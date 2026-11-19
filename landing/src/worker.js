// knowgauge.com: the static landing page (public/) plus one endpoint, POST /api/notify, that stores beta waitlist
// sign-ups in the WAITLIST KV namespace. Every other request is served from the static assets.
//
// A sign-up is stored under the key "email:<address in lower case>" with { email, createdAt, country } as value,
// so signing up twice keeps the first entry. List them with:
//   npx wrangler@4 kv key list --binding WAITLIST --remote

// Deliberately simple: one @, something before it, a dot in the domain, no spaces.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/notify') {
      if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
      return handleNotify(request, env);
    }
    return env.ASSETS.fetch(request);
  },
};

async function handleNotify(request, env) {
  // Only accept posts from the landing page itself: a browser sends Origin, and it must be this same site.
  const origin = request.headers.get('Origin');
  if (origin && hostOf(origin) !== new URL(request.url).host) return json({ error: 'Forbidden' }, 403);

  const isForm = (request.headers.get('Content-Type') || '').includes('application/x-www-form-urlencoded');
  let email = '';
  let website = '';
  try {
    if (isForm) {
      const form = await request.formData();
      email = String(form.get('email') || '');
      website = String(form.get('website') || '');
    } else {
      const body = await request.json();
      email = String(body.email || '');
      website = String(body.website || '');
    }
  } catch {
    return reply(isForm, { error: 'Invalid request' }, 400);
  }

  // "website" is a hidden honeypot field people never see; bots that fill it in get a quiet "ok".
  if (website) return reply(isForm, { ok: true }, 200);

  email = email.trim();
  if (email.length > 254 || !EMAIL.test(email)) {
    return reply(isForm, { error: 'Please enter a valid email address.' }, 400);
  }

  const key = `email:${email.toLowerCase()}`;
  if (!(await env.WAITLIST.get(key))) {
    await env.WAITLIST.put(
      key,
      JSON.stringify({ email, createdAt: new Date().toISOString(), country: request.cf?.country ?? null }),
    );
  }
  return reply(isForm, { ok: true }, 200);
}

/** JSON for the page's script; a short HTML page for a plain form post (JavaScript off). */
function reply(isForm, body, status) {
  if (!isForm) return json(body, status);
  const message = body.ok
    ? 'Thanks! We’ll email you when the KnowGauge beta opens.'
    : 'Please go back and enter a valid email address.';
  const html =
    '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<title>KnowGauge</title><body style="font-family:system-ui,sans-serif;max-width:560px;margin:15vh auto;padding:0 16px">' +
    `<p style="font-size:18px">${message}</p><p><a href="/">Back to knowgauge.com</a></p></body>`;
  return new Response(html, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}

/** The host of an Origin header, or null for "null" and anything else that is not a URL. */
function hostOf(origin) {
  try {
    return new URL(origin).host;
  } catch {
    return null;
  }
}

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
