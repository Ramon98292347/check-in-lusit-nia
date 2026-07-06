import { supabase } from "@/integrations/supabase/client";
import { calcQtdDiarias } from "@/utils/calculations";
import { enviarEventoHospedagem } from "@/services/webhooksService";
import { payloadEventoHospedagem } from "@/utils/payloads";

export const OFFLINE_PRECADASTRO_KEY = "checkin-lusitania-offline-precadastros";

type AcompanhanteInput = {
  nome?: string;
  cpf?: string;
  nascimento?: string;
};

export type PrecadastroOfflineInput = {
  acomodacao_id?: string;
  checkin: string;
  checkout: string;
  adultos: number;
  criancas: number;
  nome: string;
  cpf: string;
  nascimento?: string;
  telefone: string;
  email?: string;
  endereco?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
  placa_veiculo?: string;
  observacoes?: string;
  acompanhantes: AcompanhanteInput[];
};

type OfflineQueueItem = {
  id: string;
  createdAt: string;
  payload: PrecadastroOfflineInput;
};

function readQueue(): OfflineQueueItem[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(OFFLINE_PRECADASTRO_KEY);
  if (!raw) return [];

  try {
    return JSON.parse(raw) as OfflineQueueItem[];
  } catch {
    window.localStorage.removeItem(OFFLINE_PRECADASTRO_KEY);
    return [];
  }
}

function writeQueue(items: OfflineQueueItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(OFFLINE_PRECADASTRO_KEY, JSON.stringify(items));
}

export function getOfflinePrecCadastroCount() {
  return readQueue().length;
}

export function enqueueOfflinePrecCadastro(payload: PrecadastroOfflineInput) {
  const items = readQueue();
  const item = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    payload,
  };
  items.push(item);
  writeQueue(items);
  return item;
}

export function removeOfflinePrecCadastro(queueId: string) {
  const items = readQueue();
  const remaining = items.filter((item) => item.id !== queueId);
  writeQueue(remaining);
  return remaining.length !== items.length;
}

export async function submitPrecCadastroOnline(
  values: PrecadastroOfflineInput,
  cachedAcomodacao?: { id: string; nome: string; valor_diaria: number | null } | null,
) {
  const hospedeId = crypto.randomUUID();
  const hospedagemId = crypto.randomUUID();

  const acomodacao = values.acomodacao_id
    ? cachedAcomodacao ?? (
        await supabase
          .from("acomodacoes")
          .select("id, nome, valor_diaria")
          .eq("id", values.acomodacao_id)
          .maybeSingle()
      ).data
    : null;

  const { error: e1 } = await supabase.from("hospedes").insert({
    id: hospedeId,
    nome: values.nome,
    cpf: values.cpf,
    nascimento: values.nascimento || null,
    telefone: values.telefone,
    email: values.email || null,
    endereco: values.endereco || null,
    cidade: values.cidade || null,
    uf: values.uf?.toUpperCase() || null,
    cep: values.cep || null,
    placa_veiculo: values.placa_veiculo || null,
  });
  if (e1) throw e1;

  const qtd = calcQtdDiarias(values.checkin, values.checkout);
  const valor_diaria = Number(acomodacao?.valor_diaria || 0);

  const { error: e2 } = await supabase.from("hospedagens").insert({
    id: hospedagemId,
    hospede_id: hospedeId,
    acomodacao_id: values.acomodacao_id || null,
    checkin: values.checkin,
    checkout: values.checkout,
    adultos: values.adultos,
    criancas: values.criancas,
    qtd_diarias: qtd,
    valor_diaria,
    valor_hospedagem: qtd * valor_diaria,
    valor_total: qtd * valor_diaria,
    status: "pre_cadastro",
    origem: "pre_cadastro",
    observacoes: values.observacoes || null,
  });
  if (e2) throw e2;

  const acompanhantes = values.acompanhantes.filter((a) => a.nome?.trim());
  if (acompanhantes.length > 0) {
    await supabase.from("acompanhantes").insert(
      acompanhantes.map((a) => ({
        id: crypto.randomUUID(),
        hospedagem_id: hospedagemId,
        nome: a.nome,
        cpf: a.cpf || null,
        nascimento: a.nascimento || null,
      })),
    );
  }

  await enviarEventoHospedagem({
    hospedagem_id: hospedagemId,
    evento: "novo_precadastro",
    status: "pre_cadastro",
    payload: payloadEventoHospedagem({
      evento: "novo_precadastro",
      status: "pre_cadastro",
      hospedagem: {
        id: hospedagemId,
        hospede_id: hospedeId,
        acomodacao_id: values.acomodacao_id || null,
        acomodacao_nome: acomodacao?.nome ?? "",
        checkin: values.checkin,
        checkout: values.checkout,
        adultos: values.adultos,
        criancas: values.criancas,
        qtd_diarias: qtd,
        valor_diaria,
        valor_hospedagem: qtd * valor_diaria,
        valor_total: qtd * valor_diaria,
        origem: "pre_cadastro",
        observacoes: values.observacoes || "",
        hospede_nome: values.nome,
        hospede_cpf: values.cpf,
        hospede_nascimento: values.nascimento || null,
        hospede_telefone: values.telefone,
        hospede_email: values.email || "",
        hospede_endereco: values.endereco || "",
        hospede_cidade: values.cidade || "",
        hospede_uf: values.uf?.toUpperCase() || "",
        hospede_cep: values.cep || "",
        hospede_placa_veiculo: values.placa_veiculo || "",
      },
      acompanhantes,
    }),
  });

  return {
    hospedagemId,
    hospedeId,
    acomodacao,
    acompanhantes,
    qtd,
    valor_diaria,
  };
}

export async function syncPendingPrecCadastros() {
  const items = readQueue();
  if (items.length === 0) {
    return { synced: 0, failed: 0 };
  }

  const remaining: OfflineQueueItem[] = [];
  let synced = 0;
  let failed = 0;

  for (const item of items) {
    try {
      await submitPrecCadastroOnline(item.payload);
      synced += 1;
    } catch {
      remaining.push(item);
      failed += 1;
    }
  }

  writeQueue(remaining);
  return { synced, failed };
}

export function notifyBrowser(title: string, body: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission === "granted") {
    new Notification(title, { body });
  }
}
