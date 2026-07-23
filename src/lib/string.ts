export function normalizedFileName(name: string) {
  return name.normalize("NFKC").trim().toLowerCase();
}
