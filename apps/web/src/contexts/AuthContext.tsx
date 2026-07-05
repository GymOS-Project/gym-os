import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api } from "@/lib/api";
import type { Admin } from "@/types";

interface AuthUser {
  id: string;
  email: string;
}

interface AuthContextType {
  user: AuthUser | null;
  admin: Admin | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (
    email: string,
    password: string,
    adminData: { gym_name: string; owner_name: string; phone?: string; address?: string }
  ) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshAdmin: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) { setLoading(false); return; }
    api.me()
      .then(({ user, admin }) => { setUser(user); setAdmin(admin); })
      .catch(() => { localStorage.removeItem("access_token"); })
      .finally(() => setLoading(false));
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const result = await api.login(email, password);
      localStorage.setItem("access_token", result.session.access_token);
      setUser(result.user);
      setAdmin(result.admin);
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    adminData: { gym_name: string; owner_name: string; phone?: string; address?: string }
  ) => {
    try {
      await api.signup(email, password, adminData);
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signOut = async () => {
    await api.signout().catch(() => {});
    localStorage.removeItem("access_token");
    setUser(null);
    setAdmin(null);
  };

  const refreshAdmin = async () => {
    if (!user) return;
    const result = await api.me().catch(() => null);
    if (result) setAdmin(result.admin);
  };

  return (
    <AuthContext.Provider value={{ user, admin, loading, signIn, signUp, signOut, refreshAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
