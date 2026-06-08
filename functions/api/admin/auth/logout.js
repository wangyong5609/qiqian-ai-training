export async function onRequest(context) {
  if (context.request.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, message: "Method not allowed" }), {
      status: 405,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store"
      }
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "Set-Cookie": "qbn_admin_session=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict"
    }
  });
}
