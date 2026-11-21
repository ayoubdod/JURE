# JURE Subscription & Billing Specification

Status: implementation specification for commercial launch. Prices below are the frozen V1 list, exclusive of VAT. They are not a forecast and they are not a promise of unlimited AI.

This document is the contract between the commercial model and the Django/DRF backend. Implement it in the existing `subscriptions` app. Do not invent a second tenant, a second invoice system, or a separate JURIA product.

## 1. Frozen decisions

| Decision | V1 rule |
| --- | --- |
| Market | Morocco. Currency `MAD`. |
| Buyer | One organisation. In this codebase that is `cabinets.Cabinet`. |
| Plans | Solo 399, Cabinet 999, Business 1,999 MAD / month. Enterprise on quotation. |
| Annual | Paid upfront. List price is 15% below twelve monthly payments. |
| JURIA | Included in every plan. Shared organisation credit pool. No standalone JURIA subscription. |
| Overage | Optional credit packs. No automatic top-up. |
| Extra seat | 99 MAD / month. Extra 10 GB storage: 99 MAD / month. |
| Trial | 14 days, 100 credits once, maximum 2 users, no card required. |
| Prices | Displayed exclusive of VAT. VAT is added on the tax invoice. |
| Discount stacking | Prohibited. The annual price is a list price, not a promo code. |
| Founding customers | At most 30 organisations. 20% for the first 12 months. Not lifetime. |

Annual list prices, checked against `monthly * 12 * 0.85`:

| Plan | Monthly | Annual payment | Saving vs 12 months |
| --- | ---: | ---: | ---: |
| Solo | 399 | 4,068 | 720 |
| Cabinet | 999 | 10,188 | 1,800 |
| Business | 1,999 | 20,388 | 3,600 |

Credit packs, exclusive of VAT, valid 90 days from purchase:

| Pack | Credits | Price |
| --- | ---: | ---: |
| Mini | 250 | 99 |
| Standard | 750 | 249 |
| Professional | 2,000 | 599 |

Included monthly credits, and the internal cost budget used for planning only (0.10 MAD / credit). This budget is not an OpenAI price and must not be shown to customers.

| Plan | Included JC / month | Planning AI cost |
| --- | ---: | ---: |
| Solo | 100 | 10 MAD |
| Cabinet | 500 | 50 MAD |
| Business | 1,500 | 150 MAD |
| Enterprise | Custom | Custom |
| Trial | 100 once | — |

Internal guardrails, calculated on net subscription revenue excluding VAT and reported separately from pack revenue: warning at 5% AI cost, management review at 8%, planned ceiling 10%. Response to a breach is prompt, routing, and cache work first. Change weights or quotas only after measured consumption. Never advertise unlimited AI or unlimited document processing.

## 2. What already exists

Use these. Do not replace them.

| Commercial word | Code today |
| --- | --- |
| Organisation | `cabinets.Cabinet`. Owner is `Cabinet.owner`. Members are `User` rows with `cabinet` + `is_cabinet_member`, plus the owner. |
| Roles | `User.Role`: `OWNER`, `ADMIN`, `MANAGER`, `LAWYER`, `ASSISTANT`, `VIEWER`. Checked in `cabinets.permissions`. |
| Registration | `users.serializers.register` creates the user, then the cabinet, then sets the owner’s `cabinet`, `is_cabinet_member`, and `OWNER` role. The trial subscription is created in that same transaction, after the cabinet exists. |
| JURIA modes that exist | `CHAT`, `LEGAL_RESEARCH`, `DOCUMENT_DRAFTING`, `CONTRACT_ANALYSIS` on `JuriaConversation.Mode`. |
| JURIA usage today | `juria.JuriaUsage` is a per-user monthly counter (messages, tokens, analyses). Keep it as an analytics counter. It is not a wallet and it must not gate requests. |
| Practice finance | `finance.Invoice` and `finance.Payment` are the firm’s invoices to its clients. SaaS billing must not write those tables. |
| Notifications | `notifications.services.notification_service.create_notification`, recipients via `notifications.utils.team.owner_admin_user_ids_for_cabinet`. |
| Scheduled work | No Celery. Follow `notifications/daily_reminders.py`: a management command run by cron at 07:00 `Africa/Casablanca`. |
| App shell | `subscriptions` is installed and empty. Mount it at `/api/v1/billing/`. |
| Public pricing page | `jure-frontend/src/pages/Pricing.tsx` currently says plans are not final. Replace that copy when this spec ships. Do not leave both stories on the page. |

Cabinet resolution, copied from the member viewset: the caller’s owned cabinet, otherwise `user.cabinet`. Every billing and credit query is filtered to that cabinet. A user with no cabinet gets 403.

## 3. Package layout

Follow `docs/ENGINEERING.md`. Views stay thin. Rules live in services. New business rules get tests in the same change.

```
subscriptions/
  models/
  serializers/
  views/
  services/
    entitlements.py
    lifecycle.py
    credits.py
    seats.py
    invoices.py
    proration.py
    provider.py
  urls.py
  admin.py
  management/commands/
    seed_billing_catalog.py
    run_billing_cycle.py
  tests/
```

Money is `Decimal` with `max_digits=12` and `decimal_places=2`, never float. Credits are positive integers. Timestamps are timezone-aware. User-facing API strings go through gettext. Code and comments stay English.

`SUBSCRIPTIONS_ENFORCE` defaults to `False`. While it is false, catalog, wallet, and ledger code may run, but seat and credit checks do not block product use. Existing cabinets are backfilled onto an internal `COMPLIMENTARY` subscription (Cabinet entitlements, no invoice) so turning enforcement on does not lock out current firms. Complimentary is not a public plan and does not appear on the pricing page.

## 4. Catalog

Plans, entitlements, weights, add-ons, and packs are database rows seeded by `seed_billing_catalog`. Application code asks the entitlement service for a key. It does not branch on `"solo"` or `"cabinet"` except inside that service and inside Enterprise overrides.

### 4.1 `Plan`

| Field | Notes |
| --- | --- |
| `code` | `solo`, `cabinet`, `business`, `enterprise`. Unique. |
| `name` | Customer-facing label. |
| `monthly_price` | Null for Enterprise. |
| `annual_price` | Null for Enterprise. The 4,068 / 10,188 / 20,388 figures live here. |
| `is_public` | False for Enterprise. |
| `is_recommended` | True only for Cabinet. |
| `rank` | 10, 20, 30, 40. Used to tell upgrade from downgrade. |
| `trial_days` | 14 on the public plans. Unused for Enterprise. |
| `is_active` | Soft-retire a plan without deleting history. |

### 4.2 `PlanEntitlement`

One row per plan per key. Changing a quota is a data change, not a deploy, except where a feature does not exist yet (section 8).

Quota keys:

| Key | Solo | Cabinet | Business |
| --- | ---: | ---: | ---: |
| `seats.included` | 2 | 5 | 15 |
| `storage.gb` | 2 | 10 | 50 |
| `juria.monthly_credits` | 100 | 500 | 1500 |
| `history.days` | 30 | 90 | 365 |

Feature keys are booleans. A missing key means false.

| Key | Solo | Cabinet | Business | Release |
| --- | --- | --- | --- | --- |
| `workspace.cases` | yes | yes | yes | Phase 1 |
| `workspace.clients` | yes | yes | yes | Phase 1 |
| `workspace.tasks` | yes | yes | yes | Phase 1 |
| `workspace.calendar` | yes | yes | yes | Phase 1 |
| `workspace.documents` | yes | yes | yes | Phase 1 |
| `workspace.notifications` | yes | yes | yes | Phase 1 |
| `workspace.basic_finance` | yes | yes | yes | Phase 1 |
| `workspace.basic_reporting` | yes | yes | yes | Phase 1 |
| `workspace.team` | yes | yes | yes | Phase 1 |
| `workspace.rbac` | no | yes | yes | Phase 1 |
| `workspace.advanced_finance` | no | yes | yes | Phase 1, limited to what Finance already does |
| `workspace.advanced_reporting` | no | yes | yes | Phase 2 until the screens exist |
| `workspace.audit_trail` | no | no | yes | Phase 3 |
| `workspace.custom_workflows` | no | no | yes | Phase 2 |
| `workspace.client_portal` | no | yes | yes | Off until the portal is a sold feature. The route may exist for pilots. |
| `juria.chat` | yes | yes | yes | Phase 1. Maps to mode `CHAT`. |
| `juria.research` | yes | yes | yes | Phase 1. Maps to `LEGAL_RESEARCH`. |
| `juria.drafting` | yes | yes | yes | Phase 1. Maps to `DOCUMENT_DRAFTING`. |
| `juria.summarisation` | yes | yes | yes | Phase 1 only if a real summarisation operation exists. Otherwise the key stays false. |
| `juria.document_analysis` | no | yes | yes | Phase 2. |
| `juria.contract_analysis` | no | yes | yes | The `CONTRACT_ANALYSIS` mode exists. Advertise it on Cabinet and Business only after the workflow is accepted as launch quality. Until then the entitlement is seeded false and the mode stays available to complimentary/internal cabinets. |
| `juria.advanced_workflows` | no | no | yes | Phase 2. |

Enterprise stores the same keys on `SubscriptionEntitlementOverride` (cabinet, key, int or bool value). Resolution order: override if the subscription is Enterprise or a commercial override was approved, otherwise the plan row. Overrides are an admin operation, not a customer API.

Do not advertise OCR, scanned-document intelligence, or a client portal on the pricing page. JURE has no OCR pipeline. `history.days` is stored and shown, and a retention job is out of scope for the first billing release. Do not delete activity history until that job has its own tests.

Storage quota is stored now. There is no cabinet storage meter. Do not block uploads in the first billing release. Add the meter, then enforce `storage.gb` plus purchased storage add-ons.

### 4.3 `CreditWeight`

| `operation` | Credits | Maps to |
| --- | ---: | --- |
| `legal_question` | 1 | `CHAT` |
| `legal_research` | 3 | `LEGAL_RESEARCH` |
| `legal_drafting` | 5 | `DOCUMENT_DRAFTING` |
| `document_summary` | 3 | Future operation. No charge path until it exists. |
| `document_analysis` | 5 | Future. Includes up to 10 pages. |
| `contract_analysis` | 8 | `CONTRACT_ANALYSIS`, up to 10 pages, once the entitlement is on. |
| `complex_analysis` | 15 | Future. Commercial range is 10–20. Seed the midpoint and change the row when the operation is specified. |

V1 charges the table weight for the operation. It does not charge per token and it does not surcharge by page. Page-based overage waits until page counts are reliable. Record tokens and provider cost anyway, so weights can be revised from evidence.

`CreditWeight` rows are versioned by `effective_from`. A deduction stores the weight it used. Editing the current row does not rewrite the ledger.

### 4.4 `AddOn` and `CreditPack`

Add-on codes: `extra_seat` (99 MAD / seat / month), `storage_10gb` (99 MAD / 10 GB / month). Packs are the three rows in section 1. Both are catalog rows with `is_active`.

The 15% annual list discount does not apply to add-ons or packs. Add-ons bill monthly even when the subscription is annual. Packs are one-off.

## 5. Subscription lifecycle

### 5.1 `Subscription`

One current row per cabinet. Partial unique constraint on `(cabinet)` where `status` is not `EXPIRED` or `SUPERSEDED`. History is kept by moving the previous row to `SUPERSEDED` when a new commercial term replaces it, or by keeping one row and writing `SubscriptionEvent`. Prefer one live row plus an append-only `SubscriptionEvent` log. Do not delete subscriptions.

| Field | Notes |
| --- | --- |
| `cabinet` | FK, `PROTECT`. |
| `plan` | FK, `PROTECT`. |
| `interval` | `MONTH` or `YEAR`. Null on trial and complimentary. |
| `status` | See below. |
| `price` | Snapshotted list price after a commercial discount, excl. VAT. |
| `currency` | `MAD`. |
| `seat_addon_qty` | Extra seats purchased. |
| `storage_addon_qty` | Extra 10 GB blocks purchased. |
| `discount` | Nullable FK. The founding grant, if any. |
| `discount_ends_at` | Copied at redemption. Renewal after this date uses the list price. |
| `trial_ends_at` | Set once. |
| `current_period_start` / `current_period_end` | Paid term. Annual subscriptions still have a monthly credit period; store that separately. |
| `credit_period_start` / `credit_period_end` | Always about one month. Annual plans renew this monthly. |
| `cancel_at_period_end` | Boolean. |
| `pending_plan` | Downgrade target. Applied at `current_period_end`. |
| `grace_ends_at` | Set when a renewal payment fails. |
| `juria_paused` | Admin switch. Default false. |
| `provider` / `provider_customer_ref` | Null until a processor is integrated. |

### 5.2 Status

```
                 registration
                      |
                      v
                  TRIALING  --trial ends, no payment-->  TRIAL_EXPIRED
                      |
                 payment succeeds
                      |
                      v
                   ACTIVE  --renewal paid-->  ACTIVE
                      |
                      +-- cancel_at_period_end, period ends --> EXPIRED
                      |
                      +-- renewal payment fails --> PAST_DUE
                                                      |
                                          grace ends unpaid --> EXPIRED
                                          payment succeeds --> ACTIVE
```

`COMPLIMENTARY` is a side state for cabinets that existed before billing. It behaves as active Cabinet entitlements, with JURIA left on the current internal allowance, and it never invoices. Moving a complimentary cabinet onto a public plan is an explicit conversion, not an automatic charge.

| Status | Workspace writes | JURIA | Billing screens |
| --- | --- | --- | --- |
| `TRIALING` | Yes, seat cap 2 | Yes, while trial credits remain | Choose a plan |
| `ACTIVE` | Yes, within seats and features | Yes, while credits remain and `juria_paused` is false | Manage plan |
| `PAST_DUE` | Yes, for 7 days | Yes, same as active | Pay the open invoice |
| `TRIAL_EXPIRED` | Read and export only | No | Choose a plan. Data stays. |
| `EXPIRED` | Read and export only | No | Resubscribe. Data stays. |
| `COMPLIMENTARY` | Yes | Yes | Not shown as a public plan |

Cancellation keeps access until `current_period_end`. Monthly plans cancel at the end of the paid month. Annual plans cancel at the end of the prepaid year. There is no mid-year cash refund in V1. A downgrade scheduled during an annual term takes effect at the annual period end, not at the next credit grant.

### 5.3 Events and the rules that fire them

Write one `SubscriptionEvent` per transition (`trial_started`, `trial_expired`, `activated`, `renewed`, `payment_failed`, `grace_started`, `expired`, `cancel_scheduled`, `cancel_completed`, `upgraded`, `downgrade_scheduled`, `downgrade_applied`, `seats_changed`).

| Event | Behaviour |
| --- | --- |
| Registration | Create cabinet, then `TRIALING` for 14 days. Grant 100 trial credits once. Seat cap 2. |
| Trial expiry | `run_billing_cycle` sets `TRIAL_EXPIRED`, notifies owner and admins, does not delete data. |
| Payment success | `ACTIVE`. Set period dates from the interval. Grant the plan’s monthly credits if this period has not been granted yet. Clear grace. |
| Monthly renewal | New credit period. Grant a fresh included allowance. Included credits do not roll over. |
| Annual renewal of the contract | Charge the annual price once. Credits are still granted each month, never as a 12-month lump. |
| Upgrade | Immediate. Prorate. Raise seats and feature flags now. Grant `max(0, new_monthly_credits - old_monthly_credits)` extra credits that expire at the current credit-period end. Do not claw back credits already spent. |
| Downgrade | Set `pending_plan`. Apply at `current_period_end`. If the cabinet then has more active members than the new seat total, block new invites and mark the subscription `SEAT_OVER_LIMIT` in the API until members are deactivated or seats are added. Do not delete users automatically. |
| Extra seat or storage | Owner or admin only. Increase the add-on quantity and create an invoice for the remaining days of the month, minimum one day, at the monthly add-on price. Next month bills the full quantity. |
| Credits hit zero | Further JURIA model calls return 402 `credit_exhausted`. Cases, documents, tasks, and the rest of the workspace stay available. |
| Payment failure | Notify owner and admins. Set `PAST_DUE` and `grace_ends_at = now + 7 days`. Keep access through grace. |
| Grace ends unpaid | `EXPIRED`. Read and export remain. |
| Cancellation | `cancel_at_period_end = true`. Access until period end, then `EXPIRED`. |

Proration for an upgrade inside a paid period:

```
remaining = max(period_end - now, 0)
fraction = remaining / (period_end - period_start)
amount_due = round_half_up((new_price - old_price) * fraction, 2)
```

`old_price` and `new_price` are the snapshotted interval prices after any single applicable discount. If `amount_due` is zero or negative, do not open a credit note in V1; the upgrade still applies and the next renewal uses the new price. Downgrades are not prorated because they wait until renewal.

### 5.4 Founding discount

`Discount` code `FOUNDING`: 20 percent, duration 12 months, `max_redemptions` 30, `redeem_by` set to the programme end date when that date is chosen. Redemption counts successful activations, not trial starts.

Rules:

- One discount on a subscription.
- Reject a second code.
- Founding applies to the chosen list price, monthly or annual, for 12 months from activation.
- It does not combine with any other code.
- Enterprise discounts are not this table. They are a custom price on the Enterprise subscription, approved outside the product, stored as the snapshotted `price`.
- Renewal after `discount_ends_at` uses the then-current list price. Notify the billing contacts 30 days before that change. The notice job is part of `run_billing_cycle`.

## 6. JURIA credit ledger

### 6.1 Tables

`CreditWallet` — one per cabinet.

| Field | Notes |
| --- | --- |
| `cabinet` | One-to-one. |
| `balance_jc` | Cache. Non-negative. The ledger is authoritative; this number must match it. |
| `juria_paused` | Mirrored onto the subscription for a single read. Write both in one transaction. Prefer the subscription flag as the source of truth and keep the wallet copy only if a hot-path read needs it. One flag is enough: store `juria_paused` on `Subscription` only. |

`CreditLot` — a grant that can expire.

| Field | Notes |
| --- | --- |
| `cabinet` | FK. |
| `source` | `TRIAL`, `INCLUDED`, `UPGRADE`, `PACK`, `ADJUSTMENT`. |
| `granted_jc` / `remaining_jc` | Integers. `remaining_jc` is what FIFO may still spend. |
| `expires_at` | Trial and included: credit period end. Upgrade delta: current credit period end. Pack: purchase time + 90 days. Adjustment: set explicitly. |
| `invoice` | Set for packs. |
| `idempotency_key` | Unique per cabinet. |

`CreditLedgerEntry` — append-only. No updates, no deletes.

| Field | Notes |
| --- | --- |
| `cabinet` | FK. |
| `lot` | Nullable only for a reservation that has not been allocated yet. Normal spends point at a lot. |
| `entry_type` | `GRANT`, `RESERVE`, `COMMIT`, `RELEASE`, `EXPIRE`, `ADJUSTMENT`. |
| `delta_jc` | Signed. Grants positive. Reserve, commit, and expire negative. Release positive. |
| `balance_after` | Wallet cache after this entry. |
| `idempotency_key` | Unique per cabinet. |
| `actor` | User, nullable for the billing job. |
| `note` | Short internal text. No document body, no prompt, no model output. |

`AIUsageEvent` — one per model call that was allowed to start.

| Field | Notes |
| --- | --- |
| `cabinet`, `user` | Both required. Indexed. |
| `operation` | Weight code. |
| `model_name` | Provider model id actually called. |
| `input_tokens`, `output_tokens` | Integers, zero if the provider did not return them. |
| `provider_cost_mad` | Nullable until finance records a real cost. Never required to charge the customer. |
| `credits_reserved` | The weight. |
| `juria_message` | Nullable FK. The idempotency anchor. |
| `case` | Nullable FK. |
| `document_ref` | Nullable string id of a library or case file. Do not copy file contents. |
| `idempotency_key` | Unique per cabinet. |
| `outcome` | `RESERVED`, `COMMITTED`, `RELEASED`. |
| `created_at` | |

Tenant rule: a usage query that does not filter on the caller’s cabinet is a defect. Tests must cover a user from cabinet A requesting cabinet B’s wallet, ledger, and usage and receiving 404 or an empty set, never the other cabinet’s rows.

### 6.2 Spend algorithm

All of this runs inside `transaction.atomic()` with `select_for_update()` on the wallet row.

1. Resolve the caller’s cabinet. If the subscription cannot use JURIA (status, entitlement, or `juria_paused`), stop before any provider call.
2. Resolve the weight for the operation. Unknown operation: refuse. Do not guess a price.
3. Idempotency key is `juria-message:{message_uuid}`. If a `COMMITTED` or `RESERVED` event already exists for that key, return the original result and do not charge again. If it is `RELEASED`, a retry may reserve again under a new attempt suffix only when the caller is the same message retry path. A duplicate client request must not create a second charge.
4. Expire lots whose `expires_at` is in the past, writing `EXPIRE` entries, before testing the balance.
5. If `balance_jc` is below the weight, stop. Write nothing. Return 402 `credit_exhausted`.
6. Allocate the weight across lots ordered by `expires_at`, then `id`. This spends included credits before a pack that expires later.
7. Write `RESERVE` entries, decrement `remaining_jc` and `balance_jc`.
8. Call the model only after the reservation commits. Hold the lock only for the database work, not for the provider round trip. Use a short transaction to reserve, then a second transaction to commit or release.
9. On success, mark the event `COMMITTED`. The reserve already reduced the balance; commit does not reduce it again. Store tokens and cost.
10. On provider failure, write `RELEASE` entries, restore the lots and the balance, mark `RELEASED`. A failed call costs the customer nothing.
11. A crash after reserve and before commit is repaired by `run_billing_cycle`: a `RESERVED` event older than 15 minutes with no provider result is released.

Notify owner and admins once when included-credit consumption for the open credit period crosses 80%, and once when it crosses 100% or the wallet hits zero. Measure 80% and 100% against the included grant for that period, not against pack credits. Use the existing notification dedupe pattern so a retry does not send a second notice. Pack purchases do not reset those notices for the same period.

Included lots expire at `credit_period_end`. The renewal job writes `EXPIRE` for anything left, then inserts the new `INCLUDED` lot. Pack lots are untouched by renewal and die on their own `expires_at`.

Admin adjustment is an `ADJUSTMENT` lot or a negative ledger entry that names a lot, written from Django admin with an actor and a note. The customer API cannot mint credits.

`juria_paused` blocks new reservations even when the balance is positive. Clearing it does not grant credits. The workspace is unaffected either way.

### 6.3 Where the gate sits

Call `credits.reserve` at the start of the JURIA send path in `juria.services.chat`, before `send_chat_message` or `analyze_document`. Commit or release when that call returns. Do not deduct from the frontend, and do not trust a credit amount sent by the client.

`record_juria_usage` stays as the per-user counter. It is not consulted for entitlement.

Other JURIA entry points that reach the provider (document draft, file analysis) use the same reserve/commit/release service. A new entry point that calls the model without that service is a defect.

## 7. Seats

A seat is consumed by the owner and by every user with `cabinet` set, `is_cabinet_member=True`, and `is_active=True`. A pending invitation does not consume a seat.

```
seat_limit = entitlement(seats.included) + subscription.seat_addon_qty
```

During `TRIALING`, `seat_limit` is 2 even if the catalog plan says otherwise.

Enforce the check in cabinet member creation, before the user row is saved. Over the limit: 402 `seat_limit` with `seat_limit`, `seats_used`, and `addon_price`. Deactivating a member (`is_active=False`) frees the seat. The billing API does not deactivate people.

Client-portal users, if they are not cabinet members, do not consume a lawyer seat. Confirm that against the portal user model before the portal is sold. Until then, do not count users who are only clients.

## 8. Feature gating and release phases

Phase 1, which billing must enforce once `SUBSCRIPTIONS_ENFORCE` is on:

- Organisation, members, and seats.
- Cases, clients, tasks, deadlines, calendar, document library, team workspace, basic finance, notifications.
- JURIA chat, research, and drafting, metered.
- Trial, subscription status, credit wallet, packs, invoices.

Phase 2 entitlements may be seeded and shown as unavailable. They must not be listed as included on the public pricing page until the feature is released: advanced document analysis, contract intelligence as a marketed feature, advanced reporting, client portal, workflow automation, extra integrations.

Phase 3 stays off the self-serve catalog: AI governance, dedicated environments, custom audit, custom deployment, API. Those are Enterprise quotation items.

`entitlements.has(cabinet, key)` is the only check views should call. While enforcement is off, feature checks return true for keys the product already ships, and credit and seat checks return true. Wallet writes may still happen so usage can be measured before the switch.

## 9. Invoices and payment lifecycle

These models are `subscriptions.SubscriptionInvoice` and `subscriptions.SubscriptionPayment`. Never import them as `Invoice` or `Payment` into a module that also talks to `finance`.

### 9.1 Invoice

| Field | Notes |
| --- | --- |
| `cabinet` | FK. |
| `number` | `SUB-YYYY-XXXX`, unique. Separate sequence from `FAC-YYYY-XXX`. |
| `kind` | `SUBSCRIPTION`, `PRORATION`, `ADDON`, `CREDIT_PACK`. |
| `status` | `DRAFT`, `OPEN`, `PAID`, `VOID`, `UNCOLLECTIBLE`. |
| `currency` | `MAD`. |
| `subtotal` | Excl. VAT. |
| `vat_rate` | Snapshotted. Default `0.20`, the rate the practice-finance module already uses. Confirm the SaaS treatment with the accountant before the first live charge. The rate is data, not a scattered literal. |
| `vat_amount` | `round_half_up(subtotal * vat_rate, 2)`. |
| `total` | `subtotal + vat_amount`. |
| `period_start` / `period_end` | Nullable for a pack. |
| `due_at` | Open invoices on a renewal are due immediately. |
| `paid_at` | |

Lines: description, quantity, unit price excl. VAT, amount. A plan invoice has one plan line. A founding discount is a negative line that references the discount code. An add-on invoice has one line per block.

Billing identity, because `Cabinet` no longer stores ICE: `BillingProfile` one-to-one with cabinet. Fields: `legal_name`, `ice` (15 digits, reuse `validate_ice_length`), `if_number` optional, `billing_email`, `address`. Required before a paid invoice can be issued. Trial does not require it.

### 9.2 Payment

| Field | Notes |
| --- | --- |
| `invoice` | FK. |
| `status` | `PENDING`, `SUCCEEDED`, `FAILED`, `CANCELLED`. |
| `amount` | The invoice total, incl. VAT. |
| `provider` | `MANUAL`, or the processor code once chosen. |
| `provider_reference` | Unique when present. |
| `idempotency_key` | Unique. |
| `raw_event_id` | Provider event id. Unique. Replays no-op. |

V1 can mark a `MANUAL` payment succeeded from Django admin (bank transfer for founding firms and Enterprise). Self-serve card checkout waits on a processor decision. The service boundary is `subscriptions.services.provider.PaymentProvider`:

- `start_checkout(invoice) -> redirect or client secret`
- `parse_webhook(request) -> verified event`
- `refund` is not required in V1

Webhook rules: verify the signature on the server, reject a stale or unsigned body, and treat a repeated `raw_event_id` as success without a second state change. The frontend never tells the API that a payment succeeded. Only the webhook or an admin action does.

Processor choice is open. Evaluate a Moroccan card processor (CMI or Payzone are the usual candidates) on fees, MAD settlement, and webhook reliability before naming one in settings. Stripe is not assumed. Until a provider is configured, public checkout creates an `OPEN` invoice and shows bank instructions for annual and Enterprise, and monthly self-serve stays on trial plus manual activation.

### 9.3 Renewal job

`python manage.py run_billing_cycle` is safe to run more than once a day.

For each subscription, in its own transaction:

1. Release stale credit reservations.
2. Expire due credit lots.
3. If `TRIALING` and `trial_ends_at` has passed, expire the trial.
4. If `PAST_DUE` and `grace_ends_at` has passed, expire the subscription.
5. If `cancel_at_period_end` and the period has ended, expire it.
6. If a downgrade is pending and the period has ended, swap the plan, snapshot the new price, then continue as a renewal.
7. If `ACTIVE` and `credit_period_end` has passed, open the next credit period and grant included credits. On an annual plan this does not create a charge.
8. If `ACTIVE`, interval `MONTH`, and `current_period_end` has passed, create the next invoice. If the provider is manual, move to `PAST_DUE` only after the due date plus the grace rule; do not cut access the same minute the invoice opens. If a provider is configured, attempt collection, and move to `PAST_DUE` only on failure.
9. If `ACTIVE`, interval `YEAR`, and `current_period_end` has passed, invoice the annual price the same way.
10. Send the 30-day founding-discount expiry notice once.

Grant idempotency key: `included:{subscription_id}:{credit_period_start.date().isoformat()}`. A second run on the same day must not double-grant.

## 10. HTTP API

Prefix: `/api/v1/billing/`. Auth: JWT, same as the rest of the API. Billing mutations require `OWNER` or `ADMIN`, matching practice finance. Reads of the public catalog are allowed to anonymous users. Reads of a cabinet’s own subscription are allowed to any member of that cabinet. Other roles receive 403 on checkout, cancel, packs, seats, and the pause switch.

Errors use a stable `code` plus a gettext `detail`.

| Code | HTTP | Meaning |
| --- | --- | --- |
| `seat_limit` | 402 | Invite would exceed seats. |
| `credit_exhausted` | 402 | Wallet cannot cover the operation. |
| `juria_paused` | 403 | Admin has paused JURIA. |
| `feature_unavailable` | 403 | Plan does not include the key, or the key is not released. |
| `subscription_inactive` | 403 | Trial expired, expired, or write attempted in read-only mode. |
| `billing_forbidden` | 403 | Role cannot manage billing. |
| `discount_rejected` | 400 | Unknown, exhausted, expired, or stacked code. |
| `enterprise_required` | 400 | Self-serve checkout of Enterprise. |
| `billing_profile_required` | 400 | Paid invoice without legal identity. |

| Method | Path | Who | Purpose |
| --- | --- | --- | --- |
| `GET` | `/plans/` | Public | Public active plans, prices excl. VAT, quotas, released features. No Enterprise price. No internal cost figures. |
| `GET` | `/credit-packs/` | Public | The three packs. |
| `GET` | `/subscription/` | Member | Current subscription, status, period ends, seats used and limit, storage quota, pending downgrade, discount end. |
| `GET` | `/entitlements/` | Member | Resolved key/value map for the cabinet. |
| `POST` | `/subscription/checkout/` | Owner, admin | Body: `plan`, `interval`, optional `discount_code`. Creates the invoice. Returns `invoice` and, later, `checkout`. |
| `POST` | `/subscription/change/` | Owner, admin | Body: `plan`. Upgrade invoices the proration and applies. Downgrade sets `pending_plan`. |
| `POST` | `/subscription/cancel/` | Owner, admin | Sets `cancel_at_period_end`. |
| `POST` | `/subscription/resume/` | Owner, admin | Clears a scheduled cancellation before period end. |
| `POST` | `/seats/` | Owner, admin | Body: `quantity` absolute extra seats. |
| `POST` | `/storage/` | Owner, admin | Body: `quantity` of 10 GB blocks. Allowed to purchase; enforcement of the quota waits on the meter. |
| `GET` | `/wallet/` | Member | `balance_jc`, included remaining, pack remaining, `percent_included_used`, `period_end`, `juria_paused`. |
| `POST` | `/wallet/pause/` | Owner, admin | Body: `paused` boolean. |
| `POST` | `/credit-packs/checkout/` | Owner, admin | Body: `pack`. |
| `GET` | `/invoices/` | Owner, admin | SaaS invoices only. |
| `GET` | `/invoices/{id}/` | Owner, admin | Detail and lines. |
| `GET` | `/usage/` | Owner, admin | Paginated usage events: operation, credits, user display name, timestamp, case id. No prompts, no document text. |
| `PUT` | `/billing-profile/` | Owner, admin | Legal identity. |
| `POST` | `/provider/webhook/` | Provider | Signed. No JWT. CSRF exempt only on this path. |

Checkout of the plan the cabinet is already on returns the current subscription and does not open a second invoice. Checkout while `PAST_DUE` pays the open invoice rather than starting a parallel subscription.

Frontend clients send no price, no credit balance, and no entitlement map that the server trusts. Prices on `POST` bodies are ignored.

## 11. Frontend

Replace the early-access pricing page. The page currently tells firms that public tiers do not exist. After this ships, that sentence is false.

Public `/pricing`, French, English, and Arabic, in the existing marketing shell:

- Prices in MAD, exclusive of VAT, with the VAT note next to the price.
- Monthly / annual toggle. Annual shows the prepaid total and the equivalent per month (339, 849, 1,699).
- Three cards: Solo, Cabinet (marked recommended), Business. Enterprise is a fourth block with “On quotation” and a contact path, not a checkout button.
- Each card lists released features only. Client portal, OCR, and phase 2 AI stay off the card.
- Included credits and the seat count are on the card. Credit weights can live in a short “How JURIA credits work” section: the seven operations and the rule that unused included credits expire at period end, packs last 90 days, and the workspace keeps working when credits run out.
- Primary action: start the 14-day trial. Secondary for Enterprise: talk to the team.
- Remove the per-user ROI price recommendation. The commercial unit is the organisation. A time-saved calculator may stay if it does not invent a per-user price.
- The currency switcher may show an informational conversion. Checkout and the contract currency stay MAD.

In-app, for owner and admin, a Billing section:

- Current plan, status, renewal date, founding end date if any.
- Seats used / limit, with add-seat at 99 MAD.
- JURIA balance, 80% and empty states, pack purchase, pause switch.
- Invoice list with PDF or printable HTML, subtotal, VAT, total.
- Upgrade and downgrade. Downgrade copy must say the change applies at the next renewal.
- Cancel, with the paid-through date.
- Trial banner for every member: days left and a link the admin can use to subscribe.

Empty, expired, and past-due states are part of the same screens, not a separate marketing page. A member who is not an admin sees the status and the balance and does not see checkout actions.

Strings go into `src/i18n` (`en`, `fr`, `ar`). Data access goes through `src/services/billing/`. No prices hardcoded in components; the plan payload is the source. Tests or a render check should cover: annual toggle arithmetic, Cabinet recommended state, Enterprise without a price, and a 402 `credit_exhausted` path that leaves the rest of the workspace usable.

## 12. Permissions

Add `billing.view` and `billing.manage` to `DEFAULT_ROLE_PERMISSIONS`.

| Role | View subscription and wallet | Manage billing |
| --- | --- | --- |
| `OWNER` | yes | yes |
| `ADMIN` | yes | yes |
| `MANAGER`, `LAWYER`, `ASSISTANT`, `VIEWER` | yes | no |

`billing.view` for non-admins returns the status, seat summary, and wallet balance. It omits invoices, the billing profile, and payment references.

Django admin is the operator console for complimentary conversion, manual payment, Enterprise price, custom entitlements, founding redemption override, and credit adjustment. Those actions write `SubscriptionEvent` or a ledger entry with the staff user as actor.

## 13. Tests

Minimum set for the first implementation PR:

- Catalog seed is idempotent and the three annual prices match the table in section 1.
- Registration creates one trial, one wallet, and one 100-credit lot. A second save does not grant a second trial lot.
- Trial seat cap is 2. The third active member is rejected when enforcement is on.
- Included credits do not roll over. A pack still has its remaining balance after renewal.
- Two concurrent reservations cannot drive `balance_jc` negative. Use a database lock test, not a sleep.
- The same idempotency key does not debit twice.
- A provider failure releases the reservation.
- FIFO spends the lot that expires sooner.
- Upgrade grants only the credit delta and invoices the proration. Downgrade does not change entitlements before period end.
- Cabinet A cannot read cabinet B’s wallet, invoices, or usage.
- A client-supplied price or credit field is ignored.
- Webhook replay with the same event id does not create a second payment.
- `SUBSCRIPTIONS_ENFORCE=False` does not block an existing cabinet.
- Expired and trial-expired subscriptions can read and cannot create a case or call JURIA.

## 14. Build order

1. Catalog models, seed command, public `GET /plans/` and `GET /credit-packs/`.
2. Subscription, trial on registration, wallet, lots, ledger, reserve/commit/release, JURIA gate behind the enforcement flag.
3. Member seat check behind the same flag.
4. Invoices, billing profile, manual payment, renewal command.
5. In-app billing screens and the public pricing page.
6. Measure real provider cost per operation, payment-processor fees, hosting, and storage. Compare with the 0.10 MAD planning figure before any public campaign depends on the margin.
7. Turn `SUBSCRIPTIONS_ENFORCE` on after complimentary backfill.
8. Card processor, storage meter, history retention, and phase 2 entitlements as their own releases.

## 15. Still open, on purpose

These are not blockers for the schema. They are blockers for the first live charge.

- Accountant confirmation of VAT on Moroccan B2B SaaS, and whether any customer is invoiced without VAT.
- Card processor, its fee, and its webhook shape.
- Actual model cost per JURIA operation, in MAD, from production token logs.
- The calendar date that closes the founding programme.
- Whether `CONTRACT_ANALYSIS` is launch quality or stays dark until phase 2.

Until those are answered, the product can run trials, ledger, and manual invoices. It should not present card checkout or a gross-margin claim.
