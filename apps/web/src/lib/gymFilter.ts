export const GYM_FILTER_STORAGE_KEY = "gym-os.selectedGymId";

export function getStoredGymFilter() {
  if (typeof window === "undefined") {
    return "all";
  }

  return window.localStorage.getItem(GYM_FILTER_STORAGE_KEY) || "all";
}

export function setStoredGymFilter(gymId: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(GYM_FILTER_STORAGE_KEY, gymId);
}
