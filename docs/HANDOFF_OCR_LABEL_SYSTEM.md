# Handoff: OCR Receipt → Generic Material Label System

**Date:** 2026-10-18  
**Status:** Design decided, NOT yet implemented  
**Next agent:** Pick up from "What to build" below — do not re-open design decisions.

---

## Context

FoundTab is an F&B inventory management app. One of its features is uploading a purchase receipt — OCR extracts the line items, and the user maps each extracted item to a raw material in their database.

**The problem being solved:** OCR reads brand names from receipts (e.g. "Tepung Gandum Cap Sawah") but raw materials in the system should be stored as generic labels (e.g. "Tepung Gandum"). The brand/receipt name is separate metadata (`purchasedAs`).

---

## Current state (before this ticket)

### Frontend: `foundtab-web/src/features/purchases/pages/OcrReviewPage.tsx`

- OCR returns items with `itemName` (raw text from receipt)
- Review screen shows each item with a `SearchableSelect` dropdown
- Default is always **"Create [itemName] as new material"** (`mappedMaterialId: null`)
- Auto-match by exact name was added in the previous session — if the DB already has a material with the same name, it pre-selects it and shows a green "matched" badge
- `purchasedAs` field is sent to backend when the mapped name differs from the receipt name

### Backend: `foundtab-backend/src/services/ocrService.ts`

- `OcrLineItem` type: `{ itemName, quantity, unit, unitPrice, totalPrice }`
- No `suggestedLabel` field yet
- The OCR prompt (in `ocrService.ts`) currently says: `"clean product name"` for `itemName` — it cleans up OCR noise but does NOT strip brand names

### Backend: `foundtab-backend/src/routes/v1/purchases.ts`

- Accepts `rawMaterialName` (generic label) + optional `purchasedAs` (receipt brand name)
- Creates new raw material if `rawMaterialId` is not supplied
- No changes needed here — the contract is correct

---

## What to build

### Decision: Option A — Inline editable name on the review screen

When an OCR item has **no match** in the DB (`mappedMaterialId === null`), show an editable text field pre-filled with the OCR `itemName`. The user can:
- Leave it as-is → creates a material with that name (could be brand name)
- Edit it inline to the generic name → creates material with generic name, `purchasedAs` stores the original receipt name

**No backend change needed.** The `purchasedAs` field is already wired in the frontend payload:
```ts
purchasedAs: item.itemName !== item.mappedMaterialName ? item.itemName : undefined
```

### What the UX looks like

**Item has no DB match (new material):**
```
[OCR label: "Tepung Gandum Cap Sawah"]   1 pkt · RM 3.59
┌─────────────────────────────────────────────┐
│ 🟡 New material name:                        │
│ [Tepung Gandum Cap Sawah          ✏️ edit]   │
│  ^ user can edit this to "Tepung Gandum"     │
└─────────────────────────────────────────────┘
   or  [Link to existing material ▾]
```

**Item has a DB match (auto-matched):**
```
[OCR label: "Tepung Gandum Cap Sawah"]  ✅ matched   1 pkt · RM 3.59
┌─────────────────────────────────────────────┐
│  Tepung Gandum  (existing material)          │
└─────────────────────────────────────────────┘
   [Change ▾]
```

---

## Exact files to touch

### 1. `foundtab-web/src/features/purchases/pages/OcrReviewPage.tsx`

**Add to `ReviewItem` type:**
```ts
type ReviewItem = OcrItem & {
  mappedMaterialId: string | null
  mappedMaterialName: string  // editable label — user can rename before creating
  deleted: boolean
}
```
`mappedMaterialName` already exists — it just needs to be **editable in the UI** when `mappedMaterialId === null`.

**In the review JSX, replace the SearchableSelect block for unmatched items with two modes:**

```tsx
{item.mappedMaterialId === null ? (
  // NEW MATERIAL MODE — show editable name + option to link existing
  <div className="space-y-2">
    <div>
      <p className="text-[10px] font-medium text-amber-600 uppercase tracking-wide mb-1">New material name</p>
      <input
        type="text"
        value={item.mappedMaterialName}
        onChange={(e) => updateItemName(idx, e.target.value)}
        className="w-full border border-amber-200 bg-amber-50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
      />
      <p className="text-[10px] text-gray-400 mt-1">
        Use a generic name, not the brand. e.g. "Tepung Gandum" not "Tepung Gandum Cap Sawah"
      </p>
    </div>
    <button
      type="button"
      onClick={() => setLinkingIdx(idx)}  // see note below
      className="text-xs text-sky-600 font-medium"
    >
      Link to existing material instead →
    </button>
  </div>
) : (
  // MATCHED MODE — show SearchableSelect to change if needed
  <SearchableSelect
    value={item.mappedMaterialId}
    onChange={(id) => updateItemMap(idx, id)}
    options={materials.map((m) => ({ id: m.id, label: m.name, sublabel: m.baseUnit }))}
    createOption={{ id: '__new__', label: `Create "${item.itemName}" as new material` }}
    placeholder="Select or search material…"
  />
)}
```

**Add `updateItemName` function:**
```ts
function updateItemName(idx: number, name: string) {
  setReviewItems((prev) => prev.map((item, i) => i === idx ? { ...item, mappedMaterialName: name } : item))
}
```

**The "Link to existing" button** can either:
- Directly show the `SearchableSelect` inline (simplest — just toggle a local state)
- Or call `updateItemMap(idx, materialId)` which already sets `mappedMaterialId`

Simplest implementation: add a `showPicker` boolean to per-item state (or a separate `Set<number>` for which indices have the picker open).

### 2. No backend changes needed

The `purchasedAs` logic is already correct:
```ts
purchasedAs: item.itemName !== item.mappedMaterialName ? item.itemName : undefined
```

When user renames "Tepung Gandum Cap Sawah" → "Tepung Gandum":
- `rawMaterialName` = "Tepung Gandum" → new material created with generic name
- `purchasedAs` = "Tepung Gandum Cap Sawah" → stored as the receipt brand name

---

## Don'ts

- Do NOT add `suggestedLabel` to the backend OCR endpoint — that was the Option B we decided against (too complex for now)
- Do NOT change the `SearchableSelect` component — it's working correctly for the matched-material case
- Do NOT touch `purchasedAs` logic — it's already wired correctly
- Do NOT break the auto-match-by-name logic added in the previous session (materials load on mount, exact name match pre-selects the existing material)

---

## Test scenarios to verify before handback

1. **First-time brand item** — upload receipt with "Tepung Gandum Cap Sawah" (not in DB)
   - Review shows amber "New material name" field pre-filled with "Tepung Gandum Cap Sawah"
   - User edits to "Tepung Gandum" and confirms
   - DB gets material named "Tepung Gandum", purchase item has `purchasedAs = "Tepung Gandum Cap Sawah"`

2. **Second upload of same item** — "Tepung Gandum Cap Sawah" on another receipt, "Tepung Gandum" already in DB
   - Auto-match should NOT fire (receipt name ≠ generic DB name)
   - Review shows amber field pre-filled with "Tepung Gandum Cap Sawah"
   - User sees hint, edits to "Tepung Gandum", or clicks "Link to existing" and selects it
   - No duplicate material created

3. **Exact name match** — "Tepung Gandum" in receipt, "Tepung Gandum" already in DB
   - Auto-match fires → shows "matched" badge → SearchableSelect pre-selected
   - User confirms without touching it

4. **User links to existing** — any unmatched item, user clicks "Link to existing material"
   - SearchableSelect appears, user searches and selects
   - Item switches to matched mode
   - `mappedMaterialId` is set, `mappedMaterialName` becomes the DB material's name

---

## Stack reference

- Frontend: React + TypeScript + Tailwind, in `foundtab-web/`
- Backend: Node.js + Express + Drizzle ORM, in `foundtab-backend/`
- DB: Postgres on Docker, host port **5433**, credentials `devuser/devpass`, db `foundtab_dev`
- Backend runs on port **8080** inside Docker
- To restart backend after changes: `cd foundtab-backend && docker compose restart foundtab-backend`
- To type-check frontend: `cd foundtab-web && npx tsc --noEmit`
