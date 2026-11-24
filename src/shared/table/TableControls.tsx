import {
  Badge,
  Button,
  Checkbox,
  Group,
  Pagination,
  Popover,
  Select,
  Stack,
  Table,
  Text,
  UnstyledButton,
} from '@mantine/core';
import { IconArrowDown, IconArrowUp, IconArrowsSort, IconColumns3 } from '@tabler/icons-react';
import { useId, type ReactNode } from 'react';
import { ColumnResizer } from './ColumnResizer';
import type { SortState } from './sorting';
import { PAGE_SIZES, type TableColumn, type TableLayout } from './useTableLayout';

/** Checkboxes that show or hide the table's columns, and a reset of the dragged widths. */
export function ColumnPicker<K extends string>({ layout }: { layout: TableLayout<K> }) {
  const hideable = layout.columns.filter((c) => c.hideable !== false);
  const hiddenCount = hideable.filter((c) => !layout.shown(c.key)).length;
  return (
    <Popover position="bottom-end" shadow="md" withinPortal>
      <Popover.Target>
        <Button
          variant="default"
          leftSection={<IconColumns3 size={16} />}
          rightSection={
            hiddenCount > 0 ? (
              <Badge size="xs" variant="light" circle>
                {hideable.length - hiddenCount}
              </Badge>
            ) : undefined
          }
        >
          Columns
        </Button>
      </Popover.Target>
      <Popover.Dropdown>
        <Checkbox.Group
          value={hideable.filter((c) => layout.shown(c.key)).map((c) => c.key)}
          onChange={(values) =>
            layout.setHidden(hideable.map((c) => c.key).filter((key) => !values.includes(key)))
          }
        >
          <Stack gap="xs">
            {hideable.map((c) => (
              <Checkbox key={c.key} value={c.key} label={c.label} size="sm" />
            ))}
          </Stack>
        </Checkbox.Group>
        <Group justify="space-between" mt="sm" gap="xs">
          <Button
            variant="subtle"
            size="compact-xs"
            onClick={() => layout.setHidden([])}
            disabled={hiddenCount === 0}
          >
            Show all
          </Button>
          <Button
            variant="subtle"
            size="compact-xs"
            onClick={() => layout.widths.reset()}
            disabled={!layout.widths.resized}
          >
            Reset widths
          </Button>
        </Group>
      </Popover.Dropdown>
    </Popover>
  );
}

/**
 * A header cell with a drag handle on its right edge. With `sort` it sorts the table by its column; a second click
 * turns the order around.
 */
export function ColumnHeader<K extends string>({
  column,
  layout,
  sort,
  onSort,
}: {
  column: TableColumn<K>;
  layout: TableLayout<K>;
  sort?: SortState<K>;
  onSort?: (key: K) => void;
}) {
  const active = sort?.key === column.key;
  const Icon = !active ? IconArrowsSort : sort.ascending ? IconArrowUp : IconArrowDown;
  const label = (
    <Text size="sm" fw={600} truncate={layout.truncate}>
      {column.label}
    </Text>
  );
  return (
    <Table.Th data-column={column.key} className="kg-resizable-th" style={layout.thStyle(column)}>
      {onSort ? (
        <UnstyledButton
          onClick={() => onSort(column.key)}
          aria-label={`Sort by ${column.label}`}
          title={column.label}
          maw="100%"
        >
          <Group gap={4} wrap="nowrap">
            {label}
            <Icon
              size={14}
              style={{ flexShrink: 0 }}
              color={active ? undefined : 'var(--mantine-color-dimmed)'}
            />
          </Group>
        </UnstyledButton>
      ) : (
        label
      )}
      <ColumnResizer column={column.key} label={column.label} minWidth={column.min} state={layout.widths} />
    </Table.Th>
  );
}

/**
 * Under a table: what it holds (`summary`), the rows per page and, with more than one page, the page buttons.
 * `page` counts from 0.
 */
export function TablePager({
  layout,
  page,
  pageCount,
  onPage,
  onPageSize,
  summary,
}: {
  layout: Pick<TableLayout, 'pageSize' | 'setPageSize'>;
  page: number;
  pageCount: number;
  onPage: (page: number) => void;
  /** Called after the rows per page changed, e.g. to go back to the first page. */
  onPageSize?: () => void;
  summary?: ReactNode;
}) {
  const id = useId();
  return (
    <Group justify="space-between" mt="sm" px="xs">
      <Group gap="md">
        {summary != null && (
          <Text size="sm" c="dimmed">
            {summary}
          </Text>
        )}
        <Group gap="xs" wrap="nowrap">
          <Text size="sm" c="dimmed" component="label" htmlFor={id}>
            Rows per page
          </Text>
          <Select
            id={id}
            size="xs"
            w={80}
            data={PAGE_SIZES.map(String)}
            value={String(layout.pageSize)}
            onChange={(value) => {
              if (!value) return;
              layout.setPageSize(Number(value));
              onPageSize?.();
            }}
            allowDeselect={false}
            comboboxProps={{ withinPortal: true }}
          />
        </Group>
      </Group>
      {pageCount > 1 && (
        <Pagination total={pageCount} value={page + 1} onChange={(p) => onPage(p - 1)} size="sm" />
      )}
    </Group>
  );
}
