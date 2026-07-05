import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCPF, formatDate, formatPhone } from "@/utils/formatters";
import { ArrowLeft, Download, Loader2, Printer } from "lucide-react";
import { downloadElementAsPdf, printElement } from "@/utils/pdf";

const logoUrl = "/logo-lusitania.png";

export const Route = createFileRoute("/_authenticated/precadastros/$id")({
  component: DetalhesPrecCadastro,
});

function DetalhesPrecCadastro() {
  const { id } = useParams({ from: "/_authenticated/precadastros/$id" });
  const [registro, setRegistro] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const printableRef = useRef<HTMLDivElement | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);

    const { data: hospedagem } = await supabase
      .from("hospedagens")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (!hospedagem) {
      setRegistro(null);
      setLoading(false);
      return;
    }

    const [{ data: hospede }, { data: acomodacao }, { data: acompanhantes }] = await Promise.all([
      hospedagem.hospede_id
        ? supabase.from("hospedes").select("*").eq("id", hospedagem.hospede_id).maybeSingle()
        : Promise.resolve({ data: null }),
      hospedagem.acomodacao_id
        ? supabase.from("acomodacoes").select("*").eq("id", hospedagem.acomodacao_id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.from("acompanhantes").select("*").eq("hospedagem_id", id).order("criado_em", { ascending: true }),
    ]);

    setRegistro({
      ...hospedagem,
      hospede,
      acomodacao,
      acompanhantes: acompanhantes || [],
    });
    setLoading(false);
  }, [id]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  if (loading) {
    return (
      <div className="p-8 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!registro) {
    return (
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm">
          <Link to="/precadastros">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Voltar
          </Link>
        </Button>
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Pré-cadastro não encontrado.
          </CardContent>
        </Card>
      </div>
    );
  }

  const acompanhantes = [...(registro.acompanhantes || [])];
  while (acompanhantes.length < 3) acompanhantes.push({ id: `empty-${acompanhantes.length}` });
  const valorTotal = formatCurrency(
    registro.valor_total ??
    registro.valor_hospedagem ??
    (Number(registro.valor_diaria || 0) * Number(registro.qtd_diarias || 0)),
  );
  const dataVazia = "__/___/_____";
  const fichaHtml = gerarFichaHtml({
    logoUrl,
    acomodacao: displayText(registro.acomodacao?.nome),
    checkin: displayDate(registro.checkin, dataVazia),
    checkout: displayDate(registro.checkout, dataVazia),
    adultos: displayText(registro.adultos),
    criancas: displayText(registro.criancas),
    valorTotal: displayText(valorTotal),
    observacoes: displayText(registro.observacoes),
    nf: "",
    hospede: {
      nome: displayText(registro.hospede?.nome),
      cpf: displayText(formatCPF(registro.hospede?.cpf)),
      nascimento: displayDate(registro.hospede?.nascimento, dataVazia),
      telefone: displayText(formatPhone(registro.hospede?.telefone)),
      email: displayText(registro.hospede?.email),
      endereco: displayText(registro.hospede?.endereco),
      cidade: displayText(registro.hospede?.cidade),
      uf: displayText(registro.hospede?.uf),
      cep: displayText(registro.hospede?.cep),
      placa_veiculo: displayText(registro.hospede?.placa_veiculo),
    },
    acompanhantes: acompanhantes.map((acompanhante) => ({
      nome: displayText(acompanhante.nome),
      cpf: displayText(formatCPF(acompanhante.cpf)),
      nascimento: displayDate(acompanhante.nascimento, dataVazia),
    })),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link to="/precadastros">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Voltar
          </Link>
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => printableRef.current && printElement(printableRef.current, `Pre-cadastro - ${registro.hospede?.nome || registro.id}`)}
          >
            <Printer className="mr-1 h-4 w-4" />
            Imprimir
          </Button>
          <Button
            variant="outline"
            onClick={() => printableRef.current && downloadElementAsPdf(printableRef.current, `precadastro-${registro.hospede?.nome || registro.id}`)}
          >
            <Download className="mr-1 h-4 w-4" />
            Baixar PDF
          </Button>
        </div>
      </div>

      <div
        ref={printableRef}
        className="mx-auto"
        dangerouslySetInnerHTML={{ __html: fichaHtml }}
      />
    </div>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number.isFinite(value) ? value : 0);
}

function displayText(value: any) {
  return value && String(value).trim() !== "" ? String(value) : "";
}

function displayDate(value: any, fallback = "") {
  const formatted = formatDate(value);
  return formatted && formatted !== "—" ? formatted : fallback;
}

function gerarFichaHtml(dados: {
  logoUrl: string;
  acomodacao: string;
  checkin: string;
  checkout: string;
  adultos: string;
  criancas: string;
  valorTotal: string;
  observacoes: string;
  nf: string;
  hospede: {
    nome: string;
    cpf: string;
    nascimento: string;
    telefone: string;
    email: string;
    endereco: string;
    cidade: string;
    uf: string;
    cep: string;
    placa_veiculo: string;
  };
  acompanhantes: Array<{
    nome: string;
    cpf: string;
    nascimento: string;
  }>;
}) {
  const acompanhantes = dados.acompanhantes.slice(0, 3);
  while (acompanhantes.length < 3) {
    acompanhantes.push({ nome: "", cpf: "", nascimento: "" });
  }

  return `
    <div style="width:210mm; min-height:297mm; margin:0 auto; padding:7mm; background:#fff; font-family:Arial, Helvetica, sans-serif; color:#333;">
      <div style="width:100%; border:0.5px solid #333; border-radius:5px; overflow:hidden; margin-bottom:6mm;">
        <table style="width:100%; border-collapse:collapse; table-layout:fixed; border-bottom:0.45px solid #333;">
          <tr>
            <td style="width:34%; height:28mm; border:none; padding-left:8px; padding-right:8px; vertical-align:middle;">
              <img src="${escapeHtml(dados.logoUrl)}" alt="Pousada Lusitânia" style="width:100%; max-width:250px; height:auto; display:block; object-fit:contain;" />
            </td>
            <td style="width:66%; height:28mm; border:none; text-align:center; font-size:33px; font-weight:900; color:#000; letter-spacing:1px;">
              Ficha de Hóspede
            </td>
          </tr>
        </table>

        <table style="width:100%; border-collapse:collapse; table-layout:fixed;">
          <tr>
            <td style="${cellStyle()}"><span style="${labelStyle()}">Acomodação:</span><br><span style="${valueStyle()}">${escapeHtml(dados.acomodacao)}</span></td>
            <td style="${cellStyle()}"><span style="${labelStyle()}">Check-in:</span><br><span style="${valueStyle()} letter-spacing:1px;">${escapeHtml(dados.checkin)}</span></td>
            <td style="${cellStyle()}"><span style="${labelStyle()}">Check-out:</span><br><span style="${valueStyle()} letter-spacing:1px;">${escapeHtml(dados.checkout)}</span></td>
            <td style="${cellStyle()}"><span style="${labelStyle()}">Nº Adultos:</span><br><span style="${valueStyle()}">${escapeHtml(dados.adultos)}</span></td>
            <td style="${cellStyle({ borderRight: false })}"><span style="${labelStyle()}">Nº Crianças:</span><br><span style="${valueStyle()}">${escapeHtml(dados.criancas)}</span></td>
          </tr>

          <tr>
            <td colspan="5" style="${rowStyle(28)}"><span style="${labelStyle()}">Nome:</span> <span style="${valueStyle()}">${escapeHtml(dados.hospede.nome)}</span></td>
          </tr>

          ${acompanhantes
            .map(
              (acompanhante) => `
                <tr>
                  <td colspan="5" style="border:0.45px solid #333; border-top:none; padding:0; height:25px; font-size:10.5px; color:#333;">
                    <div style="display:flex; align-items:center; width:100%; height:25px; padding:4px 6px;">
                      <div style="width:54%; overflow:hidden; white-space:nowrap;"><span style="${labelStyle()}">Acompanhante:</span> <span style="${valueStyle()}">${escapeHtml(acompanhante.nome)}</span></div>
                      <div style="width:22%; overflow:hidden; white-space:nowrap;"><span style="${labelStyle()}">Nasc.:</span> <span style="${valueStyle()} letter-spacing:1px;">${escapeHtml(acompanhante.nascimento)}</span></div>
                      <div style="width:24%; overflow:hidden; white-space:nowrap;"><span style="${labelStyle()}">CPF:</span> <span style="${valueStyle()}">${escapeHtml(acompanhante.cpf)}</span></div>
                    </div>
                  </td>
                </tr>
              `,
            )
            .join("")}

          <tr>
            <td colspan="5" style="${rowStyle(28)}"><span style="${labelStyle()}">End.:</span> <span style="${valueStyle()}">${escapeHtml(dados.hospede.endereco)}</span></td>
          </tr>

          <tr>
            <td colspan="3" style="${cellStyle()}"><span style="${labelStyle()}">Cidade:</span> <span style="${valueStyle()}">${escapeHtml(dados.hospede.cidade)}</span></td>
            <td style="${cellStyle()}"><span style="${labelStyle()}">UF:</span> <span style="${valueStyle()}">${escapeHtml(dados.hospede.uf)}</span></td>
            <td style="${cellStyle({ borderRight: false })}"><span style="${labelStyle()}">CEP:</span> <span style="${valueStyle()}">${escapeHtml(dados.hospede.cep)}</span></td>
          </tr>

          <tr>
            <td colspan="5" style="border:0.45px solid #333; border-top:none; padding:0; height:25px; font-size:10.5px; color:#333;">
              <div style="display:flex; align-items:center; width:100%; height:25px;">
                <div style="width:45%; height:25px; display:flex; align-items:center; padding:4px 6px; overflow:hidden; white-space:nowrap;">
                  <div style="width:52%; overflow:hidden; white-space:nowrap;"><span style="${labelStyle()}">CPF:</span> <span style="${valueStyle()}">${escapeHtml(dados.hospede.cpf)}</span></div>
                  <div style="width:48%; overflow:hidden; white-space:nowrap;"><span style="${labelStyle()}">Nasc.:</span> <span style="${valueStyle()} letter-spacing:1px;">${escapeHtml(dados.hospede.nascimento)}</span></div>
                </div>
                <div style="width:25%; height:25px; display:flex; align-items:center; padding:4px 6px; border-left:0.45px solid #333; overflow:hidden; white-space:nowrap;">
                  <span style="${labelStyle()}">Tel.:</span> <span style="${valueStyle()}">${escapeHtml(dados.hospede.telefone)}</span>
                </div>
                <div style="width:30%; height:25px; display:flex; align-items:center; padding:4px 6px; border-left:0.45px solid #333; overflow:hidden; white-space:nowrap;">
                  <span style="${labelStyle()}">Placa do Veículo:</span> <span style="${valueStyle()}">${escapeHtml(dados.hospede.placa_veiculo)}</span>
                </div>
              </div>
            </td>
          </tr>

          <tr>
            <td colspan="5" style="${rowStyle(24)}"><span style="${labelStyle()}">E-mail:</span> <span style="${valueStyle()}">${escapeHtml(dados.hospede.email)}</span></td>
          </tr>

          <tr>
            <td colspan="5" style="border:0.45px solid #333; border-top:none; height:17mm; text-align:center; position:relative;">
              <div style="width:76%; border-top:0.45px solid #333; margin:12mm auto 0 auto;"></div>
              <div style="font-size:10px; font-weight:900; color:#000; margin-top:1px;">Assinatura</div>
            </td>
          </tr>
        </table>
      </div>

      <div style="width:100%; border:0.5px solid #333; border-radius:5px; overflow:hidden;">
        <table style="width:100%; border-collapse:collapse; table-layout:fixed;">
          <thead>
            <tr>
              <th style="${thStyle()}">ACOMODAÇÃO</th>
              <th style="${thStyle()}">CHECK-IN</th>
              <th style="${thStyle()}">CHECK-OUT</th>
              <th style="${thStyle()}">VALOR TOTAL R$</th>
              <th style="${thStyle(false)}">OBSERVAÇÕES</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="${tdControleStyle()} text-align:center;">${escapeHtml(dados.acomodacao)}</td>
              <td style="${tdControleStyle()} text-align:center; letter-spacing:1px;">${escapeHtml(dados.checkin)}</td>
              <td style="${tdControleStyle()} text-align:center; letter-spacing:1px;">${escapeHtml(dados.checkout)}</td>
              <td style="${tdControleStyle()} text-align:center;">${escapeHtml(dados.valorTotal)}</td>
              <td style="${tdControleStyle(false)} white-space:normal; line-height:1.25;">${escapeHtml(dados.observacoes)}</td>
            </tr>
            ${Array.from({ length: 13 })
              .map(
                () => `
                  <tr>
                    <td style="${linhaVaziaStyle()}"></td>
                    <td style="${linhaVaziaStyle()}"></td>
                    <td style="${linhaVaziaStyle()}"></td>
                    <td style="${linhaVaziaStyle()}"></td>
                    <td style="${linhaVaziaStyle(false)}"></td>
                  </tr>
                `,
              )
              .join("")}
            <tr>
              <td style="border:0.45px solid #333; border-top:none; border-right:0.45px solid #333; height:18mm; font-size:13px; font-weight:900; vertical-align:bottom; color:#000; padding:4px 6px;">
                NF: ${escapeHtml(dados.nf)}
              </td>
              <td style="border:0.45px solid #333; border-top:none; border-right:0.45px solid #333;"></td>
              <td style="border:0.45px solid #333; border-top:none; border-right:0.45px solid #333;"></td>
              <td style="border:0.45px solid #333; border-top:none; border-right:0.45px solid #333;"></td>
              <td style="border:0.45px solid #333; border-top:none;"></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function cellStyle(options?: { borderRight?: boolean }) {
  return `border:0.45px solid #333; border-top:none; ${options?.borderRight === false ? "border-right:none;" : ""} padding:4px 6px; vertical-align:middle; font-size:10.5px; height:26px; color:#333;`;
}

function rowStyle(height: number) {
  return `border:0.45px solid #333; border-top:none; padding:4px 6px; vertical-align:middle; font-size:10.5px; height:${height}px; color:#333;`;
}

function labelStyle() {
  return "font-weight:900; color:#000;";
}

function valueStyle() {
  return "font-weight:500; color:#333;";
}

function thStyle(borderRight = true) {
  return `border:0.45px solid #333; border-top:none; ${borderRight ? "" : "border-right:none;"} height:12mm; font-size:15px; text-align:center; font-weight:900; color:#000; padding:4px 6px; vertical-align:middle;`;
}

function tdControleStyle(borderRight = true) {
  return `border:0.45px solid #333; border-top:none; ${borderRight ? "" : "border-right:none;"} height:8.8mm; font-size:10.5px; color:#333; padding:4px 6px; vertical-align:middle;`;
}

function linhaVaziaStyle(borderRight = true) {
  return `border:0.45px solid #333; border-top:none; ${borderRight ? "" : "border-right:none;"} height:8.5mm;`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
