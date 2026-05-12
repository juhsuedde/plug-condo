import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type UserRole = "morador" | "sindico";

export interface Perfil {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  cpf: string | null;
  avatar_url: string | null;
  role: UserRole;
  condominio_id: string | null;
  unidade: string | null;
  veiculo_marca: string | null;
  veiculo_modelo: string | null;
  veiculo_placa: string | null;
  status_aprovacao: "pendente" | "aprovado" | "rejeitado";
  motivo_rejeicao: string | null;
}

interface AuthCtx {
  user: User | null;
  session: Session | null;
  perfil: Perfil | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (data: SignUpInput) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refreshPerfil: () => Promise<void>;
}

export interface SignUpInput {
  nome: string;
  email: string;
  password: string;
  telefone: string;
  cpf: string;
  unidade: string;
  role: UserRole;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [loading, setLoading] = useState(true);

  const loadPerfil = async (uid: string) => {
    const { data } = await supabase.from("perfis").select("*").eq("id", uid).maybeSingle();
    setPerfil((data as Perfil) ?? null);
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        setTimeout(() => loadPerfil(s.user.id), 0);
      } else {
        setPerfil(null);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) loadPerfil(data.session.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn: AuthCtx["signIn"] = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? { error: error.message } : {};
  };

  const signUp: AuthCtx["signUp"] = async (input) => {
    const { error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          nome: input.nome,
          telefone: input.telefone,
          cpf: input.cpf,
          unidade: input.unidade,
          role: input.role,
        },
      },
    });
    return error ? { error: error.message } : {};
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setPerfil(null);
  };

  return (
    <Ctx.Provider
      value={{
        user, session, perfil, loading, signIn, signUp, signOut,
        refreshPerfil: async () => { if (user) await loadPerfil(user.id); },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used within AuthProvider");
  return c;
}
