import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

const BUCKET = 'responsibility-attachments';
const MAX_MB = 10;
const MAX_BYTES = MAX_MB * 1024 * 1024;

const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/plain'
];

/**
 * POST /api/my-responsibilities/upload
 *
 * Accepts multipart/form-data with:
 *   - file        : the document file
 *   - responsibility_id : the responsibility this belongs to
 *
 * Returns: { url: string } — the public URL of the uploaded file
 */
export async function POST(request: NextRequest) {
  // 1. Auth check
  const authClient = await createClient();
  const {
    data: { user },
    error: authError
  } = await authClient.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (user.user_metadata?.role !== 'teacher') {
    return NextResponse.json({ error: 'Forbidden — teachers only' }, { status: 403 });
  }

  // 2. Parse multipart form
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('file') as File | null;
  const responsibilityId = formData.get('responsibility_id') as string | null;

  if (!file || !responsibilityId) {
    return NextResponse.json({ error: 'file and responsibility_id are required' }, { status: 400 });
  }

  // 3. Validate file
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: `File too large. Max size is ${MAX_MB}MB` }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: 'File type not allowed. Supported: PDF, Word, Excel, PPT, images, text' },
      { status: 400 }
    );
  }

  // 4. Verify assignment
  const admin = createAdminClient();
  const { data: assignment } = await admin
    .from('responsibility_assignments')
    .select('teacher_id')
    .eq('responsibility_id', responsibilityId)
    .eq('teacher_id', user.id)
    .single();

  if (!assignment) {
    return NextResponse.json(
      { error: 'You are not assigned to this responsibility' },
      { status: 403 }
    );
  }

  // 5. Build storage path: teacher_id/responsibility_id/timestamp_filename
  const ext = file.name.split('.').pop() ?? 'bin';
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${user.id}/${responsibilityId}/${Date.now()}_${safeName}`;

  // 6. Upload to Supabase Storage
  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await admin.storage.from(BUCKET).upload(path, arrayBuffer, {
    contentType: file.type,
    upsert: true
  });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  // 7. Get public URL
  const { data: urlData } = admin.storage.from(BUCKET).getPublicUrl(path);

  return NextResponse.json({ url: urlData.publicUrl });
}
