import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

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

const LOCAL_AUTH_STORAGE_KEY = "checkin-lusitania-auth-v3";
const INTERNAL_NOME = "Recepção";

function normalizeInternalUsername(username: string) {
  const normalized = username.trim().toLowerCase();
  if (normalized === "recepção") return "recepcao";
  return normalized;
}

function displayNameForInternalUser(username: string) {
  const normalized = normalizeInternalUsername(username);
  if (normalized === "admin") return "Admin";
  if (normalized === "recepcao") return "Recepção";
  return username.trim();
}

interface AuthCtx {
  user: AuthUser | null;
  session: null;
  role: "administrador" | "funcionario" | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  ensureInitialPassword: (username: string, password: string) => Promise<void>;
  hasInternalUser: (username: string) => Promise<boolean>;
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
  signIn: async () => {},
  ensureInitialPassword: async () => {},
  hasInternalUser: async () => false,
  signOut: async () => {},
});

async function hashPassword(password: string) {
  const bytes = new TextEncoder().encode(password);
  const buffer = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function createSessionFromUser(registro: { id: string; username: string; nome: string; role: "administrador" | "funcionario" }) {
  const localSession = {
    user: {
      id: registro.id,
      username: registro.username,
      nome: registro.nome,
      user_metadata: { nome: registro.nome },
    },
    role: registro.role,
  } satisfies LocalSession;

  writeLocalSession(localSession);
  return localSession;
}

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
        signIn: async (username: string, password: string) => {
          const usuario = normalizeInternalUsername(username);
          const senha = password.trim();

          if (!usuario || !senha) {
            throw new Error("Informe usuário e senha.");
          }

          const senhaHash = await hashPassword(senha);
          const { data, error } = await supabase
            .from("usuarios_internos")
            .select("id, username, nome, role, senha_hash, ativo")
            .eq("username", usuario)
            .maybeSingle();

          if (error) throw error;

          if (!data || !data.ativo) {
            throw new Error("Usuário ou senha inválidos.");
          }

          if (data.senha_hash !== senhaHash) {
            throw new Error("Usuário ou senha inválidos.");
          }

          const localSession = await createSessionFromUser(data);
          setUser(localSession.user);
          setRole(localSession.role);
          setLoading(false);
        },
        ensureInitialPassword: async (username: string, password: string) => {
          const usuario = normalizeInternalUsername(username);
          const senha = password.trim();

          if (!usuario || !senha) {
            throw new Error("Informe usuário e senha.");
          }

          const senhaHash = await hashPassword(senha);
          const { data: existente, error: errorExistente } = await supabase
            .from("usuarios_internos")
            .select("id, username, nome, role")
            .eq("username", usuario)
            .maybeSingle();

          if (errorExistente) throw errorExistente;

          if (existente) {
            const { error: updateError } = await supabase
              .from("usuarios_internos")
              .update({ senha_hash: senhaHash, ativo: true, nome: displayNameForInternalUser(usuario), role: "administrador" })
              .eq("username", usuario);

            if (updateError) throw updateError;
            return;
          }

          const { error: insertError } = await supabase.from("usuarios_internos").insert({
            username: usuario,
            nome: displayNameForInternalUser(usuario) || INTERNAL_NOME,
            role: "administrador",
            senha_hash: senhaHash,
            ativo: true,
          });

          if (insertError) throw insertError;
        },
        hasInternalUser: async (username: string) => {
          const usuario = normalizeInternalUsername(username);
          if (!usuario) return false;

          const { data, error } = await supabase
            .from("usuarios_internos")
            .select("id")
            .eq("username", usuario)
            .maybeSingle();

          if (error) throw error;
          return Boolean(data);
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
