import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Zap, ArrowRight, Building2 } from "lucide-react";
import { useEffect } from "react";
import { MobileFrame } from "@/components/MobileFrame";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const { user, perfil, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user && perfil) {
      navigate({ to: perfil.role === "sindico" ? "/sindico/dashboard" : "/morador/home" });
    }
  }, [loading, user, perfil, navigate]);

  return (
    <MobileFrame>
      <div className="relative flex-1 flex flex-col p-7">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary-soft/60 via-background to-background" />
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-2 mt-2"
        >
          <div className="h-11 w-11 rounded-2xl bg-primary text-primary-foreground grid place-items-center shadow-soft">
            <Zap size={22} strokeWidth={2.6} />
          </div>
          <span className="font-bold text-lg tracking-tight">Plug Condo</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mt-16"
        >
          <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight">
            Charge smart.<br />
            <span className="text-primary">Live better.</span>
          </h1>
          <p className="mt-4 text-muted-foreground text-[15px] leading-relaxed">
            A gestão inteligente de carregadores elétricos do seu condomínio, na palma da sua mão.
          </p>
        </motion.div>

        <div className="mt-auto space-y-3">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <Link
              to="/register"
              search={{ role: "morador" }}
              className="group flex items-center justify-between w-full bg-primary text-primary-foreground px-6 py-5 rounded-3xl shadow-soft active:scale-[0.98] transition-transform"
            >
              <div className="text-left">
                <div className="text-[11px] uppercase tracking-wider opacity-80">Sou</div>
                <div className="text-xl font-bold">Morador</div>
              </div>
              <div className="h-10 w-10 rounded-full bg-primary-foreground/15 grid place-items-center group-hover:translate-x-1 transition-transform">
                <ArrowRight size={18} />
              </div>
            </Link>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
            <Link
              to="/register"
              search={{ role: "sindico" }}
              className="group flex items-center justify-between w-full bg-card border px-6 py-5 rounded-3xl shadow-soft active:scale-[0.98] transition-transform"
            >
              <div className="text-left flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-accent-soft text-accent grid place-items-center">
                  <Building2 size={18} />
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Sou</div>
                  <div className="text-xl font-bold">Síndico</div>
                </div>
              </div>
              <ArrowRight size={18} className="text-muted-foreground group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>

          <p className="text-center text-sm text-muted-foreground pt-3">
            Já tem conta?{" "}
            <Link to="/login" className="text-primary font-semibold">Entrar</Link>
          </p>
        </div>
      </div>
    </MobileFrame>
  );
}
