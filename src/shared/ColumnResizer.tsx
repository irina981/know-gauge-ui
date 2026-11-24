import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import type { ColumnWidths, ColumnWidthsState } from './useColumnWidths';

const KEY_STEP = 16;

/** The drag handle on the right edge of a header cell (which needs `position: relative`). */
export function ColumnResizer({
  column,
  label,
  minWidth,
  state,
}: {
  column: string;
  label: string;
  minWidth: number;
  state: ColumnWidthsState;
}) {
  const drag = useRef<{ startX: number; startWidth: number; base: ColumnWidths } | null>(null);
  const [dragging, setDragging] = useState(false);

  const widthAt = (clientX: number) => {
    const current = drag.current!;
    return Math.max(minWidth, Math.round(current.startWidth + clientX - current.startX));
  };

  // Pointer capture keeps the drag going when the pointer leaves the header.
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const base = state.measured();
    drag.current = { startX: event.clientX, startWidth: base[column] ?? minWidth, base };
    setDragging(true);
    state.change(base, false);
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    state.change({ ...drag.current.base, [column]: widthAt(event.clientX) }, false);
  };
  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    state.change({ ...drag.current.base, [column]: widthAt(event.clientX) }, true);
    drag.current = null;
    setDragging(false);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.key === 'ArrowLeft' ? -KEY_STEP : event.key === 'ArrowRight' ? KEY_STEP : 0;
    if (step === 0) return;
    event.preventDefault();
    const base = state.measured();
    state.change({ ...base, [column]: Math.max(minWidth, (base[column] ?? minWidth) + step) }, true);
  };

  return (
    <div
      className="kg-col-resizer"
      data-dragging={dragging || undefined}
      role="separator"
      aria-orientation="vertical"
      aria-label={`Resize the ${label} column`}
      aria-valuenow={state.widths[column]}
      tabIndex={0}
      title="Drag to resize, double-click to reset"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={(event) => {
        event.stopPropagation();
        state.reset(column);
      }}
      onKeyDown={onKeyDown}
    />
  );
}
