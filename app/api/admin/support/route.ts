import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '../../../../lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  const role = profile?.role || 'student'
  if (role !== 'super_admin' && role !== 'content_admin') {
    return NextResponse.json({ error: 'Admin required' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({})) as {
    action?: 'reply' | 'update' | 'settings'
    requestId?: string
    message?: string
    status?: string
    priority?: string
    whatsappNumber?: string
    whatsappEnabled?: boolean
  }

  if (body.action === 'reply' && body.requestId) {
    const { error } = await supabase.rpc('admin_reply_support_request', {
      p_request_id: body.requestId,
      p_message: body.message || '',
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  }

  if (body.action === 'update' && body.requestId) {
    const { error } = await supabase.rpc('admin_update_support_request', {
      p_request_id: body.requestId,
      p_status: body.status || 'open',
      p_priority: body.priority || 'normal',
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  }

  if (body.action === 'settings') {
    if (role !== 'super_admin') return NextResponse.json({ error: 'Super Admin required' }, { status: 403 })
    const { error } = await supabase.rpc('admin_update_support_settings', {
      p_whatsapp_number: body.whatsappNumber || '',
      p_whatsapp_enabled: Boolean(body.whatsappEnabled),
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Aksi admin support tidak valid.' }, { status: 400 })
}
