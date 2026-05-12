import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Loader2, User, Building2 } from "lucide-react";
import { toast } from "sonner";
import { MobileFrame } from "@/components/MobileFrame";
import { useAuth, type UserRole } from "@/lib/auth";

export const Route = createFileRoute("/register")({
  validateSearch: (s: Record<string, unknown>) => ({ role: (s.role as UserRole) || "morador" }),
  component: RegisterPage,
});

function RegisterPage() {
  const { role: initialRole } = Route.useSearch();
  const { signUp, signIn } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState<UserRole>(initialRole);
  const [form, setForm] = useState({
    nome: "", email: "", password: "", telefone: "", cpf: "", unidade: "",
  });
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signUp({ ...form, role });
    if (error) { setLoading(false); return toast.error(error); }
    // auto-login (auto-confirm enabled)
    const { error: e2 } = await signIn(form.email, form.password);
    setLoading(false);
    if (e2) return toast.error(e2);
    toast.success("Conta criada!");
    navigate({ to: role === "sindico" ? "/sindico/dashboard" : "/morador/home" });
  };

  return (
    <MobileFrame>
      <div className="flex-1 flex flex-col p-7 overflow-y-auto">
        <Link to="/" className="h-10 w-10 -ml-2 rounded-full grid place-items-center hover:bg-muted">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-3xl font-extrabold tracking-tight mt-4">Criar conta</h1>
        <p className="text-muted-foreground mt-1">Selecione seu perfil para começar</p>

        <div className="grid grid-cols-2 gap-3 mt-6">
          {(["morador", "sindico"] as const).map((r) => {
            const active = role === r;
            const Icon = r === "morador" ? User : Building2;
            return (
              <button
                key={r} type="button" onClick={() => setRole(r)}
                className={`p-4 rounded-2xl border-2 text-left transition-all ${
                  active ? "border-primary bg-primary-soft" : "border-transparent bg-surface-2"
                }`}
              >
                <Icon size={20} className={active ? "text-primary" : "text-muted-foreground"} />
                <div className="font-semibold mt-2 capitalize">{r}</div>
              </button>
            );
          })}
        </div>

        <form onSubmit={submit} className="mt-6 space-y-3">
          <input className="input" required placeholder="Nome completo" value={form.nome} onChange={set("nome")} />
          <input className="input" required type="email" placeholder="E-mail" value={form.email} onChange={set("email")} />
          <input className="input" required placeholder="Telefone" value={form.telefone} onChange={set("telefone")} />
          <input className="input" required placeholder="CPF" value={form.cpf} onChange={set("cpf")} />
          <input className="input" required placeholder="Unidade (ex: A-101)" value={form.unidade} onChange={set("unidade")} />
          <input className="input" required type="password" minLength={6} placeholder="Senha (mín. 6 caracteres)" value={form.password} onChange={set("password")} />

          <button
            disabled={loading}
            className="w-full bg-primary text-primary-foreground rounded-2xl h-14 font-semibold flex items-center justify-center gap-2 shadow-soft active:scale-[0.98] transition disabled:opacity-60 mt-4"
          >
            {loading && <Loader2 size={18} className="animate-spin" />}
            Criar conta
          </button>
          <p className="text-center text-sm text-muted-foreground pt-2 pb-4">
            Já tem conta? <Link to="/login" className="text-primary font-semibold">Entrar</Link>
          </p>
        </form>
      </div>
      <style>{`
        .input { width:100%; height:52px; border-radius:16px; background:var(--surface-2); border:1px solid var(--input);
                 padding:0 16px; font-size:15px; outline:none; transition:border-color .2s, box-shadow .2s; }
        .input:focus { border-color:var(--ring); box-shadow:0 0 0 4px color-mix(in oklab, var(--ring) 18%, transparent); }
      `}</style>
    </MobileFrame>
  );
}
