function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function parseJsonList(value) {
  try {
    return JSON.parse(value || "[]");
  } catch (error) {
    return [];
  }
}

function parseJsonObject(value) {
  try {
    return JSON.parse(value || "{}");
  } catch (error) {
    return {};
  }
}

function getCookie(request, name) {
  const cookie = request.headers.get("Cookie") || "";
  const found = cookie.split(";").map((item) => item.trim()).find((item) => item.startsWith(`${name}=`));
  return found ? decodeURIComponent(found.slice(name.length + 1)) : "";
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

async function verifySession(request, env) {
  const token = getCookie(request, "qbn_admin_session");
  if (!token || !env || !env.ADMIN_SESSION_SECRET) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  const expected = await hmacHex(env.ADMIN_SESSION_SECRET, payload);
  if (expected !== signature) return false;

  let claims;
  try {
    claims = JSON.parse(base64UrlDecode(payload));
  } catch (error) {
    return false;
  }
  return claims.type === "session" && claims.u === env.ADMIN_USERNAME && claims.exp > Date.now();
}

function mapLead(row) {
  const report = parseJsonObject(row.report_json);
  return {
    leadId: row.lead_id,
    name: row.name,
    phone: row.phone,
    city: row.city,
    wechat: row.wechat,
    industry: row.industry,
    score: row.score,
    level: row.level,
    title: row.title,
    highItems: parseJsonList(row.high_items),
    warnItems: parseJsonList(row.warn_items),
    report,
    answers: parseJsonList(row.answers_json),
    receivedAt: row.received_at,
  };
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== "GET") {
    return jsonResponse({ ok: false, message: "Method not allowed" }, 405);
  }

  if (!await verifySession(request, env)) {
    return jsonResponse({ ok: false, message: "Unauthorized" }, 401);
  }

  if (!env.DB) {
    return jsonResponse({ ok: false, message: "未配置 D1 数据库绑定 DB" }, 500);
  }

  const result = await env.DB.prepare(`
    SELECT
      lead_id,
      name,
      phone,
      city,
      wechat,
      industry,
      score,
      level,
      title,
      high_items,
      warn_items,
      report_json,
      answers_json,
      received_at
    FROM leads
    ORDER BY received_at DESC
    LIMIT 200
  `).all();

  return jsonResponse({
    ok: true,
    leads: (result.results || []).map(mapLead)
  });
}
