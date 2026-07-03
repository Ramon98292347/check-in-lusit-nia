import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate, formatBRL } from "@/utils/formatters";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ClipboardCheck, Loader2, Minus, Plus } from "lucide-react";
import { calcHospedagem } from "@/utils/calculations";
import { toast } from "sonner";
import { enviarEventoHospedagem } from "@/services/webhooksService";
import { payloadEventoHospedagem } from "@/utils/payloads";

export const Route = createFileRoute("/_authenticated/vistorias")({
  component: Vistorias,
});

function Vistorias() {
  const [rows, setRows] = useState<any[]>([]);
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const isDetalhe = /^\/vistorias\/[^/]+$/.test(pathname);

  const carregar = async () => {
    const { data } = await supabase
      .from("hospedagens")
      .select("id, acomodacao_id, checkin, checkout, status, qtd_diarias, valor_diaria, valor_pago, desconto, valor_total, valor_consumo, valor_danos, hospede:hospedes(nome), acomodacao:acomodacoes(nome)")
      .in("status", ["hospedado", "vistoria_pendente", "vistoria_realizada"])
      .order("checkout", { ascending: false });

    const hospedagens = data || [];
    const hospedagemIds = hospedagens.map((row) => row.id);

    let vistoriasPorHospedagem = new Map<string, any>();

    if (hospedagemIds.length > 0) {
      const { data: vistorias } = await supabase
        .from("vistorias")
        .select("id, hospedagem_id, criado_em, status, quarto_vistoriado, houve_consumo, houve_dano, valor_total_consumo, valor_dano")
        .in("hospedagem_id", hospedagemIds)
        .order("criado_em", { ascending: false });

      for (const vistoria of vistorias || []) {
        if (vistoria.hospedagem_id && !vistoriasPorHospedagem.has(vistoria.hospedagem_id)) {
          vistoriasPorHospedagem.set(vistoria.hospedagem_id, vistoria);
        }
      }
    }

    setRows(
      hospedagens.map((row) => ({
        ...row,
        vistoria: vistoriasPorHospedagem.get(row.id) || null,
      })),
    );
  };

  useEffect(() => {
    carregar();
  }, []);

  const proximaVistoria = rows.find((row) => ["hospedado", "vistoria_pendente"].includes(row.status));

  if (isDetalhe) {
    return <Outlet />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl">Vistorias</h1>
        <p className="text-muted-foreground text-sm">Abra o popup para lançar itens consumidos, danos e concluir a vistoria.</p>
      </div>
      <Card className="border-border/60 shadow-soft">
        <CardHeader><CardTitle className="font-serif text-xl">Atalho de vistoria</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Quando precisar agir na hora, use este atalho para abrir rapidamente a próxima vistoria pendente.
          </p>
          {proximaVistoria ? (
            <VistoriaPopup hospedagem={proximaVistoria} onSaved={carregar} />
          ) : (
            <Button type="button" variant="outline" disabled>Nenhuma vistoria pendente</Button>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Total: {rows.length}</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hóspede</TableHead>
                <TableHead>Acomodação</TableHead>
                <TableHead>Check-out</TableHead>
                <TableHead className="text-right">Valor total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.hospede?.nome}</TableCell>
                  <TableCell>{r.acomodacao?.nome}</TableCell>
                  <TableCell>{formatDate(r.checkout)}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatBRL(r.vistoria ? Number(r.vistoria.valor_total_consumo || 0) + Number(r.vistoria.valor_dano || 0) : Number(r.valor_total || 0))}
                  </TableCell>
                  <TableCell><StatusBadge status={r.status} /></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {["hospedado", "vistoria_pendente"].includes(r.status) ? (
                        <>
                          <VistoriaPopup hospedagem={r} onSaved={carregar} />
                          {r.vistoria && (
                            <Button asChild size="sm" variant="outline">
                              <Link to="/vistorias/$id" params={{ id: r.vistoria.id }}>Ver detalhes</Link>
                            </Button>
                          )}
                        </>
                      ) : (
                        r.vistoria ? (
                          <Button asChild size="sm" variant="outline">
                            <Link to="/vistorias/$id" params={{ id: r.vistoria.id }}>Ver detalhes</Link>
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" disabled>
                            Detalhes indisponíveis
                          </Button>
                        )
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function VistoriaPopup({ hospedagem, onSaved }: { hospedagem: any; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [quartoOk, setQuartoOk] = useState(true);
  const [houveConsumo, setHouveConsumo] = useState(false);
  const [houveDano, setHouveDano] = useState(false);
  const [descDano, setDescDano] = useState("");
  const [valorDano, setValorDano] = useState(0);
  const [obs, setObs] = useState("");
  const [qtds, setQtds] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    supabase
      .from("produtos_consumo")
      .select("*")
      .eq("ativo", true)
      .order("nome")
      .then(({ data }) => setProdutos(data || []));
  }, [open]);

  const totalConsumo = produtos.reduce((soma, produto) => {
    return soma + (qtds[produto.id] || 0) * Number(produto.valor_unitario);
  }, 0);

  const salvar = async () => {
    setSaving(true);
    try {
      const { data: vistoria, error } = await supabase
        .from("vistorias")
        .insert({
          hospedagem_id: hospedagem.id,
          acomodacao_id: hospedagem.acomodacao_id,
          quarto_vistoriado: quartoOk,
          houve_consumo: houveConsumo,
          houve_dano: houveDano,
          descricao_dano: houveDano ? descDano : null,
          valor_dano: houveDano ? valorDano : 0,
          observacoes: obs || null,
          valor_total_consumo: houveConsumo ? totalConsumo : 0,
          status: "concluida",
        })
        .select("id")
        .single();

      if (error) throw error;

      const itensConsumo = produtos
        .filter((produto) => (qtds[produto.id] || 0) > 0)
        .map((produto) => ({
          vistoria_id: vistoria.id,
          hospedagem_id: hospedagem.id,
          produto_id: produto.id,
          nome_produto: produto.nome,
          quantidade: qtds[produto.id],
          valor_unitario: produto.valor_unitario,
          valor_total: qtds[produto.id] * Number(produto.valor_unitario),
        }));

      if (itensConsumo.length > 0) {
        const { error: itensError } = await supabase.from("itens_vistoria").insert(itensConsumo);
        if (itensError) throw itensError;
      }

      const valor_consumo = houveConsumo ? totalConsumo : 0;
      const valor_danos = houveDano ? valorDano : 0;
      const calculo = calcHospedagem({
        qtdDiarias: hospedagem.qtd_diarias,
        valorDiaria: Number(hospedagem.valor_diaria),
        valorConsumo: valor_consumo,
        valorDanos: valor_danos,
        desconto: Number(hospedagem.desconto || 0),
        valorPago: Number(hospedagem.valor_pago || 0),
      });

      const { error: hospedagemError } = await supabase
        .from("hospedagens")
        .update({
          valor_consumo,
          valor_danos,
          valor_hospedagem: calculo.valor_hospedagem,
          valor_total: calculo.valor_total,
          saldo: calculo.saldo,
          status: "vistoria_realizada",
        })
        .eq("id", hospedagem.id);

      if (hospedagemError) throw hospedagemError;

      await enviarEventoHospedagem({
        hospedagem_id: hospedagem.id,
        evento: "mudanca_status",
        status: "vistoria_realizada",
        payload: payloadEventoHospedagem({
          evento: "mudanca_status",
          status: "vistoria_realizada",
          hospedagem: {
            ...hospedagem,
            valor_consumo,
            valor_danos,
            valor_hospedagem: calculo.valor_hospedagem,
            valor_total: calculo.valor_total,
            saldo: calculo.saldo,
          },
          itens: itensConsumo,
          extras: {
            status_anterior: hospedagem.status,
            status_novo: "vistoria_realizada",
            houve_consumo: houveConsumo,
            houve_dano: houveDano,
            descricao_dano: houveDano ? descDano : "",
            observacoes_vistoria: obs || "",
            origem_acao: "popup_vistorias",
          },
        }),
      });

      toast.success("Vistoria salva com sucesso.");
      setOpen(false);
      onSaved();
    } catch (e: any) {
      toast.error(e.message || "Não foi possível salvar a vistoria.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <ClipboardCheck className="mr-1 h-4 w-4" />
          Fazer vistoria
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">Vistoria da hospedagem</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg bg-muted/40 p-3 text-sm">
            <div><b>{hospedagem.hospede?.nome}</b> · {hospedagem.acomodacao?.nome}</div>
            <div className="text-muted-foreground">{formatDate(hospedagem.checkin)} → {formatDate(hospedagem.checkout)}</div>
          </div>

          <label className="flex items-center gap-2">
            <Checkbox checked={quartoOk} onCheckedChange={(v) => setQuartoOk(!!v)} />
            <span>Quarto foi vistoriado</span>
          </label>
          <label className="flex items-center gap-2">
            <Checkbox checked={houveConsumo} onCheckedChange={(v) => setHouveConsumo(!!v)} />
            <span>Houve consumo no quarto</span>
          </label>
          <label className="flex items-center gap-2">
            <Checkbox checked={houveDano} onCheckedChange={(v) => setHouveDano(!!v)} />
            <span>Houve dano</span>
          </label>

          {houveDano && (
            <div className="space-y-2 rounded-lg border p-3">
              <div>
                <Label>Descrição do dano</Label>
                <Textarea rows={2} value={descDano} onChange={(e) => setDescDano(e.target.value)} />
              </div>
              <div>
                <Label>Valor cobrado (R$)</Label>
                <Input type="number" step="0.01" value={valorDano} onChange={(e) => setValorDano(Number(e.target.value))} />
              </div>
            </div>
          )}

          {houveConsumo && (
            <div className="space-y-2">
              <div className="text-sm font-medium">Itens consumidos</div>
              <div className="grid gap-2">
                {produtos.map((produto) => {
                  const quantidade = qtds[produto.id] || 0;
                  const total = quantidade * Number(produto.valor_unitario);

                  return (
                    <Card key={produto.id}>
                      <CardContent className="pb-4 pt-4">
                        <div className="grid grid-cols-[1fr_auto] items-center gap-3">
                          <div className="min-w-0">
                            <div className="truncate font-medium">{produto.nome}</div>
                            <div className="text-xs text-muted-foreground">
                              {formatBRL(produto.valor_unitario)} · Total {formatBRL(total)}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              onClick={() => setQtds((estado) => ({ ...estado, [produto.id]: Math.max(0, (estado[produto.id] || 0) - 1) }))}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <div className="w-10 text-center font-medium">{quantidade}</div>
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              onClick={() => setQtds((estado) => ({ ...estado, [produto.id]: (estado[produto.id] || 0) + 1 }))}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              <div className="text-right font-medium">Total do consumo: {formatBRL(totalConsumo)}</div>
            </div>
          )}

          <div>
            <Label>Observações da vistoria</Label>
            <Textarea rows={2} value={obs} onChange={(e) => setObs(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={salvar} disabled={saving}>
            {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            Salvar vistoria
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
