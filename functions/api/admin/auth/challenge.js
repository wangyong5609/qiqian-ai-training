function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function base64UrlEncode(value) {
  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function hmacHex(secret, value) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function signToken(claims, secret) {
  const payload = base64UrlEncode(JSON.stringify(claims));
  const signature = await hmacHex(secret, payload);
  return `${payload}.${signature}`;
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== "GET") {
    return jsonResponse({ ok: false, message: "Method not allowed" }, 405);
  }

  if (!env || !env.ADMIN_USERNAME || !env.ADMIN_PASSWORD_SALT || !env.ADMIN_SESSION_SECRET) {
    return jsonResponse({ ok: false, message: "后台登录未配置" }, 500);
  }

  const url = new URL(request.url);
  const username = (url.searchParams.get("username") || "").trim();
  if (username !== env.ADMIN_USERNAME) {
    return jsonResponse({ ok: false, message: "账号或密码错误" }, 401);
  }

  const expiresAt = Date.now() + 5 * 60 * 1000;
  const challengeToken = await signToken({
    type: "challenge",
    u: username,
    exp: expiresAt,
    nonce: crypto.randomUUID()
  }, env.ADMIN_SESSION_SECRET);

  return jsonResponse({
    ok: true,
    salt: env.ADMIN_PASSWORD_SALT,
    challengeToken,
    expiresAt
  });
}
