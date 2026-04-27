export function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function reverse(str: string): string {
  return str.split('').reverse().join('');
}

export function slugify(str: string): string {
  return str.toLowerCase().trim().replace(/\s+/g, '-');
}

export function uppercase(str: string): string {
  return str.toUpperCase();
}
