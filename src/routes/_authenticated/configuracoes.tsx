import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  component: Configuracoes,
});

const chaves = [
  { chave: "webhook_ficha_hospede", label: "Webhook da Ficha de Hóspede" },
  { chave: "webhook_controle_consumo", label: "Webhook do Controle de Consumo" },
  { chave: "webhook_whatsapp", label: "Webhook de WhatsApp" },
  { chave: "webhook_email", label: "Webhook de E-mail" },
];

function Configuracoes() {
  const [vals, setVals] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const { role } = useAuth();
  const canEdit = role === "administrador";

  useEffect(() => {
    supabase.from("configuracoes_sistema").select("chave, valor").then(({ data }) => {
      const m: Record<string, string> = {};
      (data || []).forEach((r) => (m[r.chave] = r.valor || ""));
      setVals(m);
    });
  }, []);

  const salvar = async () => {
    setSaving(true);
    try {
      for (const { chave } of chaves) {
        await supabase.from("configuracoes_sistema").update({ valor: vals[chave] || null }).eq("chave", chave);
      }
      toast.success("Configurações salvas");
    } catch (e: any) {
      toast.error(e.message);
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="font-serif text-3xl">Configurações</h1>
        <p className="text-muted-foreground text-sm">URLs dos webhooks do n8n para automação de documentos</p>
      </div>
      <Card>
        <CardHeader><CardTitle className="font-serif">Webhooks do n8n</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {!canEdit && <div className="p-3 rounded-lg bg-muted/60 text-sm">Apenas administradores podem editar.</div>}
          {chaves.map(({ chave, label }) => (
            <div key={chave} className="space-y-1.5">
              <Label>{label}</Label>
              <Input
                placeholder="https://n8n.seudominio.com/webhook/..."
                value={vals[chave] || ""}
                onChange={(e) => setVals((s) => ({ ...s, [chave]: e.target.value }))}
                disabled={!canEdit}
              />
            </div>
          ))}
          {canEdit && (
            <Button onClick={salvar} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Salvar
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
