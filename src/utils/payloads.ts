import { formatDate, formatCPF, formatPhone } from "./formatters";

const SYSTEM_LOGO_PATH = "/logo.png";

function getPublicAssetUrl(path: string) {
  if (typeof window === "undefined") return path;
  return `${window.location.origin}${path}`;
}

function safeText(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function filled(value: unknown, fallback = "—") {
  const text = String(value ?? "").trim();
  return text ? safeText(text) : fallback;
}

function buildFichaHospedeHtml(payload: ReturnType<typeof payloadFichaHospedeBase>) {
  const acompanhantes = [...payload.acompanhantes, ...Array.from({ length: Math.max(0, 3 - payload.acompanhantes.length) }).map(() => ({
    nome: "",
    cpf: "",
    nascimento: "",
  }))].slice(0, 3);

  const acompanhanteRows = acompanhantes
    .map(
      (acompanhante) => `
        <tr>
          <td style="padding:10px 14px; border-bottom:1px solid #d4ded8; font-size:13px; color:#2f4138;">Acompanhante</td>
          <td style="padding:10px 14px; border-bottom:1px solid #d4ded8; font-size:13px; color:#16241d;">${filled(acompanhante.nome)}</td>
          <td style="padding:10px 14px; border-bottom:1px solid #d4ded8; font-size:13px; color:#2f4138;">Nasc.</td>
          <td style="padding:10px 14px; border-bottom:1px solid #d4ded8; font-size:13px; color:#16241d;">${filled(acompanhante.nascimento)}</td>
          <td style="padding:10px 14px; border-bottom:1px solid #d4ded8; font-size:13px; color:#2f4138;">CPF</td>
          <td style="padding:10px 14px; border-bottom:1px solid #d4ded8; font-size:13px; color:#16241d;">${filled(acompanhante.cpf)}</td>
        </tr>
      `,
    )
    .join("");

  return `
    <div style="font-family: 'Georgia', 'Times New Roman', serif; background:#f6f1e7; padding:24px; color:#16241d;">
      <div style="max-width:980px; margin:0 auto; background:#fffdfa; border:1px solid #c4d1c7; border-radius:20px; overflow:hidden; box-shadow:0 12px 30px rgba(22,36,29,0.08);">
        <div style="display:grid; grid-template-columns:260px 1fr; border-bottom:1px solid #d4ded8;">
          <div style="padding:24px; background:linear-gradient(145deg,#183128 0%,#284438 100%); color:#f5efe3; display:flex; flex-direction:column; justify-content:center; gap:12px;">
            <img src="${safeText(payload.logo_url)}" alt="Pousada Lusitânia" style="max-width:180px; width:100%; object-fit:contain;" />
            <div style="font-size:12px; letter-spacing:0.24em; text-transform:uppercase; opacity:0.82;">Pousada Lusitânia</div>
            <div style="font-size:13px; line-height:1.6; opacity:0.88;">Hospitalidade com elegância, conforto e atenção aos detalhes.</div>
          </div>
          <div style="padding:28px 30px 20px;">
            <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:16px;">
              <div>
                <div style="font-size:13px; letter-spacing:0.16em; text-transform:uppercase; color:#6c7a72;">Registro de hospedagem</div>
                <h1 style="margin:8px 0 0; font-size:44px; line-height:1; font-family:'Arial',sans-serif; color:#16241d;">Ficha de Hóspede</h1>
              </div>
              <div style="padding:10px 14px; background:#eef4f0; border:1px solid #d4ded8; border-radius:14px; min-width:160px;">
                <div style="font-size:11px; text-transform:uppercase; letter-spacing:0.14em; color:#6c7a72;">Canal</div>
                <div style="margin-top:6px; font-size:14px; font-family:'Arial',sans-serif; font-weight:700; color:#16241d;">${filled(payload.canal.toUpperCase())}</div>
              </div>
            </div>
            <div style="display:grid; grid-template-columns:1.4fr 1fr 1fr 0.8fr 0.8fr; gap:10px; margin-top:24px;">
              ${summaryCard("Acomodação", payload.acomodacao)}
              ${summaryCard("Check-in", payload.checkin)}
              ${summaryCard("Check-out", payload.checkout)}
              ${summaryCard("Adultos", String(payload.adultos))}
              ${summaryCard("Crianças", String(payload.criancas))}
            </div>
          </div>
        </div>

        <div style="padding:26px 28px 18px;">
          <table style="width:100%; border-collapse:collapse; border:1px solid #d4ded8; border-radius:16px; overflow:hidden;">
            <tr style="background:#f2f6f3;">
              <td colspan="6" style="padding:12px 14px; font-family:'Arial',sans-serif; font-size:12px; letter-spacing:0.14em; text-transform:uppercase; color:#5f6f66;">Dados principais</td>
            </tr>
            <tr>
              <td style="padding:10px 14px; border-bottom:1px solid #d4ded8; font-size:13px; color:#2f4138;">Nome</td>
              <td colspan="5" style="padding:10px 14px; border-bottom:1px solid #d4ded8; font-size:14px; font-family:'Arial',sans-serif; font-weight:700; color:#16241d;">${filled(payload.hospede.nome)}</td>
            </tr>
            ${acompanhanteRows}
            <tr>
              <td style="padding:10px 14px; border-bottom:1px solid #d4ded8; font-size:13px; color:#2f4138;">Endereço</td>
              <td colspan="5" style="padding:10px 14px; border-bottom:1px solid #d4ded8; font-size:13px; color:#16241d;">${filled(payload.hospede.endereco)}</td>
            </tr>
            <tr>
              <td style="padding:10px 14px; border-bottom:1px solid #d4ded8; font-size:13px; color:#2f4138;">Cidade</td>
              <td style="padding:10px 14px; border-bottom:1px solid #d4ded8; font-size:13px; color:#16241d;">${filled(payload.hospede.cidade)}</td>
              <td style="padding:10px 14px; border-bottom:1px solid #d4ded8; font-size:13px; color:#2f4138;">UF</td>
              <td style="padding:10px 14px; border-bottom:1px solid #d4ded8; font-size:13px; color:#16241d;">${filled(payload.hospede.uf)}</td>
              <td style="padding:10px 14px; border-bottom:1px solid #d4ded8; font-size:13px; color:#2f4138;">CEP</td>
              <td style="padding:10px 14px; border-bottom:1px solid #d4ded8; font-size:13px; color:#16241d;">${filled(payload.hospede.cep)}</td>
            </tr>
            <tr>
              <td style="padding:10px 14px; border-bottom:1px solid #d4ded8; font-size:13px; color:#2f4138;">CPF</td>
              <td style="padding:10px 14px; border-bottom:1px solid #d4ded8; font-size:13px; color:#16241d;">${filled(payload.hospede.cpf)}</td>
              <td style="padding:10px 14px; border-bottom:1px solid #d4ded8; font-size:13px; color:#2f4138;">Nascimento</td>
              <td style="padding:10px 14px; border-bottom:1px solid #d4ded8; font-size:13px; color:#16241d;">${filled(payload.hospede.nascimento)}</td>
              <td style="padding:10px 14px; border-bottom:1px solid #d4ded8; font-size:13px; color:#2f4138;">Telefone</td>
              <td style="padding:10px 14px; border-bottom:1px solid #d4ded8; font-size:13px; color:#16241d;">${filled(payload.hospede.telefone)}</td>
            </tr>
            <tr>
              <td style="padding:10px 14px; font-size:13px; color:#2f4138;">E-mail</td>
              <td colspan="3" style="padding:10px 14px; font-size:13px; color:#16241d;">${filled(payload.hospede.email)}</td>
              <td style="padding:10px 14px; font-size:13px; color:#2f4138;">Placa do veículo</td>
              <td style="padding:10px 14px; font-size:13px; color:#16241d;">${filled(payload.hospede.placa_veiculo)}</td>
            </tr>
          </table>

          <div style="margin-top:22px; min-height:96px; padding:16px 18px; border:1px dashed #c4d1c7; border-radius:16px; background:#fcfaf5;">
            <div style="font-size:12px; text-transform:uppercase; letter-spacing:0.14em; color:#6c7a72;">Observações</div>
            <div style="margin-top:10px; font-size:13px; line-height:1.7; color:#24352d;">______________________________________________________________</div>
            <div style="margin-top:6px; font-size:13px; line-height:1.7; color:#24352d;">______________________________________________________________</div>
          </div>

          <div style="display:grid; grid-template-columns:1fr 260px; gap:24px; align-items:end; margin-top:26px;">
            <div style="font-size:11px; line-height:1.7; color:#6c7a72;">
              Declaro que os dados acima conferem com os documentos apresentados no ato da hospedagem.
            </div>
            <div>
              <div style="border-bottom:1px solid #7f8f85; height:42px;"></div>
              <div style="margin-top:8px; text-align:center; font-size:13px; color:#2f4138;">Assinatura</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function buildControleConsumoHtml(payload: ReturnType<typeof payloadControleConsumoBase>) {
  const itensRows = payload.itens.length > 0
    ? payload.itens
        .map(
          (item) => `
            <tr>
              <td style="padding:10px 12px; border-bottom:1px solid #d7e0db; font-size:13px; color:#16241d;">${filled(payload.acomodacao)}</td>
              <td style="padding:10px 12px; border-bottom:1px solid #d7e0db; font-size:13px; color:#16241d;">${filled(payload.checkin)}</td>
              <td style="padding:10px 12px; border-bottom:1px solid #d7e0db; font-size:13px; color:#16241d;">${filled(payload.checkout)}</td>
              <td style="padding:10px 12px; border-bottom:1px solid #d7e0db; font-size:13px; color:#16241d;">${filled(item.produto)}</td>
              <td style="padding:10px 12px; border-bottom:1px solid #d7e0db; font-size:13px; text-align:center; color:#16241d;">${filled(item.quantidade)}</td>
              <td style="padding:10px 12px; border-bottom:1px solid #d7e0db; font-size:13px; text-align:right; color:#16241d;">${safeText(formatCurrency(item.valor_total))}</td>
              <td style="padding:10px 12px; border-bottom:1px solid #d7e0db; font-size:13px; color:#16241d;">${filled(payload.observacoes)}</td>
            </tr>
          `,
        )
        .join("")
    : `
      <tr>
        <td style="padding:18px 12px; border-bottom:1px solid #d7e0db; font-size:13px; color:#16241d;">${filled(payload.acomodacao)}</td>
        <td style="padding:18px 12px; border-bottom:1px solid #d7e0db; font-size:13px; color:#16241d;">${filled(payload.checkin)}</td>
        <td style="padding:18px 12px; border-bottom:1px solid #d7e0db; font-size:13px; color:#16241d;">${filled(payload.checkout)}</td>
        <td style="padding:18px 12px; border-bottom:1px solid #d7e0db; font-size:13px; color:#6c7a72;" colspan="2">Sem itens lançados</td>
        <td style="padding:18px 12px; border-bottom:1px solid #d7e0db; font-size:13px; text-align:right; color:#16241d;">${safeText(formatCurrency(payload.valor_total))}</td>
        <td style="padding:18px 12px; border-bottom:1px solid #d7e0db; font-size:13px; color:#16241d;">${filled(payload.observacoes)}</td>
      </tr>
    `;

  return `
    <div style="font-family:'Arial',sans-serif; background:#f7f5ef; padding:22px; color:#16241d;">
      <div style="max-width:1040px; margin:0 auto; background:#fffdfa; border:1px solid #c4d1c7; border-radius:18px; overflow:hidden;">
        <div style="padding:22px 24px; background:linear-gradient(180deg,#f6fbf8 0%,#edf5f0 100%); border-bottom:1px solid #d7e0db;">
          <div style="display:flex; align-items:center; justify-content:space-between; gap:18px;">
            <div>
              <div style="font-size:12px; text-transform:uppercase; letter-spacing:0.14em; color:#6c7a72;">Resumo de hospedagem</div>
              <h2 style="margin:8px 0 0; font-size:34px; font-family:'Georgia',serif; color:#16241d;">Controle de Consumo</h2>
            </div>
            <img src="${safeText(getPublicAssetUrl(SYSTEM_LOGO_PATH))}" alt="Pousada Lusitânia" style="height:54px; object-fit:contain;" />
          </div>
        </div>
        <div style="padding:18px 20px 24px;">
          <table style="width:100%; border-collapse:collapse; border:1px solid #d7e0db; border-radius:14px; overflow:hidden;">
            <thead>
              <tr style="background:#eef4f0;">
                <th style="padding:12px; border-bottom:1px solid #d7e0db; text-align:left; font-size:12px; letter-spacing:0.08em; color:#415249;">Acomodação</th>
                <th style="padding:12px; border-bottom:1px solid #d7e0db; text-align:left; font-size:12px; letter-spacing:0.08em; color:#415249;">Check-in</th>
                <th style="padding:12px; border-bottom:1px solid #d7e0db; text-align:left; font-size:12px; letter-spacing:0.08em; color:#415249;">Check-out</th>
                <th style="padding:12px; border-bottom:1px solid #d7e0db; text-align:left; font-size:12px; letter-spacing:0.08em; color:#415249;">Item</th>
                <th style="padding:12px; border-bottom:1px solid #d7e0db; text-align:center; font-size:12px; letter-spacing:0.08em; color:#415249;">Qtd.</th>
                <th style="padding:12px; border-bottom:1px solid #d7e0db; text-align:right; font-size:12px; letter-spacing:0.08em; color:#415249;">Valor total</th>
                <th style="padding:12px; border-bottom:1px solid #d7e0db; text-align:left; font-size:12px; letter-spacing:0.08em; color:#415249;">Observações</th>
              </tr>
            </thead>
            <tbody>
              ${itensRows}
            </tbody>
          </table>

          <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-top:18px;">
            ${summaryCardSoft("Hospedagem", formatCurrency(payload.valor_hospedagem))}
            ${summaryCardSoft("Consumo", formatCurrency(payload.valor_consumo))}
            ${summaryCardSoft("Danos / extras", formatCurrency(payload.valor_danos))}
            ${summaryCardSoft("Valor total", formatCurrency(payload.valor_total))}
          </div>

          <div style="display:grid; grid-template-columns:1fr 180px; gap:18px; margin-top:18px; align-items:end;">
            <div style="min-height:80px; padding:14px 16px; border:1px dashed #c4d1c7; border-radius:14px; color:#43554b; font-size:13px;">
              NF: ${filled(payload.nf)}
            </div>
            <div style="text-align:right;">
              <div style="font-size:12px; text-transform:uppercase; letter-spacing:0.12em; color:#6c7a72;">Saldo</div>
              <div style="margin-top:6px; font-size:28px; font-weight:700; color:#16241d;">${safeText(formatCurrency(payload.saldo))}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function summaryCard(label: string, value: string) {
  return `
    <div style="padding:14px 16px; border:1px solid #d4ded8; border-radius:16px; background:#f8fbf9;">
      <div style="font-size:11px; text-transform:uppercase; letter-spacing:0.14em; color:#6c7a72;">${safeText(label)}</div>
      <div style="margin-top:8px; font-size:18px; font-family:'Arial',sans-serif; font-weight:700; color:#16241d;">${filled(value)}</div>
    </div>
  `;
}

function summaryCardSoft(label: string, value: string) {
  return `
    <div style="padding:14px 16px; border:1px solid #d7e0db; border-radius:14px; background:#f9fcfa;">
      <div style="font-size:11px; text-transform:uppercase; letter-spacing:0.12em; color:#6c7a72;">${safeText(label)}</div>
      <div style="margin-top:8px; font-size:17px; font-weight:700; color:#16241d;">${safeText(value)}</div>
    </div>
  `;
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function payloadFichaHospedeBase(h: any, canal: "whatsapp" | "email" = "whatsapp") {
  const acomp = (h.acompanhantes || []).map((a: any) => ({
    nome: a.nome,
    cpf: formatCPF(a.cpf),
    nascimento: formatDate(a.nascimento),
  }));
  return {
    tipo_documento: "ficha_hospede",
    canal,
    hospedagem_id: h.id,
    logo_url: getPublicAssetUrl(SYSTEM_LOGO_PATH),
    acomodacao: h.acomodacao?.nome ?? "",
    checkin: formatDate(h.checkin),
    checkout: formatDate(h.checkout),
    adultos: h.adultos,
    criancas: h.criancas,
    hospede: {
      nome: h.hospede?.nome ?? "",
      cpf: formatCPF(h.hospede?.cpf),
      nascimento: formatDate(h.hospede?.nascimento),
      telefone: formatPhone(h.hospede?.telefone),
      email: h.hospede?.email ?? "",
      endereco: h.hospede?.endereco ?? "",
      cidade: h.hospede?.cidade ?? "",
      uf: h.hospede?.uf ?? "",
      cep: h.hospede?.cep ?? "",
      placa_veiculo: h.hospede?.placa_veiculo ?? "",
    },
    acompanhantes: acomp,
  };
}

export function payloadFichaHospede(h: any, canal: "whatsapp" | "email" = "whatsapp") {
  const payload = payloadFichaHospedeBase(h, canal);
  return {
    ...payload,
    template_nome: "ficha_hospede_lusitania_v2",
    template_html: buildFichaHospedeHtml(payload),
  };
}

function payloadControleConsumoBase(h: any, itens: any[], canal: "whatsapp" | "email" = "email") {
  return {
    tipo_documento: "controle_consumo",
    canal,
    hospedagem_id: h.id,
    acomodacao: h.acomodacao?.nome ?? "",
    checkin: formatDate(h.checkin),
    checkout: formatDate(h.checkout),
    valor_hospedagem: Number(h.valor_hospedagem || 0),
    valor_consumo: Number(h.valor_consumo || 0),
    valor_danos: Number(h.valor_danos || 0),
    desconto: Number(h.desconto || 0),
    valor_total: Number(h.valor_total || 0),
    valor_pago: Number(h.valor_pago || 0),
    saldo: Number(h.saldo || 0),
    observacoes: h.observacoes ?? "",
    nf: h.nf ?? "",
    itens: (itens || []).map((i) => ({
      produto: i.nome_produto,
      quantidade: i.quantidade,
      valor_unitario: Number(i.valor_unitario),
      valor_total: Number(i.valor_total),
    })),
  };
}

export function payloadControleConsumo(h: any, itens: any[], canal: "whatsapp" | "email" = "email") {
  const payload = payloadControleConsumoBase(h, itens, canal);
  return {
    ...payload,
    template_nome: "controle_consumo_lusitania_v2",
    template_html: buildControleConsumoHtml(payload),
  };
}

export function payloadEventoHospedagem(params: {
  evento: string;
  status: string;
  hospedagem: any;
  acompanhantes?: any[];
  itens?: any[];
  extras?: Record<string, any>;
}) {
  const h = params.hospedagem;

  return {
    tipo_documento: "evento_hospedagem",
    evento: params.evento,
    status: params.status,
    enviado_em: new Date().toISOString(),
    hospedagem: {
      id: h.id,
      origem: h.origem ?? "",
      acomodacao_id: h.acomodacao_id ?? "",
      acomodacao: h.acomodacao?.nome ?? h.acomodacao_nome ?? "",
      checkin: formatDate(h.checkin),
      checkout: formatDate(h.checkout),
      adultos: Number(h.adultos || 0),
      criancas: Number(h.criancas || 0),
      qtd_diarias: Number(h.qtd_diarias || 0),
      valor_diaria: Number(h.valor_diaria || 0),
      valor_hospedagem: Number(h.valor_hospedagem || 0),
      valor_consumo: Number(h.valor_consumo || 0),
      valor_danos: Number(h.valor_danos || 0),
      desconto: Number(h.desconto || 0),
      valor_total: Number(h.valor_total || 0),
      valor_pago: Number(h.valor_pago || 0),
      saldo: Number(h.saldo || 0),
      observacoes: h.observacoes ?? "",
      nf: h.nf ?? "",
    },
    hospede: {
      id: h.hospede?.id ?? h.hospede_id ?? "",
      nome: h.hospede?.nome ?? h.hospede_nome ?? "",
      cpf: formatCPF(h.hospede?.cpf ?? h.hospede_cpf),
      nascimento: formatDate(h.hospede?.nascimento ?? h.hospede_nascimento),
      telefone: formatPhone(h.hospede?.telefone ?? h.hospede_telefone),
      email: h.hospede?.email ?? h.hospede_email ?? "",
      endereco: h.hospede?.endereco ?? h.hospede_endereco ?? "",
      cidade: h.hospede?.cidade ?? h.hospede_cidade ?? "",
      uf: h.hospede?.uf ?? h.hospede_uf ?? "",
      cep: h.hospede?.cep ?? h.hospede_cep ?? "",
      placa_veiculo: h.hospede?.placa_veiculo ?? h.hospede_placa_veiculo ?? "",
    },
    acompanhantes: (params.acompanhantes ?? h.acompanhantes ?? []).map((a: any) => ({
      nome: a.nome ?? "",
      cpf: formatCPF(a.cpf),
      nascimento: formatDate(a.nascimento),
    })),
    itens: (params.itens ?? []).map((i: any) => ({
      produto: i.nome_produto ?? i.produto ?? "",
      quantidade: Number(i.quantidade || 0),
      valor_unitario: Number(i.valor_unitario || 0),
      valor_total: Number(i.valor_total || 0),
    })),
    extras: params.extras ?? {},
  };
}
