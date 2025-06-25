export function truncateString(
  str: string | null | undefined,
  num_length: number,
  num_slice: number
): { short: string; full: string } | null {
  if (str == null) {
    return null;
  }

  return str.length > num_length
    ? { short: `${str.slice(0, num_slice)}...`, full: str }
    : { short: str, full: str };
}
