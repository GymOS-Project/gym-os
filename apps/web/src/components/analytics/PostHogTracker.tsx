import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { initPostHog, isPostHogEnabled, posthog } from "@/lib/posthog";

export default function PostHogTracker() {
  const location = useLocation();
  const { user, role, staff, selectedGymId, gyms } = useAuth();

  useEffect(() => {
    initPostHog();
  }, []);

  useEffect(() => {
    if (!isPostHogEnabled()) {
      return;
    }

    if (!user) {
      posthog.reset();
      return;
    }

    posthog.identify(user.id, {
      email: user.email,
      role,
      active_gym_id: selectedGymId === "all" ? null : selectedGymId,
      gym_count: gyms.length,
      staff_gym_id: staff?.gym_id ?? null,
    });
  }, [gyms.length, role, selectedGymId, staff?.gym_id, user]);

  useEffect(() => {
    if (!isPostHogEnabled()) {
      return;
    }

    posthog.capture("$pageview", {
      $current_url: window.location.href,
      pathname: location.pathname,
      search: location.search,
    });
  }, [location.pathname, location.search]);

  return null;
}
