import { useCallback, useLayoutEffect, useRef, type MouseEvent, type UIEvent } from "react";

interface Anchor {
  element: HTMLElement;
  offset: number;
  fallback: HTMLElement | null;
  fallbackOffset: number;
  fresh: boolean;
}

export function useScrollAnchor<T extends HTMLElement = HTMLDivElement>(busy: boolean) {
  const ref = useRef<T>(null);
  const anchor = useRef<Anchor | null>(null);
  const wasBusy = useRef(false);

  const offsetFromTop = (element: HTMLElement, scroller: HTMLElement) =>
    element.getBoundingClientRect().top - scroller.getBoundingClientRect().top;

  const onClickCapture = useCallback((event: MouseEvent<HTMLElement>) => {
    const scroller = ref.current;
    const element = (event.target as HTMLElement).closest<HTMLElement>("label");
    if (!scroller || !element) return;

    const fallback = element.closest("section")?.querySelector<HTMLElement>("h3") ?? null;
    anchor.current = {
      element,
      offset: offsetFromTop(element, scroller),
      fallback,
      fallbackOffset: fallback ? offsetFromTop(fallback, scroller) : 0,
      fresh: true,
    };
  }, []);

  const onScroll = useCallback((_event: UIEvent<HTMLElement>) => {
    const scroller = ref.current;
    const current = anchor.current;
    if (!scroller || !current) return;
    if (current.element.isConnected) current.offset = offsetFromTop(current.element, scroller);
    if (current.fallback?.isConnected) current.fallbackOffset = offsetFromTop(current.fallback, scroller);
  }, []);


  useLayoutEffect(() => {
    const scroller = ref.current;
    const current = anchor.current;
    const reloading = busy || wasBusy.current;
    wasBusy.current = busy;
    if (!scroller || !current) return;

    if (!current.fresh && !reloading) {
      anchor.current = null;
      return;
    }
    current.fresh = false;
    if (!busy) anchor.current = null;

    if (!current.element.isConnected) {
      if (!current.fallback?.isConnected) return;
      current.element = current.fallback;
      current.offset = current.fallbackOffset;
    }

    const moved = offsetFromTop(current.element, scroller) - current.offset;
    if (Math.abs(moved) >= 0.5) scroller.scrollTop += moved;
  });

  return { ref, onScroll, onClickCapture };
}
