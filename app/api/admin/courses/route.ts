import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '../../../../lib/supabase/server'

type CourseActionBody = {
  action?: 'upsert' | 'set_status'
  enrollmentId?: string | null
  userId?: string
  courseLevel?: string
  pace?: string
  status?: string
  startsAt?: string
  endsAt?: string | null
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'super_admin') return NextResponse.json({ error: 'Super Admin required' }, { status: 403 })

  const body = await request.json().catch(() => ({})) as CourseActionBody

  try {
    if (body.action === 'upsert') {
      if (!body.userId || !body.courseLevel || !body.pace || !body.status || !body.startsAt) {
        return NextResponse.json({ error: 'Data kursus belum lengkap.' }, { status: 400 })
      }

      const { data, error } = await supabase.rpc('admin_upsert_course_enrollment', {
        p_enrollment_id: body.enrollmentId || null,
        p_user_id: body.userId,
        p_course_level: body.courseLevel,
        p_pace: body.pace,
        p_status: body.status,
        p_starts_at: body.startsAt,
        p_ends_at: body.endsAt || null,
      })
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      return NextResponse.json({ ok: true, data })
    }

    if (body.action === 'set_status') {
      if (!body.enrollmentId || !body.status) {
        return NextResponse.json({ error: 'Status kursus belum lengkap.' }, { status: 400 })
      }
      const { data, error } = await supabase.rpc('admin_set_course_enrollment_status', {
        p_enrollment_id: body.enrollmentId,
        p_status: body.status,
      })
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      return NextResponse.json({ ok: true, data })
    }

    return NextResponse.json({ error: 'Aksi kursus tidak valid.' }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Operasi kursus gagal.' }, { status: 400 })
  }
}
