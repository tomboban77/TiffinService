# Build prompt: WhatsApp-native tiffin/kitchen service management platform

You are the lead engineer building a production web application with me. Read this entire document before writing any code. This spec is the source of truth; when something is ambiguous, ask me before inventing behavior. Do not add features beyond this spec without asking — restraint is a core product value here.

## 1. What we are building

A SaaS web dashboard for small home-kitchen / tiffin meal-service operators (1-person to small-crew businesses, initially in the Greater Toronto Area). These businesses run entirely on WhatsApp today: customers message the owner to order, skip days, and confirm payments; the owner tracks everything in chat scroll and notebooks.

Our product: the operator gets a mobile-first web dashboard (PWA), and their existing WhatsApp Business number gets connected to the Meta WhatsApp Cloud API via **Coexistence** (the owner keeps using their WhatsApp Business app normally; our system layers automation on the same number). A bot handles routine customer messages automatically; the dashboard turns the chaos into counts, routes, and a payment checklist.

**Customers never install anything.** They keep messaging the same number in their existing chat thread. That is the entire adoption thesis.

The product is culture-neutral (any community kitchen: South Asian tiffin, Persian, Caribbean, meal-prep for gym-goers, etc.). Nothing in code should assume a cuisine. Go-to-market is targeted, product is universal.

## 2. Tech stack (locked — do not substitute)

- **Next.js** (App Router, TypeScript) — frontend and backend API routes, mobile-first, PWA manifest
- **Tailwind CSS**
- **Supabase** — Postgres (primary DB), Auth (operator login), Row Level Security, Storage
- **Drizzle ORM** — typed queries and migrations
- **Inngest** — all background jobs: webhook processing, scheduled count locks, billing-day jobs, delayed reminders, low-balance nudges
- **Meta WhatsApp Cloud API** — called directly, no BSP/Twilio middleman
- **OpenAI Whisper API** — voice note transcription
- **A small/cheap LLM (Claude Haiku or GPT-4o-mini)** — message intent parsing and reply drafting
- **Stripe** — operator subscription billing (trial → paid)
- **Vercel** — hosting

Architectural rule: the Meta webhook route must ACK with 200 immediately and enqueue an Inngest job for all real work (media fetch, transcription, LLM parsing, DB writes, replies). Never do LLM calls inline in the webhook request.

Architectural rule: isolate all messaging behind a `MessagingAdapter` interface (send text, send template, receive events). WhatsApp is the only implementation in v1, but the boundary must exist so WeChat/Messenger adapters can be added later without a rewrite.

## 3. Core domain model — the ledger architecture

This is the most important section. Three real-world billing models must run on ONE engine:

1. **Prepaid points/credits** — customer pays upfront, payment adds a configurable number of meal points; each delivered meal burns points; skips burn nothing; low balance triggers a renewal nudge.
2. **Weekly/periodic billed (tab model)** — customer has a standing order, meals delivered accrue on a ledger, and on a billing day the owner collects the accrued amount.
3. **Fixed cycle** — a special case of the above; do not build it as a separate mode.

Unifying primitives (design the schema around these):

- **Price list**: operator-defined meal types with per-meal prices (e.g., Veg $10, Non-veg $12, Protein $14). Free-form names, no hardcoded categories. Appears on menus and drives billing math.
- **Standing order** (per customer, per meal slot): default quantity of each meal type on each service day (e.g., "2 non-veg lunches Mon–Fri"). Day pattern is a per-customer set of weekdays (supports 3-day, 5-day, 7-day operators). Also carries: delivery vs pickup flag, delivery cadence (per-day drops OR single batch drop on a chosen day covering the period), food notes free text ("less spicy, no onion").
- **Adjustments**: dated deltas on top of the standing order — skip a day, extra meals, changed quantity for a week. Created by the bot from parsed messages or manually by the operator. Adjustments must respect the slot's cutoff time; for batch customers the cutoff attaches to the batch delivery event.
- **Delivery ledger**: every delivered meal is an immutable line item (date, customer, meal type, qty, unit price, slot). Written when the operator marks a route stop delivered. Failed delivery = operator chooses charge/no-charge with a required note; both outcomes logged.
- **Billing**: per customer, mode = `prepaid` or `billed_arrears`.
  - Prepaid: payments credit a points balance (points per renewal and price are plan settings; per-plan toggle for rollover vs expire-at-cycle-end, default rollover); deliveries decrement (qty-aware); manual +/- adjustment with required note is the escape hatch.
  - Billed: on the operator's billing day (configurable: daily / weekly / biweekly / monthly), an Inngest job totals each customer's unsettled ledger lines and produces a **payment checklist** (see flows).
- **Settlements/payments**: records of money received (amount, date, method=manual e-transfer for v1, marked by operator). Marking paid triggers a WhatsApp confirmation to the customer.

Daily cook count = for each slot, sum standing orders whose day pattern includes today (or whose batch day is today, aggregated over the covered period), plus/minus adjustments, minus operator closures, grouped by meal type. Counts **lock** at the per-slot cutoff time (per-operator setting, default 8pm) via a scheduled Inngest job.

Other required entities: operators (with trial/subscription state), prospects (see below), menus/broadcasts (with sent/read stats), closures (owner holiday dates: broadcast announcement, zero counts, burn nothing), a full inbound/outbound message log (transcripts included) for auditability, and per-customer opt-out (STOP) state which must hard-block all automated sends to that customer.

## 4. The WhatsApp bot

Pipeline for every inbound message (Inngest job): identify sender → if voice note, fetch media and transcribe with Whisper (expect Malayalam/Hindi/Tamil/Punjabi/English and code-switched mixes) → LLM classifies intent with a confidence score → act only on high confidence.

Intents the bot handles autonomously (existing customers): skip/unskip specific days, pause/resume, quantity or meal-type change for a period, balance inquiry ("how many points left"), renewal confirmation, address change. Every bot action sends a plain-text confirmation back — the confirmation IS the safety mechanism (wrong parse gets caught by the customer immediately). Reply in the language the customer wrote in.

**Message edits and deletions**: the Cloud API does not deliver usable edit/delete events (deletes arrive only as "unsupported message type" errors). Design rules: (1) system state = what the bot confirmed, never the chat's current contents — the bot's confirmation persists in the customer's thread even if they delete their own message, and our raw message log is the audit record; (2) every confirmation states its own conversational undo (e.g., "✓ Skipping Tuesday. Changed your mind? Reply 'cancel the skip'") — undo is a new message, never a deletion; (3) conflicting instructions about the same date/subject resolve last-write-wins: cancel the superseded adjustment, apply the new one, and confirm the full resulting state; (4) the webhook handler treats unsupported/unknown types (deletes, reactions, polls, view-once) as log-and-ignore — never pipeline errors, never LLM input.

Anything low-confidence or non-operational (complaints, special requests, catering inquiries) → bot stays silent, flags the thread as "needs you" on the dashboard; the owner replies personally from their own WhatsApp app (Coexistence makes this seamless). The bot never fakes the owner on relationship matters. There is deliberately NO bot-console screen.

**Non-delivery disputes** ("I didn't get my food"): the bot recognizes the intent but NEVER argues, adjudicates, or auto-credits — it flags the thread top-priority. The owner's dispute view pairs the complaint with the delivery evidence from the ledger (who marked it delivered, timestamp, geolocation if captured, door photo if taken) and offers three one-tap resolutions: *credit it* (writes a no-charge adjustment with note, bot confirms the credit to the customer), *resend* (appends to today's remaining route), or *resolved otherwise* (note required). All resolutions land in the customer's interaction history so repeat patterns are visible. Prevention layer: the delivered-notification to the customer fires at mark-done so wrong-door mistakes surface within minutes, not at dinnertime.

**Prospects**: unknown numbers are NEVER auto-created as customers. The bot may answer universal questions (menu, price list, delivery area) from operator data and can offer a paid trial meal, then flags the thread under "New inquiries." The owner converts a prospect to a customer with a pre-filled one-tap flow, or dismisses.

Meta compliance: business-initiated messages outside the 24-hour window use pre-approved templates (menu broadcast, renewal reminder, delivery notification, payment confirmation). First broadcast to imported customers is a re-introduction with STOP instructions. STOP must genuinely work.

## 5. Screens (exactly these, mobile-first)

1. **Setup wizard** (once): (a) business basics + bot language; (b) "How does your service run?" — four preset cards: *Daily tiffin* (weekday pattern, weekly billing), *Flexible tiffin* (standing order + weekly tab), *Prepaid meals* (points), *Weekly meal prep* (batch drop). Presets pre-fill all underlying settings; everything editable later. (c) service days, slots (lunch/dinner/both), cutoff times; (d) price list; (e) billing day (skipped for prepaid); (f) WhatsApp Coexistence QR connect with plain-language reassurance, queue the re-introduction broadcast. Seed 3 clearly-labeled sample customers (one-tap delete). Target: under 10 minutes. Log every wizard step as an analytics event.
2. **Today** (home): per-slot locked cook counts grouped by meal type; batch-day aggregate view for meal-prep customers; skip feed ("handled by bot"); "needs you" flagged messages badge; pickup list separate from delivery route; route in order with tap-to-navigate, mark delivered / not-delivered (charge? + note); renewals/overdue strip; per-customer food notes visible inline. **"Share route" action**: owner types today's driver name and gets a tokenized, no-login mobile link (expires end of day) to WhatsApp to whoever is driving — the link shows the route with tap-to-navigate, delivered/not-home buttons, and an optional one-tap door photo. Every mark-done records who (driver name on the link), when (server timestamp), optional where (browser geolocation with permission) and photo. Owner's Today view updates live as stops complete. Drivers rotate daily; NO driver accounts and NO driver app — the tokenized link IS the driver experience.
3. **Customers**: searchable roster (name, standing order summary, balance or tab status chip); detail view with contact/address, standing order editor, adjustments, points balance + manual adjust (note required), interaction history (bot actions, payments — the dispute-settler). Add/edit as a sheet. "New inquiries" (prospects) section with one-tap convert.
4. **Menu**: compose per-day menu or duplicate last week; preview exactly as the WhatsApp message will render (with skip/pause quick-reply buttons); send; delivered/read stats; past menus; ad-hoc broadcast lives here too.
5. **Payments**: for billed customers — billing-day checklist (customer, computed amount, paid / not-yet); grace-day auto-reminder with exact amount to the unmarked; paid → WhatsApp confirmation. For prepaid — balances and low-balance list. Month total collected + last-month comparison at top. Nothing more (no charts/reports in v1).
6. **Settings**: cutoffs per slot, price list, plans/presets, billing day, closures (holiday mode), business details, WhatsApp connection status + reconnect, bot language, **CSV export of customers + payments** (always available, even after trial lapse), Stripe subscription management.
7. No other screens. Explicitly out of v1: analytics/reports tab, expense tracking, driver accounts or a driver app (the tokenized route link in the Today spec is the only driver surface), container tracking, per-day menu choice/add-ons, capacity caps, multi-kitchen, customer-facing app, multi-channel messaging.

## 6. Operator trial and billing

- Free trial: 7 days, clock starts at WhatsApp connection (not signup). Full product, no gates. No card required to start.
- Day 5–6: in-dashboard banner with the operator's OWN stats ("This week: N messages handled, N skips processed, $X tracked") + subscribe CTA. Stripe checkout, $49/month flat, single tier.
- Lapse without subscribing: dashboard goes read-only, bot goes silent (messages still land in the owner's WhatsApp app normally — graceful fallback to their old workflow), final summary sent, CSV export remains available forever, subscribing anytime reactivates intact. Never hold data hostage.

## 7. Build order (work in these milestones; ship each before the next)

1. Schema + migrations (the ledger model above), Supabase auth, operator settings CRUD, and the guardrail foundations from section 8 (timezone-aware scheduling helpers, E.164 normalization, money-as-cents, idempotency constraints, Sentry). Include worked seed data proving all three billing models on one engine, and unit tests for settlement, count, and points math.
2. Customers + standing orders + adjustments + Today screen with count computation and manual everything (usable with zero WhatsApp — this is the hand-operated pilot version).
3. WhatsApp layer: Coexistence onboarding, webhook → Inngest pipeline, template registration, menu broadcast, LLM skip/adjustment parsing + confirmations, voice note transcription, prospect flow, STOP handling. Also in this milestone: event-driven route-stop regeneration — when an adjustment/closure/pause lands for a date whose route stops already exist, an Inngest job retracts or regenerates the affected stops (the mark-time StaleRouteStopError guard from milestone 2 is the interim symptom-guard only).
4. Payments + delivery accountability: ledger settlement job, billing checklist, reminders, points renewals, low-balance nudges, delivery notifications, tokenized share-route driver link (name, timestamps, geolocation, photo), dispute-resolution flow.
5. Setup wizard + sample data + presets.
6. Trial/Stripe + lapse behavior + CSV export + wizard analytics events.

## 8. Engineering guardrails (non-negotiable; bake in from milestone 1)

- **Timezones**: every operator stores an IANA timezone. All cutoffs, count locks, billing days, and cron jobs compute in the operator's timezone, never server time. Handle DST correctly.
- **Phone numbers**: store and match in E.164 exclusively. Normalize on every entry point (owner-typed, webhook sender, prospect convert). Sender→customer matching is the bot's foundation; a format mismatch must be impossible.
- **Idempotency**: Meta retries webhooks — dedupe all inbound events by WhatsApp message ID before processing. All ledger writes, point mutations, and settlement writes must be idempotent (double-tap on "delivered" or a retried job must never double-charge or double-burn). Use DB transactions + unique constraints, not application-level hope.
- **Money**: integer cents, CAD, everywhere. No floats in any monetary path.
- **Billing tests**: settlement math, count computation, and points logic ship with unit tests in milestone 1, covering all three billing models plus edge cases (skips, failed deliveries with/without charge, partial payments, closures, batch periods, rollover vs expiry). Billing code without tests is an incomplete milestone.
- **WhatsApp failure handling**: every send records success/failure with reason; the Menu send report shows sent/delivered/read/**failed**. Batch broadcasts respect Meta messaging-tier limits (new numbers start at ~250 unique business-initiated conversations/day, scaling with quality rating) — throttle and surface tier errors to the owner instead of failing silently. Retry transient failures via Inngest.
- **Route ordering**: owner drags stops into order once; order persists across days; each stop deep-links to Google Maps navigation. No route-optimization API in v1.
- **Partial payments**: "mark paid" amount is editable, defaults to computed total; shortfalls carry forward on the tab.
- **Observability**: Sentry (or equivalent) wired into web, API routes, and Inngest jobs from day one. A silent bot failure is the worst bug this product can have — it must page, not hide.
- **Privacy (PIPEDA)**: we hold Canadian consumers' PII and message transcripts. Ship a privacy policy, support per-customer data deletion on request (reuse export machinery), and keep transcripts only as long as the audit trail needs them.

## 9. Principles (enforce these in every decision)

- The app never asks the owner to enter data it could derive from work they already do.
- Customers change nothing about how they behave; text or voice, any language.
- Billing math must be transactionally correct — this is the one place bugs are unacceptable. Prefer boring SQL and DB transactions.
- Bot acts only on high confidence; confirmations always; silence + flag otherwise.
- Presets hide complexity; every knob remains reachable in Settings.
- Mobile-first always; the operator is standing in a kitchen.
- No lock-in: export always works.
- When in doubt, build less and ask me.
