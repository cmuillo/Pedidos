// Pure helpers for the admin "new order" alerts. Kept free of browser APIs so
// they can be unit-tested; the side effects (sound/notification/badge) live in
// the client component that calls these.

/**
 * Returns the ids present in `current` that were not present in `previous`.
 * On the very first load `previous` is null, in which case no ids are returned
 * (we don't want to alert for orders that already existed when the page opened).
 */
export function newOrderIds(
  previous: readonly string[] | null,
  current: readonly string[]
): string[] {
  if (previous === null) return [];
  const prev = new Set(previous);
  return current.filter((id) => !prev.has(id));
}
