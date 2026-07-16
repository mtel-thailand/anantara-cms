create policy "Enable upload for authenticated user" on "public"."config" as PERMISSIVE for
UPDATE to authenticated using (
    true -- Provide a SQL expression for the using statement
)
with
    check (true);