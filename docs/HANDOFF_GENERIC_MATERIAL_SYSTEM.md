# Handoff: Generic Material + Variant System

**Date:** 2026-10-18  
**Status:** Design decided, NOT yet implemented  
**Next agent:** Read this fully before touching any code. Follow sub-ticket order — T1 blocks everything else.

---

## Problem

Currently `rawMaterials` serves as both the generic ingredient AND the physical stock unit. There is no separation between "Tepung Gandum" (the recipe concept) and "Tepung Gandum Cap Sawah A" (the thing you actually bought and stored).

This causes two failures:
1. Recipe says "Tepung Gandum" but stock has "Sawah A" and "Layar" — system can't resolve which to consume
2. When one brand runs out, production can't substitute intelligently — user has no UI to say "use Layar today"

---

## Core mental model (locked — do not re-open)

```
rawMaterials      = GENERIC layer    (recipe references this, never changes)
materialVariants  = BRAND layer      (what was actually purchased and stocked)

Recipe formula: "1kg Tepung Gandum"  → rawMaterial.id  (static forever)
Stock:          Sawah A 1.8kg        → materialVariant (changes every purchase)
                Layar   3.5kg        → materialVariant
```

**Formula never mentions brand. Production resolves brand at runtime.**  
**User always makes the substitution call. System never silently switches.**

---

## Current schema (before this ticket)

- `rawMaterials` — name, units, `currentStockBaseUnit` (stock tracked here = wrong level)
- `recipeIngredients` — `rawMaterialId` → rawMaterials ✅ already correct (generic ref)
- `purchaseItems` — `rawMaterialId` + `purchasedAs` (brand name stored, but no variant table)
- `productionIngredients` — `rawMaterialId` → rawMaterials, no variant tracking
- `productions` — PLANNED/COMPLETED/CANCELLED statuses

---

## Sub-tickets (implement in order)

---

### T1 — Data model: add `materialVariants` table

**New table: `materialVariants`**

```ts
export const materialVariants = pgTable(
  'material_variants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
    rawMaterialId: uuid('raw_material_id').notNull().references(() => rawMaterials.id),
    name: text('name').notNull(),           // brand name e.g. "Tepung Gandum Cap Sawah A"
    purchasedAs: text('purchased_as'),      // receipt label if different from name
    currentStockBaseUnit: numeric('current_stock_base_unit', { precision: 12, scale: 4 }).notNull().default('0'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('material_variants_org_idx').on(t.orgId),
    index('material_variants_raw_material_idx').on(t.rawMaterialId),
  ]
)
```

**Migration logic:**
- For every existing `rawMaterial`, create one `materialVariant` with the same name (brand = generic name for existing data — acceptable for now)
- Migrate `rawMaterials.currentStockBaseUnit` → `materialVariants.currentStockBaseUnit`
- Keep `rawMaterials.currentStockBaseUnit` as a computed/derived column (sum of all variants) OR remove it after verifying nothing reads it directly
- Add optional `variantId` to `productionIngredients` and `purchaseItems`

**Files to touch:**
- `src/db/schema/materialVariants.ts` — new file
- `src/db/schema/purchaseItems.ts` — add `variantId` FK (nullable)
- `src/db/schema/productionIngredients.ts` — add `variantId` FK (nullable)
- `src/db/schema/index.ts` — export materialVariants
- `src/db/migrations/` — generate migration after schema changes

---

### T2 — LLM generic mapping service

When OCR returns a new item name, call LLM to determine which `rawMaterial` (generic) it belongs to.

**New file: `src/services/materialMappingService.ts`**

```ts
export async function suggestGenericMaterial(
  orgId: string,
  receiptItemName: string,
): Promise<{ rawMaterialId: string | null; suggestedName: string }>
```

**Logic:**
1. Load all active `rawMaterials` for the org (names only)
2. Call LLM with the receipt item name + known generics list
3. Return best match `rawMaterialId` if confidence high, or `suggestedName` for a new generic

**Prompt:**

```
You are a kitchen inventory assistant for a Malaysian F&B business.

Known generic ingredients in this kitchen:
{{rawMaterialNames joined by comma}}

Receipt item: "{{receiptItemName}}"

Task: Match this receipt item to the closest known generic ingredient.
If no good match exists, suggest a clean generic name (no brand, no suffix).

Reply in JSON only:
{ "match": "Tepung Gandum", "isNew": false }
OR
{ "match": "Tepung Kacang", "isNew": true }

No explanation. JSON only.
```

**Model:** Haiku (cheapest, fast, accurate for this narrow task)  
**Cost:** < RM0.01 per 30-item receipt

**Files to touch:**
- `src/services/materialMappingService.ts` — new file
- `src/services/ocrService.ts` — call `suggestGenericMaterial` for each new item after OCR parse

---

### T3 — OCR review UX redesign

Replace the current single-screen full-list review with a confidence-batched flow.

#### Step 1 — Receipt summary screen (before review)

Show counts before asking user to do anything:

```
┌─────────────────────────────────────┐
│  📄 Receipt has 30 items            │
│                                     │
│  ✅ 22 items — already in stock.    │
│     We matched them.                │
│                                     │
│  ❓  6 items — need your input.     │
│     Takes about 2 minutes.          │
│                                     │
│  ✖   2 items — fees/taxes,          │
│     we'll skip them.                │
│                                     │
│     [ Review 6 items → ]            │
└─────────────────────────────────────┘
```

**Matching logic:**
- ✅ matched: `purchasedAs` exists in DB for this org, or exact name match in `rawMaterials`
- ✖ skip: item name contains keywords: "GST", "SST", "Service Charge", "Discount", "Rounding", "Fee"
- ❓ unmatched: everything else → goes to per-item review

#### Step 2 — Per-item review (unmatched only, one at a time)

**New item (LLM suggested a new generic):**

```
┌─────────────────────────────────────┐
│  Item 1 of 6             ░░░░░░░░░  │
│                                     │
│  "Tepung Gandum Cap Sawah"          │
│   1 pkt  ·  RM 3.59                 │
│                                     │
│  Do you want to track this          │
│  in your stock?                     │
│                                     │
│  [ ✅ Yes, track this item ]        │
│  [ ✖  No, skip it         ]        │
└─────────────────────────────────────┘
```

If Yes → name step:

```
┌─────────────────────────────────────┐
│  What do you call this item?        │
│                                     │
│  [ Tepung Gandum Cap Sawah   ✏️ ]   │
│                                     │
│  Tip: use a simple name like        │
│  "Tepung Gandum", not the brand.    │
│                                     │
│  [ Save & next → ]                  │
└─────────────────────────────────────┘
```

- Pre-filled with LLM suggestion (already stripped brand name)
- User can edit or leave as-is
- `mappedMaterialName` = what user types = generic name → `rawMaterial.name`
- `purchasedAs` = original receipt name ("Tepung Gandum Cap Sawah")

**LLM suggested a match to existing generic:**

```
┌─────────────────────────────────────┐
│  Item 2 of 6                        │
│                                     │
│  "Tepung Gandum Cap Layar"          │
│   2 pkt  ·  RM 7.20                 │
│                                     │
│  Is this the same as:               │
│                                     │
│  [ ✅ Yes — Tepung Gandum ]         │
│  [ ✖  No, it's different  ]        │
└─────────────────────────────────────┘
```

If No → falls back to name step above.

**"Link to existing" fallback (if user says No or wants to override):**

```
┌─────────────────────────────────────┐
│  Search your stock:                 │
│                                     │
│  [ 🔍 Type to search...      ]      │
│                                     │
│  Or add as new item →               │
└─────────────────────────────────────┘
```

#### Step 3 — Confirm auto-matched items

```
┌─────────────────────────────────────┐
│  Before we finish —                 │
│                                     │
│  These 22 items were matched.       │
│  Looks right?                       │
│                                     │
│  • Tepung Gandum          2 pkt     │
│  • Gula Pasir             1 kg      │
│  • Minyak Masak           3 btl     │
│    ... 19 more            [see all] │
│                                     │
│  [ ✅ Yes, all good  ]              │
│  [ ✖  Let me check  ]              │
└─────────────────────────────────────┘
```

#### Done screen

```
┌─────────────────────────────────────┐
│  ✅ Done!                           │
│                                     │
│  24 items added to stock            │
│   4 items skipped                   │
│   2 fees ignored                    │
│                                     │
│  Total spent: RM 187.40             │
│                                     │
│  [ Go to stock list ]               │
└─────────────────────────────────────┘
```

**Files to touch:**
- `foundtab-web/src/features/purchases/pages/OcrReviewPage.tsx` — full redesign
- `foundtab-backend/src/services/ocrService.ts` — add LLM mapping call, return `suggestedGenericName` + `suggestedRawMaterialId` per item
- `foundtab-backend/src/routes/v1/purchases.ts` — accept `variantId` in addition to existing fields

---

### T4 — Production substitution: manual trigger

When user manually triggers production, surface which variants are available for each ingredient.

**Production trigger screen — before:**

```
┌──────────────────────────────────────────┐
│  Start Production                        │
│  Roti Canai  ·  100 pcs                  │
│                                          │
│  Ingredients:                            │
│                                          │
│  ✅  Gula Pasir      1.2 kg — enough     │
│  ✅  Marjerin        0.8 kg — enough     │
│  ⚠️   Tepung Gandum  5.0 kg — choose     │
│                                          │
│  [ Review & start → ]                    │
└──────────────────────────────────────────┘
```

**Tepung Gandum detail (tap ⚠️ row to expand):**

```
┌──────────────────────────────────────────┐
│  Tepung Gandum  · need 5.0 kg            │
│                                          │
│  ◉  Sawah A     1.8 kg in stock         │
│  ◉  Layar       3.5 kg in stock         │
│  ○  Bobo        0.0 kg  (out of stock)  │
│                                          │
│  Using: Sawah A 1.8 + Layar 3.2         │
│  Total: 5.0 kg ✅                        │
│                                          │
│  [ Done ]                                │
└──────────────────────────────────────────┘
```

- Default selection: fill from highest stock first
- User can deselect a variant (forces others to compensate)
- If total still < needed: show max possible batch count

**If stock insufficient even with all variants:**

```
│  ❌  Only 3.1 kg available total         │
│      (Sawah A 1.8 + Layar 1.3)          │
│                                          │
│  Max you can make today: 62 pcs         │
│                                          │
│  [ Make 62 pcs ]  [ Cancel ]            │
```

**On confirm:** record per-variant deduction in `productionIngredients.variantId`.

**Files to touch:**
- `foundtab-web/src/features/production/pages/ProductionTriggerPage.tsx` (or equivalent)
- `foundtab-backend/src/services/productionService.ts` — add `resolveVariants(orgId, recipeId, batchCount)` that returns variant breakdown
- `foundtab-backend/src/repositories/productionRepository.ts` — record variantId on productionIngredients

---

### T5 — Production substitution: automated trigger notifications

For scheduled/automated productions, notify at **24h → 12h → 6h → 1h** before.

Each notification is a question, not a statement. User decides.

**Notification format (WhatsApp or push — use existing notification service):**

```
⚠️  Production in 6 hours: Roti Canai x100

Sawah A only has 1.8 kg. Need 5 kg.

Reply:
1 — Use Layar as backup
2 — I'll restock before then
3 — Reduce batch to 62 pcs
```

**If no reply by 1h before:** send final alert, auto-reduce batch to what stock allows. Never silently substitute — if user hasn't responded, reduce quantity instead.

**Notification schedule logic:**
- Calculate stock deficit at each checkpoint (24h, 12h, 6h, 1h before scheduled time)
- Only send notification if there IS a deficit — don't spam if stock is fine
- If user replies at 12h "I'll restock" and stock is still low at 6h → send again

**Files to touch:**
- `foundtab-backend/src/services/productionService.ts` — add `checkProductionReadiness(productionId)`
- New cron/scheduler: check upcoming productions every hour, send notifications when thresholds hit
- `foundtab-backend/src/services/whatsappParserService.ts` — handle reply codes 1/2/3

---

## Don'ts

- Do NOT change `recipeIngredients.rawMaterialId` — this is already the correct generic reference
- Do NOT track stock at the `rawMaterials` level after migration — all stock moves to `materialVariants`
- Do NOT let the production module auto-substitute silently — user always approves
- Do NOT block OCR completion if LLM mapping fails — fall back to user typing the name manually
- Do NOT make T5 notifications noisy — only fire when there is an actual deficit

---

## Test scenarios

**T2 — LLM mapping:**
1. "Tepung Gandum Cap Sawah" → matches existing generic "Tepung Gandum" ✅
2. "Kicap Pekat ABC" → no match → suggests new generic "Kicap Pekat" ✅
3. LLM fails/timeout → returns null → OCR review shows blank editable field, no crash ✅

**T3 — OCR review:**
1. 30-item receipt: 22 matched, 6 unknown, 2 fees → summary screen shows correct counts
2. Unknown item: user edits name → generic created, purchasedAs = original receipt name
3. LLM suggests match → user confirms → existing rawMaterialId used, new variant created
4. Second upload of same brand → auto-matched via purchasedAs lookup ✅

**T4 — Manual production:**
1. All variants in stock → no ⚠️ rows → confirm without expansion
2. One variant low → ⚠️ row expands → user picks ratio → deduction recorded per variant
3. Total stock insufficient → shows max batch → user reduces or cancels
4. Production completes → variant stock reduced correctly, not rawMaterial stock

**T5 — Automated notifications:**
1. 24h before: sufficient stock → no notification sent
2. 12h before: stock drops below needed → notification sent with 3 options
3. User replies "1" → Layar marked as backup → no more notifications for this production
4. No reply by 1h → auto-reduce batch, send confirmation of what will be made

---

## Stack reference

- Frontend: React + TypeScript + Tailwind, in `foundtab-web/`
- Backend: Node.js + Express + Drizzle ORM, in `foundtab-backend/`
- DB: Postgres on Docker, host port **5433**, credentials `devuser/devpass`, db `foundtab_dev`
- Backend runs on port **8080** inside Docker
- LLM: use Haiku (cheapest) via existing LLM service pattern in the codebase
- Restart backend: `cd foundtab-backend && docker compose restart foundtab-backend`
- Type-check frontend: `cd foundtab-web && npx tsc --noEmit`
