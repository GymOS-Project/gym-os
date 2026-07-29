import posthog from "posthog-js";

const posthogKey = import.meta.env.VITE_POSTHOG_KEY;
const posthogHost = import.meta.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com";

let initialized = false;

export function isPostHogEnabled() {
  return Boolean(posthogKey);
}

export function initPostHog() {
  if (initialized || !posthogKey || typeof window === "undefined") {
    return;
  }

  posthog.init(posthogKey, {
    api_host: posthogHost,
    autocapture: true,
    capture_pageleave: true,
    capture_pageview: false,
    loaded: (instance) => {
      if (import.meta.env.DEV) {
        instance.debug();
      }
    },
  });

  initialized = true;
}

export { posthog };
