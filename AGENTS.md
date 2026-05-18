# Repository Guidelines

## Project Structure & Module Organization

This repository is a single-page static training manual.

- `index.html` contains all page markup, CSS, and browser JavaScript.
- `DESIGN.md` documents the visual design system used by the page.
- `scripts/deploy-cloudflare.sh` deploys only `index.html` to Cloudflare Pages.
- `package.json` and `package-lock.json` define the Wrangler deployment dependency.
- There is currently no `src/`, `tests/`, or asset directory. Add one only when the project grows beyond a single-file static page.

## Build, Test, and Development Commands

- `npm install` installs the local deployment dependency, `wrangler`.
- `npm run deploy` uploads the current `index.html` to Cloudflare Pages using `scripts/deploy-cloudflare.sh`.
- Local preview can be done by opening `index.html` directly in a browser.
- Optional static checks:
  - `sh -n scripts/deploy-cloudflare.sh` validates the shell script syntax.
  - `npx wrangler whoami` confirms Cloudflare authentication.

## Coding Style & Naming Conventions

Keep the project simple and dependency-light.

- Use 2-space indentation for HTML, CSS, JSON, and shell scripts.
- Keep CSS variables in `:root` and reuse design tokens from `DESIGN.md`.
- Prefer descriptive class names such as `.prompt-card`, `.flow-step`, and `.library-tools`.
- Keep visible Chinese copy concise and training-oriented.
- Do not introduce frameworks unless there is a clear need.

## Testing Guidelines

There is no automated test suite yet. Before committing, verify manually:

- Open `index.html` in a browser and check desktop and mobile widths.
- Confirm menu switching, prompt search, and “复制提示词” buttons work.
- Confirm the prompt count remains accurate after adding or removing prompt cards.
- If deployment changes are made, run `npm run deploy` and verify the Pages URL returns the updated content.

## Commit & Pull Request Guidelines

The current history uses concise imperative commits, for example:

- `Add AI training manual site`

Use the same style: short, action-based, and specific. Pull requests should include:

- A brief summary of content or visual changes.
- Screenshots for visual changes.
- The verification steps performed.
- Any Cloudflare deployment impact or URL changes.

## Security & Configuration Tips

Do not commit Cloudflare tokens, account IDs, or private customer data. Keep `.wrangler/`, `node_modules/`, editor settings, and logs out of Git. The training manual should use mock or anonymized examples only.
