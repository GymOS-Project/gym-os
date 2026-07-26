import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api } from "@/lib/api";
import { getStoredGymFilter, setStoredGymFilter } from "@/lib/gymFilter";

interface AuthUser {
  id: string;
  email: string;
}

interface AuthContextType {
  user: AuthUser | null;
  admin: Admin | null;
  staff: StaffAccount | null;
  role: SessionRole | null;
  gyms: Gym[];
  selectedGymId: string;
  selectedGym: Gym | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (data: FormData) => Promise<{ error: Error | null; authenticated: boolean }>;
  signOut: () => Promise<void>;
  refreshAdmin: () => Promise<void>;
  setSelectedGymId: (gymId: string) => void;
  hasSectionAccess: (section: string) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [staff, setStaff] = useState<StaffAccount | null>(null);
  const [role, setRole] = useState<SessionRole | null>(null);
  const [selectedGymId, setSelectedGymIdState] = useState(() => getStoredGymFilter());
  const [loading, setLoading] = useState(true);

  const gyms = admin?.gyms || [];
  const selectedGym = selectedGymId === "all"
    ? null
    : gyms.find((gym) => gym.id === selectedGymId) || null;

  const syncSelectedGym = (nextAdmin: Admin | null, nextStaff: StaffAccount | null, nextRole: SessionRole | null) => {
    const nextGyms = nextAdmin?.gyms || [];
    if (nextRole === 'staff' && nextStaff?.gym_id) {
      setStoredGymFilter(nextStaff.gym_id);
      setSelectedGymIdState(nextStaff.gym_id);
      return;
    }

    const stored = getStoredGymFilter();
    const hasStoredGym = stored !== "all" && nextGyms.some((gym) => gym.id === stored);
    const nextSelection = hasStoredGym ? stored : nextGyms.length > 1 ? "all" : nextGyms[0]?.id || "all";

    setStoredGymFilter(nextSelection);
    setSelectedGymIdState(nextSelection);
  };

  const setSelectedGymId = (gymId: string) => {
    if (role === 'staff') {
      return;
    }
    setStoredGymFilter(gymId);
    setSelectedGymIdState(gymId);
  };

  const hasSectionAccess = (section: string) => {
    if (role === 'admin') {
      return true;
    }

    return Boolean(staff?.section_permissions.includes(section));
  };

  useEffect(() => {
    api.me()
      .then(({ user, admin, staff, role, authenticated }) => {
        if (authenticated && user) {
          setUser(user);
          setAdmin(admin);
          setStaff(staff);
          setRole(role);
          syncSelectedGym(admin, staff, role);
        } else {
          setUser(null);
          setAdmin(null);
          setStaff(null);
          setRole(null);
          syncSelectedGym(null, null, null);
        }
      })
      .catch(() => {
        setUser(null);
        setAdmin(null);
        setStaff(null);
        setRole(null);
        syncSelectedGym(null, null, null);
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
      setStaff(result.staff);
      setRole(result.role);
      syncSelectedGym(result.admin, result.staff, result.role);
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
        setStaff(result.staff);
        setRole(result.role);
        syncSelectedGym(result.admin, result.staff, result.role);
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
    setStaff(null);
    setRole(null);
    syncSelectedGym(null, null, null);
  };

  const refreshAdmin = async () => {
    if (!user) return;
    const result = await api.me().catch(() => null);
    if (result) {
      setAdmin(result.admin);
      setStaff(result.staff);
      setRole(result.role);
      syncSelectedGym(result.admin, result.staff, result.role);
    }
  };

  return (
    <AuthContext.Provider value={{ user, admin, staff, role, gyms, selectedGymId, selectedGym, loading, signIn, signUp, signOut, refreshAdmin, setSelectedGymId, hasSectionAccess }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
