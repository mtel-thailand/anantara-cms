export function normalizedFileName(name: string) {
  return name.normalize("NFKC").trim().toLowerCase();
}

export function capitalize(text: string) {
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
}
