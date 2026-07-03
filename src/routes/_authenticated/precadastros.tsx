import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate, formatCPF, formatPhone } from "@/utils/formatters";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { enviarEventoHospedagem } from "@/services/webhooksService";
import { payloadEventoHospedagem } from "@/utils/payloads";

export const Route = createFileRoute("/_authenticated/precadastros")({
  component: PreCadastros,
});

function PreCadastros() {
  const [rows, setRows] = useState<any[]>([]);
  const [publicUrl, setPublicUrl] = useState("/precadastro");
  const [savingId, setSavingId] = useState<string | null>(null);

  const carregar = async () => {
    const { data } = await supabase
      .from("hospedagens")
      .select("id, status, acomodacao_id, checkin, checkout, adultos, criancas, hospede:hospedes(nome, cpf, telefone)")
      .in("status", ["pre_cadastro", "checkin_confirmado"])
      .order("criado_em", { ascending: false });

    setRows(data || []);
  };

  useEffect(() => {
    setPublicUrl(`${window.location.origin}/precadastro`);
  }, []);

  useEffect(() => {
    carregar();
  }, []);

  const atualizarStatus = async (row: any, novoStatus: "checkin_confirmado" | "hospedado") => {
    setSavingId(row.id);
    try {
      const { error } = await supabase.from("hospedagens").update({ status: novoStatus }).eq("id", row.id);
      if (error) throw error;

      if (novoStatus === "hospedado" && row.acomodacao_id) {
        const { error: acomodacaoError } = await supabase
          .from("acomodacoes")
          .update({ status: "ocupado" })
          .eq("id", row.acomodacao_id);

        if (acomodacaoError) throw acomodacaoError;
      }

      await enviarEventoHospedagem({
        hospedagem_id: row.id,
        evento: "mudanca_status",
        status: novoStatus,
        payload: payloadEventoHospedagem({
          evento: "mudanca_status",
          status: novoStatus,
          hospedagem: row,
          extras: {
            status_anterior: row.status,
            status_novo: novoStatus,
            origem_acao: "lista_precadastros",
          },
        }),
      });

      toast.success(
        novoStatus === "checkin_confirmado" ? "Pré-cadastro confirmado com sucesso." : "Check-in realizado com sucesso.",
      );
      await carregar();
    } catch (e: any) {
      toast.error(e.message || "Não foi possível atualizar o status.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl">Pré-cadastros</h1>
        <p className="text-muted-foreground text-sm">Fichas recebidas e confirmações pendentes de entrada</p>
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
                    <div className="flex flex-wrap justify-end gap-2">
                      {r.status === "pre_cadastro" && (
                        <Button
                          size="sm"
                          onClick={() => atualizarStatus(r, "checkin_confirmado")}
                          disabled={savingId === r.id}
                        >
                          Confirmar
                        </Button>
                      )}
                      {r.status === "checkin_confirmado" && (
                        <Button
                          size="sm"
                          onClick={() => atualizarStatus(r, "hospedado")}
                          disabled={savingId === r.id}
                        >
                          Fazer check-in
                        </Button>
                      )}
                      <Button asChild size="sm" variant="outline">
                        <Link to="/hospedagens/$id" params={{ id: r.id }}>Ver detalhes</Link>
                      </Button>
                    </div>
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
