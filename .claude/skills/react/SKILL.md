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

- **Prefer extracted event handlers** at component scope when they are passed to memoized children, reused across multiple elements, used in dependency arrays, or contain non-trivial logic.
- **Inline JSX callbacks are acceptable** for simple, local interactions when they keep the code clearer and are not causing avoidable re-renders in hot paths.
- **Use `useMemo`** for expensive computations or derived state.
- **Use `useCallback`** selectively for handlers where referential stability matters (for example, props to memoized children or values used in hook dependency arrays).
- Place hooks and any memoized values/functions near the top of the component, after state declarations, following existing file conventions.

**Prefer extraction when logic is non-trivial or stability matters**:

```tsx
// ✅ Simple inline callback — fine when the handler is trivial and local
<Button onClick={() => setOpen(true)}>Open</Button>;

// ✅ Extracted handler — preferred when logic is non-trivial or passed to memoized children
const handleSubmit = useCallback(
  (values: FormValues) => {
    const sanitized = sanitizeInput(values);
    onSubmit?.(sanitized);
  },
  [onSubmit],
);

return <Form onSubmit={handleSubmit} />;
```

---

## 5. Anti-Patterns Checklist

❌ **Inline arrow functions in JSX for non-trivial logic or props to memoized children** (can cause avoidable re-renders)
❌ **Inline object/array literals in JSX props** (breaks reference equality)
❌ **Complex logic inside render** (hard to test, poor separation of concerns)
❌ **Missing dependency arrays** in `useEffect`/`useCallback`/`useMemo`
❌ **Unnecessary state** (derive from props when possible)
❌ **Hardcoded query key strings** (use `QueryKeys` constants)

✅ **Extract and memoize** callbacks with `useCallback` when referential stability matters
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
- Perform browser testing with the available project tooling before finalizing UI changes
