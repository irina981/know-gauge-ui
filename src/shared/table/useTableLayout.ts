import { useLocalStorage } from '@mantine/hooks';
import type { CSSProperties } from 'react';
import { useColumnWidths } from './useColumnWidths';

/** A column of a table whose layout the user changes. */
export interface TableColumn<K extends string = string> {
  key: K;
  label: string;
  /** The width the column gets once the table has been resized but this column has not. */
  width: number;
  /** No drag makes the column narrower than this. */
  min: number;
  /** False for the column that names the row: it always shows. */
  hideable?: boolean;
}

/** Rows per page to pick from; 20 until one is picked. */
export const PAGE_SIZES = [10, 20, 50, 100];
const DEFAULT_PAGE_SIZE = 20;

/**
 * What a user changes about a table, kept per browser under `storageKey` (`.hidden-columns`, `.column-widths`,
 * `.page-size`): the columns shown, their widths and the rows per page. A column added later shows until it is
 * hidden. `actionsWidth` is the fixed width of a last column with the row's buttons (0 without one).
 *
 * Until a column is resized the browser lays the table out; once resized the table has a fixed layout exactly as wide
 * as its columns. Pass `tableProps` to the `Table`, `thStyle(column)` to each header cell and `actionsStyle` to the
 * buttons' header cell.
 */
export function useTableLayout<K extends string>({
  storageKey,
  columns,
  actionsWidth = 0,
}: {
  storageKey: string;
  columns: TableColumn<K>[];
  actionsWidth?: number;
}) {
  const [hidden, setHidden] = useLocalStorage<K[]>({
    key: `${storageKey}.hidden-columns`,
    defaultValue: [],
    getInitialValueInEffect: false,
  });
  const [storedPageSize, setPageSize] = useLocalStorage<number>({
    key: `${storageKey}.page-size`,
    defaultValue: DEFAULT_PAGE_SIZE,
    getInitialValueInEffect: false,
  });
  const widths = useColumnWidths(`${storageKey}.column-widths`);

  // A value from storage that is not one of the choices falls back to the default.
  const pageSize = PAGE_SIZES.includes(storedPageSize) ? storedPageSize : DEFAULT_PAGE_SIZE;
  const shown = (key: K) => !hidden.includes(key) || columns.find((c) => c.key === key)?.hideable === false;
  const visibleColumns = columns.filter((c) => shown(c.key));

  const widthOf = (column: TableColumn<K>) => widths.widths[column.key] ?? column.width;
  const tableWidth = widths.resized
    ? visibleColumns.reduce((sum, c) => sum + widthOf(c), actionsWidth)
    : undefined;

  return {
    columns,
    visibleColumns,
    shown,
    hidden,
    setHidden,
    widths,
    pageSize,
    setPageSize,
    /** Long texts are cut off ("…") only once the columns have fixed widths. */
    truncate: widths.resized,
    /** For `Table.ScrollContainer`: the table's width once resized, else a rough minimum. */
    scrollMinWidth: tableWidth ?? visibleColumns.reduce((sum, c) => sum + c.min, actionsWidth),
    tableProps: {
      className: widths.resized ? 'kg-resized-table' : undefined,
      style: tableWidth ? ({ tableLayout: 'fixed', width: tableWidth } as CSSProperties) : undefined,
    },
    thStyle: (column: TableColumn<K>): CSSProperties | undefined =>
      widths.resized ? { width: widthOf(column) } : undefined,
    actionsStyle: widths.resized && actionsWidth > 0 ? { width: actionsWidth } : undefined,
  };
}

export type TableLayout<K extends string = string> = ReturnType<typeof useTableLayout<K>>;
