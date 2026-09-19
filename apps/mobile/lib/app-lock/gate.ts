/**
 * Module-level App Lock gate so deep-link / notification handlers can wait
 * for unlock without depending on React tree order.
 *
 * Fail closed: starts locked until the provider hydrates SecureStore state.
 */

type Listener = (locked: boolean) => void;

let locked = true;
let enabled = false;
const waiters: (() => void)[] = [];
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((listener) => listener(locked));
}

export function getAppLockGateState(): { locked: boolean; enabled: boolean } {
  return { locked, enabled };
}

export function isAppLockGateActive(): boolean {
  return locked;
}

export function setAppLockGateState(next: {
  locked: boolean;
  enabled: boolean;
}): void {
  enabled = next.enabled;
  const wasLocked = locked;
  locked = next.locked;

  if (wasLocked && !locked) {
    const pending = waiters.splice(0, waiters.length);
    pending.forEach((resolve) => resolve());
  }

  if (wasLocked !== locked) {
    emit();
  }
}

/** Resolves immediately when unlocked; otherwise waits for the next unlock. */
export function whenAppUnlocked(): Promise<void> {
  if (!locked) return Promise.resolve();
  return new Promise((resolve) => {
    waiters.push(resolve);
  });
}

export function subscribeAppLockGate(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Test helper — resets gate to fail-closed defaults. */
export function __resetAppLockGateForTests(): void {
  locked = true;
  enabled = false;
  waiters.splice(0, waiters.length);
  listeners.clear();
}
