import { supabase } from "@/integrations/supabase/client";

async function buscarWebhookUrl(chaves: string[]) {
  const unicas = [...new Set(chaves.filter(Boolean))];

  for (const chave of unicas) {
    const { data: cfg } = await supabase
      .from("configuracoes_sistema")
      .select("valor")
      .eq("chave", chave)
      .maybeSingle();

    const url = cfg?.valor?.trim();
    if (url) return { url, chave };
  }

  return { url: "", chave: unicas[0] ?? "" };
}

export async function enviarWebhook(opts: {
  hospedagem_id: string;
  tipo_documento: string;
  canal: string;
  chave_webhook: string;
  chaves_fallback?: string[];
  payload: any;
}) {
  const { url, chave } = await buscarWebhookUrl([opts.chave_webhook, ...(opts.chaves_fallback ?? [])]);
  let status = "erro";
  let resposta: any = null;

  if (!url) {
    await supabase.from("documentos_gerados").insert({
      hospedagem_id: opts.hospedagem_id,
      tipo_documento: opts.tipo_documento,
      canal: opts.canal,
      status: "sem_webhook",
      payload: opts.payload,
      resposta_webhook: { erro: "Webhook não configurado", chave_tentada: chave || opts.chave_webhook },
      enviado_em: new Date().toISOString(),
    });
    throw new Error("Webhook não configurado. Configure em Configurações.");
  }

  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(opts.payload),
    });
    resposta = { status: r.status, ok: r.ok, chave_utilizada: chave };
    status = r.ok ? "enviado" : "erro";
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
  } catch (e: any) {
    resposta = { erro: e.message, chave_utilizada: chave };
    status = "erro";
    await supabase.from("documentos_gerados").insert({
      hospedagem_id: opts.hospedagem_id,
      tipo_documento: opts.tipo_documento,
      canal: opts.canal,
      status,
      payload: opts.payload,
      resposta_webhook: resposta,
      enviado_em: new Date().toISOString(),
    });
    throw e;
  }

  await supabase.from("documentos_gerados").insert({
    hospedagem_id: opts.hospedagem_id,
    tipo_documento: opts.tipo_documento,
    canal: opts.canal,
    status,
    payload: opts.payload,
    resposta_webhook: resposta,
    enviado_em: new Date().toISOString(),
  });
}

export async function enviarEventoHospedagem(opts: {
  hospedagem_id: string;
  evento: string;
  status: string;
  payload: any;
}) {
  return enviarWebhook({
    hospedagem_id: opts.hospedagem_id,
    tipo_documento: `evento_${opts.evento}`,
    canal: "sistema",
    chave_webhook: "webhook_hotel_eventos",
    chaves_fallback: [
      "webhook_ficha_hospede",
      "webhook_controle_consumo",
      "webhook_whatsapp",
      "webhook_email",
    ],
    payload: opts.payload,
  });
}
