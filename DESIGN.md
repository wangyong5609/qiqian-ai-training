# Visual Design System

This project uses a blue-white, product-first interface for the 企犇牛 tax-risk assessment product. The direction is inspired by Apple's quiet web surfaces: white canvas, restrained cards, single blue action color, and product imagery that carries the premium feeling.

## Tokens

- Canvas: `#ffffff`
- Surface soft: `#f5f5f7`
- Surface card: `#ffffff`
- Surface blue soft: `#eaf2ff`
- Surface dark: `#0b1220`
- Surface dark elevated: `#111827`
- Hairline: `#dbe5f3`
- Hairline soft: `#edf2f9`
- Ink: `#1d1d1f`
- Body: `#1f2937`
- Muted: `#6b7280`
- Primary blue: `#0066cc`
- Primary active: `#004f9e`
- Focus blue: `#0071e3`
- Sky blue: `#2997ff`
- Success: `#0f9f6e`
- Warning: `#f59e0b`
- Error: `#d92d20`

## Typography

- Display and UI text use the system stack: `system-ui`, `-apple-system`, `SF Pro Display/Text`, `PingFang SC`, `Microsoft YaHei`, sans-serif.
- Headlines use weight 600 with subtle negative letter spacing.
- Body copy defaults to 17px with a 1.47 line-height.
- Buttons, labels, table headings, and badges use concise sans text with weight 500 or 600.

## Components

- Primary actions use blue fill, white text, and pill radius.
- Secondary actions use white canvas, blue hover/focus state, and a soft hairline border.
- Content cards use white backgrounds with 1px hairline borders and minimal shadow.
- Homepage imagery should be blue-white product/UI imagery, not decorative illustration.
- Product imagery may use a single soft product shadow; cards and buttons should stay mostly flat.
- The main page alternates white surfaces, soft-blue utility cards, one blue callout band, and dark-navy admin/action surfaces.
- The admin page prioritizes a scan-friendly table, compact copy buttons, and expandable answer detail rows.

## Interaction

- Assessment results are dynamically calculated from selected answers.
- CTA hover states should be visible but restrained: blue darkening plus small movement.
- Lead submissions must write to Cloudflare D1 before returning success.
- Admin authentication uses challenge-response login and an HttpOnly session cookie.
- Admin passwords are never sent as cleartext request fields.
