import { createFileRoute, Link, useParams, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Separator } from "@/components/ui/separator";
import { formatBRL, formatDate } from "@/utils/formatters";
import { ArrowLeft, Loader2, Pencil, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { calcHospedagem } from "@/utils/calculations";

export const Route = createFileRoute("/_authenticated/vistorias/$id")({
  component: DetalhesVistoria,
});

function DetalhesVistoria() {
  const { id } = useParams({ from: "/_authenticated/vistorias/$id" });
  const [vistoria, setVistoria] = useState<any>(null);
  const [itens, setItens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const navigate = useNavigate();

  const carregar = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    const { data: vistoriaBase, error: vistoriaError } = await supabase
      .from("vistorias")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (vistoriaError) {
      setVistoria(null);
      setItens([]);
      setErrorMessage(vistoriaError.message);
      setLoading(false);
      return;
    }

    if (!vistoriaBase) {
      setVistoria(null);
      setItens([]);
      setErrorMessage("Vistoria não encontrada.");
      setLoading(false);
      return;
    }

    let hospedagemCompleta = null;

    if (vistoriaBase.hospedagem_id) {
      const { data: hospedagem } = await supabase
        .from("hospedagens")
        .select("*")
        .eq("id", vistoriaBase.hospedagem_id)
        .maybeSingle();

      if (hospedagem) {
        const [{ data: hospede }, { data: acomodacao }] = await Promise.all([
          hospedagem.hospede_id
            ? supabase.from("hospedes").select("*").eq("id", hospedagem.hospede_id).maybeSingle()
            : Promise.resolve({ data: null }),
          hospedagem.acomodacao_id
            ? supabase.from("acomodacoes").select("*").eq("id", hospedagem.acomodacao_id).maybeSingle()
            : Promise.resolve({ data: null }),
        ]);

        hospedagemCompleta = {
          ...hospedagem,
          hospede,
          acomodacao,
        };
      }
    }

    setVistoria({
      ...vistoriaBase,
      hospedagem: hospedagemCompleta,
    });

    const { data: itensData } = await supabase
      .from("itens_vistoria")
      .select("*")
      .eq("vistoria_id", id)
      .order("criado_em", { ascending: true });

    setItens(itensData || []);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  if (loading) {
    return (
      <div className="p-8 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!vistoria) {
    return (
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm">
          <Link to="/vistorias">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Voltar
          </Link>
        </Button>
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            {errorMessage || "Vistoria não encontrada."}
          </CardContent>
        </Card>
      </div>
    );
  }

  const hospedagem = vistoria.hospedagem;
  const valorConsumo = Number(vistoria.valor_total_consumo || 0);
  const valorDano = Number(vistoria.valor_dano || 0);
  const totalVistoria = valorConsumo + valorDano;

  const excluirVistoria = async () => {
    try {
      await supabase.from("itens_vistoria").delete().eq("vistoria_id", vistoria.id);
      const { error } = await supabase.from("vistorias").delete().eq("id", vistoria.id);
      if (error) throw error;

      if (vistoria.hospedagem_id) {
        const valorHospedagem = Number(hospedagem?.valor_hospedagem || 0);
        const desconto = Number(hospedagem?.desconto || 0);
        const valorPago = Number(hospedagem?.valor_pago || 0);
        const calc = calcHospedagem({
          qtdDiarias: hospedagem?.qtd_diarias,
          valorDiaria: Number(hospedagem?.valor_diaria || 0),
          valorConsumo: 0,
          valorDanos: 0,
          desconto,
          valorPago,
        });

        await supabase.from("hospedagens").update({
          valor_consumo: 0,
          valor_danos: 0,
          valor_hospedagem: valorHospedagem || calc.valor_hospedagem,
          valor_total: valorHospedagem - desconto,
          saldo: (valorHospedagem - desconto) - valorPago,
          status: "vistoria_pendente",
        }).eq("id", vistoria.hospedagem_id);
      }

      toast.success("Vistoria excluída com sucesso.");
      navigate({ to: "/vistorias" });
    } catch (e: any) {
      toast.error(e.message || "Não foi possível excluir a vistoria.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link to="/vistorias">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Voltar
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl">Detalhes da vistoria</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>{hospedagem?.hospede?.nome || "Hóspede"}</span>
            <span>·</span>
            <span>{hospedagem?.acomodacao?.nome || "Acomodação"}</span>
            <span>·</span>
            <StatusBadge status={hospedagem?.status || vistoria.status} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <EditarVistoriaDialog vistoria={vistoria} itens={itens} hospedagem={hospedagem} onSaved={carregar} />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline">
                <Trash2 className="h-4 w-4 mr-1" />
                Excluir
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir vistoria</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação remove a vistoria e seus itens lançados.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={excluirVistoria}>Excluir</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          {hospedagem?.id ? (
            <Button asChild variant="outline">
              <Link to="/hospedagens/$id" params={{ id: hospedagem.id }}>
                Abrir hospedagem
              </Link>
            </Button>
          ) : (
            <Button variant="outline" disabled>
              Hospedagem indisponível
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-serif">Resumo da vistoria</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm md:grid-cols-2">
            <Info label="Hóspede" value={hospedagem?.hospede?.nome} />
            <Info label="Acomodação" value={hospedagem?.acomodacao?.nome} />
            <Info label="Check-in" value={formatDate(hospedagem?.checkin)} />
            <Info label="Check-out" value={formatDate(hospedagem?.checkout)} />
            <Info label="Vistoria criada em" value={formatDate(vistoria.criado_em)} />
            <Info label="Quarto vistoriado" value={vistoria.quarto_vistoriado ? "Sim" : "Não"} />
            <Info label="Houve consumo" value={vistoria.houve_consumo ? "Sim" : "Não"} />
            <Info label="Houve dano" value={vistoria.houve_dano ? "Sim" : "Não"} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-serif">Totais da vistoria</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            <Row label="Consumo" value={formatBRL(valorConsumo)} />
            <Row label="Danos" value={formatBRL(valorDano)} />
            <Separator className="my-2" />
            <Row label="Total da vistoria" value={formatBRL(totalVistoria)} bold />
          </CardContent>
        </Card>
      </div>

      {vistoria.descricao_dano && (
        <Card>
          <CardHeader>
            <CardTitle className="font-serif">Descrição do dano</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {vistoria.descricao_dano}
          </CardContent>
        </Card>
      )}

      {vistoria.observacoes && (
        <Card>
          <CardHeader>
            <CardTitle className="font-serif">Observações da vistoria</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {vistoria.observacoes}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="font-serif">Planilha de gastos da vistoria</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="px-3 py-2 font-medium">Descrição</th>
                <th className="px-3 py-2 font-medium text-center">Qtd.</th>
                <th className="px-3 py-2 font-medium text-right">Unitário</th>
                <th className="px-3 py-2 font-medium text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((item) => (
                <tr key={item.id} className="border-b last:border-0">
                  <td className="px-3 py-2">{item.nome_produto || "Item"}</td>
                  <td className="px-3 py-2 text-center">{item.quantidade || 0}</td>
                  <td className="px-3 py-2 text-right">{formatBRL(item.valor_unitario)}</td>
                  <td className="px-3 py-2 text-right font-medium">{formatBRL(item.valor_total)}</td>
                </tr>
              ))}
              {vistoria.houve_dano && (
                <tr className="border-b last:border-0">
                  <td className="px-3 py-2">{vistoria.descricao_dano || "Dano lançado"}</td>
                  <td className="px-3 py-2 text-center">1</td>
                  <td className="px-3 py-2 text-right">{formatBRL(vistoria.valor_dano)}</td>
                  <td className="px-3 py-2 text-right font-medium">{formatBRL(vistoria.valor_dano)}</td>
                </tr>
              )}
              {itens.length === 0 && !vistoria.houve_dano && (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">
                    Nenhum gasto foi lançado nesta vistoria.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} className="px-3 py-3 text-right font-semibold">Total geral</td>
                <td className="px-3 py-3 text-right font-semibold">{formatBRL(totalVistoria)}</td>
              </tr>
            </tfoot>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function Info({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{value || "—"}</div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "text-base font-semibold" : ""}`}>
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}

function EditarVistoriaDialog({
  vistoria,
  itens,
  hospedagem,
  onSaved,
}: {
  vistoria: any;
  itens: any[];
  hospedagem: any;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [quartoOk, setQuartoOk] = useState(!!vistoria.quarto_vistoriado);
  const [houveConsumo, setHouveConsumo] = useState(!!vistoria.houve_consumo);
  const [houveDano, setHouveDano] = useState(!!vistoria.houve_dano);
  const [descricaoDano, setDescricaoDano] = useState(vistoria.descricao_dano || "");
  const [valorDano, setValorDano] = useState(Number(vistoria.valor_dano || 0));
  const [observacoes, setObservacoes] = useState(vistoria.observacoes || "");
  const [linhas, setLinhas] = useState(
    itens.map((item) => ({
      id: item.id,
      nome_produto: item.nome_produto || "",
      quantidade: Number(item.quantidade || 0),
      valor_unitario: Number(item.valor_unitario || 0),
    })),
  );

  const salvar = async () => {
    setSaving(true);
    try {
      const itensNormalizados = linhas.map((linha) => ({
        ...linha,
        valor_total: Number(linha.quantidade || 0) * Number(linha.valor_unitario || 0),
      }));
      const totalConsumo = houveConsumo
        ? itensNormalizados.reduce((acc, linha) => acc + linha.valor_total, 0)
        : 0;
      const danos = houveDano ? valorDano : 0;

      const { error: vistoriaError } = await supabase.from("vistorias").update({
        quarto_vistoriado: quartoOk,
        houve_consumo: houveConsumo,
        houve_dano: houveDano,
        descricao_dano: houveDano ? descricaoDano : null,
        valor_dano: danos,
        observacoes: observacoes || null,
        valor_total_consumo: totalConsumo,
      }).eq("id", vistoria.id);
      if (vistoriaError) throw vistoriaError;

      for (const item of itensNormalizados) {
        await supabase.from("itens_vistoria").update({
          nome_produto: item.nome_produto,
          quantidade: item.quantidade,
          valor_unitario: item.valor_unitario,
          valor_total: item.valor_total,
        }).eq("id", item.id);
      }

      if (hospedagem?.id) {
        const calc = calcHospedagem({
          qtdDiarias: hospedagem.qtd_diarias,
          valorDiaria: Number(hospedagem.valor_diaria || 0),
          valorConsumo: totalConsumo,
          valorDanos: danos,
          desconto: Number(hospedagem.desconto || 0),
          valorPago: Number(hospedagem.valor_pago || 0),
        });

        await supabase.from("hospedagens").update({
          valor_consumo: totalConsumo,
          valor_danos: danos,
          valor_hospedagem: calc.valor_hospedagem,
          valor_total: calc.valor_total,
          saldo: calc.saldo,
        }).eq("id", hospedagem.id);
      }

      toast.success("Vistoria atualizada com sucesso.");
      setOpen(false);
      onSaved();
    } catch (e: any) {
      toast.error(e.message || "Não foi possível atualizar a vistoria.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Pencil className="h-4 w-4 mr-1" />
          Editar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif">Editar vistoria</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <label className="flex items-center gap-2">
            <Checkbox checked={quartoOk} onCheckedChange={(v) => setQuartoOk(!!v)} />
            <span>Quarto vistoriado</span>
          </label>
          <label className="flex items-center gap-2">
            <Checkbox checked={houveConsumo} onCheckedChange={(v) => setHouveConsumo(!!v)} />
            <span>Houve consumo</span>
          </label>
          <label className="flex items-center gap-2">
            <Checkbox checked={houveDano} onCheckedChange={(v) => setHouveDano(!!v)} />
            <span>Houve dano</span>
          </label>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="md:col-span-2"><Label>Descrição do dano</Label><Textarea rows={2} value={descricaoDano} onChange={(e) => setDescricaoDano(e.target.value)} /></div>
            <div><Label>Valor do dano</Label><Input type="number" step="0.01" value={valorDano} onChange={(e) => setValorDano(Number(e.target.value))} /></div>
            <div className="md:col-span-2"><Label>Observações</Label><Textarea rows={2} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} /></div>
          </div>

          <div className="space-y-3">
            <div className="font-medium text-sm">Itens da planilha</div>
            {linhas.map((linha, index) => (
              <div key={linha.id} className="grid gap-2 rounded-lg border p-3 md:grid-cols-4">
                <div><Label>Descrição</Label><Input value={linha.nome_produto} onChange={(e) => setLinhas((estado) => estado.map((item, i) => i === index ? { ...item, nome_produto: e.target.value } : item))} /></div>
                <div><Label>Qtd.</Label><Input type="number" value={linha.quantidade} onChange={(e) => setLinhas((estado) => estado.map((item, i) => i === index ? { ...item, quantidade: Number(e.target.value) } : item))} /></div>
                <div><Label>Unitário</Label><Input type="number" step="0.01" value={linha.valor_unitario} onChange={(e) => setLinhas((estado) => estado.map((item, i) => i === index ? { ...item, valor_unitario: Number(e.target.value) } : item))} /></div>
                <div><Label>Total</Label><Input value={formatBRL(linha.quantidade * linha.valor_unitario)} disabled /></div>
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={salvar} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
