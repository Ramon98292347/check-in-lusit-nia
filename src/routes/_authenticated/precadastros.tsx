import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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

export const Route = createFileRoute("/_authenticated/precadastros")({
  component: PreCadastros,
});

function PreCadastros() {
  const [rows, setRows] = useState<any[]>([]);
  const [publicUrl, setPublicUrl] = useState("/precadastro");
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

  const carregar = async () => {
    const { data } = await supabase
      .from("hospedagens")
      .select("id, checkin, checkout, adultos, criancas, criado_em, hospede:hospedes(nome, cpf, telefone), acomodacao:acomodacoes(nome)")
      .eq("origem", "pre_cadastro")
      .order("criado_em", { ascending: false });

    setRows(data || []);
  };

  useEffect(() => {
    setPublicUrl(`${window.location.origin}/precadastro`);
    supabase.from("acomodacoes").select("id, nome").eq("ativo", true).order("nome").then(({ data }) => {
      setAcomodacoes(data || []);
    });
  }, []);

  useEffect(() => {
    carregar();
  }, []);

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
          acomodacao_id: editForm.acomodacao_id,
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
        <CardHeader><CardTitle className="font-serif text-xl">Atalho de ficha</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Se o hóspede estiver na recepção, o operador pode copiar o link ou abrir o formulário na hora.
          </p>
          <div className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-3 text-sm break-all">
            {publicUrl}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                await navigator.clipboard.writeText(publicUrl);
              }}
            >
              Copiar link
            </Button>
            <Button asChild>
              <a href={publicUrl} target="_blank" rel="noreferrer">Abrir formulário</a>
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
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.hospede?.nome || "—"}</TableCell>
                  <TableCell>{formatCPF(r.hospede?.cpf)}</TableCell>
                  <TableCell>{formatPhone(r.hospede?.telefone)}</TableCell>
                  <TableCell>{r.acomodacao?.nome || "—"}</TableCell>
                  <TableCell>{formatDate(r.checkin)}</TableCell>
                  <TableCell>{formatDate(r.checkout)}</TableCell>
                  <TableCell className="text-center">{r.adultos}</TableCell>
                  <TableCell className="text-center">{r.criancas}</TableCell>
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
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Nenhuma ficha recebida</TableCell></TableRow>
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
              <Select value={editForm.acomodacao_id} onValueChange={(value) => setEditForm((prev: any) => ({ ...prev, acomodacao_id: value }))}>
                <SelectTrigger><SelectValue placeholder="Selecione a acomodação" /></SelectTrigger>
                <SelectContent>
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
