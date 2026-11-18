import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

/**
 * Fades and slides its content up when it scrolls into view (the `kg-reveal` styles in brand.css, which skip the
 * animation for users who ask for reduced motion). `index` delays items in the same row one after the other.
 * `fill` makes the wrapper fill a grid cell, so a `h="100%"` card inside keeps equal heights.
 */
export function Reveal({
  children,
  index = 0,
  fill = false,
}: {
  children: ReactNode;
  index?: number;
  fill?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!('IntersectionObserver' in window)) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={visible ? 'kg-reveal is-visible' : 'kg-reveal'}
      style={{ '--kg-reveal-i': index, height: fill ? '100%' : undefined } as CSSProperties}
    >
      {children}
    </div>
  );
}
