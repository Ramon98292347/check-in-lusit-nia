import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

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
  session: null;
  role: "administrador" | "funcionario" | null;
  loading: boolean;
  signInLocal: () => Promise<void>;
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
  const [user, setUser] = useState<AuthUser | null>(null);
  const [role, setRole] = useState<AuthCtx["role"]>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const localSession = readLocalSession();
    if (localSession) {
      setUser(localSession.user);
      setRole(localSession.role);
    }
    setLoading(false);
  }, []);

  return (
    <Ctx.Provider
      value={{
        user,
        session: null,
        role,
        loading,
        signInLocal: async () => {
          const localSession = {
            user: {
              id: "local-acesso-interno",
              username: "acesso-interno",
              nome: "Acesso interno",
              user_metadata: { nome: "Acesso interno" },
            },
            role: "administrador",
          } satisfies LocalSession;

          writeLocalSession(localSession);
          setUser(localSession.user);
          setRole(localSession.role);
          setLoading(false);
        },
        signOut: async () => {
          writeLocalSession(null);
          setUser(null);
          setRole(null);
        },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
