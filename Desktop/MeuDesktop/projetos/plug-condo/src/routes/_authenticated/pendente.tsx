import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Clock, XCircle, LogOut, MessageSquare } from "lucide-react";
import { MobileFrame } from "@/components/MobileFrame";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/pendente")({
  component: PendentePage,
});

function PendentePage() {
  const { perfil } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  const handleContactSindico = () => {
    navigate({ to: "/sindico/contato" });
  };

  if (perfil?.status_aprovacao === "rejeitado") {
    return (
      <MobileFrame>
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <div className="h-24 w-24 rounded-full bg-red-100 dark:bg-red-900/20 grid place-items-center mb-6">
            <XCircle className="text-red-600" size={48} />
          </div>

          <h1 className="text-2xl font-bold mb-4">Cadastro não aprovado</h1>

          <p className="text-muted-foreground mb-6">
            Seu cadastro não foi aprovado.
          </p>

          {perfil.motivo_rejeicao && (
            <div className="bg-card p-4 rounded-2xl shadow-soft mb-6 w-full">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Motivo: </span>
                {perfil.motivo_rejeicao}
              </p>
            </div>
          )}

          <button
            onClick={handleContactSindico}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-full font-medium"
          >
            <MessageSquare size={18} />
            Entrar em contato com o síndico
          </button>

          <button
            onClick={handleLogout}
            className="mt-4 text-sm text-muted-foreground hover:text-foreground"
          >
            Sair da conta
          </button>
        </div>
      </MobileFrame>
    );
  }

  return (
    <MobileFrame>
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div className="h-24 w-24 rounded-full bg-primary-soft grid place-items-center mb-6">
          <Clock className="text-primary" size={48} />
        </div>

        <h1 className="text-2xl font-bold mb-4">Cadastro em análise</h1>

        <p className="text-muted-foreground mb-2">
          Seu cadastro está sendo analisado pelo síndico do condomínio. Você será notificado quando for aprovado.
        </p>

        <p className="text-sm text-muted-foreground mb-8">
          Isso geralmente leva até 24 horas.
        </p>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-6 py-3 bg-card shadow-soft rounded-full font-medium"
        >
          <LogOut size={18} />
          Sair da conta
        </button>
      </div>
    </MobileFrame>
  );
}