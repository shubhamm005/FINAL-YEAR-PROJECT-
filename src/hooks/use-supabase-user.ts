'use client';

import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

export type AppRole = 'hod' | 'teacher';

export interface SupabaseUserState {
  user: User | null;
  role: AppRole | null;
  isLoaded: boolean;
  fullName: string;
  email: string;
  avatarUrl: string;
}

/**
 * Client-side hook that returns the current Supabase session user
 * plus their role (stored in user_metadata.role).
 *
 * Role is set server-side via the Supabase admin API at sign-up time:
 *   supabaseAdmin.auth.admin.updateUserById(userId, {
 *     user_metadata: { role: 'hod' | 'teacher' }
 *   })
 */
export function useSupabaseUser(): SupabaseUserState {
  const [user, setUser] = useState<User | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    // Initial session
    void supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setIsLoaded(true);
    });

    // Listen for auth state changes (sign-in / sign-out)
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const meta = user?.user_metadata ?? {};
  const role = (meta.role as AppRole) ?? null;
  const fullName: string = meta.full_name ?? meta.name ?? user?.email?.split('@')[0] ?? '';
  const email: string = user?.email ?? '';
  const avatarUrl: string = meta.avatar_url ?? '';

  return { user, role, isLoaded, fullName, email, avatarUrl };
}
