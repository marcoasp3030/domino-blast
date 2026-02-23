import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "admin" | "marketing" | "readonly";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: { id: string; full_name: string | null; company_id: string } | null;
  companyId: string | null;
  role: AppRole | null;
  permissions: string[];
  loading: boolean;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  hasPermission: (perm: string) => boolean;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  companyId: null,
  role: null,
  permissions: [],
  loading: true,
  signOut: async () => {},
  isAdmin: false,
  hasPermission: () => false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AuthContextType["profile"]>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setTimeout(async () => {
            const [profileRes, roleRes, permsRes] = await Promise.all([
              supabase
                .from("profiles")
                .select("id, full_name, company_id")
                .eq("user_id", session.user.id)
                .single(),
              supabase
                .from("user_roles")
                .select("role")
                .eq("user_id", session.user.id)
                .single(),
              supabase
                .from("user_permissions")
                .select("permission")
                .eq("user_id", session.user.id),
            ]);
            setProfile(profileRes.data);
            setRole((roleRes.data?.role as AppRole) ?? null);
            setPermissions(permsRes.data?.map((p) => p.permission) ?? []);
            setLoading(false);
          }, 0);
        } else {
          setProfile(null);
          setRole(null);
          setPermissions([]);
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (!session) setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const isAdmin = role === "admin";
  const hasPermission = (perm: string) => isAdmin || permissions.includes(perm);

  return (
    <AuthContext.Provider value={{
      session, user, profile,
      companyId: profile?.company_id ?? null,
      role, permissions, loading, signOut,
      isAdmin, hasPermission,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
