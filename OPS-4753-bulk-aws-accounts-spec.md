# OPS-4753 — Bulk-add AWS accounts to a connection

Spec for the MVP. Ticket: https://linear.app/openops/issue/OPS-4753/support-bulk-multi-account-aws-connections-via-account-id-list

Mockups:

- Textarea variant (chosen): https://claude.ai/code/artifact/5887548a-84a8-4703-adde-24d2717950e6
- Rows variant (not chosen, kept for reference): https://claude.ai/code/artifact/58fcf073-9497-4d82-ac2a-416353720ceb

## 1. Problem

Payoneer has 47 AWS accounts under two payers. Today each account has to be added
as a `roles[]` entry on an AWS connection by typing the full role ARN, external ID
and alias by hand. That is 47 repetitive form entries and blocks their rollout.

Note the ticket says "one connection per account"; the product already supports
**one connection per payer with many roles** (`amazonAuth.roles`, per-step Accounts
dropdown, `getCredentialsListFromAuth`). We are keeping that model. Confirmed with
the customer: **2 connections × ~23 roles**, not 47 connections.

## 2. Solution in one sentence

Add a "+ Add multiple accounts" button beside the existing "+ Add Item" in the AWS connection
dialog that opens a panel where the user pastes a list of account IDs, enters a
role name and an external ID once, and generates one `roles[]` entry per account.
Role validation reports every failing account in one message instead of stopping
at the first.

## 3. Decisions

| #   | Decision                | Choice                                                                                                                                                                                                                                                                                                             |
| --- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Data model              | Unchanged. Generated entries are ordinary `roles[]` items: `{ assumeRoleArn, assumeRoleExternalId, accountName }`. No API, schema, DB or engine changes.                                                                                                                                                           |
| 2   | Input mechanism         | Single textarea of account IDs. No alias input at bulk time.                                                                                                                                                                                                                                                       |
| 3   | `accountName`           | Set to the account ID. Editable afterwards on the generated role card (existing array editor — no extra work).                                                                                                                                                                                                     |
| 4   | Role name / external ID | Entered once in the panel, applied to every generated role. Remembered for the lifetime of the dialog (`useState`), not persisted.                                                                                                                                                                                 |
| 5   | Trigger gating          | Button rendered only when `authProviderKey === 'AWS'` in the connection dialog (same guard as the existing roles banner). No generic framework abstraction.                                                                                                                                                        |
| 6   | Button placement        | Beside the existing "Add Item" button, via a new slot on `ArrayBlockProperty`.                                                                                                                                                                                                                                     |
| 7   | "Add Item" label        | **Kept as-is** ("Add Item"). The `addItemLabel` idea was implemented, then dropped by decision — no framework change.                                                                                                                                                                                              |
| 8   | Invalid / duplicate IDs | Skipped, not blocking. While typing only the live count on the button is shown ("Add N accounts") — **no live error text**. After clicking Add, a one-line summary under the roles list reports what was added and skipped (invalid IDs, already-listed IDs). Duplicates include IDs already present in `roles[]`. |
| 9   | Validation atomicity    | Save stays atomic: any failing role rejects the save. Error message lists all failures. No per-role status persisted.                                                                                                                                                                                              |
| 10  | Error message size      | Header + one bullet per failure, **no cap** (the dialog body scrolls).                                                                                                                                                                                                                                             |
| 11  | Account cap             | None. Adjust banner wording when `roles.length > 50` ("may take a minute").                                                                                                                                                                                                                                        |
| 12  | Docs                    | Deferred to a separate task.                                                                                                                                                                                                                                                                                       |

## 4. UX

Roles section of the AWS connection dialog:

```
Roles                                              23 accounts
┌ #1 ─────────────────────────────────────────────────────── 🗑 ┐
│ Assume Role ARN      [arn:aws:iam::111122223333:role/OpenOpsRole] │
│ Assume Role External ID [payoneer-openops]                        │
│ Account Alias        [111122223333]                               │
└───────────────────────────────────────────────────────────────┘
… (one card per role — unchanged existing editor)

[ + Add Item ]  [ + Add multiple accounts ]
```

Clicking **+ Add Item** appends one empty role card (unchanged).

Clicking **+ Add multiple accounts** opens a panel below the list (with a close ✕):

```
┌ Add multiple accounts ────────────────────────────────────── ✕ ┐
│ Account IDs — one per line, or comma / space separated          │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ 111122223333, 444455556666                                  │ │
│ │ 777788889999                                                │ │
│ └────────────────────────────────────────────────────────────┘ │
│ Role name        [OpenOpsRole]   External ID (optional) [ … ]  │
│ arn:aws:iam::<account-id>:role/OpenOpsRole                      │
│                                          [ Add 19 accounts ]    │
└─────────────────────────────────────────────────────────────────┘
```

Behaviour:

- The textarea is parsed on every change (client-side only, no network):
  split on `/[\s,;]+/`, valid = `/^\d{12}$/`, dedupe within the paste and
  against existing `roles[].assumeRoleArn` account IDs.
- The button label is `Add N accounts` where N = valid count; disabled when
  N = 0 or role name is empty. No invalid/duplicate messages are shown while typing.
- On click: append N role entries, clear the textarea, collapse the panel,
  scroll the last new card into view, and show a muted one-line summary under the
  roles list: `Added 4 account(s). Skipped 1 invalid account ID(s): 987…. Skipped 1
already-listed account(s): 1111….` The summary clears when the panel is reopened.
  Role name / external ID keep their values.
- Generated cards are the normal editable cards; the alias field shows the
  account ID and can be changed.
- Existing "Validating AWS roles may take 10-30 seconds" banner unchanged;
  when `roles.length > 50` the text becomes "may take a minute or more".

### Save fails validation

Existing error slot ("Connection failed with error …", already
`whitespace-pre-wrap`) shows:

```
2 of 23 roles could not be assumed:
- 444455556666 (arn:aws:iam::444455556666:role/OpenOpsRole): AccessDenied: User … is not authorized to perform: sts:AssumeRole …
- 123412341234 (arn:aws:iam::123412341234:role/OpenOpsRole): NoSuchEntity: Role "OpenOpsRole" does not exist
```

Nothing is saved. User fixes or removes the failing cards and saves again.

## 5. Code changes

### 5.1 Blocks framework

No changes (the optional `addItemLabel` was dropped — see decision 7).

### 5.2 UI — array footer slot and label

`packages/react-ui/src/app/features/builder/block-properties/array-property.tsx`

- New optional prop `extraActions?: React.ReactNode`.
- Footer becomes a flex row: existing Add button + `extraActions`.
- Keep `data-testid="appendNewArrayItemButton"` on the Add button — used by e2e
  utils (`packages/tests-e2e/utils/blocks/aws/add-aws-name-and-value-filter.util.ts:7`).
- Add button text unchanged: `t('Add Item')`.

`packages/react-ui/src/app/features/builder/block-properties/auto-properties-form.tsx`

- New optional prop `arrayExtraActions?: Record<string, React.ReactNode>`
  (keyed by property name). Thread it through `selectFormComponentForPropertyParams`
  (`auto-properties-form.tsx:89`) and in the `PropertyType.ARRAY` case pass
  `extraActions={arrayExtraActions?.[propertyName]}`.
- `AutoPropertiesFormComponent` (`auto-properties-form.tsx:46`) and
  `CustomAuthConnectionSettings` (`custom-auth-connection-settings.tsx:10`) are
  `React.memo`; the dialog must `useMemo` the `{ roles: <Trigger/> }` object or
  every dialog render (each keystroke in the bulk textarea) re-renders the whole
  auth form.

`packages/react-ui/src/app/features/connections/components/custom-auth-connection-settings.tsx`

- Accept and forward `arrayExtraActions`.

### 5.3 UI — bulk panel

New: `packages/react-ui/src/app/features/connections/lib/aws-bulk-roles-utils.ts`

```ts
export const AWS_ACCOUNT_ID_REGEX = /^\d{12}$/;

export type ParsedAccountIds = {
  valid: string[]; // unique, 12-digit, not already present
  invalid: string[]; // tokens failing the regex (unique)
  duplicates: string[]; // repeated in paste or already in roles (unique)
};

export function parseAccountIds(text: string, existingAccountIds: Set<string>): ParsedAccountIds;
export function buildRoleArn(accountId: string, roleName: string): string; // arn:aws:iam::<id>:role/<name>
export function accountIdFromRoleArn(arn: unknown): string | undefined; // regex on arn:aws[-a-z]*:iam::<12 digits>:role/… (@openops/common is server-only, not importable in react-ui)
```

New: `packages/react-ui/src/app/features/connections/components/aws-bulk-roles.tsx`
— **the single AWS-specific slot component**, rendered by the dialog into
`ArrayBlockProperty`'s footer via `arrayExtraActions.roles`. It owns all bulk-add
state so the generic dialog stays provider-agnostic apart from one `isAws` check.

- Props: `authProperty` (the AWS `CustomAuthProperty` from metadata; it reads
  `props.roles.properties` itself) and `rolesFieldName` (`'request.value.props.roles'`).
- Renders the "+ Add multiple accounts" trigger button, and — when open — the panel
  in a `basis-full` wrapper so it wraps beneath the footer buttons (the footer is
  `flex flex-wrap`); when closed and a result exists, a `basis-full` muted summary line.
- State: `open`, `roleName`, `externalId` (retained across open/close), `summary`.
  Opening the panel clears the previous summary.
- Scroll-to-last-card `useEffect` keyed on the watched roles length (the panel
  unmounts on add, so the effect lives here). Finds `arrayPropertiesItem{N-1}`
  within the closest `<form>`.

New: `packages/react-ui/src/app/features/connections/components/aws-bulk-roles-panel.tsx`
— the panel body (textarea, role name, external ID, ARN preview, "Add N accounts").

- Hooks: `useFormContext()`, `useWatch(rolesFieldName)` for existing account IDs,
  `useDynamicFormValidationContext()`.
- On add: `items = valid.map(id => ({ assumeRoleArn, assumeRoleExternalId: externalId || null, accountName: id }))`, then
  1. `form.setValue(rolesFieldName, [...current, ...items], { shouldDirty, shouldValidate })`.
     **Must be `setValue`, not a second `useFieldArray().append()`**: in RHF 7.80
     `append` only updates its own instance's state (`_setFieldArray` does not emit
     `_subjects.array`), so `ArrayBlockProperty` would not render the new cards.
     `setValue` on a field-array name notifies every observer. (Found in browser QA.)
  2. `addArrayItemsToSchema(rolesFieldName, rolesProperties, current.length, items.length)`
     — one batched schema update (see below). Required because the dialog's
     TypeBox schema is a fixed-length tuple (`minItems = maxItems`); without it
     Save stays disabled.
  3. Clears the textarea, calls `onAccountsAdded({ added, invalid, duplicates })`, closes.
- `externalId || null` matches what `getDefaultValueForStep` stores for manual rows.
- Uses `Label` (not `FormLabel`, which throws outside a `FormField`).

`packages/react-ui/src/app/features/builder/dynamic-form-validation/dynamic-form-validation-context.tsx`

- New `addArrayItemsToSchema(arrayKey, propertyMap, previousArrayLength, count)`:
  batched variant of `addArrayItemToSchema` — one functional `setFormSchema`
  update that sets `minItems/maxItems = previousLength + count` and appends
  `count` cloned item schemas (mirrors `initArraySchema`). Avoids N schema clones
  for N accounts. No-op for `count <= 0`. Result is identical to N single calls
  (tested).

`packages/react-ui/src/app/features/connections/components/create-edit-connection-dialog-content.tsx`

- `isAws = authProviderKey === 'AWS'`; `rolesCount` from the existing `useWatch`.
- `arrayExtraActions = useMemo(() => isAws && auth ? { roles: <AwsBulkRoles authProperty={auth} rolesFieldName=… /> } : undefined, [isAws, auth])`
  — memoised because `CustomAuthConnectionSettings` / `AutoPropertiesFormComponent`
  are `React.memo`.
- Passed to `CustomAuthConnectionSettings`. Banner text switches at `rolesCount > 50`.
- Nothing else AWS-specific lives in the dialog.

`packages/react-ui/public/locales/en/translation.json` — keys equal English values;
count-dependent strings follow the repo convention `{n} thing(s)` (e.g.
`"+ {n} other workflow(s)"`), not ICU plurals. New keys:
`Add multiple accounts`, `Account IDs`,
`One per line, or comma / space separated`, `Role name`, `External ID (optional)`,
`Add {count} accounts`, `{count} not a 12-digit account ID: {ids}`,
`{count} already listed: {ids}`, `Validating AWS roles may take a minute or more. We will verify access to all configured roles.`

### 5.4 Shared lib — aggregated role validation

`packages/openops/src/lib/aws/auth.ts`

- `validateRoleBatch` → returns `string[]` of failure messages (all rejected
  results in the batch), not the first one.
- `validateRoleAssumptions` → iterate all batches, collect failures, then:
  - none → `{ valid: true }`
  - some → `{ valid: false, error: formatRoleFailures(failures, roles.length) }`
- `formatRoleFailures`: `"${n} of ${total} roles could not be assumed:\n"` +
  one line per failure `- ${accountId} (${arn}): ${reason}` (no cap).
  `accountId` from `parseArn(role.assumeRoleArn).accountId` **wrapped in try/catch**
  falling back to `role.accountName` — `parseArn` (`arn-handler.ts:48`,
  `@aws-sdk/util-arn-parser`) throws on a malformed hand-edited ARN, which would
  turn a clean validation error into `ENGINE_OPERATION_FAILURE`.
- `ROLE_VALIDATION_BATCH_SIZE` stays 5.

No change to `validateRequiredFields`, `validateBaseCredentials`, the API,
`engineValidateAuth`, or the error code path (`INVALID_APP_CONNECTION`).

## 5.5 Verified while reviewing (no change needed)

- `parentPropertyKey = inputName.split('settings.input.')[1]` is already
  `undefined` for the connection form today; nothing new breaks.
- Edit flow: `createDefaultValues` copies `existingConnection.value` wholesale
  for CUSTOM_AUTH (`connections-utils.ts:136-137`) so generated roles load on
  edit; `restoreRedactedSecrets` ignores the array (`app-connection-utils.ts:113-125`).
- Error path: `validate-auth.ts:57-63` → `INVALID_APP_CONNECTION` with
  `params.error` string → `formatErrorObjectToString` returns strings verbatim
  (`connections-utils.ts:210-212`) → `whitespace-pre-wrap` div. Multi-line renders.
  The background `connection-validation-job.ts:75-87` only logs the error.
- No ARN regex/parser exists in `packages/shared` or `react-ui`; `parseArn`
  lives in `packages/openops/src/lib/aws/arn-handler.ts:41` (server-only).
- Unverified: Fastify/engine timeouts for `EXECUTE_VALIDATE_AUTH` with 50+
  roles (10+ sequential STS rounds at batch size 5). Check during implementation
  before relying on "no cap".

## 6. Data flow (unchanged)

UI form → `POST /v1/app-connections` (`UpsertAppConnectionRequestBody`,
`value.type = CUSTOM_AUTH`, `value.props.roles = [...]`) →
`appConnectionService.upsert` → `engineValidateAuth` → engine
`EXECUTE_VALIDATE_AUTH` → `amazonAuth.validate` (STS GetCallerIdentity +
AssumeRole per role, batches of 5) → encrypt + upsert → `removeSensitiveData`.

## 7. Tests

`packages/react-ui` (Jest)

- `aws-bulk-roles-utils.test.ts`: separators (newline / comma / space / mixed),
  invalid tokens, duplicates within paste, duplicates against existing IDs,
  `buildRoleArn`, `accountIdFromRoleArn`.
- `aws-bulk-roles-panel.test.tsx`: renders count in button; button disabled with
  no valid IDs / empty role name; click appends N entries with
  `accountName === accountId` and shared external ID; one batched
  `addArrayItemsToSchema` call; textarea cleared; panel closes; a sibling
  `useFieldArray` observer sees the new rows (regression for the `append` bug).
- `dynamic-form-validation-context.test.tsx`: `addArrayItemsToSchema` grows
  min/max items and appends N item schemas; equals N single calls; no-op for 0.
- `array-property` test: `extraActions` rendered; "Add Item" label unchanged.
- Dialog test: trigger present for AWS, absent for another provider.

`packages/openops` (Nx project **`openops-common`**; `test/aws/auth.test.ts`,
existing `Role validation` block)

- Existing tests at `auth.test.ts:276-322` and `362-378` assert the current
  single-role format `role "<arn>" (<alias>): <msg>` — rewrite to the new
  header + bullet format (not just extend).
- Two failures in one batch → both reported.
- Failures across batches → all reported, later batches still run.
- 13 failures → 13 bullets (no truncation).
- All valid → `{ valid: true }` unchanged.
- Message includes account ID, ARN and the underlying error message.

Run: `npx nx test react-ui`, `npx nx test openops-common`,
`npx nx lint …`, `npx nx build react-ui`.

## 8. Out of scope (follow-ups)

- Alias input at bulk time / fetching account names from AWS Organizations
  (`getAccountName` in `organizations-common.ts` already exists).
- Reading account IDs from the payer's Organization (`ListAccounts`) — existing
  account-discovery backlog project.
- Partial save with per-role status.
- Creating N separate connections / connection grouping.
- CSV file upload (paste covers it).
- Docs update (separate task).

## 9. Ticket housekeeping

- Add `Frontend` label (work is ~70% UI).
- Original GitHub feature request by Assaf could not be found in any
  `openops-cloud` repo (searched all issues incl. closed, PRs, discussions, and
  his GitHub account `aflatto`); note on ticket / ask for the link.
