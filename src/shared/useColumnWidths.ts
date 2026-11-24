import { useCallback, useRef, useState, type RefObject } from 'react';

/** Column widths in pixels by column key; a table without any uses the browser's automatic layout. */
export type ColumnWidths = Record<string, number>;

function loadWidths(storageKey: string): ColumnWidths {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(storageKey) ?? '{}');
    if (!parsed || typeof parsed !== 'object') return {};
    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).filter(
        (entry): entry is [string, number] => typeof entry[1] === 'number' && entry[1] > 0,
      ),
    );
  } catch {
    return {};
  }
}

function saveWidths(storageKey: string, widths: ColumnWidths) {
  try {
    if (Object.keys(widths).length === 0) localStorage.removeItem(storageKey);
    else localStorage.setItem(storageKey, JSON.stringify(widths));
  } catch {
    // Without storage the widths last until the page is left.
  }
}

/**
 * Column widths a user sets by dragging the header edges, kept per browser under `storageKey`.
 *
 * Until a column is resized the table lays itself out. The first drag fixes every visible column at the width it has
 * then (header cells carry `data-column`), so only the dragged column changes; from then on the table uses a fixed
 * layout as wide as its columns, and a column without a width of its own (shown again, or reset by a double-click on
 * its handle) takes the table's default for it. Resetting all widths goes back to the automatic layout.
 */
export function useColumnWidths(storageKey: string, headerRowRef: RefObject<HTMLTableRowElement>) {
  const [widths, setWidths] = useState<ColumnWidths>(() => loadWidths(storageKey));
  const widthsRef = useRef(widths);
  widthsRef.current = widths;

  const change = useCallback(
    (next: ColumnWidths, persist: boolean) => {
      widthsRef.current = next;
      setWidths(next);
      if (persist) saveWidths(storageKey, next);
    },
    [storageKey],
  );

  /** The current widths plus the measured width of every visible column without one. */
  const measured = useCallback((): ColumnWidths => {
    const next = { ...widthsRef.current };
    headerRowRef.current?.querySelectorAll<HTMLElement>('[data-column]').forEach((cell) => {
      const key = cell.dataset.column!;
      if (next[key] == null) next[key] = Math.round(cell.getBoundingClientRect().width);
    });
    return next;
  }, [headerRowRef]);

  const reset = useCallback(
    (key?: string) => {
      if (key == null) {
        change({}, true);
        return;
      }
      const next = { ...widthsRef.current };
      delete next[key];
      change(next, true);
    },
    [change],
  );

  return { widths, resized: Object.keys(widths).length > 0, measured, change, reset };
}

export type ColumnWidthsState = ReturnType<typeof useColumnWidths>;
