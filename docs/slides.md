# RIMPILOT — 10 slides

English, for the submission deck. Each slide is one idea. Speaker notes are what
you say out loud, not what goes on screen.

Design: navy `#080D1A`, the violet → blue → cyan brand gradient, Inter. Money in
tabular figures. Cyan is money in, rose is money out for the business, violet is
money out for the person. Full tokens in [DESIGN.md](../DESIGN.md).

---

## 1 — Title

> # RIMPILOT
> ## The ledger you talk to
>
> Voice bookkeeping for Peru's informal vendors
> AssemblyAI Voice Agent Hackathon 2026

**Say:** Street vendors in Peru run real businesses with no books. This is a voice
agent that keeps the books for them.

---

## 2 — The problem

> # She sold S/ 75.
> # She has S/ 40.
>
> She cannot tell you why.

**Say:** Every informal vendor knows their sales. Almost none of them know their
cash. Ask where the difference went and you get a shrug — not because they are
careless, but because nothing ever wrote it down.

---

## 3 — The answer nobody writes down

> # It was lunch.
>
> Lunch · the kids' bus fare · S/ 20 to a cousin at 3pm
>
> **Money the vendor took out for herself.**

**Say:** It is almost never theft and almost never bad math. It is the money she
took out of the till for herself during the day. Nobody opens a spreadsheet to
record buying their own lunch. So the ledger is wrong by exactly that amount,
every single day.

---

## 4 — Why voice, and not an app

> Her hands are busy.
> Her attention is on the customer.
> She will never stop to type.
>
> # But she will say it out loud.

**Say:** This is the part that makes voice the product instead of the interface.
A typed app fails on the entry that matters most — nobody logs their own lunch by
hand. But if something asks, she answers. Speech is the only input cheap enough
for the number the whole ledger depends on.

---

## 5 — Just talk

> One button. Plain Spanish or English. No menus.
>
> *"Vendí tres polos a veinticinco soles cada uno, me pagaron por Yape,
> gasté quince en pasaje y me saqué veinte para el almuerzo."*
>
> → three separate entries, filed while she is still talking

**Say:** The vendor talks the way she would to a friend — one sentence, three
different kinds of movement, no keywords, no order. RIMPILOT files them
separately without interrupting her.

---

## 6 — The question nobody asks themselves

> Before hanging up, RIMPILOT asks once:
>
> # "¿Sacaste algo de la caja para ti hoy?"
> *Did you take anything out of the till for yourself today?*

**Say:** This single question is the product. Three movement types exist — a sale,
a business expense, and a personal withdrawal — and the third one is the one no
system has ever bothered to capture. RIMPILOT asks it once, does not nag, and moves on.

---

## 7 — The subtraction

> | Sales | Expenses | She took out | **Cash** |
> | --- | --- | --- | --- |
> | S/ 75 | S/ 15 | S/ 20 | **S/ 40** |
>
> *Cash = sales − expenses − withdrawals*

**Say:** Now the panel shows the number she actually has, not the number she sold.
Sold 75, has 40, and the 20 in the middle has a name. She understands this in one
second, with no accounting vocabulary.

---

## 8 — One fact, not advice

> # "1 out of every 3 soles you sold."
>
> Last 7 days · computed in code · read back verbatim
>
> RIMPILOT never says *"you take out too much."*

**Say:** With a week of history there is a pattern, so we show it — as a fact
about her own money, never as a judgment. The backend computes the phrase and the
model reads it exactly; the agent is not allowed to do the arithmetic or have an
opinion about it. That line is deliberate: this is a ledger, not a financial
advisor.

---

## 9 — Built to be trusted

> **Every entry stores the exact words that produced it.** Tap any line, see the
> speech.
>
> **The browser never talks to AssemblyAI directly.** Tool calls would return to
> the client and anyone could write into another vendor's book. Audio goes
> through our backend; the vendor ID always comes from an HMAC-signed token.
>
> **The model never computes money.** It reads totals the backend calculated.
>
> Own ledger per account, isolated guest mode · spend capped per session, per
> vendor and per day · RLS on every table · strict CSP · 42 tests in CI ·
> axe-core: 0 violations

**Say:** This is someone's income, so none of it is on trust. Every number is
traceable to speech, the model is not allowed to invent or calculate one, and the
API path is built so a malicious client cannot reach another vendor's ledger.
Anyone can try it as a guest, so the cost is capped too: a guest cannot drain the
key, and a forgotten tab stops billing after ten minutes.

---

## 10 — What's next

> **Today:** browser microphone, phone fallback, three movement types, traceable
> ledger.
>
> **Next:** exportable history that a microfinance lender can verify — the reason
> this matters beyond the till.
>
> **Not doing:** credit scoring, bank connections, financial advice.
>
> github.com/DAM2323/Rimpilot

**Say:** A vendor with twelve months of orderly, verifiable records is a vendor a
lender can finally say yes to. We are not scoring anyone's credit — we are
building the history that makes the question answerable. That is the roadmap, and
what we are deliberately not doing is on the slide too.
