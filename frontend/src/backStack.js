import { useEffect, useRef } from "react";

// One browser history entry per open layer (nested view, sheet, modal, drawer), so the system back
// gesture always closes exactly the top-most layer. Closing a layer from the UI rewinds its history
// entry too, so the next back press never lands on a stale entry.

const layers = [];
let nextId = 1;
let pendingBack = 0;
let pendingRoute = 0;
let traversing = false;
let passThrough = false;
let flushScheduled = false;
const queue = [];
let getRouteState = () => ({});
let historyApi = typeof window !== "undefined" ? window.history : null;

export function configureBackStack({ routeState, history } = {}) {
  if (typeof routeState === "function") getRouteState = routeState;
  if (history) historyApi = history;
}

function busy() {
  return traversing || pendingBack > 0 || pendingRoute > 0;
}

function flush() {
  if (traversing) return;
  if (pendingBack > 0 || pendingRoute > 0) {
    const steps = pendingBack + pendingRoute;
    passThrough = pendingRoute > 0;
    pendingBack = 0;
    pendingRoute = 0;
    traversing = true;
    historyApi?.go(-steps);
    return;
  }
  while (queue.length) {
    const entry = queue.shift();
    if (entry.layer && !layers.includes(entry.layer)) continue;
    historyApi?.pushState(entry.layer ? { ...getRouteState(), layer: entry.layer.id } : entry.state, "");
    if (entry.layer) entry.layer.pushed = true;
  }
}

function scheduleFlush() {
  if (flushScheduled) return;
  flushScheduled = true;
  queueMicrotask(() => {
    flushScheduled = false;
    flush();
  });
}

function push(entry) {
  if (busy()) {
    queue.push(entry);
    return;
  }
  historyApi?.pushState(entry.layer ? { ...getRouteState(), layer: entry.layer.id } : entry.state, "");
  if (entry.layer) entry.layer.pushed = true;
}

// Rewinds the given layers' history entries; layers whose entry was never written are just dropped.
function rewind(removed) {
  const written = removed.filter((layer) => layer.pushed).length;
  if (written > 0) {
    pendingBack += written;
    scheduleFlush();
  }
}

export function pushLayer(close) {
  const layer = { id: nextId++, close: typeof close === "function" ? close : null, pushed: false };
  layers.push(layer);
  push({ layer });
  return layer.id;
}

// Called when a layer closes from the UI (its own back/close button, a selection, unmount).
// Layers opened on top of it close as well. A layer already closed by the back gesture is ignored.
export function releaseLayer(id) {
  const index = layers.findIndex((layer) => layer.id === id);
  if (index < 0) return;
  const removed = layers.splice(index);
  removed.slice(1).reverse().forEach((layer) => {
    try { layer.close?.(); } catch { /* layer already gone */ }
  });
  rewind(removed);
}

// Closes every open layer before a screen change so the new screen sits directly on top of the
// screen it was opened from.
export function clearLayers() {
  const removed = layers.splice(0);
  removed.slice().reverse().forEach((layer) => {
    try { layer.close?.(); } catch { /* layer already gone */ }
  });
  rewind(removed);
}

export function pushRoute(state) {
  push({ state });
}

// Leaves the current screen: closes its open layers and steps back to the previous screen in a
// single traversal, so the app's popstate handler sees the previous screen's state.
export function popRoute() {
  clearLayers();
  pendingRoute += 1;
  scheduleFlush();
}

// Returns true when the popstate event belonged to the back stack and the caller must not
// treat it as a screen change.
export function handleBackStackPop() {
  if (traversing) {
    traversing = false;
    const routeChanged = passThrough;
    passThrough = false;
    flush();
    return !routeChanged;
  }
  if (pendingBack === 0 && pendingRoute > 0) {
    // The user's own back press already performs the requested screen change.
    pendingRoute -= 1;
    return false;
  }
  if (pendingBack > 0) {
    // The user went back before a scheduled rewind ran; that press already removed one entry.
    pendingBack -= 1;
    scheduleFlush();
    return true;
  }
  const top = layers.pop();
  if (!top) return false;
  try { top.close?.(); } catch { /* layer already gone */ }
  return true;
}

export function openLayerCount() {
  return layers.length;
}

// Registers a back-closable layer while `active` is true. `onBack` must close the layer.
export function useBackLayer(active, onBack) {
  const onBackRef = useRef(onBack);
  const on = Boolean(active);
  useEffect(() => {
    onBackRef.current = onBack;
  });
  useEffect(() => {
    if (!on) return undefined;
    const id = pushLayer(() => onBackRef.current?.());
    return () => releaseLayer(id);
  }, [on]);
}

export function resetBackStackForTests() {
  layers.splice(0);
  queue.splice(0);
  nextId = 1;
  pendingBack = 0;
  pendingRoute = 0;
  traversing = false;
  passThrough = false;
  flushScheduled = false;
}
