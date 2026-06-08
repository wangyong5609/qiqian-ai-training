function jsonResponse(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...extraHeaders
    }
  });
}

function base64UrlEncode(value) {
  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return atob(padded);
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

async function hashHex(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function signToken(claims, secret) {
  const payload = base64UrlEncode(JSON.stringify(claims));
  const signature = await hmacHex(secret, payload);
  return `${payload}.${signature}`;
}

async function verifyToken(token, secret, type, username) {
  const [payload, signature] = String(token || "").split(".");
  if (!payload || !signature) return false;
  const expected = await hmacHex(secret, payload);
  if (expected !== signature) return false;

  let claims;
  try {
    claims = JSON.parse(base64UrlDecode(payload));
  } catch (error) {
    return false;
  }

  return claims.type === type && claims.u === username && claims.exp > Date.now();
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== "POST") {
    return jsonResponse({ ok: false, message: "Method not allowed" }, 405);
  }

  if (!env || !env.ADMIN_USERNAME || !env.ADMIN_PASSWORD_HASH || !env.ADMIN_SESSION_SECRET) {
    return jsonResponse({ ok: false, message: "后台登录未配置" }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch (error) {
    return jsonResponse({ ok: false, message: "请求格式错误" }, 400);
  }

  if (Object.prototype.hasOwnProperty.call(body, "password")) {
    return jsonResponse({ ok: false, message: "Password must not be sent" }, 400);
  }

  const username = String(body.username || "").trim();
  const challengeToken = String(body.challengeToken || "");
  const proof = String(body.proof || "");
  if (username !== env.ADMIN_USERNAME) {
    return jsonResponse({ ok: false, message: "账号或密码错误" }, 401);
  }

  const challengeValid = await verifyToken(challengeToken, env.ADMIN_SESSION_SECRET, "challenge", username);
  const expectedProof = await hashHex(`${env.ADMIN_PASSWORD_HASH}:${challengeToken}`);
  if (!challengeValid || proof !== expectedProof) {
    return jsonResponse({ ok: false, message: "账号或密码错误" }, 401);
  }

  const sessionToken = await signToken({
    type: "session",
    u: username,
    exp: Date.now() + 12 * 60 * 60 * 1000
  }, env.ADMIN_SESSION_SECRET);

  return jsonResponse({ ok: true }, 200, {
    "Set-Cookie": `qbn_admin_session=${encodeURIComponent(sessionToken)}; Path=/; Max-Age=43200; HttpOnly; Secure; SameSite=Strict`
  });
}
