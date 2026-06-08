CREATE TABLE IF NOT EXISTS leads (
  lead_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  city TEXT NOT NULL,
  wechat TEXT,
  industry TEXT NOT NULL,
  score INTEGER NOT NULL,
  level TEXT,
  title TEXT,
  high_items TEXT NOT NULL DEFAULT '[]',
  warn_items TEXT NOT NULL DEFAULT '[]',
  report_json TEXT NOT NULL DEFAULT '{}',
  answers_json TEXT NOT NULL DEFAULT '[]',
  received_at TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'qibenniu-tax-risk-cloudflare'
);

CREATE INDEX IF NOT EXISTS idx_leads_received_at ON leads (received_at DESC);
