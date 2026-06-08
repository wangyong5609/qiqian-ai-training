import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import test from "node:test";

async function importFunction(path) {
  const source = await readFile(path, "utf8");
  const url = `data:text/javascript;charset=utf-8,${encodeURIComponent(source)}`;
  return import(url);
}

function createRequest(body, init = {}) {
  return new Request("https://example.com/api/leads", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(init.headers || {}) },
    body: JSON.stringify(body)
  });
}

function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

function createDb() {
  const records = [];
  return {
    records,
    prepare(sql) {
      return {
        bind(...values) {
          return {
            async run() {
              records.push({ sql, values });
              return { success: true };
            },
            async all() {
              return { results: records.map((record) => rowFromValues(record.values)) };
            }
          };
        },
        async all() {
          return { results: records.map((record) => rowFromValues(record.values)) };
        }
      };
    }
  };
}

function rowFromValues(values) {
  return {
    lead_id: values[0],
    name: values[1],
    phone: values[2],
    city: values[3],
    wechat: values[4],
    industry: values[5],
    score: values[6],
    level: values[7],
    title: values[8],
    high_items: values[9],
    warn_items: values[10],
    report_json: values[11],
    answers_json: values[12],
    received_at: values[13]
  };
}

const validPayload = {
  name: "王总",
  phone: "13800138000",
  city: "成都",
  wechat: "wx-qbn",
  consent: true,
  report: {
    industry: "科技服务",
    score: 72,
    level: "红色警报",
    title: "税务风险测评",
    highItems: ["发票风险"],
    warnItems: ["合同风险"],
    answers: [
      {
        questionTitle: "发票是否匹配？",
        riskName: "发票风险",
        selectedOptionText: "经常事后补资料，差异较多",
        score: 7,
        fix: "补齐发票链条。"
      }
    ]
  }
};

test("lead submission stores full report in D1 without calling webhook", async () => {
  const { onRequest } = await importFunction("functions/api/leads.js");
  const DB = createDb();
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;
  globalThis.fetch = async () => {
    fetchCalls += 1;
    return new Response("{}", { status: 200 });
  };

  try {
    const response = await onRequest({
      request: createRequest(validPayload),
      env: { DB }
    });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.ok, true);
    assert.equal(body.storage.stored, true);
    assert.equal(fetchCalls, 0);
    assert.equal(DB.records.length, 1);
    assert.equal(DB.records[0].values[1], "王总");
    assert.equal(DB.records[0].values[5], "科技服务");
    assert.equal(JSON.parse(DB.records[0].values[11]).answers[0].riskName, "发票风险");
    assert.equal(JSON.parse(DB.records[0].values[12])[0].selectedOptionText, "经常事后补资料，差异较多");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("lead submission fails when D1 is not configured", async () => {
  const { onRequest } = await importFunction("functions/api/leads.js");
  const originalError = console.error;
  console.error = () => {};

  try {
    const response = await onRequest({
      request: createRequest(validPayload),
      env: {}
    });
    const body = await response.json();

    assert.equal(response.status, 500);
    assert.equal(body.ok, false);
  } finally {
    console.error = originalError;
  }
});

test("lead submission accepts wechat-only contact and exposes CORS headers", async () => {
  const { onRequest } = await importFunction("functions/api/leads.js");
  const DB = createDb();
  const response = await onRequest({
    request: createRequest({
      ...validPayload,
      phone: "",
      city: "天津",
      wechat: "收拾收拾"
    }),
    env: { DB }
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), "*");
  assert.equal(DB.records[0].values[2], "");
  assert.equal(DB.records[0].values[3], "天津");
  assert.equal(DB.records[0].values[4], "收拾收拾");

  const optionsResponse = await onRequest({
    request: new Request("https://example.com/api/leads", {
      method: "OPTIONS",
      headers: {
        Origin: "http://127.0.0.1:4173",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "Content-Type"
      }
    }),
    env: { DB }
  });

  assert.equal(optionsResponse.status, 204);
  assert.equal(optionsResponse.headers.get("Access-Control-Allow-Origin"), "*");
  assert.match(optionsResponse.headers.get("Access-Control-Allow-Headers"), /Content-Type/);
});

test("admin login rejects cleartext password and session can read leads", async () => {
  const leadModule = await importFunction("functions/api/leads.js");
  const challengeModule = await importFunction("functions/api/admin/auth/challenge.js");
  const loginModule = await importFunction("functions/api/admin/auth/login.js");
  const adminModule = await importFunction("functions/api/admin/leads.js");
  const DB = createDb();
  const env = {
    DB,
    ADMIN_USERNAME: "sales",
    ADMIN_PASSWORD_SALT: "salt-a",
    ADMIN_PASSWORD_HASH: sha256("salt-a:correct-password"),
    ADMIN_SESSION_SECRET: "session-secret"
  };

  await leadModule.onRequest({
    request: createRequest(validPayload),
    env
  });

  const challengeResponse = await challengeModule.onRequest({
    request: new Request("https://example.com/api/admin/auth/challenge?username=sales"),
    env
  });
  const challenge = await challengeResponse.json();
  const passwordHash = sha256("salt-a:correct-password");
  const proof = sha256(`${passwordHash}:${challenge.challengeToken}`);

  const rejected = await loginModule.onRequest({
    request: new Request("https://example.com/api/admin/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "sales",
        challengeToken: challenge.challengeToken,
        proof,
        password: "correct-password"
      })
    }),
    env
  });
  assert.equal(rejected.status, 400);

  const login = await loginModule.onRequest({
    request: new Request("https://example.com/api/admin/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "sales",
        challengeToken: challenge.challengeToken,
        proof
      })
    }),
    env
  });
  assert.equal(login.status, 200);
  const cookie = login.headers.get("Set-Cookie");
  assert.match(cookie, /qbn_admin_session=/);
  assert.match(cookie, /HttpOnly/);

  const denied = await adminModule.onRequest({
    request: new Request("https://example.com/api/admin/leads"),
    env
  });
  assert.equal(denied.status, 401);

  const allowed = await adminModule.onRequest({
    request: new Request("https://example.com/api/admin/leads", {
      headers: { Cookie: cookie.split(";")[0] }
    }),
    env
  });
  const body = await allowed.json();

  assert.equal(allowed.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.leads.length, 1);
  assert.equal(body.leads[0].phone, "13800138000");
  assert.equal(body.leads[0].wechat, "wx-qbn");
  assert.equal(body.leads[0].answers[0].riskName, "发票风险");
});
