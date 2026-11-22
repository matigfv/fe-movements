# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
People and families tracking personal or household money, alone or sharing a group (workspace) with a partner or family, and small businesses tracking recurring operating expenses. Both audiences are confirmed. The UI is fully in Spanish (es-ES locale, with an English translation available) and adapts its wording to the workspace type (for example "Servicio" vs "Gasto Recurrente").

## Product Purpose
Movements is a personal and small-business finance SPA. Users log movements (debit, credit, income, reimbursement), track recurring services and subscriptions, set budgets per category, set savings goals, and read a dashboard of the month. Success is a user who keeps the ledger current with little effort and can see at a glance what is paid, what is pending, and where they are against their budgets.

## Positioning
Four confirmed differentiators together:
- Shared workspaces with roles (ADMIN, FAMILY, GUEST) and real-time updates over WebSocket.
- Import of bank PDFs (currently Santander Spain: account movements or credit card statement), reporting which movements were already loaded.
- Spending insights against the user's 6-month average, savings goals, balance projection and a usage streak.
- Multi-currency: every movement, budget and service carries its own currency, with totals per currency.

## Operating Context
Used from a browser after a mandatory Keycloak login. The frontend talks to a separate Spring Boot backend over REST and a STOMP WebSocket. Typical sessions: log a purchase, mark a service as paid, create or review a budget, categorize several movements in bulk, import a bank statement. Movements can be exported to CSV and PDF.

## Capabilities and Constraints
- Sections: Dashboard (`/`), Servicios, Presupuestos, Movimientos, Metas de ahorro, Utilidades (recovery-time calculator), Ajustes, Ayuda, Admin.
- Roles gate access per route: ADMIN, FAMILY, GUEST.
- Runtime configuration is injected through `window.env`; there are no `.env` files.
- Built on React 19, TypeScript, Vite, TanStack Router and Query, and Ant Design 6 (locale es-ES).
- Light and dark themes exist.
- Bank PDF import supports Santander Spain only for now.

## Brand Commitments
The official product name is **Movements**. Current inconsistencies to align later: the HTML title and browser tab say "Movements" and the footer says "M-1". Existing assets: `public/favicon.png` (app logo, used in the navbar) and `public/robot.png`.

## Evidence on Hand
- `docs/template.mp4` and `docs/template.gif`: a 40-second demo video of the real app, plus the README tutorial.
- A screen recording of the production app was used as the visual reference for that video (not stored in the repository).
- `src/i18n/locales/es.json` and `en.json` hold the product's real copy.
- No testimonials, customer names, benchmarks, pricing or licensing information exist in the repository. Future work must not invent them.

## Product Principles
- Logging a movement must stay fast: the common actions (add, categorize in bulk, mark as paid) are never buried.
- Money state is read at a glance: pending, paid and over-budget states are always visible without opening anything.
- Real data over decoration: the interface shows the user's own numbers, with each currency kept distinct.
- Shared groups stay trustworthy: roles and who loaded what are always clear.
- The product speaks plain, warm Spanish, and its copy is consistent across screens and workspace types.
