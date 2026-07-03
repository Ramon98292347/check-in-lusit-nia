import { formatDate, formatCPF, formatPhone } from "./formatters";

export function payloadFichaHospede(h: any, canal: "whatsapp" | "email" = "whatsapp") {
  const acomp = (h.acompanhantes || []).map((a: any) => ({
    nome: a.nome,
    cpf: formatCPF(a.cpf),
    nascimento: formatDate(a.nascimento),
  }));
  return {
    tipo_documento: "ficha_hospede",
    canal,
    hospedagem_id: h.id,
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

export function payloadControleConsumo(h: any, itens: any[], canal: "whatsapp" | "email" = "email") {
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
