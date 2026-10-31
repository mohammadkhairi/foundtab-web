# Handoff: Rename "Menu" → "Catalogue"

**Date:** 2026-10-18  
**Status:** Decision locked. Execute only — no design questions to re-open.  
**Scope:** Label/copy rename only. No data model or API changes.

---

## Decision

| Feature | Old label | New label | Why |
|---------|-----------|-----------|-----|
| Menu (bundle builder) | Menu | **Catalogue** | "Menu" sounds like a restaurant. "Catalogue" = the list of packaged combos/sets you offer. |
| Products (finished goods) | Products | **Products** | No change. Keep as-is. |

---

## What to change

### 1. Routes — `foundtab-web/src/App.tsx`

Change `/menu` → `/catalogue` in all 3 routes:

```tsx
// Before
<Route path="/menu" element={...MenuListPage...} />
<Route path="/menu/new" element={...MenuFormPage...} />
<Route path="/menu/:id/edit" element={...MenuFormPage...} />

// After
<Route path="/catalogue" element={...MenuListPage...} />
<Route path="/catalogue/new" element={...MenuFormPage...} />
<Route path="/catalogue/:id/edit" element={...MenuFormPage...} />
```

### 2. Navigation — `foundtab-web/src/components/DesktopSidebar.tsx`

```tsx
// Before
{ path: '/menu', label: t('nav_menu'), icon: <PackageIcon /> }

// After
{ path: '/catalogue', label: t('nav_catalogue'), icon: <PackageIcon /> }
```

Check `BottomNav.tsx` for the same — update path and label key if `/menu` appears there.

### 3. Navigate calls — `foundtab-web/src/features/menu/pages/MenuFormPage.tsx`

```tsx
// Before
navigate('/menu')

// After
navigate('/catalogue')
```

### 4. Translation keys — `foundtab-web/src/i18n/translations.ts`

Add new keys alongside existing ones (keep old `menu_*` keys for now to avoid any runtime errors from missed spots — remove after confirmed working):

**English block — find the `// Menu` section and update:**
```ts
nav_catalogue: 'Catalogue',      // was nav_menu: 'Menu'
menu_title: 'Catalogue',         // page heading (key stays, value changes)
menu_formAddTitle: 'Add to Catalogue',
menu_formEditTitle: 'Edit Catalogue Item',
menu_emptyTitle: 'No catalogue items yet',
menu_emptyDesc: 'Add your product bundles and sets here.',
menu_emptyAction: 'Add item',
menu_add: 'Add item',
```

**Malay block — same section:**
```ts
nav_catalogue: 'Katalog',
menu_title: 'Katalog',
menu_formAddTitle: 'Tambah ke Katalog',
menu_formEditTitle: 'Edit Item Katalog',
menu_emptyTitle: 'Tiada item katalog lagi',
menu_emptyDesc: 'Tambah set atau bundle produk anda di sini.',
menu_emptyAction: 'Tambah item',
menu_add: 'Tambah item',
```

Also rename `nav_menu` → `nav_catalogue` in both language blocks (update value + key reference in nav components).

### 5. Setup checklist — `foundtab-web/src/features/onboarding/components/SetupChecklist.tsx`

The checklist step for `purchase` links to `/purchases/new`. No menu/catalogue step in checklist — nothing to change here.

### 6. Any other hardcoded `/menu` strings

Run this grep to catch stragglers:
```bash
grep -rn '"/menu"\|'"'"'/menu'"'" src/ --include="*.tsx" --include="*.ts"
```

---

## What NOT to change

- **API routes** — the backend routes stay at `/api/v1/menu`. This is a frontend label rename only.
- **File/folder names** — `src/features/menu/` folder stays. Component file names stay. Only labels and routes change.
- **Products feature** — zero changes. `/products`, `nav_products`, all product translation keys untouched.
- **Database** — no schema changes.

---

## Test checklist before handback

1. `/catalogue` loads the menu list page
2. `/catalogue/new` opens the add form
3. `/catalogue/:id/edit` opens the edit form
4. Sidebar shows "Catalogue" (not "Menu")
5. Page `<h1>` heading shows "Catalogue"
6. Save/cancel navigates back to `/catalogue`
7. `/menu` old route — can 404 or redirect, either is fine (no existing links in production)
8. `npx tsc --noEmit` passes clean

---

## Stack reference

- Frontend: `foundtab-web/` — React + TypeScript + Tailwind
- Run type check: `cd foundtab-web && npx tsc --noEmit`
- No backend restart needed (API routes unchanged)
