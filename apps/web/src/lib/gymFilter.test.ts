import { afterEach, describe, expect, it } from "vitest";

import { GYM_FILTER_STORAGE_KEY, getStoredGymFilter, setStoredGymFilter } from "./gymFilter";

const originalWindow = globalThis.window;

function setTestWindow(value: unknown) {
  Object.defineProperty(globalThis, "window", {
    value,
    configurable: true,
  });
}

describe("gym filter storage", () => {
  afterEach(() => {
    setTestWindow(originalWindow);
  });

  it("defaults to all without a browser window", () => {
    setTestWindow(undefined);
    expect(getStoredGymFilter()).toBe("all");
  });

  it("stores selected gym ids in localStorage", () => {
    const store = new Map<string, string>();
    setTestWindow({
      localStorage: {
        getItem: (key: string) => store.get(key) || null,
        setItem: (key: string, value: string) => store.set(key, value),
      },
    });

    setStoredGymFilter("gym-1");

    expect(store.get(GYM_FILTER_STORAGE_KEY)).toBe("gym-1");
    expect(getStoredGymFilter()).toBe("gym-1");
  });
});
