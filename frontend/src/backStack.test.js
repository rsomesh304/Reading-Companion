import assert from "node:assert/strict";
import test from "node:test";
import {
  clearLayers, configureBackStack, handleBackStackPop, openLayerCount, popRoute, pushLayer, pushRoute, releaseLayer, resetBackStackForTests,
} from "./backStack.js";

// A tiny session history: go() lands asynchronously and fires popstate, like a browser.
function fakeHistory() {
  const entries = [{ screen: "dashboard" }];
  let index = 0;
  const api = {
    get entries() { return entries.slice(0, index + 1); },
    get state() { return entries[index]; },
    pushState(state) { entries.splice(index + 1); entries.push(state); index += 1; },
    go(delta) {
      setTimeout(() => {
        index = Math.max(0, Math.min(entries.length - 1, index + delta));
        api.onpop?.(entries[index]);
      }, 0);
    },
    back() { api.go(-1); },
  };
  return api;
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 5));

function setup() {
  resetBackStackForTests();
  const history = fakeHistory();
  let route = { screen: "dashboard" };
  const routeChanges = [];
  history.onpop = (state) => {
    if (handleBackStackPop()) return;
    route = state;
    routeChanges.push(state.screen);
  };
  configureBackStack({ history, routeState: () => route });
  const navigate = (screen) => { clearLayers(); route = { screen }; pushRoute(route); };
  return { history, routeChanges, navigate, currentRoute: () => route };
}

test("back closes only the top layer, one level at a time", async () => {
  const { history, routeChanges, navigate } = setup();
  navigate("settings");
  const closed = [];
  pushLayer(() => closed.push("release-notes"));
  pushLayer(() => closed.push("version-detail"));
  assert.equal(history.entries.length, 4);

  history.back();
  await settle();
  assert.deepEqual(closed, ["version-detail"]);
  assert.equal(openLayerCount(), 1);
  assert.deepEqual(routeChanges, []);

  history.back();
  await settle();
  assert.deepEqual(closed, ["version-detail", "release-notes"]);

  history.back();
  await settle();
  assert.deepEqual(routeChanges, ["dashboard"]);
});

test("closing a layer from the UI rewinds its history entry", async () => {
  const { history, routeChanges, navigate } = setup();
  navigate("report");
  const id = pushLayer(() => {});
  releaseLayer(id);
  await settle();
  assert.equal(history.entries.length, 2);
  assert.equal(history.state.screen, "report");
  assert.deepEqual(routeChanges, []);

  history.back();
  await settle();
  assert.deepEqual(routeChanges, ["dashboard"]);
});

test("a layer opened right after another closes lands on the correct entry", async () => {
  const { history, navigate } = setup();
  navigate("chapter");
  const first = pushLayer(() => {});
  releaseLayer(first);
  const second = pushLayer(() => {});
  await settle();
  assert.equal(history.entries.length, 3);
  assert.equal(history.state.layer, second);
});

test("releasing a parent layer also closes the layers above it", async () => {
  const { history, navigate } = setup();
  navigate("report");
  const closed = [];
  const detail = pushLayer(() => closed.push("detail"));
  pushLayer(() => closed.push("lightbox"));
  releaseLayer(detail);
  await settle();
  assert.deepEqual(closed, ["lightbox"]);
  assert.equal(openLayerCount(), 0);
  assert.equal(history.entries.length, 2);
});

test("changing screens drops open layers so back returns to the previous screen", async () => {
  const { history, routeChanges, navigate } = setup();
  navigate("library");
  pushLayer(() => {});
  navigate("session");
  await settle();
  assert.deepEqual(history.entries.map((entry) => entry.screen), ["dashboard", "library", "session"]);

  history.back();
  await settle();
  assert.deepEqual(routeChanges, ["library"]);
});

test("strict-mode style mount, unmount, mount keeps one entry", async () => {
  const { history, navigate } = setup();
  navigate("help");
  const a = pushLayer(() => {});
  releaseLayer(a);
  pushLayer(() => {});
  await settle();
  assert.equal(history.entries.length, 3);
  assert.equal(openLayerCount(), 1);
});

test("leaving a screen with open layers returns to the previous screen in one step", async () => {
  const { history, routeChanges, navigate } = setup();
  navigate("library");
  navigate("session");
  const closed = [];
  pushLayer(() => closed.push("transcript"));
  pushLayer(() => closed.push("feed"));
  popRoute();
  await settle();
  assert.deepEqual(closed, ["feed", "transcript"]);
  assert.deepEqual(routeChanges, ["library"]);
  assert.equal(history.state.screen, "library");
  assert.equal(openLayerCount(), 0);
});

test("leaving a screen without layers behaves like a single back press", async () => {
  const { history, routeChanges, navigate } = setup();
  navigate("settings");
  popRoute();
  await settle();
  assert.deepEqual(routeChanges, ["dashboard"]);
  assert.equal(history.entries.length, 1);
});
