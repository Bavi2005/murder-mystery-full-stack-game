import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isLoginLocked, recordLoginFailure, clearLoginFailures, secondsUntilUnlock, resetLoginGuard,
} from './loginGuard';

describe('loginGuard — brute force protection', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetLoginGuard();
  });
  afterEach(() => {
    vi.useRealTimers();
    resetLoginGuard();
  });

  it('allows attempts under the threshold', () => {
    expect(isLoginLocked('a@b.com', '1.2.3.4')).toBe(false);
    for (let i = 0; i < 4; i++) recordLoginFailure('a@b.com', '1.2.3.4');
    expect(isLoginLocked('a@b.com', '1.2.3.4')).toBe(false);
  });

  it('locks after 5 failed attempts', () => {
    for (let i = 0; i < 5; i++) recordLoginFailure('a@b.com', '1.2.3.4');
    expect(isLoginLocked('a@b.com', '1.2.3.4')).toBe(true);
    expect(secondsUntilUnlock('a@b.com', '1.2.3.4')).toBeGreaterThan(0);
  });

  it('locks an IP across different emails', () => {
    recordLoginFailure('a@b.com', '9.9.9.9');
    recordLoginFailure('c@d.com', '9.9.9.9');
    recordLoginFailure('e@f.com', '9.9.9.9');
    recordLoginFailure('g@h.com', '9.9.9.9');
    recordLoginFailure('i@j.com', '9.9.9.9');
    expect(isLoginLocked('x@y.com', '9.9.9.9')).toBe(true);
  });

  it('locks an email across different IPs', () => {
    for (let i = 0; i < 5; i++) recordLoginFailure('a@b.com', `1.1.1.${i}`);
    expect(isLoginLocked('a@b.com', '2.2.2.2')).toBe(true);
  });

  it('unlocks after the lock window expires', () => {
    for (let i = 0; i < 5; i++) recordLoginFailure('a@b.com', '1.2.3.4');
    expect(isLoginLocked('a@b.com', '1.2.3.4')).toBe(true);
    vi.advanceTimersByTime(16 * 60 * 1000);
    expect(isLoginLocked('a@b.com', '1.2.3.4')).toBe(false);
  });

  it('successful login clears the email-level lock', () => {
    for (let i = 0; i < 5; i++) recordLoginFailure('a@b.com', '1.2.3.4');
    expect(isLoginLocked('a@b.com', '9.9.9.9')).toBe(true); // email locked
    clearLoginFailures('a@b.com');
    expect(isLoginLocked('a@b.com', '9.9.9.9')).toBe(false);
    // the offending IP stays locked for its own window
    expect(isLoginLocked('a@b.com', '1.2.3.4')).toBe(true);
  });

  it('is case-insensitive on emails', () => {
    recordLoginFailure('A@B.com', '1.2.3.4');
    expect(isLoginLocked('a@b.com', '1.2.3.4')).toBe(false); // only 1 failure
    for (let i = 0; i < 4; i++) recordLoginFailure('A@B.com', '1.2.3.4');
    expect(isLoginLocked('a@b.com', '1.2.3.4')).toBe(true);
  });
});
