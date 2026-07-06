import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate, formatCPF, formatPhone } from "@/utils/formatters";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Copy, ExternalLink, Share2 } from "lucide-react";
import { usePreCadastroAutoRefresh } from "@/hooks/usePreCadastroAutoRefresh";

export const Route = createFileRoute("/_authenticated/precadastros")({
  component: PreCadastros,
});

function PreCadastros() {
  const [rows, setRows] = useState<any[]>([]);
  const [publicUrl, setPublicUrl] = useState("/precadastro");
  const [copied, setCopied] = useState(false);
  const [acomodacoes, setAcomodacoes] = useState<any[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({
    acomodacao_id: "",
    checkin: "",
    checkout: "",
    adultos: 1,
    criancas: 0,
    observacoes: "",
    nome: "",
    cpf: "",
    nascimento: "",
    telefone: "",
    email: "",
    endereco: "",
    cidade: "",
    uf: "",
    cep: "",
    placa_veiculo: "",
  });
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const isDetalhe = /^\/precadastros\/[^/]+$/.test(pathname);

  const carregar = useCallback(async () => {
    const { data: hospedagens, error } = await supabase
      .from("hospedagens")
      .select("id, hospede_id, acomodacao_id, checkin, checkout, adultos, criancas, criado_em, status_impressao, impresso_em, acomodacao_texto")
      .eq("origem", "pre_cadastro")
      .order("criado_em", { ascending: false });

    if (error) {
      toast.error(error.message || "Não foi possível carregar as fichas.");
      setRows([]);
      return;
    }

    const hospedeIds = [...new Set((hospedagens || []).map((item) => item.hospede_id).filter(Boolean))] as string[];
    const acomodacaoIds = [...new Set((hospedagens || []).map((item) => item.acomodacao_id).filter(Boolean))] as string[];

    const [{ data: hospedes }, { data: acomodacoes }] = await Promise.all([
      hospedeIds.length
        ? supabase.from("hospedes").select("id, nome, cpf, telefone").in("id", hospedeIds)
        : Promise.resolve({ data: [] }),
      acomodacaoIds.length
        ? supabase.from("acomodacoes").select("id, nome").in("id", acomodacaoIds)
        : Promise.resolve({ data: [] }),
    ]);

    const hospedeMap = new Map((hospedes || []).map((item) => [item.id, item]));
    const acomodacaoMap = new Map((acomodacoes || []).map((item) => [item.id, item]));

    setRows(
      (hospedagens || []).map((item) => ({
        ...item,
        hospede: item.hospede_id ? hospedeMap.get(item.hospede_id) || null : null,
        acomodacao: item.acomodacao_id ? acomodacaoMap.get(item.acomodacao_id) || null : null,
      })),
    );
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setPublicUrl(`${window.location.origin}/precadastro`);
    }

    supabase.from("acomodacoes").select("id, nome").eq("ativo", true).order("nome").then(({ data }) => {
      setAcomodacoes(data || []);
    });
  }, []);

  const copiarLink = async () => {
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  useEffect(() => {
    void carregar();
  }, [carregar]);

  usePreCadastroAutoRefresh({ onRefresh: carregar, enabled: !isDetalhe });

  const abrirEdicao = async (id: string) => {
    const { data: hospedagem, error } = await supabase.from("hospedagens").select("*").eq("id", id).maybeSingle();
    if (error || !hospedagem) {
      toast.error("Não foi possível abrir este cadastro.");
      return;
    }

    const { data: hospede } = hospedagem.hospede_id
      ? await supabase.from("hospedes").select("*").eq("id", hospedagem.hospede_id).maybeSingle()
      : { data: null };

    setEditandoId(id);
    setEditForm({
      acomodacao_id: hospedagem.acomodacao_id || "",
      checkin: hospedagem.checkin || "",
      checkout: hospedagem.checkout || "",
      adultos: hospedagem.adultos ?? 1,
      criancas: hospedagem.criancas ?? 0,
      observacoes: hospedagem.observacoes || "",
      nome: hospede?.nome || "",
      cpf: hospede?.cpf || "",
      nascimento: hospede?.nascimento || "",
      telefone: hospede?.telefone || "",
      email: hospede?.email || "",
      endereco: hospede?.endereco || "",
      cidade: hospede?.cidade || "",
      uf: hospede?.uf || "",
      cep: hospede?.cep || "",
      placa_veiculo: hospede?.placa_veiculo || "",
    });
    setEditOpen(true);
  };

  const salvarEdicao = async () => {
    if (!editandoId) return;
    setSalvando(true);

    try {
      const { data: hospedagem, error: hospedagemError } = await supabase
        .from("hospedagens")
        .select("hospede_id")
        .eq("id", editandoId)
        .maybeSingle();

      if (hospedagemError || !hospedagem) throw hospedagemError || new Error("Cadastro não encontrado.");

      const { error: errorHospedagem } = await supabase
        .from("hospedagens")
        .update({
          acomodacao_id: editForm.acomodacao_id || null,
          checkin: editForm.checkin,
          checkout: editForm.checkout,
          adultos: Number(editForm.adultos || 1),
          criancas: Number(editForm.criancas || 0),
          observacoes: editForm.observacoes || "",
        })
        .eq("id", editandoId);

      if (errorHospedagem) throw errorHospedagem;

      if (hospedagem.hospede_id) {
        const { error: errorHospede } = await supabase
          .from("hospedes")
          .update({
            nome: editForm.nome,
            cpf: editForm.cpf,
            nascimento: editForm.nascimento || null,
            telefone: editForm.telefone,
            email: editForm.email || "",
            endereco: editForm.endereco || "",
            cidade: editForm.cidade || "",
            uf: editForm.uf || "",
            cep: editForm.cep || "",
            placa_veiculo: editForm.placa_veiculo || "",
          })
          .eq("id", hospedagem.hospede_id);

        if (errorHospede) throw errorHospede;
      }

      toast.success("Ficha atualizada com sucesso.");
      setEditOpen(false);
      setEditandoId(null);
      await carregar();
    } catch (error: any) {
      toast.error(error?.message || "Não foi possível salvar a ficha.");
    } finally {
      setSalvando(false);
    }
  };

  const excluirCadastro = async () => {
    if (!excluindoId) return;

    try {
      const { data: hospedagem, error: hospedagemError } = await supabase
        .from("hospedagens")
        .select("id, hospede_id")
        .eq("id", excluindoId)
        .maybeSingle();

      if (hospedagemError || !hospedagem) throw hospedagemError || new Error("Cadastro não encontrado.");

      const { error: acompanhantesError } = await supabase.from("acompanhantes").delete().eq("hospedagem_id", excluindoId);
      if (acompanhantesError) throw acompanhantesError;

      const { error: deleteHospedagemError } = await supabase.from("hospedagens").delete().eq("id", excluindoId);
      if (deleteHospedagemError) throw deleteHospedagemError;

      if (hospedagem.hospede_id) {
        const { count } = await supabase
          .from("hospedagens")
          .select("id", { count: "exact", head: true })
          .eq("hospede_id", hospedagem.hospede_id);

        if (!count) {
          await supabase.from("hospedes").delete().eq("id", hospedagem.hospede_id);
        }
      }

      toast.success("Ficha excluída com sucesso.");
      setExcluindoId(null);
      await carregar();
    } catch (error: any) {
      toast.error(error?.message || "Não foi possível excluir a ficha.");
    }
  };

  if (isDetalhe) {
    return <Outlet />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl">Ficha de Hóspede</h1>
        <p className="text-muted-foreground text-sm">Fichas recebidas pelo formulário público</p>
      </div>
      <Card className="border-border/60 shadow-soft">
        <CardHeader>
          <CardTitle className="font-serif text-xl">Cadastro público</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Use este link para abrir o formulário do hóspede na recepção ou compartilhar com antecedência.
          </p>
          <div className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-3 text-sm break-all">
            {publicUrl}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={copiarLink}
              className={copied ? "border-primary bg-primary/10 text-primary shadow-sm" : ""}
            >
              <Copy className="mr-2 h-4 w-4" />
              {copied ? "Copiado!" : "Copiar link"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                if (navigator.share) {
                  await navigator.share({
                    title: "Pré-cadastro Pousada Lusitânia",
                    text: "Abra o formulário público de pré-cadastro.",
                    url: publicUrl,
                  });
                  return;
                }
                await copiarLink();
              }}
            >
              <Share2 className="mr-2 h-4 w-4" />
              Compartilhar
            </Button>
            <Button asChild>
              <a href={publicUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Abrir formulário
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Total: {rows.length}</CardTitle>
          <p className="text-sm text-muted-foreground">Cada cadastro pode ser aberto, editado ou excluído.</p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hóspede</TableHead>
                <TableHead>CPF</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Acomodação</TableHead>
                <TableHead>Check-in</TableHead>
                <TableHead>Check-out</TableHead>
                <TableHead className="text-center">Ad.</TableHead>
                <TableHead className="text-center">Cri.</TableHead>
                <TableHead className="text-center">Impressão</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.hospede?.nome || "—"}</TableCell>
                  <TableCell>{formatCPF(r.hospede?.cpf)}</TableCell>
                  <TableCell>{formatPhone(r.hospede?.telefone)}</TableCell>
                  <TableCell>{r.acomodacao_texto || r.acomodacao?.nome || "—"}</TableCell>
                  <TableCell>{formatDate(r.checkin)}</TableCell>
                  <TableCell>{formatDate(r.checkout)}</TableCell>
                  <TableCell className="text-center">{r.adultos}</TableCell>
                  <TableCell className="text-center">{r.criancas}</TableCell>
                  <TableCell className="text-center">
                    <div className="space-y-1">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                          (r.status_impressao || "PENDENTE_IMPRESSAO") === "IMPRESSO"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {(r.status_impressao || "PENDENTE_IMPRESSAO") === "IMPRESSO"
                          ? "Impresso"
                          : "Pendente de impressão"}
                      </span>
                      {(r.status_impressao || "PENDENTE_IMPRESSAO") === "IMPRESSO" && r.impresso_em && (
                        <div className="text-[11px] text-muted-foreground">
                          {formatDate(r.impresso_em)}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button asChild size="sm" variant="outline">
                        <Link to="/precadastros/$id" params={{ id: r.id }}>Detalhes</Link>
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => abrirEdicao(r.id)}>
                        Editar
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => setExcluindoId(r.id)}>
                        Excluir
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">Nenhuma ficha recebida</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Editar ficha de hóspede</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2 space-y-1.5">
              <Label>Acomodação</Label>
              <Select
                value={editForm.acomodacao_id || "__none__"}
                onValueChange={(value) => setEditForm((prev: any) => ({ ...prev, acomodacao_id: value === "__none__" ? "" : value }))}
              >
                <SelectTrigger><SelectValue placeholder="Selecione a acomodação" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Não informar agora</SelectItem>
                  {acomodacoes.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Check-in</Label>
              <Input type="date" value={editForm.checkin} onChange={(e) => setEditForm((prev: any) => ({ ...prev, checkin: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Check-out</Label>
              <Input type="date" value={editForm.checkout} onChange={(e) => setEditForm((prev: any) => ({ ...prev, checkout: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Adultos</Label>
              <Input type="number" min={1} value={editForm.adultos} onChange={(e) => setEditForm((prev: any) => ({ ...prev, adultos: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Crianças</Label>
              <Input type="number" min={0} value={editForm.criancas} onChange={(e) => setEditForm((prev: any) => ({ ...prev, criancas: e.target.value }))} />
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <Label>Nome</Label>
              <Input value={editForm.nome} onChange={(e) => setEditForm((prev: any) => ({ ...prev, nome: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>CPF</Label>
              <Input value={editForm.cpf} onChange={(e) => setEditForm((prev: any) => ({ ...prev, cpf: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Nascimento</Label>
              <Input type="date" value={editForm.nascimento} onChange={(e) => setEditForm((prev: any) => ({ ...prev, nascimento: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <Input value={editForm.telefone} onChange={(e) => setEditForm((prev: any) => ({ ...prev, telefone: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input type="email" value={editForm.email} onChange={(e) => setEditForm((prev: any) => ({ ...prev, email: e.target.value }))} />
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <Label>Endereço</Label>
              <Input value={editForm.endereco} onChange={(e) => setEditForm((prev: any) => ({ ...prev, endereco: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Cidade</Label>
              <Input value={editForm.cidade} onChange={(e) => setEditForm((prev: any) => ({ ...prev, cidade: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>UF</Label>
              <Input maxLength={2} value={editForm.uf} onChange={(e) => setEditForm((prev: any) => ({ ...prev, uf: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>CEP</Label>
              <Input value={editForm.cep} onChange={(e) => setEditForm((prev: any) => ({ ...prev, cep: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Placa do veículo</Label>
              <Input value={editForm.placa_veiculo} onChange={(e) => setEditForm((prev: any) => ({ ...prev, placa_veiculo: e.target.value }))} />
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <Label>Observações</Label>
              <Textarea rows={4} value={editForm.observacoes} onChange={(e) => setEditForm((prev: any) => ({ ...prev, observacoes: e.target.value }))} />
            </div>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={salvarEdicao} disabled={salvando}>
              {salvando ? "Salvando..." : "Salvar alterações"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!excluindoId} onOpenChange={(open) => !open && setExcluindoId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir ficha de hóspede?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove o cadastro recebido e não poderá ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={excluirCadastro}>Excluir ficha</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
