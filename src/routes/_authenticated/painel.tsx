import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/utils/formatters";
import { ClipboardList, Copy, ExternalLink, Share2 } from "lucide-react";
import { usePreCadastroAutoRefresh } from "@/hooks/usePreCadastroAutoRefresh";

export const Route = createFileRoute("/_authenticated/painel")({
  component: Painel,
});

function Painel() {
  const [stats, setStats] = useState({
    hoje: 0,
    total: 0,
    pendentes: 0,
    impressosHoje: 0,
  });
  const [proximosCadastros, setProximosCadastros] = useState<any[]>([]);
  const [publicUrl, setPublicUrl] = useState("/precadastro");
  const [copied, setCopied] = useState(false);

  const carregar = useCallback(async () => {
    const hoje = new Date().toISOString().slice(0, 10);
    const inicioHoje = `${hoje}T00:00:00`;

    const [total, hojeCadastros, pendentes, impressosHoje] = await Promise.all([
      supabase.from("hospedagens").select("id", { count: "exact", head: true }).eq("origem", "pre_cadastro"),
      supabase
        .from("hospedagens")
        .select("id", { count: "exact", head: true })
        .eq("origem", "pre_cadastro")
        .gte("criado_em", inicioHoje),
      supabase
        .from("hospedagens")
        .select("id", { count: "exact", head: true })
        .eq("origem", "pre_cadastro")
        .eq("status_impressao", "PENDENTE_IMPRESSAO"),
      supabase
        .from("hospedagens")
        .select("id", { count: "exact", head: true })
        .eq("origem", "pre_cadastro")
        .eq("status_impressao", "IMPRESSO")
        .gte("impresso_em", inicioHoje),
    ]);
    setStats({
      hoje: hojeCadastros.count || 0,
      total: total.count || 0,
      pendentes: pendentes.count || 0,
      impressosHoje: impressosHoje.count || 0,
    });

    const { data: proximos } = await supabase
      .from("hospedagens")
      .select("id, checkin, checkout, criado_em, status_impressao, impresso_em, hospede:hospedes(nome), acomodacao:acomodacoes(nome), acomodacao_texto")
      .eq("origem", "pre_cadastro")
      .gte("criado_em", inicioHoje)
      .order("criado_em", { ascending: false })
      .limit(5);
    setProximosCadastros(proximos || []);
  }, []);

  useEffect(() => {
    void carregar();

    if (typeof window !== "undefined") {
      setPublicUrl(`${window.location.origin}/precadastro`);
    }
  }, [carregar]);

  usePreCadastroAutoRefresh({ onRefresh: carregar });

  const copiarLink = async () => {
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const compartilharLink = async () => {
    if (navigator.share) {
      await navigator.share({
        title: "Pré-cadastro Pousada Lusitânia",
        text: "Abra o formulário público de pré-cadastro.",
        url: publicUrl,
      });
      return;
    }

    await copiarLink();
  };

  const cards = [
    { label: "Cadastros hoje", value: stats.hoje, icon: ClipboardList, color: "text-amber-600" },
    { label: "Total de cadastros", value: stats.total, icon: ClipboardList, color: "text-sky-600" },
    { label: "Pendentes de impressão", value: stats.pendentes, icon: ClipboardList, color: "text-orange-600" },
    { label: "Impressos hoje", value: stats.impressosHoje, icon: ClipboardList, color: "text-emerald-600" },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <div>
        <h1 className="font-serif text-3xl">Painel</h1>
        <p className="text-muted-foreground text-sm">Visão geral de hoje na pousada</p>
      </div>
      <Card className="border-border/60 shadow-soft md:hidden">
        <CardContent className="space-y-3 pt-6">
          <div className="text-sm text-muted-foreground">
            Acessos rápidos para o cadastro público.
          </div>
          <div className="grid grid-cols-1 gap-2">
            <Button asChild className="w-full justify-center">
              <Link to="/precadastro">
                <ExternalLink className="h-4 w-4" />
                Criar cadastro
              </Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              className={`w-full justify-center transition ${copied ? "border-primary bg-primary/10 text-primary shadow-sm" : ""}`}
              onClick={copiarLink}
            >
              <Copy className="h-4 w-4" />
              {copied ? "Copiado!" : "Copiar link"}
            </Button>
            <Button type="button" variant="outline" className="w-full justify-center" onClick={compartilharLink}>
              <Share2 className="h-4 w-4" />
              Compartilhar
            </Button>
          </div>
        </CardContent>
      </Card>
      <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
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

      <div className="grid w-full gap-4">
        <ListaRapida titulo="Nova Ficha de Hóspede" itens={proximosCadastros} />
      </div>
    </div>
  );
}

function ListaRapida({ titulo, itens }: { titulo: string; itens: any[] }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base font-serif">{titulo}</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {itens.length === 0 && <p className="text-sm text-muted-foreground">Nenhum item.</p>}
        {itens.map((h) => (
          <Link
            key={h.id}
            to="/precadastros/$id"
            params={{ id: h.id }}
            className={`block rounded-lg border p-3 transition ${
              (h.status_impressao || "PENDENTE_IMPRESSAO") === "IMPRESSO"
                ? "border-emerald-200 bg-emerald-50 hover:bg-emerald-100"
                : "bg-card hover:bg-muted/40"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-medium truncate">{h.hospede?.nome || "—"}</div>
                <div className="text-xs text-muted-foreground truncate">{h.acomodacao_texto || h.acomodacao?.nome || "—"} · {formatDate(h.checkin)} → {formatDate(h.checkout)}</div>
                <div className="text-xs text-muted-foreground">Recebido hoje</div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    (h.status_impressao || "PENDENTE_IMPRESSAO") === "IMPRESSO"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-primary/10 text-primary"
                  }`}
                >
                  {(h.status_impressao || "PENDENTE_IMPRESSAO") === "IMPRESSO" ? "Impresso" : "Abrir ficha"}
                </span>
                {(h.status_impressao || "PENDENTE_IMPRESSAO") === "IMPRESSO" && h.impresso_em && (
                  <span className="text-[11px] text-emerald-700/80">Impresso em {formatDate(h.impresso_em)}</span>
                )}
              </div>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              Toque para abrir os dados completos da ficha.
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
