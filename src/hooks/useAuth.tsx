import type { Session } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";

export type PortalRole = "admin" | "staff" | "client" | null;

function normalizeApprovalStatus(status: string | null | undefined): string | null {
  if (!status) return null;
  const normalized = status.toLowerCase();
  if (normalized === "approved") return "Approved";
  if (normalized === "rejected") return "Rejected";
  if (normalized === "pending") return "Pending";
  return status;
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
  approvalStatus: string | null;
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
  const [approvalStatus, setApprovalStatus] = useState<string | null>(null);
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
      setApprovalStatus(null);
      setFullName("");
      setRoleLoading(false);
      return;
    }

    let cancelled = false;
    setRoleLoading(true);
    void (async () => {
      try {
        const metadata = session.user.user_metadata;
        const registration = metadata?.["client_registration"] as
          Record<string, string> | undefined;
        if (registration) {
          await (supabase as any).rpc("finalize_client_registration", {
            _full_name: registration.fullName,
            _phone: registration.phone,
            _address: registration.address,
            _city: registration.city,
            _state: registration.state,
          });
        }
        const [adminRes, staffRes, clientRes, profileRes] = await Promise.all([
          supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
          supabase.rpc("has_role", { _user_id: userId, _role: "staff" }),
          (supabase as any)
            .from("clients")
            .select("id, approval_status, full_name")
            .eq("auth_user_id", userId)
            .maybeSingle(),
          (supabase as any)
            .from("profiles")
            .select("full_name, approval_status, is_active")
            .eq("id", userId)
            .maybeSingle(),
        ]);

        if (cancelled) return;

        const admin = Boolean(adminRes.data);
        const staff = Boolean(staffRes.data);
        setIsAdmin(admin);
        setIsStaff(staff);
        setClientId(clientRes.data?.id ?? null);
        const clientApproval = normalizeApprovalStatus(clientRes.data?.approval_status);
        const profileApproval = normalizeApprovalStatus(profileRes.data?.approval_status);
        setClientStatus(clientApproval);
        setApprovalStatus(
          admin
            ? "Approved"
            : profileRes.data?.is_active === false
              ? "Inactive"
              : staff
                ? profileApproval
                : (clientApproval ?? profileApproval),
        );
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
          setApprovalStatus(null);
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
      approvalStatus,
      fullName,
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [
      session,
      loading,
      roleLoading,
      isAdmin,
      isStaff,
      role,
      clientId,
      clientStatus,
      approvalStatus,
      fullName,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}

export function homeRouteForRole(role: PortalRole): string {
  if (role === "client") return "/dashboard";
  if (role === "staff") return "/work";
  return "/dashboard";
}
