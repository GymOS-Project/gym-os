import type * as React from "react";

export {};

declare global {
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

  interface AuthProviderProps {
    children: React.ReactNode;
  }
}
