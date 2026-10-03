# FoundTab Web — Coding Rules

All global rules in `~/.claude/CLAUDE.md` apply. This file adds repo-specific guidance.

## Stack

React 18 + Vite + TypeScript strict. TanStack Query for server state. React Router for navigation.
Tailwind CSS for styling. shadcn/ui for components (added in T12).

## Folder structure

```
src/
  features/<feature>/     ← co-locate components, hooks, types per feature
  components/             ← shared, reusable UI components only
  lib/                    ← utilities, API client
  hooks/                  ← shared hooks
  types/                  ← shared TypeScript types
  config/                 ← env.ts, constants.ts
```

## API client

Types are generated from the BE OpenAPI spec via `npm run sync-api`.
Never manually write API types — always regenerate from spec.
API calls live in `src/lib/api.ts` or feature-level `src/features/<name>/api.ts`.

## UX rule — maximum simplicity for non-tech users

This app is used by home-based food business owners who may not be tech-savvy:
- Labels must be plain Malay/English — no technical terms
- Errors must tell users exactly what to do next (not just what failed)
- Forms must be as short as possible — only ask what's needed
- Loading states and empty states are mandatory — no blank screens
- Button labels describe the action: "Simpan" not "Submit"

## Components

- No class components
- Props as single object: `function Card({ title, onClick }: CardProps) {}`
- Always export named, not default, for components (exception: page-level components for Next.js/Vite route lazy-loading)

## State

- Server state: TanStack Query (`useQuery`, `useMutation`)
- UI state: React `useState` / `useReducer` in the component or feature
- No global client state library (Redux, Zustand) unless proven necessary
