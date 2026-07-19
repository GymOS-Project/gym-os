import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api } from "@/lib/api";
import { getStoredGymFilter, setStoredGymFilter } from "@/lib/gymFilter";
import type { Admin, Gym } from "@/types";

interface AuthUser {
  id: string;
  email: string;
}

interface AuthContextType {
  user: AuthUser | null;
  admin: Admin | null;
  gyms: Gym[];
  selectedGymId: string;
  selectedGym: Gym | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (data: FormData) => Promise<{ error: Error | null; authenticated: boolean }>;
  signOut: () => Promise<void>;
  refreshAdmin: () => Promise<void>;
  setSelectedGymId: (gymId: string) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [selectedGymId, setSelectedGymIdState] = useState(() => getStoredGymFilter());
  const [loading, setLoading] = useState(true);

  const gyms = admin?.gyms || [];
  const selectedGym = selectedGymId === "all"
    ? null
    : gyms.find((gym) => gym.id === selectedGymId) || null;

  const syncSelectedGym = (nextAdmin: Admin | null) => {
    const nextGyms = nextAdmin?.gyms || [];
    const stored = getStoredGymFilter();
    const hasStoredGym = stored !== "all" && nextGyms.some((gym) => gym.id === stored);
    const nextSelection = hasStoredGym ? stored : nextGyms.length > 1 ? "all" : nextGyms[0]?.id || "all";

    setStoredGymFilter(nextSelection);
    setSelectedGymIdState(nextSelection);
  };

  const setSelectedGymId = (gymId: string) => {
    setStoredGymFilter(gymId);
    setSelectedGymIdState(gymId);
  };

  useEffect(() => {
    api.me()
      .then(({ user, admin, authenticated }) => {
        if (authenticated && user) {
          setUser(user);
          setAdmin(admin);
          syncSelectedGym(admin);
        } else {
          setUser(null);
          setAdmin(null);
          syncSelectedGym(null);
        }
      })
      .catch(() => {
        setUser(null);
        setAdmin(null);
        syncSelectedGym(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const result = await api.login(email, password);
      if (!result.authenticated || !result.user) {
        return { error: new Error(result.message || "Login failed") };
      }
      setUser(result.user);
      setAdmin(result.admin);
      syncSelectedGym(result.admin);
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signUp = async (data: FormData) => {
    try {
      const result = await api.signup(data);

      if (result.authenticated && result.user) {
        setUser(result.user);
        setAdmin(result.admin);
        syncSelectedGym(result.admin);
      }

      return { error: null, authenticated: result.authenticated };
    } catch (err) {
      return { error: err as Error, authenticated: false };
    }
  };

  const signOut = async () => {
    await api.signout().catch(() => {});
    setUser(null);
    setAdmin(null);
    syncSelectedGym(null);
  };

  const refreshAdmin = async () => {
    if (!user) return;
    const result = await api.me().catch(() => null);
    if (result) {
      setAdmin(result.admin);
      syncSelectedGym(result.admin);
    }
  };

  return (
    <AuthContext.Provider value={{ user, admin, gyms, selectedGymId, selectedGym, loading, signIn, signUp, signOut, refreshAdmin, setSelectedGymId }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
