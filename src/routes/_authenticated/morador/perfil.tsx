import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Car, Bell, LogOut, Settings, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { brl } from "@/lib/format";
import { format, parseISO } from "date-fns";

export const Route = createFileRoute("/_authenticated/morador/perfil")({
  component: PerfilPage,
});

function PerfilPage() {
  const { perfil, signOut, refreshPerfil } = useAuth();
  const navigate = useNavigate();
  const [notif, setNotif] = useState(true);
  const [vehicle, setVehicle] = useState({
    veiculo_marca: perfil?.veiculo_marca ?? "",
    veiculo_modelo: perfil?.veiculo_modelo ?? "",
    veiculo_placa: perfil?.veiculo_placa ?? "",
  });
  const [editing, setEditing] = useState(false);

  const txQ = useQuery({
    queryKey: ["minhas-tx", perfil?.id],
    enabled: !!perfil?.id,
    queryFn: async () => (await supabase.from("transacoes").select("*").eq("perfil_id", perfil!.id).order("created_at", { ascending: false }).limit(20)).data || [],
  });

  const saveVehicle = async () => {
    await supabase.from("perfis").update(vehicle).eq("id", perfil!.id);
    await refreshPerfil();
    setEditing(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  return (
    <div className="px-5 pt-8 pb-6 space-y-5">
      <h1 className="text-2xl font-extrabold tracking-tight">Perfil</h1>

      <div className="bg-card rounded-3xl p-5 shadow-soft flex items-center gap-4">
        <div className="h-16 w-16 rounded-full bg-primary text-primary-foreground grid place-items-center text-2xl font-bold">
          {perfil?.nome?.[0]?.toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="font-bold text-lg truncate">{perfil?.nome}</div>
          <div className="text-sm text-muted-foreground">Unidade {perfil?.unidade}</div>
          <div className="text-xs text-muted-foreground truncate">{perfil?.email}</div>
        </div>
      </div>

      <section className="bg-card rounded-2xl p-5 shadow-soft">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 font-semibold"><Car size={16} /> Meu veículo</div>
          <button onClick={() => editing ? saveVehicle() : setEditing(true)} className="text-primary text-sm font-semibold">
            {editing ? "Salvar" : "Editar"}
          </button>
        </div>
        {editing ? (
          <div className="space-y-2">
            <input className="input" placeholder="Marca" value={vehicle.veiculo_marca} onChange={(e) => setVehicle({ ...vehicle, veiculo_marca: e.target.value })} />
            <input className="input" placeholder="Modelo" value={vehicle.veiculo_modelo} onChange={(e) => setVehicle({ ...vehicle, veiculo_modelo: e.target.value })} />
            <input className="input" placeholder="Placa" value={vehicle.veiculo_placa} onChange={(e) => setVehicle({ ...vehicle, veiculo_placa: e.target.value })} />
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            {perfil?.veiculo_marca || perfil?.veiculo_modelo
              ? `${perfil.veiculo_marca ?? ""} ${perfil.veiculo_modelo ?? ""} · ${perfil.veiculo_placa ?? ""}`
              : "Adicione seu veículo"}
          </div>
        )}
      </section>

      <section className="bg-card rounded-2xl p-5 shadow-soft">
        <div className="font-semibold mb-3">Histórico de pagamentos</div>
        {(txQ.data || []).length === 0 && <p className="text-sm text-muted-foreground">Nenhum pagamento ainda.</p>}
        <div className="space-y-2">
          {(txQ.data || []).slice(0, 5).map((t: any) => (
            <div key={t.id} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{format(parseISO(t.created_at), "dd/MM/yyyy")}</span>
              <span className="font-semibold">{brl(Number(t.valor_total))}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-card rounded-2xl shadow-soft overflow-hidden">
        <Item icon={<Bell size={18} />} label="Notificações" right={
          <button onClick={() => setNotif((v) => !v)} className={`w-11 h-6 rounded-full transition ${notif ? "bg-primary" : "bg-muted"}`}>
            <span className={`block h-5 w-5 bg-white rounded-full shadow transition-transform ${notif ? "translate-x-5" : "translate-x-0.5"}`} />
          </button>
        } />
        <div className="border-t" />
        <Item icon={<Settings size={18} />} label="Configurações" right={<ChevronRight size={16} className="text-muted-foreground" />} />
      </section>

      <button onClick={handleSignOut} className="w-full h-12 rounded-2xl bg-card text-destructive font-semibold flex items-center justify-center gap-2 shadow-soft">
        <LogOut size={16} /> Sair
      </button>
      <style>{`
        .input { width:100%; height:46px; border-radius:12px; background:var(--surface-2); border:1px solid var(--input);
                 padding:0 14px; font-size:14px; outline:none; }
        .input:focus { border-color:var(--ring); }
      `}</style>
    </div>
  );
}

function Item({ icon, label, right }: { icon: React.ReactNode; label: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-5 py-4">
      <span className="text-muted-foreground">{icon}</span>
      <span className="flex-1 text-sm font-medium">{label}</span>
      {right}
    </div>
  );
}
