import { useState } from 'react';

export interface SortState<K extends string = string> {
  key: K;
  ascending: boolean;
}

/** The order of a table: a click on a column sorts by it ascending, a second click turns the order around. */
export function useSort<K extends string>(initial: SortState<K>, onChange?: () => void) {
  const [sort, setSort] = useState<SortState<K>>(initial);
  const changeSort = (key: K) => {
    setSort((current) => ({ key, ascending: current.key === key ? !current.ascending : true }));
    onChange?.();
  };
  return { sort, changeSort };
}

/** A value to sort a row by; empty values go last whatever the direction. */
export type SortValue = string | number | null | undefined;

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

/** The rows ordered by `sort`, with `valueOf` giving each row's value in a column. Doesn't change `rows`. */
export function sortRows<T, K extends string>(
  rows: T[],
  sort: SortState<K>,
  valueOf: (row: T, key: K) => SortValue,
): T[] {
  const direction = sort.ascending ? 1 : -1;
  return [...rows].sort((a, b) => {
    const x = valueOf(a, sort.key);
    const y = valueOf(b, sort.key);
    const xEmpty = x == null || x === '';
    const yEmpty = y == null || y === '';
    if (xEmpty || yEmpty) return xEmpty === yEmpty ? 0 : xEmpty ? 1 : -1;
    const order =
      typeof x === 'number' && typeof y === 'number' ? x - y : collator.compare(String(x), String(y));
    return order * direction;
  });
}

/**
 * One page of rows already loaded in full. The page goes back to the first one when `resetKey` changes (a new filter
 * or order) and stays within the pages there are when the list gets shorter.
 */
export function usePagedRows<T>(rows: T[], pageSize: number, resetKey: string) {
  const [state, setState] = useState({ page: 0, resetKey });
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const page = Math.min(state.resetKey === resetKey ? state.page : 0, pageCount - 1);
  return {
    page,
    pageCount,
    setPage: (next: number) => setState({ page: next, resetKey }),
    rows: rows.slice(page * pageSize, (page + 1) * pageSize),
  };
}
