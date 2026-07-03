import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate, formatCPF, formatPhone } from "@/utils/formatters";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/precadastros")({
  component: PreCadastros,
});

function PreCadastros() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    supabase
      .from("hospedagens")
      .select("id, status, checkin, checkout, adultos, criancas, hospede:hospedes(nome, cpf, telefone)")
      .eq("status", "pre_cadastro")
      .order("criado_em", { ascending: false })
      .then(({ data }) => setRows(data || []));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl">Pré-cadastros</h1>
        <p className="text-muted-foreground text-sm">Fichas recebidas aguardando confirmação</p>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Total: {rows.length}</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hóspede</TableHead>
                <TableHead>CPF</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Check-in</TableHead>
                <TableHead>Check-out</TableHead>
                <TableHead className="text-center">Ad.</TableHead>
                <TableHead className="text-center">Cri.</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.hospede?.nome || "—"}</TableCell>
                  <TableCell>{formatCPF(r.hospede?.cpf)}</TableCell>
                  <TableCell>{formatPhone(r.hospede?.telefone)}</TableCell>
                  <TableCell>{formatDate(r.checkin)}</TableCell>
                  <TableCell>{formatDate(r.checkout)}</TableCell>
                  <TableCell className="text-center">{r.adultos}</TableCell>
                  <TableCell className="text-center">{r.criancas}</TableCell>
                  <TableCell><StatusBadge status={r.status} /></TableCell>
                  <TableCell className="text-right">
                    <Button asChild size="sm" variant="outline">
                      <Link to="/hospedagens/$id" params={{ id: r.id }}>Ver detalhes</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Nenhum pré-cadastro pendente</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
