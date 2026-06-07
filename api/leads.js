const COMPANY_NAME = "企犇牛科技（四川）集团有限公司";

function setJsonHeaders(res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
}

async function readBody(req) {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }
  if (typeof req.body === "string") {
    return JSON.parse(req.body || "{}");
  }

  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
  }
  return raw ? JSON.parse(raw) : {};
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
  if (!report || !report.industry || typeof report.score !== "number") {
    return { error: "缺少测评结果" };
  }

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
      warnItems: Array.isArray(report.warnItems) ? report.warnItems.slice(0, 12) : []
    }
  };
}

function buildLeadMessage(record) {
  return [
    "企犇牛税务风险速测新线索",
    `服务主体：${COMPANY_NAME}`,
    `编号：${record.leadId}`,
    `行业：${record.industry}`,
    `得分：${record.score}`,
    `等级：${record.level}`,
    `称呼：${record.name}`,
    `城市：${record.city}`,
    `手机：${record.phone || "未填写"}`,
    `微信：${record.wechat || "未填写"}`,
    `高危项：${record.highItems.join("、") || "暂无"}`,
    `关注项：${record.warnItems.join("、") || "暂无"}`
  ].join("\n");
}

function isWecomWebhook(url) {
  return url.includes("qyapi.weixin.qq.com/cgi-bin/webhook/send");
}

async function forwardToWebhook(record) {
  const url = process.env.WECOM_WEBHOOK_URL || process.env.LEADS_WEBHOOK_URL;
  if (!url) return { forwarded: false };

  const message = buildLeadMessage(record);
  const isWecom = isWecomWebhook(url);
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(isWecom ? {
      msgtype: "text",
      text: { content: message }
    } : {
      text: message,
      lead: record
    })
  });

  if (!response.ok) {
    throw new Error(`Webhook failed with ${response.status}`);
  }

  let result = null;
  try {
    result = await response.json();
  } catch (error) {
    result = null;
  }

  if (isWecom && result && result.errcode !== 0) {
    throw new Error(`WeCom webhook failed with ${result.errcode}: ${result.errmsg || "unknown error"}`);
  }

  return { forwarded: true, channel: isWecom ? "wecom" : "generic" };
}

module.exports = async function handler(req, res) {
  setJsonHeaders(res);

  if (req.method === "OPTIONS") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ ok: false, message: "Method not allowed" });
  }

  try {
    const body = await readBody(req);
    const validation = validateLead(body);
    if (validation.error) {
      return res.status(400).json({ ok: false, message: validation.error });
    }

    const record = {
      ...validation.lead,
      leadId: `QBN-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      receivedAt: new Date().toISOString(),
      companyName: COMPANY_NAME,
      source: "qibenniu-tax-risk"
    };

    const delivery = await forwardToWebhook(record);
    console.log(JSON.stringify({ event: "tax-risk-lead", delivery, record }));

    return res.status(200).json({
      ok: true,
      leadId: record.leadId,
      delivery
    });
  } catch (error) {
    console.error("lead-submit-failed", error);
    return res.status(500).json({
      ok: false,
      message: "提交失败，请稍后重试"
    });
  }
};
