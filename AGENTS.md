# Anantara CMS Engineering Instructions

## Project Overview

Anantara CMS is a Next.js App Router application using React, TypeScript,
Tailwind CSS, next-intl, Supabase, Zod, React Hook Form, Zustand, and shadcn/Radix
UI primitives.

Keep route files thin. Business behavior belongs in `src/features`, shared UI
belongs in `src/components`, and infrastructure belongs in `src/lib`.

## Agent Rule Compliance

- Before starting any task, read this entire `AGENTS.md` and any more-specific
  `AGENTS.md` files that apply to the files in scope.
- Re-check the applicable rules before editing and again before completing the
  task. Do not rely on remembered instructions from an earlier task or session.
- When a requested implementation conflicts with these rules, identify the
  conflict explicitly before proceeding.

## Commands

Use Yarn because this repository commits `yarn.lock`.

```bash
yarn dev
yarn build
yarn lint
yarn tsc --noEmit
```

For a focused change, run ESLint against the touched files as well as the full
TypeScript check:

```bash
yarn eslint path/to/file.tsx
yarn tsc --noEmit
```

There is currently no automated test script. Do not claim tests passed unless a
test command was actually added and run.

## Repository Structure

```text
app/
  [locale]/                 Locale-aware pages and layouts
  api/                      Next.js route handlers
src/
  components/
    form/                   React Hook Form adapters
    layout/                 Sidebar, topbar, and page shells
    providers/              Application-level React providers
    ui/                     Reusable low-level UI primitives
  constants/                Shared static configuration
  features/
    <feature>/              Feature-owned UI and business behavior
  hooks/                    Cross-feature hooks
  i18n/                     next-intl routing/navigation setup
  lib/
    api/                    Route-handler middleware
    supabase/               Browser/server Supabase clients and helpers
    s3/                     S3 infrastructure
  stores/                   Cross-feature Zustand stores
  types/                    Shared TypeScript types
messages/                   English and Italian translation messages
styles/                     Global CSS and Tailwind theme configuration
```

## Feature Structure

Use a feature folder when code belongs to one product area. Follow the agenda
feature as the fullest current example:

```text
src/features/<feature>/
  <feature>-client.tsx      Main client-side screen/orchestrator
  <feature>.actions.ts      Public Next.js server actions
  <feature>.schema.ts       Zod schemas
  <feature>.types.ts        Feature domain and result types
  <feature>.helpers.ts      Pure feature transformations
  components/               Feature-only UI
  hooks/                    Feature-only hooks
  api/                      Shared feature data access and serializers
  <feature>.commands.ts     Typed commands when a command bus is useful
  <feature>.reducer.ts      Pure local state transitions
```

This is a menu of allowed responsibilities, not a requirement to create every
file or directory. Add a file only when it has a real current responsibility.

Rules:

- Route pages should set metadata and render the feature entry component.
- Do not put Supabase queries, large forms, or business mutations in `page.tsx`.
- Keep feature-only components inside the feature. Promote code to
  `src/components` or `src/lib` only after it is genuinely shared.
- Keep every product-specific artifact under `src/features/<feature>`, including
  components, hooks, services, schemas, types, helpers, constants, commands,
  reducers, and feature-owned state. Outside `src/features`, add only route
  composition or code that is genuinely reused by multiple features.
- Do not place feature-specific code in shared directories such as
  `src/components`, `src/hooks`, `src/lib`, `src/stores`, `src/constants`, or
  `src/types`.
- Create product-area components under
  `src/features/<feature>/components`. Do not place feature-specific components
  in `src/components`, including `src/components/form`.
- Keep domain types separate from form types when their names or nullability
  differ.
- Use temporary IDs prefixed with `temp-` for unpublished records.

### Canonical Feature Layout

Use this layout for a feature that has multiple workflows:

```text
src/features/<feature>/
  <feature>-client.tsx
  <feature>.types.ts
  <feature>.constants.ts
  components/
  hooks/
  api/
    <feature>.service.ts
    <feature>.serializer.ts
  <workflow>/
    <workflow>-client.tsx
    <workflow>.actions.ts
    <workflow>.schema.ts
    <workflow>.types.ts
    <workflow>.payload.ts
    <workflow>.persistence.ts
    <workflow>.notifications.ts
    <workflow>.media.ts
    <workflow>.helpers.ts
    components/
    hooks/
```

Layout rules:

- Keep the primary entry component and primary feature files at the root of
  their owning feature or workflow.
- Create a nested workflow folder when an area has its own screen, form,
  business lifecycle, or server mutation flow. Examples include `list/`,
  `review/`, and `editor/`.
- Create `components/`, `hooks/`, `api/`, or `state/` only when the category is
  meaningful. Do not create a directory for a single trivial forwarding file.
- Components shared by workflows of the same product feature belong in the
  nearest common feature `components/` folder. Components used by one workflow
  stay in that workflow's `components/` folder.
- A child workflow may import from its parent feature's shared modules. Sibling
  workflows must not deep-import each other's private modules; move genuinely
  shared behavior to their nearest common parent.
- Do not add barrel `index.ts` files merely to shorten imports. Import the
  owning file directly so dependencies remain visible and tree shaking remains
  predictable.

### Feature File Responsibilities

- `<feature>-client.tsx`: owns browser state, React hooks, form orchestration,
  modal orchestration, and composition. It must not contain substantial database
  queries, payload serialization, or storage implementation.
- `<feature>.actions.ts`: exposes thin async server-action entry points. An
  action authenticates, validates, and orchestrates named feature functions; it
  must not become the home for large media, persistence, or notification
  implementations.
- `<feature>.service.ts`: performs Supabase or remote API access for the browser
  or shared feature data layer. It must not render UI, show toasts, or own React
  state.
- `<feature>.persistence.ts`: owns server-only database queries, transactional
  RPC calls, optimistic concurrency, and canonical reloads used by an action.
- `<feature>.serializer.ts`: maps database/API records to domain models and maps
  domain models to persistence payloads. Keep mapping pure and free of network
  calls.
- `<feature>.schema.ts`: owns Zod schemas and schema-inferred input/form types.
  It must not perform network calls or persistence.
- `<feature>.types.ts`: owns named domain, command, result, and cross-module
  feature types. Do not duplicate generated database types or move form types
  out of their schema without a concrete reason.
- `<feature>.payload.ts`: parses untrusted action/API payloads and applies
  request-level business validation. It must return typed canonical input.
- `<feature>.media.ts`: owns feature-specific upload validation, media mapping,
  reconciliation, and cleanup. Generic S3 infrastructure remains in `src/lib`.
- `<feature>.notifications.ts`: owns notification eligibility, template
  parameters, delivery, and feature-level notification logging.
- `<feature>.helpers.ts`: contains small pure transformations only. Do not use it
  as a dumping ground for unrelated behavior.
- `<feature>.constants.ts`: contains static feature configuration only. Values
  derived from runtime state belong near the code that derives them.
- `<feature>.commands.ts` and `<feature>.reducer.ts`: contain typed commands and
  pure deterministic transitions. Keep network, storage, toast, and modal side
  effects outside reducers.

### Feature Dependency Direction

Keep dependencies moving in this direction:

```text
route
  -> feature client
    -> feature components and hooks
    -> server actions or client services
      -> payload / persistence / media / notifications
        -> serializer and feature types
          -> shared infrastructure
```

Dependency rules:

- Lower layers must not import feature clients, React components, route files,
  or UI state.
- Feature components may import their feature's schemas, types, constants, and
  pure helpers plus shared UI/form primitives. They must not directly import S3,
  SES, server Supabase clients, or persistence modules.
- Client services may use the browser Supabase client. Persistence modules and
  server actions use the per-request server client.
- Modules importing server credentials, `next/headers`, S3 server adapters, or
  SES must remain server-only and must never be runtime-imported by a client
  component. Put client-consumed types in a separate type-only module.
- Avoid circular dependencies. If two modules require each other, move their
  shared contract or pure transformation into a lower-level types/helper module.
- Do not create a generic abstraction until at least two real callers have the
  same stable behavior. Prefer a clearly named feature function over a flexible
  helper with flags and callbacks.
- An orchestrator should read as a sequence of business operations. When a block
  mixes multiple external boundaries or requires its own error/cleanup policy,
  extract it into a named feature module.

### Naming Rules

- Use lowercase kebab-case filenames.
- Prefix primary files with their owning feature or workflow, such as
  `submission-review.actions.ts` rather than `actions.ts`.
- Name React components by product meaning, such as
  `review-decision-card.tsx`, not `card.tsx` or `section.tsx`.
- Name hooks `use-<behavior>.ts` and export a matching `useBehavior` function.
- Use plural nouns only for modules that genuinely manage collections.
- Avoid ambiguous filenames such as `utils.ts`, `common.ts`, `misc.ts`,
  `data.ts`, and `manager.ts`. Name the responsibility explicitly.
- Use one responsibility suffix consistently. Do not mix persistence queries
  into `.helpers.ts` or UI composition into `.service.ts`.

## Server And Client Boundaries

- Add `"use client"` only to modules that use browser APIs, hooks, event
  handlers, or browser Supabase clients.
- Prefer Server Components for route composition, metadata, and initial auth
  checks.
- Protected routes live below `app/[locale]/(protected)` and are guarded by the
  protected layout.
- Browser-only values such as `localStorage`, `EventTarget`, and `crypto` must
  not run during server rendering.
- Do not create a global server Supabase client. Create one per request or
  server function.

## Supabase Data Access

Use the existing clients:

- Browser/client code: `src/lib/supabase/client.ts`
- Server Components and route handlers: `src/lib/supabase/server.ts`
- Session refresh/proxy behavior: `src/lib/supabase/proxy.ts`
- Required non-null query data: `unwrap(data, error)` from
  `src/lib/supabase/unwrap.ts`

Placement rules:

- Put workflow-local queries in
  `src/features/<feature>/<workflow>/<workflow>.service.ts`. Put data access
  shared by multiple workflows in
  `src/features/<feature>/api/<feature>.service.ts`.
- Put only cross-feature Supabase helpers in `src/lib/supabase`.
- UI components call service functions; they should not assemble substantial
  database queries themselves.
- Auth UI may call the browser auth client directly for sign-in, sign-out,
  password reset, and password updates.
- Use the server client for privileged route behavior and server-side auth
  checks. Never expose a service-role/secret key to client code.

Query and mutation rules:

- Check every Supabase `error`; never silently ignore failed writes.
- Use `.select(...).single()` when a row must exist after insert.
- For update/delete, select the affected ID and verify a row was returned when
  the operation must affect an existing record.
- Return fresh canonical data after a multi-step publish operation.
- Keep database payload mapping in small service helpers rather than passing UI
  objects directly to Supabase.
- Preserve parent/child ordering for dependent writes. For example, create an
  agenda first, then use its real ID for events.
- Treat browser Supabase access as public Data API access. RLS must protect every
  exposed table; a publishable key is not authorization.
- Schema, RLS, policy, view, function, or storage changes require a migration
  and a security review. UPDATE policies need both row visibility and write
  checks.

## Route Handler API Pattern

Route handlers belong in `app/api/**/route.ts`. Use the existing typed wrapper
pipeline:

1. Define strict Zod schemas with `satisfies SchemaMap`.
2. Derive context using `ApiContext & InferSchemas<typeof schemas>`.
3. Write a handler receiving `NextRequest` and the typed context.
4. Wrap validation with `withValidate`.
5. Wrap protected endpoints with `withAuth`.
6. Apply `withApiLogger` as the outer wrapper.

```ts
const schemas = {
  body: z.object({ title: z.string().min(1) }).strict(),
} satisfies SchemaMap;

type Context = ApiContext & InferSchemas<typeof schemas>;

async function handler(request: NextRequest, context: Context) {
  return NextResponse.json({ title: context.body.title });
}

const validated = withValidate<typeof schemas, ApiContext>(schemas, handler);
export const POST = withApiLogger(withAuth(validated));
```

API rules:

- Return JSON with an appropriate HTTP status.
- Validation failures are handled by `withValidate`; do not parse the same
  payload again inside the handler.
- Use `withAuth` for protected API routes and use `context.user` rather than
  trusting a user ID supplied by the request.
- Use `src/lib/logger.ts`; do not log passwords, tokens, cookies, secrets, or
  full sensitive payloads.
- Keep file constraints in the route schema: count, size, and MIME type.

## Forms And Validation

- Use React Hook Form with `zodResolver` and a feature-owned Zod schema.
- Follow the form architecture demonstrated by the agenda feature, especially
  `src/features/agenda/components/agenda-item-modals.tsx`: keep `useForm` in the
  feature screen, modal, or form orchestrator; use a feature-owned schema and
  typed form values; and pass typed form controls to child components.
- Before using a raw input with React Hook Form, reuse a controlled adapter from
  `src/components/form`.
- Shared components that connect UI primitives to React Hook Form must live in
  `src/components/form` and encapsulate `Controller`. Feature components must
  consume those adapters instead of declaring their own `Controller` wrappers.
- Add a new adapter to `src/components/form` only when no existing adapter can
  cover the UI primitive. Keep product-specific labels, validation, and business
  behavior in the owning feature.
- Infer or explicitly type form values; do not use `any` for translators,
  controls, schemas, or submit data.
- Prefer `mode: "onSubmit"` and `reValidateMode: "onChange"` unless the flow
  needs different behavior.
- Keep English and Italian values in the same form state. The form language
  toggle changes which fields are displayed; it does not navigate or change the
  application locale.
- Validate cross-field behavior such as start/end time with Zod
  `superRefine`.

## Modal Pattern

Use `useModal()` and open a modal directly with `modal.open({...})`. Do not add
a rendered controller component whose only purpose is receiving an `open` prop.

```tsx
modal.open({
  header: <Header />,
  headerClassName: "border-b px-4",
  content: <Content />,
  contentClassName: "px-4",
  footer: <Footer />,
  footerClassName: "px-4",
});
```

Rules:

- Keep header, content, and footer as separate modal slots.
- Use `footer: ({ loading, close, run }) => ...` for asynchronous actions.
- Execute async footer actions through `run` to get loading state and prevent
  duplicate execution.
- Close only after a successful mutation; keep the modal open when saving
  fails.
- Use `headerClassName`, `contentClassName`, and `footerClassName` for slot
  styling.
- Put reusable feature modal openers in hooks such as
  `useAgendaDateModal()` or `useAgendaActionModals()`.
- If separate content and footer need shared transient state without a form,
  use a modal-scoped store/observable as the agenda date modal does. Do not move
  transient modal state into a page-wide context.

## Local Feature Commands

The agenda feature uses one typed browser event, `agenda:command`, to decouple
table/modal actions from the screen state owner.

- Add agenda actions to the `AgendaCommand` discriminated union.
- Emit one command object through `eventEmitter.emit("agenda:command", command)`.
- Keep one listener in `useAgendaCommands`.
- Put state transitions in `agendaReducer`; do not rebuild a long list of
  individual listeners in `AgendaClient`.
- Generate IDs and timestamps before entering a React state updater so repeated
  reducer execution remains deterministic.
- Keep reducers free of toast, modal, storage, and network side effects.

Do not use the global event emitter for ordinary parent-child communication.
Use props and callbacks when components already have a direct relationship.

## Draft And Publish Behavior

Agenda editing is intentionally local-first:

- `agendas` is the editable draft.
- `publishedAgendas` is the latest server snapshot.
- Changes persist to local storage only after initial storage hydration.
- Never overwrite a valid draft with an empty array.
- Remove the draft after publish or when it matches the published snapshot.
- Add/edit/remove actions update local state only. Supabase writes happen on
  Publish.
- Removal is soft in the draft (`removed: true`) and becomes a real delete
  during publish. Restore removes the draft flag.
- Publish sorts records and assigns sequence values before saving.
- Discard restores the published snapshot without contacting Supabase.

## Dates And Time Zones

The event business timezone is `Europe/Rome`, defined by `DEFAULT_TZ`.

- Import the configured singleton from `src/lib/dayjs.ts`; do not import and
  configure Day.js plugins elsewhere.
- Use helpers in `src/lib/date.ts` for parsing, comparison, formatting, and time
  assignment.
- Treat calendar dates as `YYYY-MM-DD` values in Rome time.
- Treat user-entered times such as `08:30` as Rome wall-clock time.
- Persist instants as ISO UTC strings. Rome `08:30` may correctly be stored as
  `06:30Z` during daylight saving time.
- Display agenda times through `formatTime`/`formatTimeRange`, which converts
  persisted instants back to Rome time.
- Compare duplicate dates with `isSameDate` or `hasDuplicateDate`, not raw
  string equality or the browser's local timezone.
- Do not add ad hoc `new Date()` conversion logic when an existing date helper
  expresses the operation.

## Internationalization

- Supported locales are English (`en`) and Italian (`it`).
- Locale-aware routes live below `app/[locale]`.
- Use navigation exports from `src/i18n/navigation.ts` for locale-aware links,
  redirects, and routing.
- Add interface translations to both `messages/en.json` and
  `messages/it.json`.
- Use the shared `Locale` type rather than repeating locale unions.
- Content editing locale and application navigation locale are different
  concerns; do not couple them unintentionally.

## UI Rules

- Reuse `src/components/ui` primitives and Lucide icons.
- Reuse `Text`, `Button`, `PageHeader`, `Card`, `Skeleton`, tooltip, and table
  components before adding local equivalents.
- Search the existing shared and feature components before creating a new
  component. Extend or compose an existing component when it already covers the
  required behavior.
- Feature loading states should resemble the final layout; use a table skeleton
  for agenda loading rather than a lone spinner.
- Use Sonner toasts for user-visible mutation results.
- Keep destructive draft rows visible with reduced opacity and an explicit
  removal label so they can be restored before publishing.
- Preserve the application shell: the main element owns vertical scrolling and
  the topbar remains inside that shell.
- Keep layouts responsive and avoid text or controls overflowing their
  containers.

## TypeScript And Code Style

- Strict TypeScript is enabled. Do not introduce `any`; prefer generics,
  `unknown`, discriminated unions, and inferred Zod types.
- Use the `@/` alias for project-root imports.
- Prefer named domain types and typed payload helpers over inline casts.
- Use `import type` for type-only imports where practical.
- Remove unused imports, types, interfaces, functions, components, constants,
  variables, parameters, and exports as part of every completed change. Do not
  leave dead code, commented-out implementations, or speculative helpers for
  possible future use.
- Keep comments for non-obvious business rules, not line-by-line narration.
- Do not leave debug `console.log` statements in completed work.
- Preserve unrelated working-tree changes. This repository may be actively
  edited and need not be clean before a task starts.

## Verification Checklist

Before completing a change:

1. Run `yarn tsc --noEmit`.
2. Run focused ESLint on touched files.
3. Run `yarn lint` for broad/shared changes when existing unrelated failures do
   not prevent it.
4. Exercise the affected UI flow when behavior changed.
5. For Supabase writes, verify create, update, delete, error handling, and the
   returned canonical data.
6. Confirm both English and Italian behavior for bilingual content changes.
7. Confirm Rome-time display and UTC persistence for date/time changes.

Never expose environment values or commit `.env` files.
