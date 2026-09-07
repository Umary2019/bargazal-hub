import type { Session, User } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";

export type PortalRole = "admin" | "staff" | "client" | null;

async function ensureProfile(user: User) {
  const email = user.email ?? "";
  const fullName = user.user_metadata?.["full_name"] ?? user.email?.split("@")[0] ?? "User";

  try {
    await supabase
      .from("profiles")
      .upsert({ id: user.id, email, full_name: fullName }, { onConflict: "id" });
  } catch (error) {
    console.warn("Profile bootstrap failed:", error);
  }
}

type AuthState = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  roleLoading: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  role: PortalRole;
  clientId: string | null;
  clientStatus: string | null;
  fullName: string;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roleLoading, setRoleLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isStaff, setIsStaff] = useState(false);
  const [role, setRole] = useState<PortalRole>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [clientStatus, setClientStatus] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");

  useEffect(() => {
    try {
      const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
        setSession(nextSession);
        setLoading(false);
      });

      supabase.auth
        .getSession()
        .then(({ data }) => {
          setSession(data.session);
          setLoading(false);
        })
        .catch((error) => {
          console.warn("Auth session lookup failed:", error);
          setLoading(false);
        });

      return () => sub.subscription.unsubscribe();
    } catch (error) {
      console.warn("Auth initialization failed:", error);
      setLoading(false);
      return;
    }
  }, []);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) {
      setIsAdmin(false);
      setIsStaff(false);
      setRole(null);
      setClientId(null);
      setClientStatus(null);
      setFullName("");
      setRoleLoading(false);
      return;
    }

    void ensureProfile(session.user);

    let cancelled = false;
    setRoleLoading(true);
    void (async () => {
      try {
        const [adminRes, staffRes, clientRes, profileRes] = await Promise.all([
          supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
          supabase.rpc("has_role", { _user_id: userId, _role: "staff" }),
          supabase
            .from("clients")
            .select("id, approval_status, full_name")
            .eq("user_id", userId)
            .maybeSingle(),
          supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle(),
        ]);

        if (cancelled) return;

        const admin = Boolean(adminRes.data);
        const staff = Boolean(staffRes.data);
        setIsAdmin(admin);
        setIsStaff(staff);
        setClientId(clientRes.data?.id ?? null);
        setClientStatus(clientRes.data?.approval_status ?? null);
        setRole(admin ? "admin" : staff ? "staff" : clientRes.data ? "client" : null);
        setFullName(
          profileRes.data?.full_name ?? clientRes.data?.full_name ?? session?.user?.email ?? "",
        );
      } catch (error) {
        if (!cancelled) {
          console.warn("Role lookup failed:", error);
          setIsAdmin(false);
          setIsStaff(false);
          setRole(null);
          setFullName(session?.user?.email ?? "");
        }
      } finally {
        if (!cancelled) setRoleLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session?.user?.id, session?.user?.email]);

  const value = useMemo<AuthState>(
    () => ({
      user: session?.user ?? null,
      session,
      loading,
      roleLoading,
      isAdmin,
      isStaff,
      role,
      clientId,
      clientStatus,
      fullName,
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [session, loading, roleLoading, isAdmin, isStaff, role, clientId, clientStatus, fullName],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}

export function homeRouteForRole(role: PortalRole): string {
  if (role === "client") return "/portal";
  if (role === "staff") return "/staff";
  return "/dashboard";
}
