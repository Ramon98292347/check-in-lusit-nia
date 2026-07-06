const WEBHOOKS_ATIVOS = false;

export async function enviarWebhook(opts: {
  hospedagem_id: string;
  tipo_documento: string;
  canal: string;
  chave_webhook: string;
  chaves_fallback?: string[];
  payload: any;
}) {
  if (!WEBHOOKS_ATIVOS) {
    return {
      status: "desativado",
      hospedagem_id: opts.hospedagem_id,
      tipo_documento: opts.tipo_documento,
      canal: opts.canal,
    };
  }
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
