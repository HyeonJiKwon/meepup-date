import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

// getSnapshot must return a stable reference across calls, or React treats
// every render as "changed" and re-renders forever. Compute once and cache.
let cachedToday: Date | undefined;
function getToday() {
  cachedToday ??= new Date();
  return cachedToday;
}

/**
 * `new Date()` differs between the SSR pass and client hydration. This
 * matters for anything derived from "today" — a `disabled: { before: ... }`
 * boundary, or react-day-picker's own internal "today" cell highlighting
 * (it calls `new Date()` internally unless given an explicit `today` prop).
 * Returning `undefined` for the server snapshot keeps the first client
 * render matching SSR output; React re-renders with the real date right
 * after hydration.
 */
export function useToday(): Date | undefined {
  return useSyncExternalStore(noopSubscribe, getToday, () => undefined);
}
