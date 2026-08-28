# Codex Handoff: Reusable Content System

## Objective

Implement the reusable CMS content system in the Anantara CMS project using the
provided SQL migrations and the project's existing architecture.

The system must support page-specific variants rather than assuming every field
has EN/IT on both platforms:

- Desktop is represented by `channel = "web"`.
- App is represented by `channel = "app"`.
- English uses `locale = "en"` and Italian uses `locale = "it"`.
- Non-translated values use `locale = "und"`.
- Rich text, plain text and email fields
- Local-first editing: changes stay in client state until Publish
- Atomic publishing through a PostgreSQL RPC
- Optimistic concurrency through `content_pages.version`
- Exact per-field allowed and required variant validation
- Publication snapshots for audit/history

Read and follow the repository's `AGENTS.md` before making changes.

## Critical Scope Boundary

Do not create, alter, migrate, query, or refactor the project's existing Static
Pages schema.

The following screens are out of scope and must continue using the project's
existing implementation:

- About
- How to get there
- Charity
- What to wear
- Venue

Do not create a new `static_pages` table. Do not add static-page RPCs. Do not add
Static Pages to `content_pages`.

## Screens Included

Only implement the reusable content system for:

1. Cars Classes
2. Sponsors
3. Judges
4. Awards — Best of Show
5. Awards — Best in Class
6. Awards — Special Awards
7. Gallery

Existing domain data stays in its current tables. For example, Cars, Classes,
Judges, Sponsors, award winners and Gallery images must not be moved into the
generic content tables. This system stores only the editable page copy and
metadata listed below.

## Field Mapping

```text
cars.classes
  hero            rich_text
    required: Web EN, Web IT, App EN
    forbidden: App IT

sponsors
  header          rich_text
    required: Web EN, Web IT, App EN
    forbidden: App IT

  footer          rich_text
    required: Web EN, Web IT
    forbidden: App EN, App IT

judges
  hero            rich_text
    required: Web EN, Web IT, App EN
    forbidden: App IT

awards.best_of_show
  description     plain_text
    required: one non-translated shared value (`und` + `shared`)

awards.best_in_class
  description     plain_text
    required: one non-translated shared value (`und` + `shared`)

awards.special_awards
  description     plain_text
    required: one non-translated shared value (`und` + `shared`)

gallery
  contact_email   email
    required: Web + `und`
    forbidden: App

  header          rich_text
    required: Web EN, Web IT
    forbidden: App EN, App IT
```

Do not create unsupported variants. In particular, App IT is not supported by
Cars, Sponsors header, or Judges; Sponsors footer and Gallery header have no App
content at all.

Award descriptions have exactly one value and no translations. Store each as
`locale = 'und'`, `channel = 'shared'` so the same value is used regardless of
the requested locale/channel. Gallery contact email is Desktop-only and uses
`locale = 'und'`, `channel = 'web'`.

### Exact Variant Configuration

The current `is_localized`, `channel_mode`, and `required` flags are not precise
enough to express these mixed rules by themselves. Use `content_fields.config`
to define exact allowed and required variants, or introduce an equally explicit
normalized mechanism if the repository already has one. Do not infer a full
EN/IT x Web/App Cartesian product.

Recommended config shape:

```json
{
  "allowedVariants": ["web:en", "web:it", "app:en"],
  "requiredVariants": ["web:en", "web:it", "app:en"]
}
```

Use these exact configurations:

```text
cars.classes.hero
  allowed/required = web:en, web:it, app:en

sponsors.header
  allowed/required = web:en, web:it, app:en

sponsors.footer
  allowed/required = web:en, web:it

judges.hero
  allowed/required = web:en, web:it, app:en

each awards description
  allowed/required = shared:und

gallery.contact_email
  allowed/required = web:und

gallery.header
  allowed/required = web:en, web:it
```

Expected field-definition flags and config:

| Page/field | `is_localized` | `channel_mode` | Exact variants |
|---|---:|---|---|
| `cars.classes.hero` | `true` | `per_channel` | `web:en`, `web:it`, `app:en` |
| `sponsors.header` | `true` | `per_channel` | `web:en`, `web:it`, `app:en` |
| `sponsors.footer` | `true` | `per_channel` | `web:en`, `web:it` |
| `judges.hero` | `true` | `per_channel` | `web:en`, `web:it`, `app:en` |
| Award `description` | `false` | `shared` | `shared:und` |
| `gallery.contact_email` | `false` | `per_channel` | `web:und` |
| `gallery.header` | `true` | `per_channel` | `web:en`, `web:it` |

Update the SQL seed, example data, RPC validation, Zod schema, CMS tabs, and
public mapping to follow these rules. The provided proposal migrations still
need to be reconciled with this final mapping before they are applied.

## Database Design

Use these tables from the provided migration:

### `content_pages`

```text
id
key
version
published_at
created_at
updated_at
```

### `content_fields`

```text
id
page_id
key
content_type
placement
is_localized
channel_mode
required
sequence
config
created_at
updated_at
```

### `content_field_values`

```text
id
field_id
locale
channel
value
created_at
updated_at
```

The unique content variant is:

```text
field_id + locale + channel
```

### `content_publications`

Stores a complete snapshot for every successful publish.

## Columns Intentionally Excluded

Do not add these columns:

```text
content_pages.admin_title
content_pages.route_path
content_fields.admin_label
content_fields.admin_description
```

CMS titles, field labels and descriptions are presentation concerns and must be
defined in the relevant feature code, not stored in the database.

Example feature configuration:

```ts
export const sponsorsContentConfig = {
  pageKey: "sponsors",
  title: "Content field",
  description: "Edit the copy on the public Sponsors page.",
  fields: {
    header: {
      label: "Header",
      description: "Title shown above the sponsor logo set.",
    },
    footer: {
      label: "Footer",
      description: "Desktop-only content shown below the sponsor logo set.",
    },
  },
} as const;
```

## SQL Files Provided

The proposal files are in:

```text
outputs/content-cms-migrations/
```

Apply/review in this order:

```text
202608270001_create_content_schema.sql
202608270002_content_rls.sql
202608270003_seed_content_definitions.sql
202608270004_content_rpcs.sql
```

`202608270003_example_data_with_ids.sql` is example data only. It is an
alternative to the normal seed file, not an additional production migration.
Never apply both seed files to the same database.

Before copying these into the project's Supabase migrations:

1. Inspect the repository's existing migration naming conventions.
2. Inspect its real authentication/authorization mechanism.
3. Adapt `is_cms_content_editor()` to the project's real role source.
4. Check for conflicting table, policy, trigger and function names.
5. If an earlier version of this proposal has already been applied, create a new
   corrective migration. Do not edit production-applied migrations.

## RPC Contract

### Admin read

```ts
supabase.rpc("get_content_page_admin", {
  p_page_key: "sponsors",
});
```

Returns the page version, field definitions and every saved locale/channel
variant needed to construct the CMS draft.

### Public read

```ts
supabase.rpc("get_content_page_public", {
  p_page_key: "sponsors",
  p_locale: "en",
  p_channel: "web",
});
```

Returns only variants that are valid for the requested screen/channel/locale.
Do not return Sponsors footer or Gallery header for App. Reject or return no
content for unsupported combinations such as App IT. Do not silently fall back
between EN and IT, and do not invent App content from Desktop unless a future
field explicitly defines such fallback.

### Publish

```ts
supabase.rpc("publish_content_page", {
  p_page_key: draft.pageKey,
  p_expected_version: draft.version,
  p_values: draft.values,
});
```

Example values payload:

```json
[
  {
    "fieldKey": "header",
    "locale": "en",
    "channel": "web",
    "value": {
      "format": "html",
      "content": "<h1>2026 Partners</h1>"
    }
  },
  {
    "fieldKey": "header",
    "locale": "it",
    "channel": "web",
    "value": {
      "format": "html",
      "content": "<h1>Partner 2026</h1>"
    }
  },
  {
    "fieldKey": "header",
    "locale": "en",
    "channel": "app",
    "value": {
      "format": "html",
      "content": "<h1>Our Partners</h1>"
    }
  }
]
```

Publish must execute atomically and must:

1. Verify the authenticated CMS editor.
2. Validate the payload is an array within the size limit.
3. Lock the matching `content_pages` record.
4. Compare `p_expected_version` with the persisted version.
5. Reject duplicate field/locale/channel variants.
6. Reject unknown fields.
7. Validate the exact `channel:locale` pair against the field's
   `config.allowedVariants` list.
8. Validate the JSON shape against `content_type`.
9. Require every pair in `config.requiredVariants`; do not apply a global EN/IT
   or Web/App requirement.
10. Upsert non-null variants and delete explicitly null optional variants.
11. Increment `content_pages.version`.
12. Update `published_at`.
13. Insert a `content_publications` snapshot.
14. Return the new canonical snapshot.

Any failure must roll back the complete publish.

## Rich Text Shape

The project currently uses CKEditor. Prefer this published shape unless the
existing feature already standardizes another shape:

```json
{
  "format": "html",
  "content": "<h1>Title</h1><p>Body</p>"
}
```

Sanitize rich HTML at the project's approved boundary before rendering it. Do
not render untrusted HTML directly.

## Application Architecture

Follow repository conventions and keep responsibilities separated:

```text
Route/Page
  -> feature query/persistence
  -> Supabase admin/public read RPC

Client editor
  -> local draft state
  -> thin Server Action on Publish
  -> feature persistence
  -> atomic publish RPC
```

Expected feature-level responsibilities:

- Domain types for page, field, variant and draft
- Zod schema for publish input
- Persistence functions wrapping Supabase RPC calls
- Mapper from flat admin RPC rows to a client-friendly draft
- Mapper from public rows to a `fieldKey -> value` object
- Feature configuration containing CMS titles/labels/descriptions
- Reusable editor helpers for finding and updating variants
- Thin Server Action that validates input and delegates to persistence

Do not put business logic in route files or Server Actions.

## Suggested TypeScript Types

```ts
export type ContentLocale = "en" | "it" | "und";
export type ContentChannel = "web" | "app" | "shared";

export type ContentVariant = {
  fieldKey: string;
  locale: ContentLocale;
  channel: ContentChannel;
  value: Record<string, unknown> | null;
};

export type ContentDraft = {
  pageKey: string;
  version: number;
  values: ContentVariant[];
};
```

Prefer more specific discriminated value types for rich text, plain text and
email if they fit the existing project conventions.

## Local-first Editing

Editing a supported language/channel tab must update only client draft state.
Do not write to Supabase on every editor change. Render tabs from the field's
allowed variants so unsupported editors never appear:

```text
Cars hero:          Desktop EN, Desktop IT, App EN
Sponsors header:   Desktop EN, Desktop IT, App EN
Sponsors footer:   Desktop EN, Desktop IT
Judges hero:        Desktop EN, Desktop IT, App EN
Award description: one editor with no language toggle
Gallery header:    Desktop EN, Desktop IT
Gallery email:     one Desktop email input with no language toggle
```

The publish button sends the complete canonical draft. After a successful
publish, replace the local draft/version with the RPC response. Discard changes
must restore the last successfully loaded or published snapshot.

Do not show an App editor for Sponsors footer or Gallery header. Do not show an
Italian App editor anywhere in this scope. Do not generate unsupported rows when
publishing the complete draft.

## Concurrency Behaviour

Example:

```text
Admin A loads version 3
Admin B loads version 3
Admin B publishes -> database becomes version 4
Admin A publishes expected version 3 -> reject with concurrency error
```

The UI must show a clear refresh/reload message. It must not automatically retry
with the new version because doing so could overwrite another editor's changes.

## Public Page Integration

Each public screen calls `get_content_page_public(pageKey, locale, channel)` and
maps the result by `field_key`.

Examples:

```ts
const sponsorsContent = {
  header: rowsByKey.header,
  footer: rowsByKey.footer,
};
```

Render this page copy around the existing domain components:

```text
Sponsors header content
Existing sponsor-logo grid
Sponsors footer content (Desktop only)
```

On App, Sponsors renders only the English header and does not request/render the
footer. Gallery has no App page content in this system. Cars and Judges App
content is English only. Award descriptions use the single shared value.

Equivalent rules apply without moving or duplicating existing list/domain
queries.

## Database Types

After migrations are applied to the intended Supabase environment, regenerate:

```text
src/types/database.types.ts
```

Do not manually invent RPC types if the project's type-generation workflow can
produce them. Use type-only imports where appropriate.

## Testing and Verification

At minimum verify:

1. Admin read returns every field even when no value exists.
2. Cars Web returns EN/IT, and Cars App returns EN only.
3. Sponsors header returns Web EN/IT and App EN only.
4. Sponsors footer returns Web EN/IT and is absent on App.
5. Judges Web returns EN/IT, and Judges App returns EN only.
6. Each Award screen returns exactly one non-translated description.
7. Gallery returns its Desktop email and Web EN/IT header, with no App content.
8. App IT and every other unsupported locale/channel combination are rejected.
9. No fallback occurs between EN and IT.
10. Unknown field keys are rejected.
11. Missing exact required variants are rejected.
12. Invalid rich-text, plain-text and email shapes are rejected.
13. Duplicate variants in one payload are rejected.
14. A stale expected version is rejected without any partial updates.
15. A successful publish updates all values, increments the version and inserts
    exactly one publication snapshot.
16. Static Pages continue to work unchanged.

Run focused checks on all touched files:

- TypeScript typecheck
- ESLint
- Existing feature tests
- Supabase migration validation or local database reset, if available

If the full project check fails because of pre-existing errors, report those
separately and still run the narrowest relevant checks on touched files.

## Required Deliverables

1. New Supabase migrations following repository naming conventions
2. Regenerated `database.types.ts`
3. Feature domain types and Zod schemas
4. Persistence wrappers for all three content RPCs
5. Thin publish Server Action
6. CMS integration for every included screen
7. Public integration for each screen's supported variants only
8. Tests or focused verification evidence
9. Concise list of touched files
10. Explicit note of any remaining limitation

## Do Not Do

- Do not change the existing Static Pages schema or feature.
- Do not add Static Pages to the reusable content tables.
- Do not add `route_path` or CMS labels/descriptions to the database.
- Do not move existing Cars, Sponsors, Judges, Awards or Gallery domain records.
- Do not write draft content to the database on every keystroke.
- Do not perform multi-step non-transactional publishing.
- Do not bypass optimistic concurrency.
- Do not silently fall back from EN to IT or IT to EN.
- Do not apply both seed files.
- Do not edit a migration that has already been applied to production; create a
  corrective migration instead.

## Current Limitation

The SQL files in `outputs/content-cms-migrations/` are a reviewed proposal but
have not been executed against the project's real Supabase database in this
workspace. Codex must inspect the current project migrations and authorization
model, adapt safely, then validate against the available local/test database.
