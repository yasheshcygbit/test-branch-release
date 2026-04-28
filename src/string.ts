export function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function reverse(str: string): string {
  if (!str) return str;
  return str.split('').reverse().join('');
}

export function slugify(str: string): string {
  return str.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
}

export function uppercase(str: string): string {
  if (!str) return str;
  return str.toUpperCase();
}

export function lowercase(str: string): string {
  if (!str) return str;
  return str.toLowerCase();
}

export function repeat(str: string, n: number): string {
  return str.repeat(n);
}
