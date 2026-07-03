import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate } from "@/utils/formatters";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/vistorias")({
  component: Vistorias,
});

function Vistorias() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("hospedagens")
      .select("id, checkin, checkout, status, hospede:hospedes(nome), acomodacao:acomodacoes(nome)")
      .in("status", ["hospedado", "vistoria_pendente", "vistoria_realizada"])
      .order("checkout", { ascending: false })
      .then(({ data }) => setRows(data || []));
  }, []);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl">Vistorias</h1>
        <p className="text-muted-foreground text-sm">Hospedagens aguardando ou com vistoria realizada</p>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Total: {rows.length}</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hóspede</TableHead>
                <TableHead>Acomodação</TableHead>
                <TableHead>Check-out</TableHead>
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
                  <TableCell><StatusBadge status={r.status} /></TableCell>
                  <TableCell className="text-right">
                    <Button asChild size="sm"><Link to="/hospedagens/$id" params={{ id: r.id }}>Fazer vistoria</Link></Button>
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
