import type { Session, User } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";

async function ensureProfile(user: User) {
  const email = user.email ?? "";
  const fullName = user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "User";

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
  isAdmin: boolean;
  fullName: string;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
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
      // Never let a backend/config failure blank the whole app.
      console.warn("Auth initialization failed:", error);
      setLoading(false);
      return;
    }
  }, []);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) {
      setIsAdmin(false);
      setFullName("");
      return;
    }

    void ensureProfile(session.user);

    let cancelled = false;
    void (async () => {
      try {
        const [roleRes, profileRes] = await Promise.all([
          supabase.rpc("has_role", { _user_id: userId, _role: "admin" }).catch((error) => {
            console.warn("Role check failed:", error);
            return { data: false, error } as const;
          }),
          supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle(),
        ]);

        if (cancelled) return;

        const hasRole =
          roleRes && typeof roleRes === "object" && "data" in roleRes
            ? Boolean(roleRes.data)
            : false;

        setIsAdmin(hasRole);
        setFullName(profileRes.data?.full_name ?? session?.user?.email ?? "");
      } catch (error) {
        if (!cancelled) {
          setIsAdmin(false);
          setFullName(session?.user?.email ?? "");
        }
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
      isAdmin,
      fullName,
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [session, loading, isAdmin, fullName],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
