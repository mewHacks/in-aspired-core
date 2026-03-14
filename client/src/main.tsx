// Application entry point — mounts the React root and wraps with BrowserRouter
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./styles/tailwind.css";
import "./styles/globals.css";
import "./styles/animations.css";
import "./i18n"; // Import i18n configuration to initialize it
import { ThemeProvider } from "./contexts/ThemeContext";

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <BrowserRouter>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </BrowserRouter>
);

// Register Service Worker for PWA and Push Notifications
if ('serviceWorker' in navigator) { // Check if service worker is supported
  window.addEventListener('load', () => {

    // Register service worker
    navigator.serviceWorker.register('/sw.js')
      .then(registration => { // Handle registration success
        console.log('[SW] Registered successfully:', registration.scope);
      })
      .catch(error => { // Handle registration failure
        console.log('[SW] Registration failed:', error);
      });
  });
}