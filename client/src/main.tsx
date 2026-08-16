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
}

createRoot(document.getElementById("root")!).render(<App />);
