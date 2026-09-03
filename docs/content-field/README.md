# Reusable Content Migrations

This migration set manages content only for the following screens:

- Cars Classes
- Sponsors
- Judges
- Awards: Best of Show, Best in Class, and Special Awards
- Gallery

## Static Pages Are Out of Scope

This system does not create, modify, read, or add RPCs for `static_pages` because
the project already has its own Static Pages structure.

The following pages must continue using the project's existing implementation:

- About
- How to get there
- Charity
- What to wear
- Venue

## Excluded Columns

CMS presentation text belongs in the React feature configuration. The following
columns are therefore intentionally excluded:

- `content_pages.admin_title`
- `content_pages.route_path`
- `content_fields.admin_label`
- `content_fields.admin_description`

The database identifies pages and content slots using stable `key` values only.

## Tables

### `content_pages`

Stores the identity, publish version, and latest publication time for each
generic content page.

Important columns:

- `id`: Database identifier
- `key`: Stable page identifier used by application code and RPCs
- `version`: Publication revision incremented after every publish
- `published_at`: Time of the latest successful publication
- `created_at`, `updated_at`: Audit timestamps

### `content_fields`

Defines the content slots available on each page, such as `hero`, `header`,
`body`, `description`, and `contact_email`.

Important columns:

- `page_id`: Owning content page
- `key`: Stable field identifier within the page
- `content_type`: `rich_text`, `plain_text`, `email`, or `image`
- `placement`: `header`, `content`, `footer`, or `metadata`
- `is_localized`: Whether the field has EN and IT variants
- `channel_mode`: `shared` or `per_channel`
- `required`: Whether the baseline value is required before publishing
- `sequence`: Field order in the CMS editor
- `config`: Field-specific configuration such as App-to-Web fallback

### `content_field_values`

Stores published content variants using the unique combination:

```text
field_id + locale + channel
```

Supported locales:

- `en`: English
- `it`: Italian
- `und`: Language-independent content

Supported channels:

- `web`: Web-specific content
- `app`: App-specific content
- `shared`: One value shared by Web and App

The `value` column is a JSON object whose shape depends on `content_type`.

Rich text example:

```json
{
  "format": "html",
  "content": "<h1>2026 Partners</h1>"
}
```

Plain text example:

```json
{
  "text": "Awarded to the most significant car presented at the Concorso."
}
```

Email example:

```json
{
  "email": "gallery@anantaraconcorsoroma.com"
}
```

### `content_publications`

Stores a complete snapshot after every successful publish.

The snapshot can support:

- Publication auditing
- Comparing versions
- Incident investigation
- A future rollback feature

## Page and Field Mapping

```text
cars.classes
  hero            rich_text  EN/IT  Web/App

sponsors
  header          rich_text  EN/IT  Web/App
  footer          rich_text  EN/IT  Web

judges
  hero            rich_text  EN/IT  Web/App

awards.best_of_show
awards.best_in_class
awards.special_awards
  description     plain_text EN/IT  shared

gallery
  contact_email   email      und    Web
  header          rich_text  EN/IT  Web
```

Existing domain records remain in their current tables. Cars, car classes,
sponsors, judges, award winners, and gallery images are not moved into these
generic content tables.

## Migration Order

Apply the migrations in this order:

```text
202608270001_create_content_schema.sql
202608270002_content_rls.sql
202608270003_seed_content_definitions.sql
202608270004_content_rpcs.sql
202608270005_allow_all_authenticated_publish.sql
```

To load deterministic example UUIDs and example values, use:

```text
202608270003_example_data_with_ids.sql
```

Use the example-data file instead of
`202608270003_seed_content_definitions.sql`. Do not apply both seed files to the
same database.

If any earlier version of these migrations has already been applied to a shared
or production database, do not edit or reapply that migration. Create a new
corrective migration instead.

## Row-Level Security

The RLS migration uses this access model:

| Database role | SELECT | INSERT | UPDATE | DELETE |
|---|---:|---:|---:|---:|
| `anon` | Yes | No | No | No |
| `authenticated` | Yes | Yes | Yes | Yes |

Anonymous users have read-only access to all four content tables. Every
authenticated user has direct CRUD access to all four content tables.

The CMS publish feature should still use `publish_content_page()` so validation,
value updates, and the publication snapshot happen in
one transaction. Direct authenticated writes can bypass those guarantees and
should be reserved for intentional administrative/database workflows.

No CMS role claim is required. The publish RPC checks only that `auth.uid()` is
present, so every authenticated user can publish. The legacy-named
`is_cms_content_editor()` helper also returns `true` for any authenticated user
and does not inspect `app_metadata.cms_role`.

## RPC Functions

### `get_content_page_admin(pageKey)`

Returns:

- Page ID and version
- Field definitions
- Every stored locale/channel variant

Use this RPC to construct the CMS local draft.

Example:

```ts
const { data, error } = await supabase.rpc(
  "get_content_page_admin",
  {
    p_page_key: "sponsors",
  },
);
```

### `get_content_page_public(pageKey, locale, channel)`

Returns the selected published value for each field.

Example:

```ts
const { data, error } = await supabase.rpc(
  "get_content_page_public",
  {
    p_page_key: "sponsors",
    p_locale: "en",
    p_channel: "web",
  },
);
```

When an App value is absent, the RPC falls back to the Web value only when the
field has:

```json
{
  "appFallbackToWeb": true
}
```

The RPC does not fall back between EN and IT.

### `publish_content_page(pageKey, values)`

Publishes the complete local draft atomically.

Example:

```ts
const { data, error } = await supabase.rpc(
  "publish_content_page",
  {
    p_page_key: draft.pageKey,
    p_values: draft.values,
  },
);
```

The RPC:

1. Checks that the caller is authenticated.
2. Locks the relevant `content_pages` record.
3. Rejects duplicate variants and unknown fields.
4. Validates locale, channel, and value shape.
5. Verifies all required baseline values.
6. Upserts or removes variants.
7. Increments the page revision.
8. Updates `published_at`.
9. Inserts a publication snapshot.
10. Returns the canonical published snapshot.

All operations run in one PostgreSQL transaction. Any failure rolls back the
complete publish.

## Concurrent Publishing

The page row is locked while each publish runs. The most recently completed
publish becomes live; publishing does not compare an expected version.

## Local-First Editing

Changing an editor value must update only client-side draft state. Do not write
to the database after every keystroke.

The intended flow is:

```text
Load admin RPC
  -> create local draft
  -> edit EN/IT and Web/App variants locally
  -> press Publish
  -> thin Server Action
  -> persistence layer
  -> atomic PostgreSQL RPC
  -> replace local draft with canonical response
```

When the CMS displays a Web value as an App fallback, it must not create an
App-specific database row unless the editor explicitly changes the App value.

## Application Responsibilities

Follow the repository's `AGENTS.md` and existing feature architecture.

- Keep routes and Server Actions thin.
- Keep Zod schemas, domain types, mapping, and persistence in the relevant
  feature module.
- Store CMS labels and descriptions in feature configuration.
- Use type-only imports where appropriate.
- Keep existing domain queries separate from page-copy queries.
- Sanitize CKEditor HTML at the project's approved boundary before rendering.

## Verification Before Completion

Verify at minimum:

1. Admin read returns fields even when their values are missing.
2. Public Web returns correct EN and IT values.
3. Public App returns explicit App values when present.
4. Public App falls back to Web only when configured.
5. No locale fallback occurs between EN and IT.
6. Invalid field, locale, channel, and value shapes are rejected.
7. Required EN/IT baseline values are enforced.
8. Duplicate variants are rejected.
9. A stale version produces no partial updates.
10. A successful publish increments the version and creates one snapshot.
11. Existing Static Pages continue working unchanged.

After applying the migrations:

- Regenerate `src/types/database.types.ts`.
- Run focused TypeScript checks.
- Run ESLint on touched files.
- Run existing relevant tests.
- Validate or reset the local Supabase database if available.

## Current Limitation

These SQL files are a proposal and have not been executed against the project's
real Supabase database in this workspace. Inspect existing migrations,
authorization, naming conventions, and deployed schema before applying them.
