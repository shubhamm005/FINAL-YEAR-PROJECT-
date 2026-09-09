'use client';

import { LoadingButton } from '@/components/ui/loading-button';
import { FieldGroup } from '@/components/ui/field';
import { useAppForm } from '@/lib/form';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { toast } from 'sonner';
import * as z from 'zod';

// ─── Schemas ───────────────────────────────────────────────────────────────

const signInSchema = z.object({
  email: z.string().email({ message: 'Enter a valid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' })
});

const signUpSchema = z.object({
  fullName: z.string().min(2, { message: 'Full name is required' }),
  email: z.string().email({ message: 'Enter a valid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
  role: z.enum(['hod', 'teacher'], { message: 'Select a role' })
});

// ─── Role Picker ────────────────────────────────────────────────────────────

const ROLES: { value: 'hod' | 'teacher'; label: string; description: string }[] = [
  {
    value: 'teacher',
    label: 'Teacher',
    description: 'Manage classes & lessons'
  },
  {
    value: 'hod',
    label: 'Head of Department',
    description: 'Full department access'
  }
];

interface RolePickerProps {
  value: 'hod' | 'teacher';
  onChange: (v: 'hod' | 'teacher') => void;
  disabled?: boolean;
}

function RolePicker({ value, onChange, disabled }: RolePickerProps) {
  return (
    <div className='space-y-1.5'>
      <span className='text-sm font-medium'>Role</span>
      <div className='grid grid-cols-2 gap-3'>
        {ROLES.map((role) => {
          const selected = value === role.value;
          return (
            <button
              key={role.value}
              type='button'
              disabled={disabled}
              onClick={() => onChange(role.value)}
              className={cn(
                'flex flex-col items-start rounded-lg border-2 px-4 py-3 text-left transition-all',
                'focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                'disabled:cursor-not-allowed disabled:opacity-50',
                selected
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border hover:border-primary/50 hover:bg-muted/50'
              )}
              aria-pressed={selected}
            >
              <span className='text-sm font-semibold leading-tight'>{role.label}</span>
              <span
                className={cn(
                  'mt-0.5 text-xs leading-snug',
                  selected ? 'text-primary/80' : 'text-muted-foreground'
                )}
              >
                {role.description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Props ─────────────────────────────────────────────────────────────────

interface UserAuthFormProps {
  mode: 'sign-in' | 'sign-up';
}

// ─── Sign-in Form ───────────────────────────────────────────────────────────

function SignInForm() {
  const [loading, startTransition] = useTransition();
  const router = useRouter();

  const form = useAppForm({
    defaultValues: { email: '', password: '' },
    validators: { onSubmit: signInSchema },
    onSubmit: ({ value }) => {
      startTransition(async () => {
        const supabase = createClient();
        const { error } = await supabase.auth.signInWithPassword({
          email: value.email,
          password: value.password
        });

        if (error) {
          toast.error(error.message);
          return;
        }

        toast.success('Signed in successfully!');
        router.push('/dashboard/overview');
        router.refresh();
      });
    }
  });

  return (
    <form
      className='w-full space-y-4'
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
    >
      <FieldGroup>
        <form.AppField
          name='email'
          children={(field) => (
            <field.TextField
              label='Email'
              type='email'
              placeholder='you@school.edu'
              disabled={loading}
            />
          )}
        />
        <form.AppField
          name='password'
          children={(field) => (
            <field.TextField
              label='Password'
              type='password'
              placeholder='••••••••'
              disabled={loading}
            />
          )}
        />
      </FieldGroup>
      <LoadingButton loading={loading} type='submit' className='w-full'>
        Sign In
      </LoadingButton>
    </form>
  );
}

// ─── Sign-up Form ───────────────────────────────────────────────────────────

function SignUpForm() {
  const [loading, startTransition] = useTransition();
  const router = useRouter();

  const form = useAppForm({
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      role: 'teacher' as 'hod' | 'teacher'
    },
    validators: { onSubmit: signUpSchema },
    onSubmit: ({ value }) => {
      startTransition(async () => {
        const supabase = createClient();
        const { error } = await supabase.auth.signUp({
          email: value.email,
          password: value.password,
          options: {
            data: {
              full_name: value.fullName,
              role: value.role
            }
          }
        });

        if (error) {
          toast.error(error.message);
          return;
        }

        toast.success('Account created! Check your email to confirm.');
        router.push('/auth/sign-in');
      });
    }
  });

  return (
    <form
      className='w-full space-y-4'
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
        <form.AppField
          name='email'
          children={(field) => (
            <field.TextField
              label='Email'
              type='email'
              placeholder='you@school.edu'
              disabled={loading}
            />
          )}
        />
        <form.AppField
          name='password'
          children={(field) => (
            <field.TextField
              label='Password'
              type='password'
              placeholder='••••••••'
              disabled={loading}
            />
          )}
        />
      </FieldGroup>

      {/* Side-by-side role picker — reads and writes the 'role' field directly */}
      <form.Field
        name='role'
        children={(field) => (
          <RolePicker
            value={field.state.value}
            onChange={(v) => field.handleChange(v)}
            disabled={loading}
          />
        )}
      />

      <LoadingButton loading={loading} type='submit' className='w-full'>
        Create Account
      </LoadingButton>
    </form>
  );
}

// ─── Export ─────────────────────────────────────────────────────────────────

export default function UserAuthForm({ mode }: UserAuthFormProps) {
  return mode === 'sign-in' ? <SignInForm /> : <SignUpForm />;
}
