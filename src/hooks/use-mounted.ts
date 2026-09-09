'use client';

import { useEffect, useState } from 'react';

/**
 * Returns `false` on the server and on the initial client render,
 * then `true` after the first commit to the DOM.
 *
 * Use this to defer auth-dependent rendering so the server HTML and
 * the initial client render are identical, avoiding hydration mismatches.
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
