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
  --cyan: #01B2F8;          /* income, balance, focus — 7.43:1               */
  --violet: #A78BFA;        /* accent icons — 6.58:1                         */
  --rose: #FB7185;          /* expenses, receivables — 6.65:1                */
  --on-accent: #080D1A;     /* text on a brand fill — 7.43:1 on cyan         */
  --grad: linear-gradient(120deg, #824CE8 0%, #4F73EF 52%, #01B2F8 100%);
}
```

### Rules that are not negotiable

The three gradient stops are sampled from the logo file itself, not approximated.
Two of them cannot be used as drawn:

- **The logo's violet `#824CE8` never carries text.** It measures 3.53:1 on
  `--surface`, below AA. It exists in the gradient and in fills only; for violet
  text use `--violet` (`#A78BFA`).
- **The logo's blue `#4F73EF` never carries text either** — 4.29:1, also short.
  It is a gradient stop only.
- **A brand fill takes dark text, never white.** Primary buttons are cyan with
  `--on-accent` on top.
- **Money is distinguished by meaning, not only colour.** Three flows, three hues:
  cyan for what came in, rose for what went out *for the business*, violet
  (`--violet`, 6.58:1) for what the vendor took out *for themselves*. Both
  outflows carry a `−` sign and a distinct icon, so a reader who cannot separate
  rose from violet still reads the ledger correctly from the sign, the icon and
  the label.
- **Violet earns a data role here, and only here.** It is the one accent left that
  is neither income nor business expense, and the withdrawal is the number the
  product exists to surface. `--violet` is the text-safe tint; the logo's
  `#824CE8` still never carries text.
- Focus is a 3px cyan ring at 7.43:1. It is never removed.

## Typography

**Inter Variable**, self-hosted from `@fontsource-variable/inter` (SIL Open Font
License). It is not loaded from a CDN: the CSP declares `font-src 'self'`, so an
external font host would be blocked, and self-hosting also removes the layout shift
of a late-arriving face.

Only the Latin subset is downloaded — roughly 56 KB — because the package ships
`unicode-range` per subset and the browser fetches what the page actually needs.

Fixed product scale: 0.75rem, 0.875rem, 1rem, 1.125rem, 1.375rem and 2rem. Headings
are tightly tracked; body text is not.

**Money always uses tabular numerals** (`font-variant-numeric: tabular-nums` plus
`font-feature-settings: "tnum"`). Inter ships real tabular figures, so amounts in a
column line up digit for digit — a proportional `1` next to a `7` makes a ledger
harder to scan than any colour choice.

## Components

**Anything that looks like a control is one.** An earlier version had a navigation
rail with three bars that led nowhere, a "Wari está listo" pill that said ready with
the microphone off, and a settings icon that did nothing. All gone: the mark sits in
the header and links home, and the microphone's real state lives in its panel.

Surfaces separate with 1px `--line` borders over `--surface`; no drop shadows — on a
dark ground, elevation comes from the surface step, not from shade. No card sits
inside another card. No coloured side-stripe borders: states are carried by
background, alignment and written labels.

- **The day's account** is written as the subtraction it is — *Vendiste − Gastaste
  − Sacaste para ti = Te queda en caja* — with the signs as text (and hidden
  "menos" / "igual a" for screen readers), not four identical metric tiles.
- **The conversation** reads like a chat: the person on the right on a cyan tint,
  Wari on the left, each bubble labelled with who is speaking.
- **Wari's orb** is the one animated element. It is driven by the real audio level
  (an `AnalyserNode` on Wari's voice and on the microphone, written to a CSS
  variable once per frame, never through React state) and by the real session
  state from the backend: *Te escucho · Escuchándote · Pensando · Wari está
  hablando · Anotando en tu libro · Revisando tu caja*. Violet halo when Wari
  speaks, cyan when the person does.
- Headlines are solid colour. The gradient appears three times on the landing and
  never carries text: the mark, the orb, one rule.

Motion is 180ms state feedback with an exponential ease-out, plus the orb. Under
`prefers-reduced-motion` everything is still and the audio loop never starts.

## Voice

The product speaks the way Peru speaks: **tú**, never *vos*. "Cuéntale tu día",
"Toca", "Crea tu cuenta". Wari's prompt already used tú; an earlier interface used
voseo, so the screen and the voice disagreed.

## The logo

The source file lives at `images/logo.png` (1254×1254, navy background baked in).
Everything else is derived from it, never redrawn:

| File | What it is |
| --- | --- |
| `packages/dashboard/public/logo.png` | Full lockup, background keyed to transparent, 880px wide |
| `packages/dashboard/public/logo-simbolo.png` | The mark alone (R + wave), transparent — used in the app rail |
| `packages/dashboard/app/icon.png` | 512×512 favicon, the mark on the logo's own navy |

The background is keyed out with a soft alpha ramp rather than a hard threshold, so
the glow and the antialiased edges survive. That lets the lockup sit on `--bg`
without a visible plate.

The hackathon cover at `docs/cover/` derives from the same file and the same
tokens, and is generated from `plantilla.html` rather than placed by hand.

These three files, the Open Graph image and the middleware matcher move together:
the matcher must keep the logo and icon outside the auth gate, or the browser cannot
fetch the favicon before signing in.
