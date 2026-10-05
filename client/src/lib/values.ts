
export function uniqueTrimmed(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const trimmed = value.trim();
    const key = trimmed.toLowerCase();
    if (trimmed === "" || seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }

  return result;
}

export function includesValue(list: string[], value: string): boolean {
  const key = value.toLowerCase();
  return list.some((item) => item.toLowerCase() === key);
}

export function toggleValue(list: string[], value: string): string[] {
  const key = value.toLowerCase();
  return includesValue(list, value)
    ? list.filter((item) => item.toLowerCase() !== key)
    : [...list, value];
}
