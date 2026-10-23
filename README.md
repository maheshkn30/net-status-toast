net-status-toast

Lightweight internet status, connection speed, and network quality notifications for the browser.

net-status-toast automatically monitors internet connectivity, measures download speed, evaluates connection quality, and displays beautiful toast notifications when the network goes offline, comes back online, or becomes slow.

Zero dependencies. No CSS setup. Works with React, Vue, Angular, Svelte, and vanilla JavaScript.

✨ Features
🌐 Real connectivity checks — checks internet reachability instead of relying only on navigator.onLine.
📶 Speed measurement — measures download speed in Mbps.
🚦 Connection quality — classifies speeds as Excellent, Good, Fair, Poor, or Unknown.
🔔 Automatic toast notifications — handles offline, online, and slow connection states.
⚡ Zero dependencies — built with native browser APIs and ES modules.
🎨 No CSS required — toast notifications are created and styled automatically.
♿ Accessible notifications — uses role="status" and aria-live="polite".
⚛️ Framework-friendly — works with React, Vue, Angular, Svelte, and plain HTML.
🛡️ SSR-safe — safe to import in server-rendered applications such as Next.js and Nuxt.
📘 TypeScript support — includes TypeScript declarations.
📦 Installation
npm install net-status-toast

🚀 Quick Start
import startNetworkToast from "net-status-toast";

const monitor = startNetworkToast();


That's it! The library starts monitoring the connection and displays notifications when relevant network conditions change.

The returned monitor provides methods to retrieve the latest status, run an immediate check, and stop monitoring.

// Get the latest connection status
const status = monitor.getStatus();

console.log(status.online);
console.log(status.speedMbps);
console.log(status.quality);

// Run a check immediately
const latestStatus = await monitor.checkNow();

// Stop monitoring and remove the toast
monitor.stop();

🌐 Browser Demo

You can use the library in a regular HTML file without a bundler.

HTML
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Network Status Toast</title>
</head>
<body>
  <h1>My Application</h1>
  <p>Try disconnecting and reconnecting your internet connection.</p>

  <script type="module">
    import startNetworkToast from
      "https://cdn.jsdelivr.net/npm/net-status-toast/index.js";

    const monitor = startNetworkToast({
      position: "top-center"
    });

    // Optional: stop monitoring when no longer needed
    window.addEventListener("pagehide", () => monitor.stop(), {
      once: true
    });
  </script>
</body>
</html>

⚛️ React

Initialize the monitor inside useEffect and stop it during cleanup. This prevents duplicate monitors when a component unmounts or an effect reruns.

import { useEffect } from "react";
import startNetworkToast from "net-status-toast";

export default function App() {
  useEffect(() => {
    const monitor = startNetworkToast({
      position: "bottom-center",
      onChange: (status) => {
        console.log("Online:", status.online);
        console.log("Speed:", status.speedMbps);
        console.log("Quality:", status.quality);
      }
    });

    return () => monitor.stop();
  }, []);

  return <main>My Application</main>;
}


Next.js: Use the library inside a Client Component and initialize it in useEffect. Importing the package on the server is safe.

🟢 Vue

For Vue 3 with the Composition API:

<script setup>
import { onMounted, onBeforeUnmount } from "vue";
import startNetworkToast from "net-status-toast";

let monitor;

onMounted(() => {
  monitor = startNetworkToast({
    position: "bottom-center"
  });
});

onBeforeUnmount(() => {
  monitor?.stop();
});
</script>

<template>
  <main>My Application</main>
</template>

🅰️ Angular

Initialize monitoring in ngOnInit and clean it up in ngOnDestroy.

import { Component, OnInit, OnDestroy } from "@angular/core";
import startNetworkToast, {
  NetworkToastHandle
} from "net-status-toast";

@Component({
  selector: "app-root",
  template: "<main>My Application</main>"
})
export class AppComponent implements OnInit, OnDestroy {
  private monitor?: NetworkToastHandle;

  ngOnInit(): void {
    this.monitor = startNetworkToast({
      position: "bottom-center"
    });
  }

  ngOnDestroy(): void {
    this.monitor?.stop();
  }
}

📚 API Reference
startNetworkToast(options?)

Starts a new network monitor and returns a NetworkToastHandle. This function is also the default export.

startNetworkToast(options?: NetworkToastOptions): NetworkToastHandle;

Monitor methods
Method	Return type	Description
getStatus()	NetworkStatus	Returns a snapshot of the latest network status.
checkNow()	Promise<NetworkStatus>	Runs an immediate check. Queues a follow-up check if another is running. Never rejects.
stop()	void	Stops monitoring, clears timers and event listeners, aborts active requests, and removes the toast. Safe to call more than once.

Each invocation creates its own monitor and toast. Call stop() when the monitor is no longer needed.

Configuration options

All options are optional. Invalid values fall back to their defaults.

Option	Type	Default	Description
pingUrl	string	https://www.gstatic.com/generate_204	Endpoint used to check internet reachability and measure latency.
speedUrl	string	https://speed.cloudflare.com/__down?bytes=500000	Resource downloaded to measure speed. Must support CORS.
checkInterval	number	5000	Interval between connectivity checks, in milliseconds.
speedInterval	number	30000	Interval between speed tests, in milliseconds. A test also runs after connectivity is restored.
timeout	number	5000	Timeout for a ping or speed test, in milliseconds.
slowThresholdMbps	number	1	Speeds below this threshold trigger the slow-connection notification. Set to 0 to disable it.
position	string	"bottom-center"	Toast placement. See supported values below.
showSpeed	boolean	true	Shows the measured speed and quality in online and slow notifications.
zIndex	number	99999	CSS stacking order of the toast.
messages	object	See below	Custom messages for offline, online, and slow connection states.
onChange	(status) => void	None	Callback invoked after the initial check and whenever connectivity changes.
Toast positions

Supported values:

"top-left"
"top-center"
"top-right"
"bottom-left"
"bottom-center"
"bottom-right"

Example:

const monitor = startNetworkToast({
  position: "top-right",
  checkInterval: 5000,
  speedInterval: 30000,
  slowThresholdMbps: 1,
  showSpeed: true
});

Custom messages

Default messages:

{
  offline: "No internet connection",
  online: "Back online",
  slow: "Slow connection"
}


Customize them using the messages option:

const monitor = startNetworkToast({
  messages: {
    offline: "You're currently offline",
    online: "Your connection has been restored",
    slow: "Your internet connection is slow"
  }
});


When enabled, the measured speed and quality are appended to online and slow notifications.

getQuality(mbps)

Returns a quality classification for a download speed in Mbps.

import { getQuality } from "net-status-toast";

console.log(getQuality(15));  // "excellent"
console.log(getQuality(7.2)); // "good"
console.log(getQuality(2.5)); // "fair"
console.log(getQuality(0.5)); // "poor"
console.log(getQuality(null)); // "unknown"

Quality thresholds
Quality	Download speed
excellent	10 Mbps or higher
good	5 Mbps or higher
fair	1 Mbps or higher
poor	Below 1 Mbps
unknown	Not a finite number
📊 Network Status

The status object is returned by getStatus() and checkNow(), and passed to the onChange callback.

Property	Type	Description
online	boolean	Whether the configured connectivity check succeeded.
latency	number | null	Round-trip ping time in milliseconds.
speedMbps	number | null	Measured download speed in Mbps, rounded to two decimal places.
quality	string	Quality classification: excellent, good, fair, poor, or unknown.
qualityLabel	string	Capitalized quality label, such as "Excellent".
effectiveType	string | null	Browser-reported connection type, such as "4g" or "3g".
downlink	number | null	Browser-reported estimated downlink speed in Mbps.
rtt	number | null	Browser-reported estimated round-trip time in milliseconds.

The effectiveType, downlink, and rtt properties depend on the Network Information API, which is not available in every browser. They are null when unavailable.

🔔 Toast Behavior
State	Appearance	Behavior
Offline	🔴 Red	Remains visible until connectivity returns.
Back online	🟢 Green	Automatically disappears after 3.5 seconds.
Slow connection	🟠 Amber	Appears while the measured speed is below the configured threshold and hides when it improves.
Normal connection	No toast	No notification is shown.

The initial check does not display a "Back online" notification when the connection is already working.

When connectivity returns but the connection is slow, the online notification appears first, followed by the slow-connection notification.

⚙️ How It Works
Connectivity detection

The library does not rely exclusively on navigator.onLine, because a connected network interface does not guarantee access to the internet.

Instead, it performs a request to the configured pingUrl at the configured interval. Browser online and offline events trigger an immediate check.

Download speed measurement

The library downloads a resource from speedUrl and estimates download speed using the amount of data received and elapsed time.

The result is expressed in Mbps and rounded to two decimal places. If a timeout occurs during a download, bytes received up to that point can still be used to estimate speed.

Connection quality

The measured speed is mapped to a quality category using the thresholds defined by getQuality().

The slow-connection notification is controlled by slowThresholdMbps.

Safe monitoring

Only one connectivity check runs at a time. Additional checks are queued rather than executed concurrently.

Network errors are handled internally, so checkNow() resolves with a status snapshot instead of rejecting because of a network failure.

⚠️ Important Notes
Data usage

The default speed test downloads approximately 500 KB every 30 seconds.

That can amount to roughly 60 MB per hour per open tab, depending on actual transfer sizes and browser behavior.

To reduce data usage, increase speedInterval or configure a smaller test resource through speedUrl.

Custom speed endpoints

Your custom speedUrl must return appropriate CORS headers. Otherwise, the browser may prevent the library from reading the response and calculating download speed.

Captive portals

A no-cors connectivity request cannot inspect the response status. A captive portal that responds to the request may therefore be mistaken for a working internet connection.

Browser compatibility

The library uses native ES modules and modern browser APIs. Network Information API properties are optional and depend on browser support.

Server-side rendering

The library is designed to be safe to import in SSR environments. Start monitoring in browser-only lifecycle hooks, such as React's useEffect or Vue's onMounted.

📝 License

MIT

📦 Links
View on NPM
Install with npm