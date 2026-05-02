/**
 * Merges class names into a single string.
 * Filters out falsy values (undefined, null, false, empty string).
 * Upgrade to `clsx` + `tailwind-merge` when conditional class logic grows.
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}
