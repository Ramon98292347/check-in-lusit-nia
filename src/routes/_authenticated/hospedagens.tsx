import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate, formatBRL, STATUS_LABELS } from "@/utils/formatters";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/hospedagens")({
  component: Hospedagens,
});

function Hospedagens() {
  const [rows, setRows] = useState<any[]>([]);
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [busca, setBusca] = useState("");

  useEffect(() => {
    let q = supabase
      .from("hospedagens")
      .select("id, status, checkin, checkout, adultos, criancas, valor_diaria, valor_total, hospede:hospedes(nome, cpf), acomodacao:acomodacoes(nome)")
      .order("checkin", { ascending: false });
    if (filtroStatus !== "todos") q = q.eq("status", filtroStatus);
    q.then(({ data }) => setRows(data || []));
  }, [filtroStatus]);

  const filtered = rows.filter((r) => {
    if (!busca) return true;
    const b = busca.toLowerCase();
    return (
      r.hospede?.nome?.toLowerCase().includes(b) ||
      r.hospede?.cpf?.includes(busca) ||
      r.acomodacao?.nome?.toLowerCase().includes(b)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3 justify-between">
        <div>
          <h1 className="font-serif text-3xl">Hospedagens</h1>
          <p className="text-muted-foreground text-sm">Todas as reservas e estadias</p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex flex-1 flex-wrap gap-2">
            <Input placeholder="Buscar por nome, CPF ou acomodação…" value={busca} onChange={(e) => setBusca(e.target.value)} className="max-w-sm" />
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <CardTitle className="text-base">Total: {filtered.length}</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hóspede</TableHead>
                <TableHead>Acomodação</TableHead>
                <TableHead>Check-in</TableHead>
                <TableHead>Check-out</TableHead>
                <TableHead className="text-center">Ad./Cri.</TableHead>
                <TableHead className="text-right">Diária</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.hospede?.nome || "—"}</TableCell>
                  <TableCell>{r.acomodacao?.nome || "—"}</TableCell>
                  <TableCell>{formatDate(r.checkin)}</TableCell>
                  <TableCell>{formatDate(r.checkout)}</TableCell>
                  <TableCell className="text-center">{r.adultos}/{r.criancas}</TableCell>
                  <TableCell className="text-right">{formatBRL(r.valor_diaria)}</TableCell>
                  <TableCell className="text-right font-medium">{formatBRL(r.valor_total)}</TableCell>
                  <TableCell><StatusBadge status={r.status} /></TableCell>
                  <TableCell className="text-right">
                    <Button asChild size="sm" variant="outline">
                      <Link to="/hospedagens/$id" params={{ id: r.id }}>Detalhes</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Nenhuma hospedagem encontrada</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
