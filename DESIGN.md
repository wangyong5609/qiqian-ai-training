# Visual Design System

This project uses a warm editorial interface inspired by Claude.com's surface rhythm, adapted for the 企犇牛 tax-risk assessment product.

## Tokens

- Canvas: `#faf9f5`
- Surface soft: `#f5f0e8`
- Surface card: `#efe9de`
- Surface dark: `#181715`
- Surface dark elevated: `#252320`
- Hairline: `#e6dfd8`
- Ink: `#141413`
- Body: `#3d3d3a`
- Muted: `#6c6a64`
- Primary coral: `#cc785c`
- Primary active: `#a9583e`
- Success: `#5db872`
- Warning: `#d4a017`
- Error: `#c64545`

## Typography

- Display headings use a serif stack: `Cormorant Garamond`, `EB Garamond`, Garamond, `Times New Roman`, serif.
- Body and UI text use Inter and system sans fallbacks.
- Display headings stay regular/medium weight with slight negative letter spacing.
- Buttons, labels, table headings, and badges use sans at 13-14px with medium weight.

## Components

- Primary actions use coral fill with white text and 8px radius.
- Secondary actions use cream canvas with hairline border.
- Content cards use `surface-card` and 12px radius.
- Product/result emphasis uses dark navy panels.
- The main page alternates cream canvas, coral callout, cream cards, and dark result/action surfaces.
- The admin page prioritizes a scan-friendly table, compact copy buttons, and expandable answer detail rows.

## Interaction

- Assessment results are dynamically calculated from selected answers.
- Lead submissions must write to Cloudflare D1 before returning success.
- Admin authentication uses challenge-response login and an HttpOnly session cookie.
- Admin passwords are never sent as cleartext request fields.
