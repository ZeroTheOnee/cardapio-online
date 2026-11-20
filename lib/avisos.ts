// Envio dos avisos de pedido novo (notificação push). SÓ para rotas de servidor:
// recebe um cliente Supabase com a chave service_role.
import * as webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";

export const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://pedeeasy.com.br";

export type Aviso = {
  titulo: string;
  texto: string;
  url: string;
  icon?: string; // ícone da notificação (ex.: o da loja)
  tag?: string; // mesma tag substitui a notificação anterior (ex.: id do pedido)
  fixa?: boolean; // false = some sozinha (para o cliente)
};

export async function enviarAvisos(
  admin: SupabaseClient,
  lojaId: string,
  aviso: Aviso
) {
  const resultado = { push: 0 };

  // Push
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const assunto = process.env.VAPID_SUBJECT;
  if (pub && priv && assunto) {
    webpush.setVapidDetails(assunto, pub, priv);
    const { data: subs } = await admin
      .from("push_inscricoes")
      .select("id, endpoint, p256dh, auth")
      .eq("loja_id", lojaId);
    await Promise.all(
      (subs ?? []).map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            JSON.stringify(aviso),
            { TTL: 600, urgency: "high" }
          );
          resultado.push++;
        } catch (e) {
          const code = (e as { statusCode?: number }).statusCode;
          // aparelho que desinstalou ou revogou a permissão
          if (code === 404 || code === 410) {
            await admin.from("push_inscricoes").delete().eq("id", s.id);
          }
        }
      })
    );
  }

  return resultado;
}

// Aviso ao CLIENTE sobre um pedido: vai para os aparelhos inscritos naquele pedido.
export async function enviarAvisoPedido(
  admin: SupabaseClient,
  pedidoId: string,
  aviso: Aviso
) {
  const resultado = { push: 0 };
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const assunto = process.env.VAPID_SUBJECT;
  if (!pub || !priv || !assunto) return resultado;
  webpush.setVapidDetails(assunto, pub, priv);

  const { data: subs } = await admin
    .from("push_pedidos")
    .select("id, endpoint, p256dh, auth")
    .eq("pedido_id", pedidoId);
  await Promise.all(
    (subs ?? []).map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(aviso),
          { TTL: 3600, urgency: "high" }
        );
        resultado.push++;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) {
          await admin.from("push_pedidos").delete().eq("id", s.id);
        }
      }
    })
  );
  return resultado;
}
