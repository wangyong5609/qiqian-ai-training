# Repository Guidelines

## Product Context

This repository is a mobile-first tax-risk assessment funnel for 企犇牛科技（四川）集团有限公司.

Primary user flow:

1. Open the site from a WeChat QR code.
2. Tap “开始测评”.
3. Choose an industry.
4. Answer 10 industry-specific questions.
5. View the risk result.
6. Leave contact details to receive the report.

Mobile WeChat usage is the priority. Desktop should work, but do not optimize desktop at the expense of phone conversion.

## Project Structure

- `index.html` contains the public assessment page markup.
- `admin.html` contains the admin lead-management page markup.
- `assets/app.js` contains public-page interaction logic.
- `assets/data.js` contains industries, questions, options, and actions.
- `assets/scoring.js` contains score/report calculation.
- `assets/site.css` contains all visual styling and responsive rules.
- `assets/hero-risk-dashboard.png` is the homepage product preview image.
- `functions/api/leads.js` stores submitted leads in Cloudflare D1.
- `functions/api/admin/auth/*.js` handles admin challenge/login/logout.
- `functions/api/admin/leads.js` returns recent leads for the admin UI.
- `schema.sql` defines the D1 `leads` table.
- `test/` contains Node built-in tests for scoring, lead submission, and admin auth.
- `scripts/deploy-cloudflare.sh` prepares a Cloudflare Pages deployment bundle.

The old `api/` directory is not used by the active Cloudflare Pages Functions setup.

## Commands

Install dependencies:

```sh
npm install
```

Run tests:

```sh
npm test -- --runInBand
```

Syntax checks:

```sh
node --check assets/app.js
node --check functions/api/leads.js
sh -n scripts/deploy-cloudflare.sh
```

Local preview:

```sh
python3 -m http.server 4185
```

Open:

```text
http://127.0.0.1:4185/index.html
```

## Coding Style

- Use 2-space indentation for HTML, CSS, JS, JSON, SQL, and shell scripts.
- Keep the project dependency-light. Do not add a frontend framework unless the user explicitly asks or the project scope changes.
- Keep visible Chinese copy concise and sales/follow-up oriented.
- Reuse existing CSS variables in `:root`.
- Keep cards at `12px` radius or below unless matching existing local styling.
- Avoid decorative-only layout changes. Every mobile change should improve clarity, trust, or conversion.
- Keep UI text and controls inside their containers at 320px, 375px, 390px, and 414px widths.

## Mobile UX Priorities

- The homepage must immediately communicate that this is an assessment tool, not a brochure.
- Important CTAs must appear before users need to scroll far.
- Result page conversion is important:
  - keep the score summary readable and trustworthy;
  - keep “领取完整报告” visible soon after the result summary;
  - preserve the mobile bottom CTA that jumps to the lead form;
  - hide the bottom CTA once the lead form is visible.
- If the user fails to check the consent checkbox, highlight and shake the consent row near the checkbox. Do not rely on an error message at the bottom of the form.
- Submission success should use a modal, not weak inline text.

## Testing Guidelines

Before claiming a fix is complete, run fresh verification.

Minimum for JS/API changes:

```sh
node --check assets/app.js
node --check functions/api/leads.js
npm test -- --runInBand
```

Minimum for deployment script changes:

```sh
sh -n scripts/deploy-cloudflare.sh
```

Manual/mobile checks should cover:

- homepage at 320px, 375px, 390px, and 414px widths;
- no horizontal overflow;
- start button enters industry selection;
- industry selection enters quiz;
- answering 10 questions reaches result page;
- result page report CTA jumps to lead form;
- consent validation highlights the checkbox row;
- successful submission shows the success modal;
- admin login reads leads after refresh.

## Cloudflare Runtime

Production Pages project:

```text
qibenniu-tax-risk
```

Production URL:

```text
https://qibenniu-tax-risk.pages.dev
```

D1:

- Database name: `qibenniu-tax-risk-db`
- Binding name: `DB`
- Table: `leads`

Admin environment variables configured in Cloudflare Pages:

- `ADMIN_USERNAME`
- `ADMIN_PASSWORD_SALT`
- `ADMIN_PASSWORD_HASH`
- `ADMIN_SESSION_SECRET`

Do not commit Cloudflare tokens, account IDs, D1 UUIDs, admin passwords, session secrets, or private customer data.

## Deployment Notes For Future Agents

Try first:

```sh
npm run deploy
```

If Wrangler authentication is unavailable, deploy through the Cloudflare API MCP with a Pages direct upload:

1. Get a Pages upload token from Cloudflare API.
2. Build `.tmp-pages-upload`.
3. Copy:
   - `index.html`
   - `admin.html`
   - `_headers`
   - `assets/`
   - `admin/index.html` copied from `admin.html`
4. Upload `.tmp-pages-upload` using Wrangler direct upload and write `.tmp-pages-manifest.json`.
5. Create a Pages deployment with multipart form data:
   - `manifest`
   - `branch=main`
   - `commit_dirty=true`
   - `_headers`
   - `_worker.js`
6. `_worker.js` must include all API routes and the admin clean URL route.
7. Remove `.tmp-pages-upload` and `.tmp-pages-manifest.json` after deploy.

Important: do not deploy static files without the Worker routing. That can break `/api/*` and admin access.

## Admin Clean URL Pitfall

Cloudflare Pages clean URLs can redirect `admin.html` and `admin/index.html`.

Known failure:

```text
ERR_TOO_MANY_REDIRECTS
```

Root cause from 2026-06-08: Worker tried to fetch `/admin.html` or `/admin/index.html`, while Pages normalized those paths back to `/admin`, creating a redirect loop.

Correct pattern:

- Include `/admin/index.html` in the uploaded manifest.
- For `/admin` and `/admin/`, Worker should fetch the directory path `/admin/`.
- Verify both endpoints after deploy:

```sh
curl -sS -D - -o /dev/null https://qibenniu-tax-risk.pages.dev/admin
curl -sS -D - -o /dev/null https://qibenniu-tax-risk.pages.dev/admin/
```

Both must return `200`.

## Post-Deploy Verification

After every Cloudflare deployment, verify:

```sh
curl -fsSL https://qibenniu-tax-risk.pages.dev/ | rg 'assets/app.js|开始测评'
curl -sS -D - -o /dev/null https://qibenniu-tax-risk.pages.dev/admin
curl -sS -D - -o /dev/null https://qibenniu-tax-risk.pages.dev/admin/
```

Then verify admin auth with the configured credentials:

1. call `/api/admin/auth/challenge`;
2. compute password proof client-side;
3. call `/api/admin/auth/login`;
4. call `/api/admin/leads` with the returned session cookie.

Expected result: login `200`, leads `200`, and a JSON body with `ok: true`.

For lead submission, create only clearly marked test leads and delete only that exact test record after verification. Never delete real leads.

## 2026-06-08 Development And Deployment Record

Completed work:

- Converted the homepage into a mobile-first assessment entry.
- Generated and added a premium product preview image.
- Fixed result text rendering `undefined`.
- Removed the post-assessment copy-report feature.
- Added Cloudflare D1 lead storage.
- Added admin login and lead-management dashboard.
- Added CORS support for local preview submissions.
- Allowed WeChat-only contact submissions.
- Fixed admin session persistence after refresh.
- Improved consent validation with local highlight and shake.
- Changed success feedback from inline text to a modal.
- Redesigned result score from a dark/pie look to a light ring card.
- Added result-page CTAs so users can reach the lead form earlier.
- Fixed the `/admin` Cloudflare redirect loop.

Verified at the end of the day:

- `npm test -- --runInBand` passed 7/7.
- `/admin` and `/admin/` returned `200`.
- Admin login and lead fetch returned `200`.
- Production lead submission returned JSON and wrote to D1.
- Test leads created during verification were deleted afterward.
- Mobile result page at 390px had no horizontal overflow and the CTA jumped to the lead form.

## Security And Data Handling

- Do not commit credentials or tokens.
- Do not put the admin password in README, AGENTS, commits, or issue text.
- Do not expose real customer data in tests, screenshots, or docs.
- Tests should use mock/anonymized records.
- D1 cleanup should target explicit test markers only, such as both a test name and a test WeChat value.

## Commit And PR Guidance

Use concise imperative commit messages, for example:

- `Fix admin clean URL route`
- `Improve mobile result conversion`
- `Add D1 lead storage`

For visual changes, include screenshots or state the mobile widths checked. For deployment changes, include the Pages URL and the verification commands run.
