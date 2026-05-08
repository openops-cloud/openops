---
name: react
description: >
  Use when creating or editing frontend React code in react-ui or ui-components packages.
  Triggers on any frontend component, hook, or UI work.
---

# React & Frontend Development Skill

When working on frontend code in `packages/react-ui` or `packages/ui-components`, follow these guidelines strictly.

---

## 1. Modular Components

- Break the design into independent files. Avoid large, single-file outputs.
- Each component should have one clear responsibility.
- Reusable, pure components live in `packages/ui-components` and **must** have Storybook stories in `packages/ui-components/src/stories/`.
- Application-specific components live in `packages/react-ui`.
- Do not make breaking changes to existing component interfaces (props, names) without discussion.

---

## 2. Logic Isolation

- Move event handlers and business logic into **custom hooks** (`use-*.ts`).
- Follow existing convention: hooks go in `hooks/` directories alongside features (e.g., `features/campaigns/hooks/use-campaign-charts.ts`).
- Keep component files focused on rendering; delegate logic to hooks.
- Extract complex derived state into hooks or utility functions.

---

## 3. Data Fetching — react-query v5

- Use `QueryKeys` from `@/app/constants/query-keys.ts` — **never hardcode query key strings**.
- Use `useQuery` for reads, `useMutation` for writes.
- Invalidate related queries after mutations using `queryClient.invalidateQueries`.
- Use the `enabled` option for conditional queries.
- Keep query functions in dedicated API modules (e.g., `campaigns-api.ts`).

**Example — existing pattern:**

```tsx
import { QueryKeys } from '@/app/constants/query-keys';
import { useQuery } from '@tanstack/react-query';
import { campaignsApi } from '../campaigns-api';

export function useCampaignCharts(campaignId: string) {
  const { data: chartData } = useQuery({
    queryKey: [QueryKeys.campaignCharts, campaignId],
    queryFn: () => campaignsApi.getCharts(campaignId),
  });

  const weekData = useMemo(() => /* derive from chartData */, [chartData]);

  return { chartData, weekData };
}
```

---

## 4. React Hooks & Performance

- **Always extract event handlers** to memoized callbacks using `useCallback` at component scope.
- **Never define inline callbacks** in JSX (`onChange`, `onBlur`, `onClick`, etc.).
- **Use `useMemo`** for expensive computations or derived state.
- **Use `useCallback`** for all event handlers passed as props or used in dependency arrays.
- Place all hooks and memoized functions at the top of the component, after state declarations.

**BAD** — Inline callbacks:

```tsx
<Input
  onChange={(e) => {
    const num = Number.parseInt(e.target.value);
    onMaxChange?.(Number.isNaN(num) ? 0 : Math.max(1, num));
  }}
  onBlur={(e) => {
    if (!e.target.value || Number.parseInt(e.target.value) < 1) {
      onMaxChange?.(1);
    }
  }}
/>
```

**GOOD** — Extracted memoized handlers:

```tsx
const handleMaxChange = useCallback(
  (e: React.ChangeEvent<HTMLInputElement>) => {
    const num = Number.parseInt(e.target.value);
    onMaxChange?.(Number.isNaN(num) ? 0 : Math.max(1, num));
  },
  [onMaxChange],
);

const handleMaxBlur = useCallback(
  (e: React.FocusEvent<HTMLInputElement>) => {
    if (!e.target.value || Number.parseInt(e.target.value) < 1) {
      onMaxChange?.(1);
    }
  },
  [onMaxChange],
);

return <Input onChange={handleMaxChange} onBlur={handleMaxBlur} />;
```

---

## 5. Anti-Patterns Checklist

❌ **Inline arrow functions in JSX** (creates new function on every render)
❌ **Inline object/array literals in JSX props** (breaks reference equality)
❌ **Complex logic inside render** (hard to test, poor separation of concerns)
❌ **Missing dependency arrays** in `useEffect`/`useCallback`/`useMemo`
❌ **Unnecessary state** (derive from props when possible)
❌ **Hardcoded query key strings** (use `QueryKeys` constants)

✅ **Extract and memoize** all callbacks with `useCallback`
✅ **Extract complex JSX logic** into separate memoized functions or sub-components
✅ **Derive state** with `useMemo` instead of storing duplicated state
✅ **Keep component functions focused** — one clear responsibility per function
✅ **Move business logic into custom hooks**

---

## 6. Styling

- Use shadcn components as the foundation.
- Use `cn` utility to group Tailwind classnames:

```tsx
<div
  className={cn(
    'absolute bottom-[-20px] left-1/2 -translate-x-1/2',
    'w-[118px] h-[24px] flex items-center justify-center',
    'font-satoshi font-medium text-xs text-blueAccent-500',
    'border border-solid border-blueAccent-500 rounded-[4px]',
    'bg-background-800',
    {
      'pt-2': !someVar,
    },
  )}
>
  {t('Sample output data')}
</div>
```

---

## 7. Code Quality Constraints

- **SOLID, DRY, Clean Code** — small functions, clear names, no dead code.
- **Pattern consistency** — read existing code in the target area before writing new code.
- Run build, test, lint, type-check iteratively:

```bash
npx nx test react-ui
npx nx test ui-components
npx nx lint react-ui
npx nx lint ui-components
```

---

## 8. Project-Specific Context

- **React 18** with functional components
- **Zustand** for state management
- **react-query v5** (`@tanstack/react-query`) for data fetching
- **shadcn** for UI components
- **Axios** via existing wrapper in `api.ts`; use `qs` package for query strings
- Tests go in `tests/` folders alongside code (Jest)
- Use `qa-agent` subagent for browser testing
