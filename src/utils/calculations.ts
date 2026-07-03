export function calcQtdDiarias(checkin: string, checkout: string): number {
  if (!checkin || !checkout) return 1;
  const a = new Date(checkin + "T00:00:00");
  const b = new Date(checkout + "T00:00:00");
  const diff = Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(1, diff);
}

export function calcHospedagem(params: {
  qtdDiarias: number;
  valorDiaria: number;
  valorConsumo: number;
  valorDanos: number;
  desconto: number;
  valorPago: number;
}) {
  const valor_hospedagem = params.qtdDiarias * params.valorDiaria;
  const valor_total =
    valor_hospedagem + (params.valorConsumo || 0) + (params.valorDanos || 0) - (params.desconto || 0);
  const saldo = valor_total - (params.valorPago || 0);
  return { valor_hospedagem, valor_total, saldo };
}
