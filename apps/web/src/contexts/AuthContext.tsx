import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Admin } from '@/types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  admin: Admin | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, adminData: { gym_name: string; owner_name: string; phone?: string; address?: string }) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshAdmin: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAdmin = async (userId: string) => {
    const { data } = await supabase
      .from('admins')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    setAdmin(data);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchAdmin(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      (async () => {
        if (session?.user) {
          await fetchAdmin(session.user.id);
        } else {
          setAdmin(null);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUp = async (
    email: string,
    password: string,
    adminData: { gym_name: string; owner_name: string; phone?: string; address?: string }
  ) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error as Error };
    if (data.user) {
      const { error: adminError } = await supabase.from('admins').insert({
        user_id: data.user.id,
        ...adminData,
      });
      if (adminError) return { error: adminError as unknown as Error };
    }
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setAdmin(null);
  };

  const refreshAdmin = async () => {
    if (user) await fetchAdmin(user.id);
  };

  return (
    <AuthContext.Provider value={{ user, session, admin, loading, signIn, signUp, signOut, refreshAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
