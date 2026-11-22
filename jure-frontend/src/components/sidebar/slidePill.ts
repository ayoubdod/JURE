import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

/**
 * Stretching nav pill. The edge you travel toward moves first (power3.out, 0.36s)
 * and the trailing edge catches up (power3.inOut, 0.55s), via clip-path insets.
 */

type Edge = 'l' | 'r' | 't' | 'b';
type Edges = Record<Edge, number>;

type PillHost = HTMLElement & {
  __st?: Edges;
  __kill?: () => void;
  __animating?: boolean;
  __layoutDirty?: boolean;
  __onIdle?: () => void;
};

const LEAD_S = 0.36;
const TRAIL_S = 0.55;

function easePower3Out(t: number) {
  return 1 - (1 - t) ** 3;
}

function easePower3InOut(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

function clip(e: Edges, radius: string) {
  return `inset(${e.t}px ${e.r}px ${e.b}px ${e.l}px round ${radius})`;
}

function radiusOf(el: HTMLElement) {
  const radius = getComputedStyle(el).borderTopLeftRadius;
  return radius && radius !== '0px' ? radius : '8px';
}

type Tween = {
  key: Edge;
  from: number;
  to: number;
  duration: number;
  ease: (t: number) => number;
};

export function slidePill(pill: HTMLElement, el: HTMLElement, instant = false) {
  const box = pill.parentElement;
  if (!box) return;

  const host = pill as PillHost;
  host.__kill?.();
  host.__kill = undefined;

  const width = box.offsetWidth;
  const height = box.offsetHeight;
  const to: Edges = {
    l: el.offsetLeft,
    r: Math.max(0, width - el.offsetLeft - el.offsetWidth),
    t: el.offsetTop,
    b: Math.max(0, height - el.offsetTop - el.offsetHeight),
  };
  const radius = radiusOf(el);
  const paint = (edges: Edges) => {
    pill.style.clipPath = clip(edges, radius);
  };

  if (instant || !host.__st) {
    host.__st = { ...to };
    host.__animating = false;
    paint(host.__st);
    return;
  }

  const st = host.__st;
  const vertical = Math.abs(to.t - st.t) >= Math.abs(to.l - st.l);
  const tweens: Tween[] = [];
  const push = (key: Edge, duration: number, ease: (t: number) => number) => {
    tweens.push({ key, from: st[key], to: to[key], duration, ease });
  };

  if (vertical) {
    const forward = to.t > st.t;
    const [lead, trail] = forward ? (['b', 't'] as const) : (['t', 'b'] as const);
    push(lead, LEAD_S, easePower3Out);
    push(trail, TRAIL_S, easePower3InOut);
    push('l', TRAIL_S, easePower3InOut);
    push('r', TRAIL_S, easePower3InOut);
  } else {
    const forward = to.l > st.l;
    const [lead, trail] = forward ? (['r', 'l'] as const) : (['l', 'r'] as const);
    push(lead, LEAD_S, easePower3Out);
    push(trail, TRAIL_S, easePower3InOut);
    push('t', TRAIL_S, easePower3InOut);
    push('b', TRAIL_S, easePower3InOut);
  }

  const moving = tweens.filter((tween) => Math.abs(tween.to - tween.from) > 0.4);
  if (moving.length === 0) {
    Object.assign(st, to);
    host.__animating = false;
    paint(st);
    return;
  }

  host.__animating = true;
  const start = performance.now();
  let raf = 0;
  let killed = false;

  const finish = () => {
    host.__animating = false;
    host.__kill = undefined;
    host.__onIdle?.();
  };

  const tick = (now: number) => {
    if (killed) return;
    const elapsed = (now - start) / 1000;
    let alive = false;
    for (const tween of moving) {
      const progress = tween.duration <= 0 ? 1 : Math.min(1, elapsed / tween.duration);
      st[tween.key] = tween.from + (tween.to - tween.from) * tween.ease(progress);
      if (progress < 1) alive = true;
    }
    paint(st);
    if (alive) raf = requestAnimationFrame(tick);
    else finish();
  };

  raf = requestAnimationFrame(tick);
  host.__kill = () => {
    killed = true;
    cancelAnimationFrame(raf);
    host.__animating = false;
    host.__kill = undefined;
  };
}

export function useSlidePill(activeId: string | null, layoutKey: unknown) {
  const rootRef = useRef<HTMLElement | null>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(activeId);
  const prevId = useRef<string | null | undefined>(undefined);
  const [rootNode, setRootNode] = useState<HTMLElement | null>(null);

  activeRef.current = activeId;

  const setRoot = useCallback((node: HTMLDivElement | null) => {
    rootRef.current = node;
    setRootNode((prev) => (prev === node ? prev : node));
  }, []);

  const place = useCallback((instant: boolean) => {
    const pill = pillRef.current;
    const root = rootRef.current;
    if (!pill) return;

    const host = pill as PillHost;
    host.__onIdle = () => {
      if (!host.__layoutDirty) return;
      host.__layoutDirty = false;
      place(true);
    };

    const id = activeRef.current;
    if (!root || !id) {
      host.__kill?.();
      pill.style.opacity = '0';
      return;
    }

    const target = root.querySelector<HTMLElement>(
      `[data-pill-target="${CSS.escape(id)}"]`,
    );
    if (!target) {
      host.__kill?.();
      pill.style.opacity = '0';
      return;
    }

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    pill.style.opacity = '1';
    slidePill(pill, target, instant || reduce);
  }, []);

  useLayoutEffect(() => {
    const idChanged = prevId.current !== undefined && prevId.current !== activeId;
    prevId.current = activeId;
    place(!idChanged);
  }, [activeId, layoutKey, rootNode, place]);

  useEffect(() => {
    if (!rootNode || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      const pill = pillRef.current as PillHost | null;
      if (!pill) return;
      if (pill.__animating) {
        pill.__layoutDirty = true;
        return;
      }
      place(true);
    });
    observer.observe(rootNode);
    return () => observer.disconnect();
  }, [rootNode, place]);

  return { setRoot, pillRef };
}
