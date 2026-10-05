
const PALETTE: Record<string, { bg: string; fg: string }> = {
  purple: { bg: "#e3def6", fg: "#5d4b96" },
  coral: { bg: "#f7dcd2", fg: "#9a4634" },
  green: { bg: "#dceedc", fg: "#336b41" },
  tan: { bg: "#efe1c6", fg: "#7a5b22" },
  yellow: { bg: "#f6efc0", fg: "#7a6a14" },
  lavender: { bg: "#eadff3", fg: "#6e4e96" },
  orange: { bg: "#f7e1c9", fg: "#8f5620" },
  blue: { bg: "#dae5f6", fg: "#3b5f92" },
};

const FALLBACK = { bg: "#e7e5dc", fg: "#6b6656" };

export function avatarColors(key: string): { bg: string; fg: string } {
  return PALETTE[key] ?? FALLBACK;
}

export const AVATAR_KEYS = Object.keys(PALETTE);

export function initials(firstName: string, lastName: string): string {
  const first = Array.from(firstName.trim())[0] ?? "";
  const last = Array.from(lastName.trim())[0] ?? "";
  return (first + last).toUpperCase();
}
