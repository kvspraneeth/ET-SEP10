import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Suppress benign ResizeObserver loop errors from Recharts and flex animations
if (typeof window !== "undefined") {
  const resizeObserverErrRegex = /ResizeObserver loop (completed with undelivered notifications|limit exceeded)/i;
  
  const originalOnError = window.onerror;
  window.onerror = (message, source, lineno, colno, error) => {
    if (typeof message === "string" && resizeObserverErrRegex.test(message)) {
      return true; // Stop error from bubbling to error overlays
    }
    return originalOnError ? originalOnError(message, source, lineno, colno, error) : false;
  };

  window.addEventListener("error", (event) => {
    if (event.message && resizeObserverErrRegex.test(event.message)) {
      event.stopImmediatePropagation();
      event.preventDefault();
    }
  });

  window.addEventListener("unhandledrejection", (event) => {
    if (event.reason && resizeObserverErrRegex.test(String(event.reason))) {
      event.stopImmediatePropagation();
      event.preventDefault();
    }
  });

  // Register PWA Service Worker for Mobile Notifications & Offline Sync
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("PWA Service Worker registered with scope:", registration.scope);
        })
        .catch((err) => {
          console.warn("Service Worker registration failed:", err);
        });
    });
  }
}

createRoot(document.getElementById("root")!).render(<App />);
