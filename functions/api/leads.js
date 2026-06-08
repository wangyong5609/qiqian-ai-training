const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...corsHeaders
    }
  });
}

function sanitizeText(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

function validateLead(body) {
  const name = sanitizeText(body.name, 40);
  const phone = sanitizeText(body.phone, 20);
  const city = sanitizeText(body.city, 40);
  const wechat = sanitizeText(body.wechat, 80);
  const report = body.report && typeof body.report === "object" ? body.report : null;

  if (!name) return { error: "请填写称呼" };
  if (!phone && !wechat) return { error: "请至少填写手机号或微信号" };
  if (phone && !/^1\d{10}$/.test(phone)) return { error: "手机号格式不正确" };
  if (!city) return { error: "请选择所在城市" };
  if (!body.consent) return { error: "请确认授权说明" };
  if (!report || !report.industry || typeof report.score !== "number" || !Array.isArray(report.answers)) {
    return { error: "缺少测评结果" };
  }

  const answers = report.answers.slice(0, 24).map((answer) => ({
    questionTitle: sanitizeText(answer.questionTitle, 180),
    questionDesc: sanitizeText(answer.questionDesc, 300),
    riskName: sanitizeText(answer.riskName, 80),
    selectedOptionText: sanitizeText(answer.selectedOptionText, 220),
    score: Number(answer.score) || 0,
    fix: sanitizeText(answer.fix, 220),
    tag: sanitizeText(answer.tag, 20)
  }));

  return {
    lead: {
      name,
      phone,
      city,
      wechat,
      industry: sanitizeText(report.industry, 40),
      score: report.score,
      level: sanitizeText(report.level, 40),
      title: sanitizeText(report.title, 120),
      highItems: Array.isArray(report.highItems) ? report.highItems.slice(0, 12) : [],
      warnItems: Array.isArray(report.warnItems) ? report.warnItems.slice(0, 12) : [],
      report: {
        industry: sanitizeText(report.industry, 40),
        industryKey: sanitizeText(report.industryKey, 40),
        score: report.score,
        level: sanitizeText(report.level, 40),
        title: sanitizeText(report.title, 120),
        message: sanitizeText(report.message, 300),
        highItems: Array.isArray(report.highItems) ? report.highItems.slice(0, 12) : [],
        warnItems: Array.isArray(report.warnItems) ? report.warnItems.slice(0, 12) : [],
        answers
      },
      answers
    }
  };
}

async function storeLead(record, env) {
  if (!env || !env.DB) {
    throw new Error("D1 database is not configured");
  }

  await env.DB.prepare(`
    INSERT INTO leads (
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
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    record.leadId,
    record.name,
    record.phone,
    record.city,
    record.wechat,
    record.industry,
    record.score,
    record.level,
    record.title,
    JSON.stringify(record.highItems),
    JSON.stringify(record.warnItems),
    JSON.stringify(record.report),
    JSON.stringify(record.answers),
    record.receivedAt
  ).run();

  return { stored: true };
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Allow": "POST, OPTIONS",
        "Cache-Control": "no-store",
        ...corsHeaders
      }
    });
  }

  if (request.method !== "POST") {
    return jsonResponse({ ok: false, message: "Method not allowed" }, 405);
  }

  try {
    const body = await request.json();
    const validation = validateLead(body);
    if (validation.error) {
      return jsonResponse({ ok: false, message: validation.error }, 400);
    }

    const record = {
      ...validation.lead,
      leadId: `QBN-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      receivedAt: new Date().toISOString(),
      source: "qibenniu-tax-risk-cloudflare"
    };

    const storage = await storeLead(record, env);
    console.log(JSON.stringify({
      event: "tax-risk-lead",
      storage,
      leadId: record.leadId,
      industry: record.industry,
      score: record.score,
      receivedAt: record.receivedAt
    }));

    return jsonResponse({
      ok: true,
      leadId: record.leadId,
      storage
    });
  } catch (error) {
    console.error("lead-submit-failed", error);
    return jsonResponse({ ok: false, message: "提交失败，请稍后重试" }, 500);
  }
}
