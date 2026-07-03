import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

export type AuthUser = {
  id: string;
  username: string;
  nome: string;
  user_metadata?: {
    nome?: string;
  };
};

type LocalSession = {
  user: AuthUser;
  role: "administrador" | "funcionario";
};

const LOCAL_AUTH_STORAGE_KEY = "checkin-lusitania-local-auth";

interface AuthCtx {
  user: AuthUser | null;
  session: Session | null;
  role: "administrador" | "funcionario" | null;
  loading: boolean;
  signInLocal: (params: { username: string; password: string }) => Promise<void>;
  signOut: () => Promise<void>;
}

function readLocalSession(): LocalSession | null {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(LOCAL_AUTH_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as LocalSession;
  } catch {
    window.localStorage.removeItem(LOCAL_AUTH_STORAGE_KEY);
    return null;
  }
}

function writeLocalSession(session: LocalSession | null) {
  if (typeof window === "undefined") return;

  if (!session) {
    window.localStorage.removeItem(LOCAL_AUTH_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(LOCAL_AUTH_STORAGE_KEY, JSON.stringify(session));
}

const Ctx = createContext<AuthCtx>({
  user: null,
  session: null,
  role: null,
  loading: true,
  signInLocal: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [role, setRole] = useState<AuthCtx["role"]>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const localSession = readLocalSession();
    if (localSession) {
      setUser(localSession.user);
      setRole(localSession.role);
    }

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      const storedSession = readLocalSession();

      if (storedSession && s?.user) {
        setUser(storedSession.user);
        setRole(storedSession.role);
      } else if (storedSession && !s?.user) {
        writeLocalSession(null);
        setUser(null);
        setRole(null);
      } else if (s?.user) {
        setUser({
          id: s.user.id,
          username: "acesso-interno",
          nome: s.user.user_metadata?.nome ?? "Acesso interno",
          user_metadata: { nome: s.user.user_metadata?.nome ?? "Acesso interno" },
        });
        setTimeout(() => {
          supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", s.user.id)
            .maybeSingle()
            .then(({ data }) => setRole((data?.role as any) ?? "funcionario"));
        }, 0);
      } else {
        setUser(null);
        setRole(null);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      const storedSession = readLocalSession();

      if (storedSession && data.session?.user) {
        setUser(storedSession.user);
        setRole(storedSession.role);
      } else if (storedSession && !data.session?.user) {
        writeLocalSession(null);
        setUser(null);
        setRole(null);
      } else if (data.session?.user) {
        setUser({
          id: data.session.user.id,
          username: "acesso-interno",
          nome: data.session.user.user_metadata?.nome ?? "Acesso interno",
          user_metadata: { nome: data.session.user.user_metadata?.nome ?? "Acesso interno" },
        });
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.session.user.id)
          .maybeSingle()
          .then(({ data: r }) => setRole((r?.role as any) ?? "funcionario"));
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <Ctx.Provider
      value={{
        user,
        session,
        role,
        loading,
        signInLocal: async ({ username, password }) => {
          const normalizedUsername = username.trim().toLowerCase();
          const { data: matchedUser, error: loginError } = await supabase.rpc("validar_login_interno", {
            p_username: normalizedUsername,
            p_password: password,
          });

          if (loginError) {
            throw loginError;
          }

          const internalUser = matchedUser?.[0];

          if (!internalUser) {
            throw new Error("Usuario ou senha invalidos.");
          }

          const { data, error } = await supabase.auth.signInAnonymously({
            options: {
              data: {
                nome: internalUser.nome,
                username: internalUser.username,
                origem: "acesso-interno",
              },
            },
          });

          if (error) {
            throw error;
          }

          const localSession = {
            user: {
              id: data.user?.id ?? internalUser.id,
              username: internalUser.username,
              nome: internalUser.nome,
              user_metadata: { nome: internalUser.nome },
            },
            role: internalUser.role,
          } satisfies LocalSession;

          writeLocalSession(localSession);
          setSession(data.session ?? null);
          setUser(localSession.user);
          setRole(localSession.role);
          setLoading(false);
        },
        signOut: async () => {
          writeLocalSession(null);
          setSession(null);
          setUser(null);
          setRole(null);
          await supabase.auth.signOut();
        },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
