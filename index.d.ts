/**
 * Connection quality bucket derived from the measured download speed.
 *
 * - `excellent`: 10 Mbps or more
 * - `good`: 5 Mbps or more
 * - `fair`: 1 Mbps or more
 * - `poor`: under 1 Mbps
 * - `unknown`: no usable speed reading yet
 */
export type NetworkQuality = "excellent" | "good" | "fair" | "poor" | "unknown";

/** Human readable form of {@link NetworkQuality}. */
export type NetworkQualityLabel = "Excellent" | "Good" | "Fair" | "Poor" | "Unknown";

/** Value of `navigator.connection.effectiveType` (Chromium based browsers only). */
export type EffectiveConnectionType = "slow-2g" | "2g" | "3g" | "4g";

/** Where the toast is placed in the viewport. */
export type ToastPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

/** Snapshot of the connection. */
export interface NetworkStatus {
  /** `true` when a real request to `pingUrl` succeeded on the latest check. */
  online: boolean;
  /** Round trip time of the latest ping in milliseconds, or `null` when offline or not measured yet. */
  latency: number | null;
  /** Latest download speed in Mbps (2 decimals), or `null` when offline or not measured yet. */
  speedMbps: number | null;
  /** Quality bucket for `speedMbps`. */
  quality: NetworkQuality;
  /** Capitalised `quality`, e.g. `"Excellent"`. */
  qualityLabel: NetworkQualityLabel;
  /** `navigator.connection.effectiveType`, or `null` when the browser does not expose it. */
  effectiveType: EffectiveConnectionType | null;
  /** `navigator.connection.downlink` in Mbps, or `null` when unavailable. */
  downlink: number | null;
  /** `navigator.connection.rtt` in milliseconds, or `null` when unavailable. */
  rtt: number | null;
}

/** Custom toast text. The speed and quality suffix is appended to `online` and `slow`. */
export interface NetworkToastMessages {
  /** @default "No internet connection" */
  offline?: string;
  /** @default "Back online" */
  online?: string;
  /** @default "Slow connection" */
  slow?: string;
}

/** All options are optional. Invalid values fall back to their defaults. */
export interface NetworkToastOptions {
  /**
   * URL requested with `HEAD`, `mode: "no-cors"` and `cache: "no-store"` to prove real internet access.
   * @default "https://www.gstatic.com/generate_204"
   */
  pingUrl?: string;
  /**
   * URL downloaded to measure speed. It must send CORS headers. A cache-busting query param is added.
   * @default "https://speed.cloudflare.com/__down?bytes=500000"
   */
  speedUrl?: string;
  /**
   * Milliseconds between connectivity checks.
   * @default 5000
   */
  checkInterval?: number;
  /**
   * Milliseconds between speed tests. A test also runs right after the connection comes back.
   * @default 30000
   */
  speedInterval?: number;
  /**
   * Milliseconds before a ping or a speed test is aborted.
   * @default 5000
   */
  timeout?: number;
  /**
   * Speeds below this value (in Mbps) show the "slow connection" toast.
   * @default 1
   */
  slowThresholdMbps?: number;
  /**
   * @default "bottom-center"
   */
  position?: ToastPosition;
  /**
   * Append the speed and quality, e.g. `· 12.4 Mbps (Excellent)`, to the online and slow toasts.
   * @default true
   */
  showSpeed?: boolean;
  /**
   * CSS `z-index` of the toast.
   * @default 99999
   */
  zIndex?: number;
  /** Custom toast text. */
  messages?: NetworkToastMessages;
  /**
   * Called after the first check and whenever the online/offline state changes.
   * Errors thrown by the callback are logged and never stop the monitor.
   */
  onChange?: (status: NetworkStatus) => void;
}

/** Returned by {@link startNetworkToast}. */
export interface NetworkToastHandle {
  /**
   * Stops monitoring: clears the timers, removes the event listeners, aborts requests
   * in flight and removes the toast from the DOM. Safe to call more than once.
   */
  stop(): void;
  /**
   * Runs a check right away (queued if one is already running) and resolves with the
   * resulting status. Never rejects.
   */
  checkNow(): Promise<NetworkStatus>;
  /** Returns a snapshot of the latest status. */
  getStatus(): NetworkStatus;
}

/**
 * Maps a download speed in Mbps to a quality bucket.
 * Anything that is not a finite number returns `"unknown"`.
 */
export function getQuality(mbps: number | null | undefined): NetworkQuality;

/**
 * Starts monitoring the connection and showing toasts.
 *
 * Safe to import and call during SSR: when `window` or `document` is undefined it does
 * nothing and returns an inert handle.
 */
export function startNetworkToast(options?: NetworkToastOptions): NetworkToastHandle;

export default startNetworkToast;
