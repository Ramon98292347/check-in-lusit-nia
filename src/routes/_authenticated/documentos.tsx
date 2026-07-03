import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/utils/formatters";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/documentos")({
  component: Documentos,
});

function Documentos() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("documentos_gerados").select("*").order("criado_em", { ascending: false }).limit(200)
      .then(({ data }) => setRows(data || []));
  }, []);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl">Documentos enviados</h1>
        <p className="text-muted-foreground text-sm">Histórico de envios para o n8n</p>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Últimos {rows.length} envios</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Data</TableHead><TableHead>Tipo</TableHead><TableHead>Canal</TableHead><TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {rows.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>{formatDate(d.criado_em)}</TableCell>
                  <TableCell>{d.tipo_documento}</TableCell>
                  <TableCell>{d.canal}</TableCell>
                  <TableCell><span className={cn("text-xs px-2 py-0.5 rounded-full", d.status === "enviado" ? "bg-green-100 text-green-900" : "bg-red-100 text-red-900")}>{d.status}</span></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
