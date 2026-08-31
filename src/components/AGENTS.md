# Shared Components Instructions

This directory contains only common, reusable UI. Before creating a component,
search `src/components/ui` and the owning feature for an existing equivalent.

## Component Placement

- Put reusable UI primitives in `src/components/ui`. This includes tables,
  dialogs/modals, inputs, buttons, menus, badges, and other presentational
  building blocks.
- Keep a primitive in its existing UI subdirectory when one exists, such as
  `src/components/ui/table/`. Create a clearly named subdirectory there when a
  new primitive needs supporting files.
- Put shared application composition (for example, page shells and layout
  pieces) in its established shared directory such as `layout/` or
  `providers/`; do not place provider state or application layout code in
  `ui/`.
- A component specific to one product area must live in
  `src/features/<feature>/components/`, never in `src/components` or
  `src/components/ui`.
- Promote a feature component to `src/components/ui` only when at least two
  real callers share the same stable, product-independent behavior. Otherwise,
  keep it feature-owned.

## Creation Rules

- Reuse or compose an existing common component before creating a new one.
- Do not create feature-specific wrappers around shared table or modal
  primitives unless the wrapper contains feature-owned behavior or domain
  content.
- Common components must accept product-neutral props and must not import a
  feature, feature types, feature translations, or feature server actions.
- Feature components may compose common components and own their labels,
  translations, domain types, mutations, and workflow state.
- Use lowercase kebab-case filenames and name each component after its visible
  responsibility.
