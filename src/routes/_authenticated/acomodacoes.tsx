import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatBRL, ACOMODACAO_STATUS_LABELS } from "@/utils/formatters";
import { toast } from "sonner";
import { Plus, Edit } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/acomodacoes")({
  component: Acomodacoes,
});

const empty = {
  nome: "", tipo: "Chalé", descricao: "",
  capacidade_adultos: 2, capacidade_criancas: 0,
  valor_diaria: 0, status: "disponivel", ativo: true,
};

function Acomodacoes() {
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(empty);
  const [editId, setEditId] = useState<string | null>(null);

  const load = () => supabase.from("acomodacoes").select("*").order("nome").then(({ data }) => setRows(data || []));
  useEffect(() => { load(); }, []);

  const salvar = async () => {
    if (!form.nome.trim()) return toast.error("Nome obrigatório");
    if (editId) {
      const { error } = await supabase.from("acomodacoes").update(form).eq("id", editId);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("acomodacoes").insert(form);
      if (error) return toast.error(error.message);
    }
    toast.success("Acomodação salva");
    setOpen(false); setForm(empty); setEditId(null); load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl">Acomodações</h1>
          <p className="text-muted-foreground text-sm">Quartos e chalés da pousada</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setForm(empty); setEditId(null); } }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Nova acomodação</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-serif">{editId ? "Editar" : "Nova"} acomodação</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nome</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Tipo</Label><Input value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} /></div>
                <div><Label>Valor da diária</Label><Input type="number" step="0.01" value={form.valor_diaria} onChange={(e) => setForm({ ...form, valor_diaria: Number(e.target.value) })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Cap. adultos</Label><Input type="number" value={form.capacidade_adultos} onChange={(e) => setForm({ ...form, capacidade_adultos: Number(e.target.value) })} /></div>
                <div><Label>Cap. crianças</Label><Input type="number" value={form.capacidade_criancas} onChange={(e) => setForm({ ...form, capacidade_criancas: Number(e.target.value) })} /></div>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ACOMODACAO_STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Descrição</Label><Textarea rows={2} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={salvar}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rows.map((a) => (
          <Card key={a.id} className="shadow-soft">
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle className="font-serif">{a.nome}</CardTitle>
                <div className="text-xs text-muted-foreground">{a.tipo}</div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => { setForm(a); setEditId(a.id); setOpen(true); }}><Edit className="h-4 w-4" /></Button>
            </CardHeader>
            <CardContent className="space-y-2">
              <StatusBadge status={a.status} tipo="acomodacao" />
              <div className="text-sm text-muted-foreground">Capacidade: {a.capacidade_adultos} adultos, {a.capacidade_criancas} crianças</div>
              <div className="text-2xl font-serif text-primary">{formatBRL(a.valor_diaria)}<span className="text-sm text-muted-foreground">/diária</span></div>
              {a.descricao && <div className="text-sm text-muted-foreground">{a.descricao}</div>}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
