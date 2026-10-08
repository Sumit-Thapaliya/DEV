/** One-time compatibility cleanup only. Never read or restore old credentials.
 * Scope deletion to this application's keys; do not touch other apps' data. */
export function clearLegacyStorage() {
  for (const kind of ['localStorage', 'sessionStorage'] as const) {
    try {
      const storage = window[kind];
      for (let index = storage.length - 1; index >= 0; index--) {
        const key = storage.key(index);
        if (key?.startsWith('jobdev-')) storage.removeItem(key);
      }
    } catch { /* Storage can be disabled. Authentication never depends on it. */ }
  }
}
