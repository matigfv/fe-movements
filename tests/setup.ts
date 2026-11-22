import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/es";

dayjs.extend(relativeTime);
dayjs.locale("es");

import "@testing-library/jest-dom";
import { act } from "@testing-library/react";
import { message, notification } from "antd";
import { afterEach, vi } from "vitest";
import i18n from "../src/i18n/config";

// Deterministic language for tests regardless of jsdom's navigator locale — matches the app's
// own default (Spanish) rather than whatever the language detector happens to pick up.
await i18n.changeLanguage("es");

// Mock window.env for all tests
Object.defineProperty(window, "env", {
  value: {
    backend: {
      api: "http://localhost:8080",
      websocketUrl: "http://localhost:8080",
    },
    keycloak: {
      clientId: "test-client",
      realm: "test-realm",
      url: "http://localhost:8180",
    },
  },
  writable: true,
});

// Polyfill ResizeObserver — not available in jsdom but required by Ant Design
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Polyfill window.matchMedia — not available in jsdom but required by Ant Design Grid (Row/Col)
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// antd's static `notification` and `message` render in their own React root outside Testing Library's
// tree. Destroy them and let their pending scheduler work flush while jsdom is alive; otherwise it
// runs after teardown ("ReferenceError: window is not defined"). Only pays the cost when one is present.
afterEach(async () => {
  if (
    typeof document === "undefined" ||
    !document.querySelector(".ant-notification, .ant-message")
  ) {
    return;
  }
  await act(async () => {
    notification.destroy();
    message.destroy();
    // Fake timers would hang a real timeout; destroying is all we can do in that case.
    if (!vi.isFakeTimers()) await new Promise((resolve) => setTimeout(resolve, 100));
  });
});
