// In-memory brute-force protection for authentication endpoints.
// Single-process deployment (one backend container), so an in-memory map is
// sufficient. Tracks failures per (email) and per (ip).

interface FailEntry {
  count: number;
  lockedUntil: number;
}

const MAX_ATTEMPTS = 5;
const LOCK_MS = 15 * 60 * 1000;
const WINDOW_MS = 15 * 60 * 1000;

const emailFailures = new Map<string, FailEntry>();
const ipFailures = new Map<string, FailEntry>();

function sweep(): void {
  const now = Date.now();
  for (const [k, v] of emailFailures) {
    if (now - v.lockedUntil > WINDOW_MS && v.count === 0) emailFailures.delete(k);
  }
}

export function isLoginLocked(email: string, ip: string): boolean {
  sweep();
  const now = Date.now();
  for (const entry of [emailFailures.get(email.toLowerCase()), ipFailures.get(ip)]) {
    if (entry && entry.lockedUntil > now) return true;
  }
  return false;
}

export function recordLoginFailure(email: string, ip: string): void {
  sweep();
  const now = Date.now();
  const bump = (map: Map<string, FailEntry>, key: string) => {
    const entry = map.get(key) || { count: 0, lockedUntil: 0 };
    entry.count += 1;
    if (entry.count >= MAX_ATTEMPTS) {
      entry.count = 0;
      entry.lockedUntil = now + LOCK_MS;
    }
    map.set(key, entry);
  };
  bump(emailFailures, email.toLowerCase());
  bump(ipFailures, ip);
}

export function clearLoginFailures(email: string): void {
  emailFailures.delete(email.toLowerCase());
}

export function secondsUntilUnlock(email: string, ip: string): number {
  const now = Date.now();
  let max = 0;
  for (const entry of [emailFailures.get(email.toLowerCase()), ipFailures.get(ip)]) {
    if (entry && entry.lockedUntil > now) max = Math.max(max, entry.lockedUntil - now);
  }
  return Math.ceil(max / 1000);
}

/** Test-only: wipe all in-memory state. */
export function resetLoginGuard(): void {
  emailFailures.clear();
  ipFailures.clear();
}
