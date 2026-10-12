# CLAUDE.md — tenant-portal

## What this project is
A tenant screening portal for a low-income (LIHTC / Section 42) property. Its job is to
collect applicant information and documents, extract and pre-calculate the numbers, and hand
a clean, verifiable package to a human reviewer who completes the official CTCAC Tenant
Income Certification (TIC) form. The system NEVER makes a final eligibility determination —
a human always decides.

## Golden rules (do not violate)
1. The rules engine is pure, deterministic TypeScript. No LLM, no randomness, no network
   calls in the rules path.
2. Extraction proposes, rules calculate, a human decides. These three stages stay separate.
3. Applications are versioned. Editing a submitted application creates a NEW version; never
   overwrite or mutate a prior version.
4. The demographic data table is isolated for HERA reporting ONLY. It must never be imported,
   joined, or referenced by the rules engine, decision views, or waitlist ordering. Any such
   reference is a bug.
5. All thresholds (income cap, occupancy limits, passbook rate, asset threshold) live in
   versioned configuration, never hardcoded in logic.
6. Every screening rule has unit tests. Rules code does not merge with failing/missing tests.
7. Follow the iOS design system below for every UI. No ad-hoc styling — use the tokens and
   shared components.

## Architecture — three-stage pipeline
- Extraction: reads uploaded income/identity documents and PROPOSES field values, behind a
  swappable interface. Dev uses a FakeExtractor; real extraction uses Tesseract OCR (CPU-only).
  A vision LLM is a fallback only if Tesseract proves insufficient.
- Screening: deterministic TypeScript over verified inputs.
- Review: a human verifies proposed values and decides. The app pre-fills the TIC form.

## Screening rules (from the CTCAC TIC form)
- Income cap: a hard maximum in versioned config. Over the cap → fail.
- Occupancy: households above the size limit auto-deny; borderline cases route to human review.
- Full-time student households (TIC Part VII): ineligible unless one of the five specific
  exemptions applies.
- Asset imputation (TIC Part IV): when total asset cash value exceeds the configured threshold,
  compute imputed income at the passbook rate, compare against actual asset income, and add the
  GREATER of the two to gross income.
- Rules combine; a result surfaces ALL failure reasons, not just the first.

## Data model
- Postgres on Neon free tier (no Docker; this runs on an 8GB M2 Air).
- Versioned applications; append-only where feasible.
- Demographic table physically and logically isolated (see Golden Rule 4).
- Keep secrets and documents out of git.

## Auth
- Magic-link sign-in for applicants and reviewers.
- Reviewers additionally require a TOTP second factor. (Two magic links = same factor twice —
  don't do that.)

## iOS design system (core requirement)
This web app must FEEL like a native iOS app. Build a design system modeled on Apple's Human
Interface Guidelines and route ALL styling through it.

Tokens (define once as CSS variables + a tokens file; every component consumes them):
- Font stack: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display",
  "Helvetica Neue", sans-serif.
- Type scale: LargeTitle 34 / Title1 28 / Title2 22 / Title3 20 / Headline 17 semibold /
  Body 17 / Callout 16 / Subhead 15 / Footnote 13 / Caption 12.
- Color: iOS system palette via semantic tokens — systemBlue #007AFF primary, systemGreen
  success, systemRed destructive, label / secondaryLabel / tertiaryLabel grays, grouped vs.
  content backgrounds. Full light AND dark mode.
- Radii: continuous, generous — ~12px cards, ~10px controls, pill/full for buttons and chips.
- Spacing: 16px base gutter; grouped inset sections.

Patterns:
- Large-title nav headers that collapse to inline titles on scroll.
- Bottom tab bar for primary navigation on mobile.
- Grouped inset lists/cards; rows with trailing chevrons.
- Modals as bottom sheets that slide up.
- Native-style controls: switches (not checkboxes), segmented controls, steppers.
- Respect safe-area insets via env(safe-area-inset-*).
- Subtle spring-like transitions. Dynamic-Type-style scaling; maintain contrast.

## Tech stack
- Next.js (App Router), TypeScript.
- Strict TypeScript with noUncheckedIndexedAccess. Type errors block commits.
- Neon Postgres. vitest for tests. Tesseract OCR for extraction (FakeExtractor in dev).

## Working conventions
- Small, verifiable steps. After each working milestone: run the type check and tests, then
  commit with a clear message and push.
- Never commit .env, documents, or secrets.
- Prefer clarity over cleverness; this code will be audited.

## Elevation, materials & motion (depth is required)
Flat is wrong. Every surface must read as layered, and interactive elements must respond to touch.

Background layering (this is what creates depth — cards sit ON a recessed base):
- Grouped base background: #F2F2F7 light / #000000 dark.
- Card / content surface: #FFFFFF light / #1C1C1E dark.
- Elevated surface (sheets, menus): #2C2C2E dark.

Shadows — always soft and two-part, never a single hard shadow:
- --shadow-card: 0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06)
- --shadow-elevated: 0 4px 16px rgba(0,0,0,0.12), 0 16px 48px rgba(0,0,0,0.16)
- Dark mode: lean on layer contrast + a hairline top highlight (inset 0 0.5px rgba(255,255,255,0.06)) rather than heavy shadow.

Materials (the signature iOS depth cue) — nav header and tab bar are frosted glass:
- Background: rgba(255,255,255,0.72) light / rgba(30,30,30,0.72) dark.
- backdrop-filter: blur(20px) saturate(180%).
- Hairline bottom/top separator: 0.5px rgba(60,60,67,0.29) light / rgba(84,84,88,0.6) dark.

Type polish (this is the "lifted" feel):
- Global: -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale.
- Tracking: LargeTitle -0.4px, Title -0.3px, Headline -0.2px, Body 0.
- Weight hierarchy carries emphasis; labels are near-black, not pure #000. No embossed/heavy text-shadow.

Motion (use framer-motion / motion-react):
- Press feedback on all buttons, rows, and toggles: scale 0.97 + opacity ~0.9 on press, spring back. Spring ~ stiffness 400, damping 30.
- Switches slide with a spring; bottom sheets spring up (stiffness 300, damping 30).
- Always honor prefers-reduced-motion (disable transforms, keep opacity).

## Text lift (titles only)
Large titles and section headers get a "floating" shadow so glyphs sit above the surface.
Body, captions, labels, and row text stay crisp — never shadow them.
- --text-lift (light): 0 3px 6px rgba(0,0,0,0.24)
- --text-lift (dark):  0 4px 10px rgba(0,0,0,0.5)
- Apply to: LargeTitle, Title1/2/3, and section header labels ONLY.
- Alternatives if we change our mind (swap the one value):
  - Raised:  0 1px 0 rgba(255,255,255,0.95), 0 2px 3px rgba(0,0,0,0.22)
  - 3D:      0 1px 0 #c6c6ca, 0 2px 0 #b8b8bc, 0 3px 5px rgba(0,0,0,0.28)

## Elevation fix — cards must visibly float
The grouped background (#F2F2F7 light / #000 dark) and white cards need a shadow strong
enough to read, or the layering looks flat.
- --shadow-card: 0 1px 2px rgba(0,0,0,0.05), 0 10px 28px rgba(0,0,0,0.10)

## Filled button — never dim at rest
Filled buttons are solid at rest: bg #007AFF (#0A84FF dark), full opacity, with
0 1px 2px rgba(0,0,0,0.06), 0 6px 16px rgba(0,122,255,0.28). The scale-down + dim is the
PRESSED state only — it must not be the default/resting style.

## Dark mode palette — CORRECTION (do not use pure black)
Pure #000 base with #1C1C1E cards gives near-zero layer contrast and kills all depth.
Replace the dark values:
- Grouped base background: #1C1C1E (NOT #000000)
- Card / content surface:  #2C2C2E (elevated, clearly lighter than the base)
- Elevated surface (sheets/menus): #3A3A3C
Depth in dark mode comes from LAYER CONTRAST + a hairline top highlight, not shadows:
- Card top highlight: inset 0 0.5px 0 rgba(255,255,255,0.08)
- Keep only a faint ambient shadow: 0 1px 3px rgba(0,0,0,0.4)
Frosted bars in dark mode: rgba(30,30,30,0.72) + blur, hairline separator rgba(84,84,88,0.6).
Text: primary #FFFFFF, secondary rgba(235,235,245,0.6). Blue: #0A84FF.

## Hover states (desktop)
Interactive elements respond BEFORE the click, not just on press. Wrap all hover styles in
@media (hover: hover) and pointer: fine so touch devices don't get sticky hover.
- Filled button hover: scale 1.02, brightness 1.08, shadow deepens to
  0 2px 6px rgba(0,0,0,0.10), 0 10px 24px rgba(0,122,255,0.38). Transition ~200ms ease-out.
- Tinted/plain button hover: background tint opacity rises (~0.12 -> 0.20).
- List rows hover: surface lightens subtly + cursor pointer.
- Cards hover: translateY(-4px) with the elevated shadow.
- Full interaction ladder on every control: rest -> hover (lift) -> press (compress 0.96,
  fast spring) -> release (spring back with overshoot).
- cursor: pointer on everything interactive. Honor prefers-reduced-motion (keep color/shadow
  changes, drop transforms).
