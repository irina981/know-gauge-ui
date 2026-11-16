import { Center, Loader, Text } from '@mantine/core';
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// PDF.js parses and renders in a web worker; Vite bundles the worker file next to the app.
pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

interface PdfViewerProps {
  url: string;
  /** Page width in percent of the viewer width: 100 fits the width. */
  zoom: number;
  /** Ctrl + mouse wheel (or a pinch on a touchpad) zooms in (1) or out (-1). */
  onZoomStep: (direction: 1 | -1) => void;
}

/**
 * The width available for a page inside the viewer: without its padding and without the vertical scrollbar, so a page
 * at 100% fits exactly. Updated when the split is dragged, the window resized or the scrollbar appears.
 */
function useInnerWidth(ref: RefObject<HTMLDivElement>) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const style = getComputedStyle(el);
      setWidth(el.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}

/**
 * Renders all pages of a PDF with PDF.js, one under the other, with selectable text and working links. Unlike the
 * browser's own viewer in a frame it has no toolbar of its own (the preview header has the controls), works the
 * same in every browser and keeps the reading position when zooming.
 */
export default function PdfViewer({ url, zoom, onZoomStep }: PdfViewerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const width = useInnerWidth(ref);
  const [pageCount, setPageCount] = useState(0);
  const pageWidth = width > 0 ? Math.round((width * zoom) / 100) : 0;

  // Keep the point in the middle of the view in place when the pages change size (zoom or resizing the split). The
  // pages redraw a moment after the size changes and are briefly shorter, which makes the browser clamp the scroll
  // position. So the position is kept as a share of the content (updated while the user scrolls) and applied again
  // after every page has redrawn; scroll events caused by that are ignored for a short while.
  const anchor = useRef({ x: 0.5, y: 0 });
  const restoring = useRef(false);
  const restoreTimer = useRef<number>();

  const onScroll = () => {
    const el = ref.current;
    if (!el || restoring.current || el.scrollHeight === 0) return;
    anchor.current = {
      x: (el.scrollLeft + el.clientWidth / 2) / el.scrollWidth,
      y: (el.scrollTop + el.clientHeight / 2) / el.scrollHeight,
    };
  };

  const restore = () => {
    const el = ref.current;
    if (!el) return;
    el.scrollTop = anchor.current.y * el.scrollHeight - el.clientHeight / 2;
    el.scrollLeft = anchor.current.x * el.scrollWidth - el.clientWidth / 2;
  };

  useLayoutEffect(() => {
    if (pageWidth <= 0) return;
    restoring.current = true;
    restore();
    window.clearTimeout(restoreTimer.current);
    restoreTimer.current = window.setTimeout(() => (restoring.current = false), 800);
  }, [pageWidth]);
  useEffect(() => () => window.clearTimeout(restoreTimer.current), []);

  // React's wheel listener is passive, so ctrl + wheel needs a native one to stop the browser zooming the whole page.
  const zoomStep = useRef(onZoomStep);
  zoomStep.current = onZoomStep;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey || event.deltaY === 0) return;
      event.preventDefault();
      zoomStep.current(event.deltaY < 0 ? 1 : -1);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  return (
    <div ref={ref} className="kg-pdf-viewer" onScroll={onScroll}>
      <Document
        file={url}
        onLoadSuccess={({ numPages }) => setPageCount(numPages)}
        loading={
          <Center h={200}>
            <Loader size="sm" />
          </Center>
        }
        error={
          <Center h={200} px="md">
            <Text size="sm" c="dimmed" ta="center">
              The document could not be shown. Use the download button in the list instead.
            </Text>
          </Center>
        }
      >
        {pageWidth > 0 &&
          Array.from({ length: pageCount }, (_, index) => (
            <Page
              key={index + 1}
              pageNumber={index + 1}
              width={pageWidth}
              className="kg-pdf-page"
              onRenderSuccess={() => restoring.current && restore()}
              loading={<div style={{ height: pageWidth * 1.414 }} />}
            />
          ))}
      </Document>
    </div>
  );
}
