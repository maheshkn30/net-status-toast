/**
 * net-status-toast
 *
 * Shows a toast when the internet goes off and reports connection speed and quality.
 * Zero dependencies, framework agnostic and SSR-safe: importing this module touches
 * nothing, and `startNetworkToast()` does nothing when `window` is undefined.
 *
 * Written in plain ES2017 so it can ship un-transpiled.
 *
 * @license MIT
 */

const DEFAULT_PING_URL = "https://www.gstatic.com/generate_204";
const DEFAULT_SPEED_URL = "https://speed.cloudflare.com/__down?bytes=500000";

const DEFAULT_MESSAGES = {
  offline: "No internet connection",
  online: "Back online",
  slow: "Slow connection",
};

const POSITIONS = [
  "top-left",
  "top-center",
  "top-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
];

const QUALITY_LABELS = {
  excellent: "Excellent",
  good: "Good",
  fair: "Fair",
  poor: "Poor",
  unknown: "Unknown",
};

// Dark enough to keep white text at or above the WCAG AA 4.5:1 contrast ratio.
const TOAST_COLORS = {
  offline: "#dc2626",
  online: "#15803d",
  slow: "#b45309",
};

const ONLINE_TOAST_MS = 3000; // how long the "Back online" toast stays
const FADE_MS = 300; // fade transition length
const EDGE_OFFSET = "20px"; // distance from the viewport edge
const SEPARATOR = " \u00B7 "; // " · "
const MAX_TIMER_MS = 2147483647; // largest delay setInterval/setTimeout accept

const BASE_STYLE = {
  position: "fixed",
  boxSizing: "border-box",
  width: "max-content",
  maxWidth: "92vw",
  margin: "0",
  padding: "10px 18px",
  borderRadius: "12px",
  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.22)",
  color: "#fff",
  fontFamily:
    'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif',
  fontSize: "14px",
  fontWeight: "500",
  lineHeight: "1.4",
  textAlign: "center",
  overflowWrap: "break-word",
  pointerEvents: "none",
  opacity: "0",
  transition: "opacity " + FADE_MS + "ms ease",
};

/* -------------------------------------------------------------------------- */
/* Public helpers                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Maps a download speed in Mbps to a quality bucket.
 * Excellent >= 10, Good >= 5, Fair >= 1, Poor < 1. Anything that is not a
 * finite number (null, undefined, NaN, strings) is "unknown".
 *
 * @param {number | null | undefined} mbps
 * @returns {"excellent" | "good" | "fair" | "poor" | "unknown"}
 */
export function getQuality(mbps) {
  if (typeof mbps !== "number" || !Number.isFinite(mbps)) return "unknown";
  if (mbps >= 10) return "excellent";
  if (mbps >= 5) return "good";
  if (mbps >= 1) return "fair";
  return "poor";
}

/* -------------------------------------------------------------------------- */
/* Small internal utilities                                                   */
/* -------------------------------------------------------------------------- */

function isBrowser() {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function noop() {}

function now() {
  return typeof performance !== "undefined" &&
    typeof performance.now === "function"
    ? performance.now()
    : Date.now();
}

function report(err) {
  if (typeof console !== "undefined" && typeof console.error === "function") {
    console.error("[net-status-toast]", err);
  }
}

function positiveNumber(value, fallback) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.min(value, MAX_TIMER_MS)
    : fallback;
}

function nonNegativeNumber(value, fallback) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : fallback;
}

function nonEmptyString(value, fallback) {
  return typeof value === "string" && value.trim() !== "" ? value : fallback;
}

/** 12.43 -> "12.4", 0.6 -> "0.6", 0.04 -> "0.04", 10 -> "10". */
function formatMbps(mbps) {
  return String(Number(mbps.toFixed(mbps >= 1 ? 1 : 2)));
}

/** Appends a cache-busting query param without disturbing an existing query string. */
function withCacheBuster(url) {
  const stamp = Date.now() + "-" + Math.random().toString(36).slice(2, 8);
  try {
    const parsed = new URL(url, window.location.href);
    parsed.searchParams.set("_", stamp);
    return parsed.toString();
  } catch (err) {
    return url + (url.indexOf("?") === -1 ? "?" : "&") + "_=" + stamp;
  }
}

/** Live `navigator.connection` data, or nulls when the browser does not expose it. */
function readConnection() {
  const nav = typeof navigator !== "undefined" ? navigator : null;
  const conn =
    nav && (nav.connection || nav.mozConnection || nav.webkitConnection);
  return {
    effectiveType:
      conn && typeof conn.effectiveType === "string"
        ? conn.effectiveType
        : null,
    downlink: conn && typeof conn.downlink === "number" ? conn.downlink : null,
    rtt: conn && typeof conn.rtt === "number" ? conn.rtt : null,
  };
}

function buildStatus(core) {
  const quality = getQuality(core.speedMbps);
  const connection = readConnection();
  return {
    online: core.online,
    latency: core.latency,
    speedMbps: core.speedMbps,
    quality: quality,
    qualityLabel: QUALITY_LABELS[quality],
    effectiveType: connection.effectiveType,
    downlink: connection.downlink,
    rtt: connection.rtt,
  };
}

function resolveOptions(options) {
  const o = options && typeof options === "object" ? options : {};
  const m = o.messages && typeof o.messages === "object" ? o.messages : {};
  return {
    pingUrl: nonEmptyString(o.pingUrl, DEFAULT_PING_URL),
    speedUrl: nonEmptyString(o.speedUrl, DEFAULT_SPEED_URL),
    checkInterval: positiveNumber(o.checkInterval, 5000),
    speedInterval: positiveNumber(o.speedInterval, 30000),
    timeout: positiveNumber(o.timeout, 5000),
    slowThresholdMbps: nonNegativeNumber(o.slowThresholdMbps, 1),
    position:
      POSITIONS.indexOf(o.position) !== -1 ? o.position : "bottom-center",
    showSpeed: o.showSpeed === undefined ? true : Boolean(o.showSpeed),
    zIndex:
      typeof o.zIndex === "number" && Number.isFinite(o.zIndex)
        ? Math.round(o.zIndex)
        : 99999,
    messages: {
      offline: nonEmptyString(m.offline, DEFAULT_MESSAGES.offline),
      online: nonEmptyString(m.online, DEFAULT_MESSAGES.online),
      slow: nonEmptyString(m.slow, DEFAULT_MESSAGES.slow),
    },
    onChange: typeof o.onChange === "function" ? o.onChange : null,
  };
}

/* -------------------------------------------------------------------------- */
/* Toast element                                                              */
/* -------------------------------------------------------------------------- */

function placement(position) {
  const parts = position.split("-"); // e.g. ["bottom", "center"]
  const style = {};
  style[parts[0]] = EDGE_OFFSET;
  if (parts[1] === "center") {
    style.left = "50%";
    style.transform = "translateX(-50%)";
  } else {
    style[parts[1]] = EDGE_OFFSET;
  }
  return style;
}

/**
 * One toast element, created lazily on the first show and reused for every state.
 * It stays in the DOM (transparent and empty when idle) so screen readers see text
 * being injected into an existing live region, which is announced reliably.
 */
function createToast(cfg) {
  let el = null;
  let kind = null; // "offline" | "online" | "slow" | null (hidden)
  let clearTimer = null;

  function build() {
    const node = document.createElement("div");
    node.setAttribute("role", "status");
    node.setAttribute("aria-live", "polite");
    node.setAttribute("aria-atomic", "true");
    // Styles go through the CSSOM (not a style attribute), so strict CSPs allow them.
    Object.assign(node.style, BASE_STYLE, placement(cfg.position), {
      zIndex: String(cfg.zIndex),
    });
    return node;
  }

  function show(nextKind, message) {
    let created = false;
    if (!el) {
      if (!document.body) return; // too early; the next render will retry
      el = build();
      document.body.appendChild(el);
      created = true;
    }
    clearTimeout(clearTimer);
    clearTimer = null;

    if (kind !== nextKind) el.style.backgroundColor = TOAST_COLORS[nextKind];
    if (el.textContent !== message) el.textContent = message;
    kind = nextKind;

    // Commit the opacity:0 starting state so the very first show fades in.
    if (created) void el.offsetWidth;
    el.style.opacity = "1";
  }

  function hide() {
    if (!el || kind === null) return;
    kind = null;
    el.style.opacity = "0";
    clearTimeout(clearTimer);
    // Once faded out, empty the live region so stale text is not left for assistive tech.
    clearTimer = setTimeout(function () {
      clearTimer = null;
      if (el && kind === null) el.textContent = "";
    }, FADE_MS + 50);
  }

  function destroy() {
    clearTimeout(clearTimer);
    clearTimer = null;
    if (el && el.parentNode) el.parentNode.removeChild(el);
    el = null;
    kind = null;
  }

  return { show: show, hide: hide, destroy: destroy };
}

/* -------------------------------------------------------------------------- */
/* Public API                                                                 */
/* -------------------------------------------------------------------------- */

function createNoopHandle() {
  const status = buildStatus({ online: true, latency: null, speedMbps: null });
  return {
    stop: noop,
    checkNow: function () {
      return Promise.resolve(Object.assign({}, status));
    },
    getStatus: function () {
      return Object.assign({}, status);
    },
  };
}

/**
 * Starts monitoring the connection and showing toasts.
 * Safe to call during SSR: without `window`/`document` it returns an inert handle.
 *
 * @param {object} [options] See `NetworkToastOptions` in index.d.ts.
 * @returns {{ stop(): void, checkNow(): Promise<object>, getStatus(): object }}
 */
export function startNetworkToast(options) {
  if (!isBrowser()) return createNoopHandle();

  const cfg = resolveOptions(options);
  const toast = createToast(cfg);
  const inflight = new Set(); // AbortControllers of requests currently running

  const state = {
    online: typeof navigator === "undefined" || navigator.onLine !== false,
    latency: null,
    speedMbps: null,
  };

  let stopped = false;
  let lastOnline = null; // null until the first check finishes
  let running = null; // promise for the check loop while one is in flight
  let rerun = false; // an urgent trigger arrived mid-check: run once more afterwards
  let speedDue = true; // measure speed on the next successful check
  let backOnline = false; // inside the "Back online" display window
  let backOnlineTimer = null;

  function snapshot() {
    return buildStatus(state);
  }

  /* ---------------------------------- network --------------------------------- */

  function doFetch(url, init) {
    // Looked up on every call so a polyfill or test double installed later is honoured.
    return typeof window.fetch === "function"
      ? window.fetch(url, init)
      : fetch(url, init);
  }

  /** Runs `run(signal, hasTimedOut)` with an AbortController that fires after `cfg.timeout`. */
  async function withTimeout(run) {
    const controller = new AbortController();
    let timedOut = false;
    inflight.add(controller);
    const timer = setTimeout(function () {
      timedOut = true;
      controller.abort();
    }, cfg.timeout);
    try {
      return await run(controller.signal, function () {
        return timedOut;
      });
    } finally {
      clearTimeout(timer);
      inflight.delete(controller);
      controller.abort(); // release anything left unread; a no-op once the request finished
    }
  }

  /** HEAD request that proves real internet access and measures latency. Never throws. */
  async function ping() {
    const started = now();
    try {
      await withTimeout(function (signal) {
        return doFetch(cfg.pingUrl, {
          method: "HEAD",
          mode: "no-cors",
          cache: "no-store",
          signal: signal,
        });
      });
      return { ok: true, latency: Math.round(now() - started) };
    } catch (err) {
      return { ok: false, latency: null };
    }
  }

  async function readBody(response, onBytes) {
    const body = response.body;
    if (body && typeof body.getReader === "function") {
      // Count bytes as they arrive so a timeout still leaves a usable partial reading.
      const reader = body.getReader();
      let total = 0;
      for (;;) {
        const chunk = await reader.read();
        if (chunk.done) break;
        total += chunk.value ? chunk.value.byteLength || 0 : 0;
        onBytes(total);
      }
      return;
    }
    const buffer = await response.arrayBuffer();
    onBytes(buffer.byteLength);
  }

  /**
   * Downloads `speedUrl` and returns Mbps rounded to 2 decimals, or null when no
   * reading could be taken. If the timeout hits mid-download, the bytes received so
   * far still give a valid (low) reading, which is what makes very slow links visible.
   */
  async function measureSpeed() {
    const started = now();
    let bytes = 0;
    let failed = false;

    await withTimeout(async function (signal, hasTimedOut) {
      try {
        const response = await doFetch(withCacheBuster(cfg.speedUrl), {
          cache: "no-store",
          signal: signal,
        });
        if (!response.ok) {
          failed = true;
          return;
        }
        await readBody(response, function (total) {
          bytes = total;
        });
      } catch (err) {
        if (!hasTimedOut()) failed = true;
      }
    });

    if (failed || bytes <= 0) return null;
    const seconds = Math.max(now() - started, 1) / 1000;
    const mbps = Math.round(((bytes * 8) / seconds / 1e6) * 100) / 100;
    return Number.isFinite(mbps) ? mbps : null;
  }

  /* ------------------------------------ UI ------------------------------------ */

  function isSlow() {
    return state.speedMbps !== null && state.speedMbps < cfg.slowThresholdMbps;
  }

  function withSpeed(message) {
    if (!cfg.showSpeed || state.speedMbps === null) return message;
    const label = QUALITY_LABELS[getQuality(state.speedMbps)];
    return (
      message +
      SEPARATOR +
      formatMbps(state.speedMbps) +
      " Mbps (" +
      label +
      ")"
    );
  }

  /** The toast is a pure function of the current state. */
  function render() {
    if (stopped) return;
    if (!state.online) {
      toast.show("offline", cfg.messages.offline);
    } else if (backOnline) {
      toast.show("online", withSpeed(cfg.messages.online));
    } else if (isSlow()) {
      toast.show("slow", withSpeed(cfg.messages.slow));
    } else {
      toast.hide();
    }
  }

  function setBackOnline(flag) {
    clearTimeout(backOnlineTimer);
    backOnlineTimer = null;
    backOnline = flag;
    if (flag) {
      backOnlineTimer = setTimeout(function () {
        backOnlineTimer = null;
        backOnline = false;
        render();
      }, ONLINE_TOAST_MS);
    }
  }

  function notify() {
    if (!cfg.onChange) return;
    try {
      cfg.onChange(snapshot());
    } catch (err) {
      report(err);
    }
  }

  /** Applies one finished check to the state, then updates the toast and callback. */
  function commit(result, speed) {
    const previous = lastOnline;
    lastOnline = result.ok;
    state.online = result.ok;
    state.latency = result.ok ? result.latency : null;

    if (!result.ok) {
      state.speedMbps = null; // an old reading says nothing about the next connection
      speedDue = true; // measure right away once the connection is back
      setBackOnline(false);
    } else {
      if (speed !== null) state.speedMbps = speed;
      if (previous === false) setBackOnline(true);
    }

    render();
    if (previous === null || previous !== result.ok) notify();
  }

  /* ------------------------------ check scheduling ----------------------------- */

  async function runCheck() {
    const result = await ping();
    if (stopped) return;

    let speed = null;
    if (result.ok && speedDue) {
      speed = await measureSpeed();
      if (stopped) return;
      speedDue = false; // a failed attempt waits for the next speed tick, not the next ping
    }
    commit(result, speed);
  }

  async function loop() {
    try {
      do {
        rerun = false;
        await runCheck();
      } while (rerun && !stopped);
    } catch (err) {
      report(err); // never let a failure escape as an unhandled rejection
    } finally {
      running = null;
    }
    return snapshot();
  }

  /**
   * Starts a check unless one is already running (checks never overlap).
   * Urgent triggers (events, checkNow) queue exactly one follow-up check so the
   * result always reflects something that started after the trigger.
   */
  function trigger(urgent) {
    if (stopped) return Promise.resolve(snapshot());
    if (running) {
      if (urgent) rerun = true;
      return running;
    }
    running = loop();
    return running;
  }

  function onNetworkEvent() {
    trigger(true);
  }

  function stop() {
    if (stopped) return;
    stopped = true;
    clearInterval(pingTimer);
    clearInterval(speedTimer);
    clearTimeout(backOnlineTimer);
    backOnlineTimer = null;
    window.removeEventListener("online", onNetworkEvent);
    window.removeEventListener("offline", onNetworkEvent);
    inflight.forEach(function (controller) {
      controller.abort();
    });
    inflight.clear();
    toast.destroy();
  }

  window.addEventListener("online", onNetworkEvent);
  window.addEventListener("offline", onNetworkEvent);

  const pingTimer = setInterval(function () {
    trigger(false);
  }, cfg.checkInterval);

  const speedTimer = setInterval(function () {
    speedDue = true;
    trigger(false);
  }, cfg.speedInterval);

  trigger(true); // first check

  return {
    stop: stop,
    checkNow: function () {
      return trigger(true);
    },
    getStatus: snapshot,
  };
}

export default startNetworkToast;
