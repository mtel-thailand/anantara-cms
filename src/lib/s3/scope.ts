export type StorageScope = readonly string[];

export function encodeStorageScope(scope: StorageScope) {
  return scope.join("/");
}

export function decodeStorageScope(scope: string | undefined) {
  return scope?.split("/").filter(Boolean) ?? [];
}

export function storageScopesEqual(
  left: StorageScope,
  right: StorageScope,
) {
  return (
    left.length === right.length &&
    left.every((segment, index) => segment === right[index])
  );
}
