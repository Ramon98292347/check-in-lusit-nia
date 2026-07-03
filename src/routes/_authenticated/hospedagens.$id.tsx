import { createFileRoute, useParams, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate, formatBRL, formatCPF, formatPhone } from "@/utils/formatters";
import { calcHospedagem } from "@/utils/calculations";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import {
  LogIn, ClipboardCheck, ShoppingBasket, LogOut, FileText,
  MessageSquare, Mail, Minus, Plus, ArrowLeft, Loader2,
  Pencil, Trash2,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { payloadFichaHospede, payloadControleConsumo, payloadEventoHospedagem } from "@/utils/payloads";
import { enviarEventoHospedagem, enviarWebhook } from "@/services/webhooksService";

export const Route = createFileRoute("/_authenticated/hospedagens/$id")({
  component: Detalhes,
});

function Detalhes() {
  const { id } = useParams({ from: "/_authenticated/hospedagens/$id" });
  const [h, setH] = useState<any>(null);
  const [itens, setItens] = useState<any[]>([]);
  const [historico, setHistorico] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const { role } = useAuth();
  const navigate = useNavigate();

  const carregar = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    const { data: hospedagem, error: hospedagemError } = await supabase
      .from("hospedagens")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (hospedagemError) {
      setH(null);
      setItens([]);
      setErrorMessage(hospedagemError.message);
      setLoading(false);
      return;
    }

    if (!hospedagem) {
      setH(null);
      setItens([]);
      setErrorMessage("Hospedagem não encontrada.");
      setLoading(false);
      return;
    }

    const [{ data: hospede }, { data: acomodacao }, { data: acompanhantes }, { data: it }] = await Promise.all([
      hospedagem.hospede_id
        ? supabase.from("hospedes").select("*").eq("id", hospedagem.hospede_id).maybeSingle()
        : Promise.resolve({ data: null }),
      hospedagem.acomodacao_id
        ? supabase.from("acomodacoes").select("*").eq("id", hospedagem.acomodacao_id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.from("acompanhantes").select("*").eq("hospedagem_id", id).order("criado_em", { ascending: true }),
      supabase.from("itens_vistoria").select("*").eq("hospedagem_id", id).order("criado_em", { ascending: true }),
    ]);

    setH({
      ...hospedagem,
      hospede,
      acomodacao,
      acompanhantes: acompanhantes || [],
    });
    setItens(it || []);

    if (hospedagem.hospede_id) {
      const { data: historicoData } = await supabase
        .from("hospedagens")
        .select("id, checkin, checkout, status, valor_total, adultos, criancas, acomodacao:acomodacoes(nome)")
        .eq("hospede_id", hospedagem.hospede_id)
        .order("checkin", { ascending: false });
      setHistorico(historicoData || []);
    } else {
      setHistorico([]);
    }

    setLoading(false);
  }, [id]);

  useEffect(() => { carregar(); }, [carregar]);

  if (loading) return <div className="p-8 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div>;

  if (!h) {
    return (
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm"><Link to="/hospedagens"><ArrowLeft className="h-4 w-4 mr-1" />Voltar</Link></Button>
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            {errorMessage || "Não foi possível carregar esta hospedagem."}
          </CardContent>
        </Card>
      </div>
    );
  }

  const confirmarPreCadastro = async () => {
    const { error } = await supabase.from("hospedagens").update({ status: "checkin_confirmado" }).eq("id", id);
    if (error) return toast.error(error.message);
    await enviarEventoHospedagem({
      hospedagem_id: h.id,
      evento: "mudanca_status",
      status: "checkin_confirmado",
      payload: payloadEventoHospedagem({
        evento: "mudanca_status",
        status: "checkin_confirmado",
        hospedagem: h,
        extras: {
          status_anterior: h.status,
          status_novo: "checkin_confirmado",
          origem_acao: "detalhes_hospedagem",
        },
      }),
    });
    toast.success("Pré-cadastro confirmado");
    carregar();
  };

  const confirmarCheckin = async () => {
    const { error: e1 } = await supabase.from("hospedagens").update({ status: "hospedado" }).eq("id", id);
    if (e1) return toast.error(e1.message);
    if (h.acomodacao_id) await supabase.from("acomodacoes").update({ status: "ocupado" }).eq("id", h.acomodacao_id);
    await enviarEventoHospedagem({
      hospedagem_id: h.id,
      evento: "mudanca_status",
      status: "hospedado",
      payload: payloadEventoHospedagem({
        evento: "mudanca_status",
        status: "hospedado",
        hospedagem: h,
        extras: {
          status_anterior: h.status,
          status_novo: "hospedado",
          origem_acao: "detalhes_hospedagem",
        },
      }),
    });
    toast.success("Check-in confirmado");
    carregar();
  };

  const enviarFicha = async (canal: "whatsapp" | "email") => {
    try {
      await enviarWebhook({
        hospedagem_id: h.id,
        tipo_documento: "ficha_hospede",
        canal,
        chave_webhook: canal === "whatsapp" ? "webhook_whatsapp" : "webhook_ficha_hospede",
        payload: payloadFichaHospede(h, canal),
      });
      toast.success("Documento enviado com sucesso para automação.");
    } catch (e: any) {
      toast.error("Não foi possível enviar o documento. Verifique a configuração do webhook.");
    }
  };

  const enviarConsumoDoc = async (canal: "whatsapp" | "email") => {
    try {
      await enviarWebhook({
        hospedagem_id: h.id,
        tipo_documento: "controle_consumo",
        canal,
        chave_webhook: canal === "whatsapp" ? "webhook_whatsapp" : "webhook_controle_consumo",
        payload: payloadControleConsumo(h, itens, canal),
      });
      toast.success("Documento enviado com sucesso para automação.");
    } catch {
      toast.error("Não foi possível enviar o documento. Verifique a configuração do webhook.");
    }
  };

  const excluirHospedagem = async () => {
    try {
      await supabase.from("itens_vistoria").delete().eq("hospedagem_id", h.id);
      await supabase.from("vistorias").delete().eq("hospedagem_id", h.id);
      await supabase.from("pagamentos").delete().eq("hospedagem_id", h.id);
      await supabase.from("acompanhantes").delete().eq("hospedagem_id", h.id);

      const { error } = await supabase.from("hospedagens").delete().eq("id", h.id);
      if (error) throw error;

      if (h.hospede_id) {
        const { count } = await supabase
          .from("hospedagens")
          .select("id", { count: "exact", head: true })
          .eq("hospede_id", h.hospede_id);

        if (!count) {
          await supabase.from("hospedes").delete().eq("id", h.hospede_id);
        }
      }

      toast.success("Hospedagem excluída com sucesso.");
      navigate({ to: "/hospedagens" });
    } catch (e: any) {
      toast.error(e.message || "Não foi possível excluir a hospedagem.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm"><Link to="/hospedagens"><ArrowLeft className="h-4 w-4 mr-1" />Voltar</Link></Button>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-sm text-muted-foreground">Detalhes da hospedagem</div>
          <h1 className="font-serif text-3xl">{h.hospede?.nome || "Hóspede"}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-muted-foreground">
            <span>{h.acomodacao?.nome}</span>·
            <span>{formatDate(h.checkin)} → {formatDate(h.checkout)}</span>·
            <StatusBadge status={h.status} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <EditarHospedagemDialog hospedagem={h} onSaved={carregar} />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline">
                <Trash2 className="h-4 w-4 mr-1" />
                Excluir
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir hospedagem</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação remove a hospedagem, acompanhantes, pagamentos, vistorias e itens vinculados.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={excluirHospedagem}>Excluir</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          {h.status === "pre_cadastro" && (
            <Button onClick={confirmarPreCadastro}><FileText className="h-4 w-4 mr-1" />Confirmar pré-cadastro</Button>
          )}
          {h.status === "checkin_confirmado" && (
            <Button onClick={confirmarCheckin}><LogIn className="h-4 w-4 mr-1" />Realizar Check-in</Button>
          )}
          {(h.status === "hospedado" || h.status === "vistoria_pendente") && (
            <VistoriaDialog hospedagem={h} onSaved={carregar} />
          )}
          {h.status === "vistoria_realizada" && (
            <FechamentoDialog hospedagem={h} onSaved={carregar} isAdmin={role === "administrador"} />
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle className="font-serif">Dados da hospedagem</CardTitle></CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <Info label="Acomodação" value={h.acomodacao?.nome} />
            <Info label="Check-in" value={formatDate(h.checkin)} />
            <Info label="Check-out" value={formatDate(h.checkout)} />
            <Info label="Adultos / Crianças" value={`${h.adultos || 0} / ${h.criancas || 0}`} />
            <Info label="Quantidade de diárias" value={h.qtd_diarias} />
            <Info label="Status da hospedagem" value={h.status ? h.status.replaceAll("_", " ") : "—"} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="font-serif">Dados do hóspede</CardTitle></CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-3 text-sm">
            <Info label="Nome" value={h.hospede?.nome} />
            <Info label="CPF" value={formatCPF(h.hospede?.cpf)} />
            <Info label="Nascimento" value={formatDate(h.hospede?.nascimento)} />
            <Info label="Telefone" value={formatPhone(h.hospede?.telefone)} />
            <Info label="E-mail" value={h.hospede?.email} />
            <Info label="Placa" value={h.hospede?.placa_veiculo} />
            <Info label="Endereço" value={h.hospede?.endereco} />
            <Info label="Cidade/UF" value={`${h.hospede?.cidade || "—"} / ${h.hospede?.uf || "—"}`} />
            <Info label="CEP" value={h.hospede?.cep} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="font-serif">Valores</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1.5">
            <Row label="Diárias" value={`${h.qtd_diarias} × ${formatBRL(h.valor_diaria)}`} />
            <Row label="Hospedagem" value={formatBRL(h.valor_hospedagem)} />
            <Row label="Consumo" value={formatBRL(h.valor_consumo)} />
            <Row label="Danos/extras" value={formatBRL(h.valor_danos)} />
            <Row label="Desconto" value={`- ${formatBRL(h.desconto)}`} />
            <Separator className="my-2" />
            <Row label="Total" value={formatBRL(h.valor_total)} bold />
            <Row label="Pago" value={formatBRL(h.valor_pago)} />
            <Row label="Saldo" value={formatBRL(h.saldo)} bold className={Number(h.saldo) > 0 ? "text-destructive" : "text-green-700"} />
          </CardContent>
        </Card>
      </div>

      {h.acompanhantes && h.acompanhantes.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="font-serif">Acompanhantes</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {h.acompanhantes.map((a: any) => (
              <div key={a.id} className="grid md:grid-cols-3 gap-2 p-3 rounded-lg bg-muted/40 text-sm">
                <div><span className="text-muted-foreground text-xs">Nome</span><div>{a.nome || "—"}</div></div>
                <div><span className="text-muted-foreground text-xs">CPF</span><div>{formatCPF(a.cpf)}</div></div>
                <div><span className="text-muted-foreground text-xs">Nascimento</span><div>{formatDate(a.nascimento)}</div></div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {itens.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="font-serif">Itens consumidos</CardTitle></CardHeader>
          <CardContent className="text-sm">
            {itens.map((i) => (
              <div key={i.id} className="flex justify-between py-1.5 border-b last:border-0">
                <span>{i.quantidade}× {i.nome_produto}</span>
                <span className="font-medium">{formatBRL(i.valor_total)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="font-serif">Histórico de reservas</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="px-3 py-2 font-medium">Acomodação</th>
                <th className="px-3 py-2 font-medium">Check-in</th>
                <th className="px-3 py-2 font-medium">Check-out</th>
                <th className="px-3 py-2 font-medium">Ad./Cri.</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium text-right">Valor total</th>
              </tr>
            </thead>
            <tbody>
              {historico.map((reserva) => (
                <tr key={reserva.id} className={`border-b last:border-0 ${reserva.id === h.id ? "bg-muted/30" : ""}`}>
                  <td className="px-3 py-2">{reserva.acomodacao?.nome || "—"}</td>
                  <td className="px-3 py-2">{formatDate(reserva.checkin)}</td>
                  <td className="px-3 py-2">{formatDate(reserva.checkout)}</td>
                  <td className="px-3 py-2">{reserva.adultos || 0}/{reserva.criancas || 0}</td>
                  <td className="px-3 py-2"><StatusBadge status={reserva.status} /></td>
                  <td className="px-3 py-2 text-right font-medium">{formatBRL(reserva.valor_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="font-serif">Documentos & Envios</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => enviarFicha("whatsapp")}><MessageSquare className="h-4 w-4 mr-1" />Enviar Ficha WhatsApp</Button>
          <Button variant="outline" onClick={() => enviarFicha("email")}><Mail className="h-4 w-4 mr-1" />Enviar Ficha E-mail</Button>
          <Button variant="outline" onClick={() => enviarConsumoDoc("whatsapp")}><MessageSquare className="h-4 w-4 mr-1" />Enviar Consumo WhatsApp</Button>
          <Button variant="outline" onClick={() => enviarConsumoDoc("email")}><Mail className="h-4 w-4 mr-1" />Enviar Consumo E-mail</Button>
        </CardContent>
      </Card>

      {h.observacoes && (
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground mb-1">Observações</div><div className="text-sm">{h.observacoes}</div></CardContent></Card>
      )}
    </div>
  );
}

function EditarHospedagemDialog({ hospedagem, onSaved }: { hospedagem: any; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nome, setNome] = useState(hospedagem.hospede?.nome || "");
  const [cpf, setCpf] = useState(hospedagem.hospede?.cpf || "");
  const [telefone, setTelefone] = useState(hospedagem.hospede?.telefone || "");
  const [email, setEmail] = useState(hospedagem.hospede?.email || "");
  const [checkin, setCheckin] = useState(hospedagem.checkin || "");
  const [checkout, setCheckout] = useState(hospedagem.checkout || "");
  const [adultos, setAdultos] = useState(hospedagem.adultos || 0);
  const [criancas, setCriancas] = useState(hospedagem.criancas || 0);
  const [observacoes, setObservacoes] = useState(hospedagem.observacoes || "");

  const salvar = async () => {
    setSaving(true);
    try {
      if (hospedagem.hospede_id) {
        const { error: hospedeError } = await supabase.from("hospedes").update({
          nome,
          cpf,
          telefone,
          email,
        }).eq("id", hospedagem.hospede_id);
        if (hospedeError) throw hospedeError;
      }

      const { error } = await supabase.from("hospedagens").update({
        checkin,
        checkout,
        adultos,
        criancas,
        observacoes,
      }).eq("id", hospedagem.id);
      if (error) throw error;

      toast.success("Hospedagem atualizada com sucesso.");
      setOpen(false);
      onSaved();
    } catch (e: any) {
      toast.error(e.message || "Não foi possível salvar as alterações.");
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-serif">Editar hóspede e hospedagem</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 md:grid-cols-2">
          <div><Label>Nome</Label><Input value={nome} onChange={(e) => setNome(e.target.value)} /></div>
          <div><Label>CPF</Label><Input value={cpf} onChange={(e) => setCpf(e.target.value)} /></div>
          <div><Label>Telefone</Label><Input value={telefone} onChange={(e) => setTelefone(e.target.value)} /></div>
          <div><Label>E-mail</Label><Input value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div><Label>Check-in</Label><Input type="date" value={checkin} onChange={(e) => setCheckin(e.target.value)} /></div>
          <div><Label>Check-out</Label><Input type="date" value={checkout} onChange={(e) => setCheckout(e.target.value)} /></div>
          <div><Label>Adultos</Label><Input type="number" value={adultos} onChange={(e) => setAdultos(Number(e.target.value))} /></div>
          <div><Label>Crianças</Label><Input type="number" value={criancas} onChange={(e) => setCriancas(Number(e.target.value))} /></div>
          <div className="md:col-span-2"><Label>Observações</Label><Textarea rows={3} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={salvar} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Info({ label, value }: { label: string; value: any }) {
  return (
    <div><div className="text-xs text-muted-foreground">{label}</div><div className="font-medium">{value || "—"}</div></div>
  );
}
function Row({ label, value, bold, className = "" }: { label: string; value: string; bold?: boolean; className?: string }) {
  return (
    <div className={`flex justify-between ${bold ? "font-semibold text-base" : ""} ${className}`}>
      <span className="text-muted-foreground">{label}</span><span>{value}</span>
    </div>
  );
}

// ————— Vistoria Dialog —————
function VistoriaDialog({ hospedagem, onSaved }: { hospedagem: any; onSaved: () => void }) {
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
    if (open) {
      supabase.from("produtos_consumo").select("*").eq("ativo", true).order("nome")
        .then(({ data }) => setProdutos(data || []));
    }
  }, [open]);

  const totalConsumo = produtos.reduce((s, p) => s + (qtds[p.id] || 0) * Number(p.valor_unitario), 0);

  const salvar = async () => {
    setSaving(true);
    try {
      const { data: v, error } = await supabase.from("vistorias").insert({
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
      }).select("id").single();
      if (error) throw error;

      if (houveConsumo) {
        const itens = produtos
          .filter((p) => (qtds[p.id] || 0) > 0)
          .map((p) => ({
            vistoria_id: v.id,
            hospedagem_id: hospedagem.id,
            produto_id: p.id,
            nome_produto: p.nome,
            quantidade: qtds[p.id],
            valor_unitario: p.valor_unitario,
            valor_total: qtds[p.id] * Number(p.valor_unitario),
          }));
        if (itens.length > 0) await supabase.from("itens_vistoria").insert(itens);
      }

      const valor_consumo = houveConsumo ? totalConsumo : 0;
      const valor_danos = houveDano ? valorDano : 0;
      const calc = calcHospedagem({
        qtdDiarias: hospedagem.qtd_diarias,
        valorDiaria: Number(hospedagem.valor_diaria),
        valorConsumo: valor_consumo,
        valorDanos: valor_danos,
        desconto: Number(hospedagem.desconto || 0),
        valorPago: Number(hospedagem.valor_pago || 0),
      });

      await supabase.from("hospedagens").update({
        valor_consumo,
        valor_danos,
        valor_hospedagem: calc.valor_hospedagem,
        valor_total: calc.valor_total,
        saldo: calc.saldo,
        status: "vistoria_realizada",
      }).eq("id", hospedagem.id);

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
            valor_hospedagem: calc.valor_hospedagem,
            valor_total: calc.valor_total,
            saldo: calc.saldo,
          },
          itens: produtos
            .filter((p) => (qtds[p.id] || 0) > 0)
            .map((p) => ({
              nome_produto: p.nome,
              quantidade: qtds[p.id],
              valor_unitario: p.valor_unitario,
              valor_total: qtds[p.id] * Number(p.valor_unitario),
            })),
          extras: {
            status_anterior: hospedagem.status,
            status_novo: "vistoria_realizada",
            houve_consumo: houveConsumo,
            houve_dano: houveDano,
            descricao_dano: houveDano ? descDano : "",
            observacoes_vistoria: obs || "",
          },
        }),
      });

      toast.success("Vistoria salva com sucesso");
      setOpen(false);
      onSaved();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><ClipboardCheck className="h-4 w-4 mr-1" />Fazer Vistoria</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="font-serif text-xl">Vistoria do quarto</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="p-3 bg-muted/40 rounded-lg text-sm">
            <div><b>{hospedagem.hospede?.nome}</b> · {hospedagem.acomodacao?.nome}</div>
            <div className="text-muted-foreground">{formatDate(hospedagem.checkin)} → {formatDate(hospedagem.checkout)}</div>
          </div>

          <label className="flex items-center gap-2"><Checkbox checked={quartoOk} onCheckedChange={(v) => setQuartoOk(!!v)} /><span>Quarto foi vistoriado</span></label>
          <label className="flex items-center gap-2"><Checkbox checked={houveConsumo} onCheckedChange={(v) => setHouveConsumo(!!v)} /><span>Houve consumo no quarto</span></label>
          <label className="flex items-center gap-2"><Checkbox checked={houveDano} onCheckedChange={(v) => setHouveDano(!!v)} /><span>Houve dano</span></label>

          {houveDano && (
            <div className="space-y-2 p-3 border rounded-lg">
              <div><Label>Descrição do dano</Label><Textarea rows={2} value={descDano} onChange={(e) => setDescDano(e.target.value)} /></div>
              <div><Label>Valor cobrado (R$)</Label><Input type="number" step="0.01" value={valorDano} onChange={(e) => setValorDano(Number(e.target.value))} /></div>
            </div>
          )}

          {houveConsumo && (
            <div className="space-y-2">
              <div className="text-sm font-medium">Produtos consumidos</div>
              <div className="grid gap-2">
                {produtos.map((p) => {
                  const q = qtds[p.id] || 0;
                  const total = q * Number(p.valor_unitario);
                  return (
                    <Card key={p.id}>
                      <CardContent className="pt-4 pb-4">
                        <div className="grid grid-cols-[1fr_auto] items-center gap-3">
                          <div className="min-w-0">
                            <div className="font-medium truncate">{p.nome}</div>
                            <div className="text-xs text-muted-foreground">{formatBRL(p.valor_unitario)} · Total {formatBRL(total)}</div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button type="button" size="icon" variant="outline" onClick={() => setQtds((s) => ({ ...s, [p.id]: Math.max(0, (s[p.id] || 0) - 1) }))}><Minus className="h-4 w-4" /></Button>
                            <div className="w-10 text-center font-medium">{q}</div>
                            <Button type="button" size="icon" variant="outline" onClick={() => setQtds((s) => ({ ...s, [p.id]: (s[p.id] || 0) + 1 }))}><Plus className="h-4 w-4" /></Button>
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

          <div><Label>Observações da vistoria</Label><Textarea rows={2} value={obs} onChange={(e) => setObs(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={salvar} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Salvar vistoria
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ————— Fechamento —————
function FechamentoDialog({ hospedagem, onSaved, isAdmin }: { hospedagem: any; onSaved: () => void; isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const [valorPago, setValorPago] = useState<number>(Number(hospedagem.valor_total || 0));
  const [desconto, setDesconto] = useState<number>(Number(hospedagem.desconto || 0));
  const [forma, setForma] = useState("pix");
  const [obsPag, setObsPag] = useState("");
  const [saving, setSaving] = useState(false);
  const [forcarAdmin, setForcarAdmin] = useState(false);

  const calc = calcHospedagem({
    qtdDiarias: hospedagem.qtd_diarias,
    valorDiaria: Number(hospedagem.valor_diaria),
    valorConsumo: Number(hospedagem.valor_consumo || 0),
    valorDanos: Number(hospedagem.valor_danos || 0),
    desconto,
    valorPago,
  });

  const finalizar = async () => {
    if (calc.saldo > 0.001 && !(isAdmin && forcarAdmin)) {
      toast.error("Não é possível finalizar com saldo em aberto. Peça a um administrador.");
      return;
    }
    setSaving(true);
    try {
      await supabase.from("pagamentos").insert({
        hospedagem_id: hospedagem.id,
        valor: valorPago,
        forma_pagamento: forma,
        observacao: obsPag || null,
      });
      await supabase.from("hospedagens").update({
        valor_pago: valorPago,
        desconto,
        valor_total: calc.valor_total,
        saldo: calc.saldo,
        status: "check_out_finalizado",
      }).eq("id", hospedagem.id);
      if (hospedagem.acomodacao_id) {
        await supabase.from("acomodacoes").update({ status: "em_limpeza" }).eq("id", hospedagem.acomodacao_id);
      }

      await enviarEventoHospedagem({
        hospedagem_id: hospedagem.id,
        evento: "mudanca_status",
        status: "check_out_finalizado",
        payload: payloadEventoHospedagem({
          evento: "mudanca_status",
          status: "check_out_finalizado",
          hospedagem: {
            ...hospedagem,
            valor_pago: valorPago,
            desconto,
            valor_total: calc.valor_total,
            saldo: calc.saldo,
          },
          extras: {
            status_anterior: hospedagem.status,
            status_novo: "check_out_finalizado",
            forma_pagamento: forma,
            observacao_pagamento: obsPag || "",
          },
        }),
      });

      toast.success("Check-out finalizado");
      setOpen(false);
      onSaved();
    } catch (e: any) {
      toast.error(e.message);
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><LogOut className="h-4 w-4 mr-1" />Finalizar Check-out</Button></DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle className="font-serif">Fechamento da hospedagem</DialogTitle></DialogHeader>
        <div className="space-y-3 text-sm">
          <Row label="Hospedagem" value={formatBRL(hospedagem.valor_hospedagem)} />
          <Row label="Consumo" value={formatBRL(hospedagem.valor_consumo)} />
          <Row label="Danos/extras" value={formatBRL(hospedagem.valor_danos)} />
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Desconto</Label><Input type="number" step="0.01" value={desconto} onChange={(e) => setDesconto(Number(e.target.value))} /></div>
            <div><Label>Valor pago</Label><Input type="number" step="0.01" value={valorPago} onChange={(e) => setValorPago(Number(e.target.value))} /></div>
          </div>
          <div>
            <Label>Forma de pagamento</Label>
            <Select value={forma} onValueChange={setForma}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="dinheiro">Dinheiro</SelectItem>
                <SelectItem value="pix">PIX</SelectItem>
                <SelectItem value="credito">Cartão de crédito</SelectItem>
                <SelectItem value="debito">Cartão de débito</SelectItem>
                <SelectItem value="transferencia">Transferência</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Observação</Label><Textarea rows={2} value={obsPag} onChange={(e) => setObsPag(e.target.value)} /></div>
          <Separator />
          <Row label="Total" value={formatBRL(calc.valor_total)} bold />
          <Row label="Saldo" value={formatBRL(calc.saldo)} bold className={calc.saldo > 0 ? "text-destructive" : "text-green-700"} />
          {calc.saldo > 0.001 && isAdmin && (
            <label className="flex items-center gap-2 text-xs"><Checkbox checked={forcarAdmin} onCheckedChange={(v) => setForcarAdmin(!!v)} /><span>Confirmar finalização mesmo com saldo em aberto (administrador)</span></label>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={finalizar} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Finalizar Check-out</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
