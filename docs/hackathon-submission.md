# RIMPILOT — hackathon submission copy

Everything a judge reads, in English. The product is built for Spanish-speaking
vendors in Peru, and it also runs fully in English so anyone can try it: the site
opens in English for browsers not set to Spanish (ES / EN switch at the top), and
in English mode Wari listens and answers in English with an English voice.
Amounts stay in soles. The demo video is spoken in Spanish with English subtitles.

Amounts are in Peruvian soles (`S/`). Roughly: `S/ 75 ≈ US$ 20`.

---

## Title

**RIMPILOT — the ledger you talk to**

Alternate, if a shorter field is required: **RIMPILOT**

## Tagline (one line)

Peru's street vendors know what they sold. They don't know where the money went.
RIMPILOT finds out by listening.

## Short description (under 300 characters)

A voice agent that keeps books for informal vendors in Peru. You talk — from the
browser or a phone call — and Wari writes down what you sold, what you spent, and
what you took out of the till for yourself. That last one is why your cash never
matches your sales.

## Long description

An informal vendor in Lima can tell you exactly what they sold today. Ask them
why the till holds `S/ 40` when they sold `S/ 75`, and the answer is a shrug.

The missing money is almost never theft or bad math. It is lunch. The kids' bus
fare. `S/ 20` handed to a cousin at 3pm. Money the vendor took out for themselves
and never wrote down, because no one opens a spreadsheet to record buying their
own lunch.

**RIMPILOT is a voice agent that asks.**

You press one button in the browser and talk the way you would to a friend:
*"vendí tres polos a veinticinco soles cada uno, me pagaron por Yape, gasté
quince en pasaje y me saqué veinte para el almuerzo."* Wari — the agent — files
three separate entries while you are still speaking, and before hanging up asks
the question nobody asks themselves: *did you take anything out of the till for
yourself today?*

The ledger then shows the subtraction that matters:

| Sales | Expenses | You took out | **Cash** |
| --- | --- | --- | --- |
| S/ 75 | S/ 15 | S/ 20 | **S/ 40** |

Sold 75, have 40. That gap has a name now.

Once there is a week of history, the panel adds one more fact, computed in code
and read back verbatim by the agent: *1 out of every 3 soles you sold.* It is not
advice. RIMPILOT never tells anyone what to do with their money — it shows them
their own arithmetic and stops talking.

**Why voice is the product, not the interface.** A vendor's hands are busy and
their attention is on the customer in front of them. They will never stop to type.
But they will say it out loud — especially the withdrawal, which is the one entry
a person would never bother to open an app for, and the one the whole ledger
depends on.

**Every number is traceable.** Each entry stores the exact fragment of speech that
produced it. Tap any line in the ledger and you see the words. Nothing in the book
came from a guess, and nothing was computed by the model: the agent reads totals
the backend calculated.

## Tags

`voice-agent` · `assemblyai` · `fintech` · `financial-inclusion` · `latam` ·
`spanish` · `informal-economy` · `bookkeeping` · `twilio` · `accessibility` ·
`nextjs` · `postgres`

## Tech stack

- **AssemblyAI Voice Agent API** — Spanish or English speech (the session's
  language, prompt and voice follow the language the person picked), turn
  detection, barge-in, and four tools: record sale, record expense, record
  personal withdrawal, read the daily summary.
- **Two audio channels, one bridge.** The browser microphone sends PCM16 at
  24 kHz; Twilio sends G.711 μ-law at 8 kHz. Neither is re-encoded — the session
  is configured with the codec each channel already speaks.
- **Fastify** backend (TypeScript, ESM), **Next.js 14** dashboard, **PostgreSQL**
  on Supabase with row-level security.

## What makes it defensible

- **The browser never talks to AssemblyAI directly.** The API allows it with a
  temporary token, and doing so would send tool calls back to the client — anyone
  could ask to write into another vendor's ledger. Audio goes through our backend
  instead: the API key never leaves the server, and the vendor ID always comes
  from an HMAC-signed token, never from a client message.
- **Spend is capped, four ways.** The landing page is public and anyone can try
  it as a guest, so every session is billable to one shared key. There is a cap
  on concurrent sessions, on sessions per vendor per day, on sessions per day in
  total — the one that matters, since each guest is a new account with its own
  daily quota — and a ten-minute limit per session, so a forgotten tab does not
  bill forever. A rejected session is turned away before it ever reaches
  AssemblyAI, so it costs nothing.
- **Real degradation.** On 429 or 503 the bridge retries with backoff and then
  fails with an actual error instead of leaving an open microphone in silence.
- **Accounts without a shared demo account.** Sign up with email and password, or
  try it as a guest: each guest gets an empty ledger of their own, never a shared
  one. Ending the trial deletes it for real — the entries and the words, not just
  the access. Every query filters by the signed-in owner; changing a UUID in the
  URL returns 404, and that was tested, not assumed.
- **Accessibility measured, not assumed.** axe-core reports zero violations on
  desktop and mobile, in every state. Contrast values were computed against the
  real surfaces, not eyeballed — one brand colour was rejected for text because it
  measured 4.23:1.

## What is real today

Shipped and verified:

- Browser microphone end to end: live against AssemblyAI, and in an automated
  run against a mock that speaks the real protocol — sign up, talk, the tool
  call, the row in the ledger, the transcript on the detail page, and the
  session caps
- The three movement types, the cash subtraction, and the weekly ratio, verified
  against a real PostgreSQL
- Traceable transcripts on every entry, and both sides of the conversation on
  screen while it happens
- Accounts and isolated guest ledgers, strict CSP with per-request nonce,
  security headers on every response including static files, RLS on every table
- 42 automated tests in CI. Each one was checked by breaking the code on
  purpose and watching it fail
- Accessibility with axe-core on every page, desktop and a Pixel 7 viewport
  (emulated, not a physical phone): zero violations

Not claimed:

- No credit scoring and no bank connection. RIMPILOT builds the orderly history
  that could enable those later; it does not do them now.
- No financial advice, by design.

## Links

| What | Where |
| --- | --- |
| Repository | https://github.com/DAM2323/Rimpilot |
| Cover image | [docs/cover/rimpilot-cover.png](cover/rimpilot-cover.png) — 3840×2160, 16:9 |
| Demo video | *(pending upload)* |
| Live demo | *(pending deploy)* |
| Slides | [docs/slides.md](slides.md) |
| Demo script | [docs/demo-script.md](demo-script.md) |

The cover is generated, not hand-placed: `node docs/cover/render.mjs` rebuilds it
from [cover/plantilla.html](cover/plantilla.html), inlining Inter and the real
logo file. Change a number or a line of copy in the template and re-run. It needs
Playwright available; the rendered PNG is committed, so you only re-run it if the
copy changes.
