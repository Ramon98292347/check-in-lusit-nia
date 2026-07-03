import { supabase } from "@/integrations/supabase/client";

export async function enviarWebhook(opts: {
  hospedagem_id: string;
  tipo_documento: string;
  canal: string;
  chave_webhook: string;
  payload: any;
}) {
  // Busca URL configurada
  const { data: cfg } = await supabase
    .from("configuracoes_sistema")
    .select("valor")
    .eq("chave", opts.chave_webhook)
    .maybeSingle();

  const url = cfg?.valor?.trim();
  let status = "erro";
  let resposta: any = null;

  if (!url) {
    await supabase.from("documentos_gerados").insert({
      hospedagem_id: opts.hospedagem_id,
      tipo_documento: opts.tipo_documento,
      canal: opts.canal,
      status: "sem_webhook",
      payload: opts.payload,
      resposta_webhook: { erro: "Webhook não configurado" },
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
    resposta = { status: r.status, ok: r.ok };
    status = r.ok ? "enviado" : "erro";
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
  } catch (e: any) {
    resposta = { erro: e.message };
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
