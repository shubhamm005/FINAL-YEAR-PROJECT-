'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingButton } from '@/components/ui/loading-button';
import { FieldGroup } from '@/components/ui/field';
import { useAppForm } from '@/lib/form';
import { createClient } from '@/lib/supabase/client';
import { useMounted } from '@/hooks/use-mounted';
import { useSupabaseUser } from '@/hooks/use-supabase-user';
import { useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';
import * as z from 'zod';

const profileSchema = z.object({
  fullName: z.string().min(2, { message: 'Full name is required' })
});

const ROLE_LABELS: Record<string, string> = {
  hod: 'Head of Department',
  teacher: 'Teacher'
};

interface Profile {
  id: string;
  full_name: string | null;
  role: 'hod' | 'teacher';
  email: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export default function ProfileViewPage() {
  const mounted = useMounted();
  const { user } = useSupabaseUser();
  const [loading, startTransition] = useTransition();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fetching, setFetching] = useState(true);

  // Fetch the profile row from the profiles table
  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    void supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
      .then(({ data, error }) => {
        if (!error && data) setProfile(data as Profile);
        setFetching(false);
      });
  }, [user]);

  const form = useAppForm({
    defaultValues: { fullName: profile?.full_name ?? '' },
    validators: { onSubmit: profileSchema },
    onSubmit: ({ value }) => {
      startTransition(async () => {
        const supabase = createClient();

        // Update both the profiles table and auth user_metadata atomically
        const [profileRes, authRes] = await Promise.all([
          supabase.from('profiles').update({ full_name: value.fullName }).eq('id', user!.id),
          supabase.auth.updateUser({ data: { full_name: value.fullName } })
        ]);

        if (profileRes.error) {
          toast.error(profileRes.error.message);
          return;
        }
        if (authRes.error) {
          toast.error(authRes.error.message);
          return;
        }

        setProfile((prev) => (prev ? { ...prev, full_name: value.fullName } : prev));
        toast.success('Profile updated!');
      });
    }
  });

  if (!mounted || !user) return null;

  return (
    <div className='flex w-full flex-col gap-6 p-4'>
      {/* Account info card — sourced from profiles table */}
      <Card>
        <CardHeader>
          <CardTitle>Account Info</CardTitle>
          <CardDescription>Your account details from the database</CardDescription>
        </CardHeader>
        <CardContent className='space-y-3 text-sm'>
          <div className='flex items-center gap-3'>
            <span className='text-muted-foreground w-24 shrink-0'>Email</span>
            <span className='font-medium'>{profile?.email ?? user.email ?? '—'}</span>
          </div>
          <div className='flex items-center gap-3'>
            <span className='text-muted-foreground w-24 shrink-0'>Role</span>
            <span className='bg-primary/10 text-primary rounded-md px-2 py-0.5 text-xs font-semibold uppercase tracking-wide'>
              {profile?.role ? (ROLE_LABELS[profile.role] ?? profile.role) : '—'}
            </span>
          </div>
          <div className='flex items-center gap-3'>
            <span className='text-muted-foreground w-24 shrink-0'>Member since</span>
            <span className='font-medium'>
              {profile?.created_at
                ? new Intl.DateTimeFormat('en-GB', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  }).format(new Date(profile.created_at))
                : '—'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Edit profile card */}
      <Card>
        <CardHeader>
          <CardTitle>Edit Profile</CardTitle>
          <CardDescription>Update your display name</CardDescription>
        </CardHeader>
        <CardContent>
          {fetching ? (
            <div className='text-muted-foreground text-sm'>Loading…</div>
          ) : (
            <form
              className='space-y-4'
              onSubmit={(e) => {
                e.preventDefault();
                form.handleSubmit();
              }}
            >
              <FieldGroup>
                <form.AppField
                  name='fullName'
                  children={(field) => (
                    <field.TextField
                      label='Full Name'
                      type='text'
                      placeholder='Jane Smith'
                      disabled={loading}
                    />
                  )}
                />
              </FieldGroup>
              <LoadingButton loading={loading} type='submit'>
                Save changes
              </LoadingButton>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
