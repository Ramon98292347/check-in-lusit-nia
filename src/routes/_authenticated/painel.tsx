import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate } from "@/utils/formatters";
import { ClipboardList, LogIn, BedDouble, LogOut, ClipboardCheck, ShoppingBasket, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/painel")({
  component: Painel,
});

function Painel() {
  const [stats, setStats] = useState({ pre: 0, ins: 0, hosp: 0, outs: 0, vist: 0, cons: 0 });
  const [proximosCheckin, setProximosCheckin] = useState<any[]>([]);
  const [checkoutsHoje, setCheckoutsHoje] = useState<any[]>([]);
  const [vistoriasPend, setVistoriasPend] = useState<any[]>([]);

  useEffect(() => {
    const hoje = new Date().toISOString().slice(0, 10);

    (async () => {
      const [pre, ins, hosp, outs, vist, cons] = await Promise.all([
        supabase.from("hospedagens").select("id", { count: "exact", head: true }).eq("status", "pre_cadastro"),
        supabase.from("hospedagens").select("id", { count: "exact", head: true }).eq("checkin", hoje).in("status", ["pre_cadastro", "checkin_confirmado"]),
        supabase.from("hospedagens").select("id", { count: "exact", head: true }).eq("status", "hospedado"),
        supabase.from("hospedagens").select("id", { count: "exact", head: true }).eq("checkout", hoje).in("status", ["hospedado", "vistoria_pendente", "vistoria_realizada"]),
        supabase.from("hospedagens").select("id", { count: "exact", head: true }).in("status", ["hospedado", "vistoria_pendente"]).lte("checkout", hoje),
        supabase.from("itens_vistoria").select("id", { count: "exact", head: true }).gte("criado_em", hoje),
      ]);
      setStats({
        pre: pre.count || 0,
        ins: ins.count || 0,
        hosp: hosp.count || 0,
        outs: outs.count || 0,
        vist: vist.count || 0,
        cons: cons.count || 0,
      });

      const { data: proximos } = await supabase
        .from("hospedagens")
        .select("id, checkin, checkout, status, hospede:hospedes(nome), acomodacao:acomodacoes(nome)")
        .gte("checkin", hoje)
        .in("status", ["pre_cadastro", "checkin_confirmado"])
        .order("checkin").limit(5);
      setProximosCheckin(proximos || []);

      const { data: outsData } = await supabase
        .from("hospedagens")
        .select("id, checkin, checkout, status, hospede:hospedes(nome), acomodacao:acomodacoes(nome)")
        .eq("checkout", hoje).limit(5);
      setCheckoutsHoje(outsData || []);

      const { data: vistData } = await supabase
        .from("hospedagens")
        .select("id, checkin, checkout, status, hospede:hospedes(nome), acomodacao:acomodacoes(nome)")
        .in("status", ["hospedado", "vistoria_pendente"]).lte("checkout", hoje).limit(5);
      setVistoriasPend(vistData || []);
    })();
  }, []);

  const cards = [
    { label: "Pré-cadastros pendentes", value: stats.pre, icon: ClipboardList, color: "text-amber-600" },
    { label: "Check-ins de hoje", value: stats.ins, icon: LogIn, color: "text-primary" },
    { label: "Hóspedes hospedados", value: stats.hosp, icon: BedDouble, color: "text-forest" },
    { label: "Check-outs de hoje", value: stats.outs, icon: LogOut, color: "text-blue-600" },
    { label: "Vistorias pendentes", value: stats.vist, icon: ClipboardCheck, color: "text-orange-600" },
    { label: "Consumos lançados hoje", value: stats.cons, icon: ShoppingBasket, color: "text-accent" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl">Painel</h1>
        <p className="text-muted-foreground text-sm">Visão geral de hoje na pousada</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {cards.map((c) => (
          <Card key={c.label} className="shadow-soft">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">{c.label}</div>
                  <div className="text-3xl font-serif mt-1">{c.value}</div>
                </div>
                <c.icon className={`h-8 w-8 ${c.color} opacity-80`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <ListaRapida titulo="Próximos check-ins" itens={proximosCheckin} acao="Confirmar check-in" />
        <ListaRapida titulo="Check-outs do dia" itens={checkoutsHoje} acao="Ver detalhes" />
        <ListaRapida titulo="Vistorias pendentes" itens={vistoriasPend} acao="Fazer vistoria" />
      </div>
    </div>
  );
}

function ListaRapida({ titulo, itens, acao }: { titulo: string; itens: any[]; acao: string }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base font-serif">{titulo}</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {itens.length === 0 && <p className="text-sm text-muted-foreground">Nenhum item.</p>}
        {itens.map((h) => (
          <div key={h.id} className="p-3 rounded-lg border bg-card hover:bg-muted/40 transition">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-medium truncate">{h.hospede?.nome || "—"}</div>
                <div className="text-xs text-muted-foreground truncate">{h.acomodacao?.nome} · {formatDate(h.checkin)} → {formatDate(h.checkout)}</div>
                <div className="mt-1"><StatusBadge status={h.status} /></div>
              </div>
              <Button asChild size="sm" variant="ghost">
                <Link to="/hospedagens/$id" params={{ id: h.id }}>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="mt-2">
              <Button asChild size="sm" variant="outline" className="w-full">
                <Link to="/hospedagens/$id" params={{ id: h.id }}>{acao}</Link>
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
