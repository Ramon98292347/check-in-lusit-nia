export const formatBRL = (v: number | string | null | undefined) => {
  const n = typeof v === "string" ? Number(v) : (v ?? 0);
  return (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

export const formatDate = (d: string | Date | null | undefined) => {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d + (d.length === 10 ? "T00:00:00" : "")) : d;
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("pt-BR");
};

export const formatCPF = (cpf: string | null | undefined) => {
  if (!cpf) return "—";
  const c = cpf.replace(/\D/g, "").padStart(11, "0").slice(-11);
  return c.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
};

export const formatPhone = (p: string | null | undefined) => {
  if (!p) return "—";
  const d = p.replace(/\D/g, "");
  if (d.length === 11) return d.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  if (d.length === 10) return d.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  return p;
};

export const STATUS_LABELS: Record<string, string> = {
  pre_cadastro: "Pré-cadastro",
  checkin_confirmado: "Check-in confirmado",
  hospedado: "Hospedado",
  vistoria_pendente: "Vistoria pendente",
  vistoria_realizada: "Vistoria realizada",
  check_out_finalizado: "Check-out finalizado",
  cancelado: "Cancelado",
};

export const ACOMODACAO_STATUS_LABELS: Record<string, string> = {
  disponivel: "Disponível",
  ocupado: "Ocupado",
  em_limpeza: "Em limpeza",
  manutencao: "Manutenção",
  inativo: "Inativo",
};

export const STATUS_VARIANT: Record<string, string> = {
  pre_cadastro: "bg-secondary text-secondary-foreground",
  checkin_confirmado: "bg-accent/30 text-accent-foreground",
  hospedado: "bg-primary text-primary-foreground",
  vistoria_pendente: "bg-yellow-100 text-yellow-900",
  vistoria_realizada: "bg-blue-100 text-blue-900",
  check_out_finalizado: "bg-green-100 text-green-900",
  cancelado: "bg-red-100 text-red-900",
  disponivel: "bg-green-100 text-green-900",
  ocupado: "bg-primary text-primary-foreground",
  em_limpeza: "bg-yellow-100 text-yellow-900",
  manutencao: "bg-red-100 text-red-900",
  inativo: "bg-muted text-muted-foreground",
};
