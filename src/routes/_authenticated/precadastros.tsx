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
  const [publicUrl, setPublicUrl] = useState("/precadastro");

  useEffect(() => {
    setPublicUrl(`${window.location.origin}/precadastro`);
  }, []);

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
      <Card className="border-border/60 shadow-soft">
        <CardHeader><CardTitle className="font-serif text-xl">Atalho de cadastro</CardTitle></CardHeader>
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
