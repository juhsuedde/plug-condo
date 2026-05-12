import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { MobileFrame } from "@/components/MobileFrame";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) return toast.error(error);
    toast.success("Bem-vindo de volta!");
    navigate({ to: "/" });
  };

  return (
    <MobileFrame>
      <div className="flex-1 flex flex-col p-7">
        <Link to="/" className="h-10 w-10 -ml-2 rounded-full grid place-items-center hover:bg-muted">
          <ArrowLeft size={20} />
        </Link>
        <div className="mt-6">
          <h1 className="text-3xl font-extrabold tracking-tight">Bem-vindo</h1>
          <p className="text-muted-foreground mt-1">Entre na sua conta Plug Condo</p>
        </div>

        <form onSubmit={submit} className="mt-8 space-y-4 flex-1 flex flex-col">
          <Field label="E-mail">
            <input
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="input" placeholder="seu@email.com"
            />
          </Field>
          <Field label="Senha">
            <input
              type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              className="input" placeholder="••••••••" minLength={6}
            />
          </Field>

          <div className="flex-1" />

          <button
            disabled={loading}
            className="bg-primary text-primary-foreground rounded-2xl h-14 font-semibold flex items-center justify-center gap-2 shadow-soft active:scale-[0.98] transition disabled:opacity-60"
          >
            {loading && <Loader2 size={18} className="animate-spin" />}
            Entrar
          </button>
          <p className="text-center text-sm text-muted-foreground">
            Não tem conta?{" "}
            <Link to="/register" search={{ role: "morador" }} className="text-primary font-semibold">Cadastre-se</Link>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[13px] font-medium text-muted-foreground ml-1">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
