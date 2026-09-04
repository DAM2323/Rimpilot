# RIMPILOT Design System

## Visual language

Derived from the logo: a deep navy field with a violet → blue → cyan gradient and a
sound wave. The product reads as a voice instrument for money — dark, precise and
calm, with light used the way a waveform uses it: to mark what matters.

The gradient is the brand's signature and appears sparingly: the mark, one headline,
one rule. Data surfaces stay quiet so the numbers carry the emphasis.

**Every colour below was measured against the surface it sits on. No value ships on
a guess.**

## Tokens

```css
:root {
  --bg: #080D1A;            /* base                                          */
  --surface: #0F1728;       /* cards, rails                                  */
  --surface-2: #182238;     /* raised: inputs, quote blocks                  */
  --line: #22304F;          /* decorative separators                         */
  --line-strong: #5470A8;   /* form control borders — 3.63:1, meets 1.4.11   */
  --ink: #F2F5FF;           /* primary text — 17.81:1 on bg                  */
  --muted: #9AABCE;         /* secondary text — 8.40:1 on bg                 */
  --cyan: #22D3EE;          /* income, balance, focus — 10.73:1              */
  --blue: #60A5FA;          /* brand text, links — 7.63:1                    */
  --violet: #A78BFA;        /* accent icons — 7.13:1                         */
  --rose: #FB7185;          /* expenses, receivables — 7.21:1                */
  --on-accent: #080D1A;     /* text on a brand fill — 10.73:1 on cyan        */
  --grad: linear-gradient(120deg, #8B5CF6 0%, #3B82F6 52%, #22D3EE 100%);
}
```

### Rules that are not negotiable

- **The logo's violet `#8B5CF6` never carries text.** It measures 4.23:1 on
  `--surface`, below AA. It exists in the gradient and in fills only; for violet
  text use `--violet` (`#A78BFA`).
- **A brand fill takes dark text, never white.** White on `#3B82F6` is 3.68:1 and
  fails. Primary buttons are cyan with `--on-accent` on top.
- **Money is distinguished by meaning, not only colour.** Cyan for what came in,
  rose for what went out or is still owed — always paired with a `+` / `−` sign and
  a distinct icon, so the ledger reads without relying on hue.
- Focus is a 3px cyan ring at 10.73:1. It is never removed.

## Typography

System sans stack, fixed product scale: 0.75rem, 0.875rem, 1rem, 1.125rem, 1.375rem
and 2rem. Data uses tabular numerals. Headings are tightly tracked; body text is not.

## Components

Slim navy navigation rail on desktop with the gradient mark at the top; compact
header on mobile. Surfaces separate with 1px `--line` borders over `--surface`;
no drop shadows — on a dark ground, elevation comes from the surface step, not from
shade. Motion is limited to 180ms state feedback, loading uses skeletons, and every
state works without hover.

## The logo

The mark is an `R` cut by a sound wave, in the brand gradient on navy. The favicon
(`packages/dashboard/app/icon.svg`) is a simplified redraw for small sizes: at 16px
the original's inner counter-forms fill in.

> The full-resolution logo file is not in the repository yet. Add it under
> `packages/dashboard/public/` and reference it from the marketing surfaces that
> need the complete lockup.
