import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '../../../lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  const body = await request.json().catch(() => ({})) as {
    action?: 'create' | 'reply'
    category?: string
    subject?: string
    message?: string
    requestId?: string
  }

  if (body.action === 'create') {
    const { data, error } = await supabase.rpc('submit_support_request', {
      p_category: body.category || 'other',
      p_subject: body.subject || '',
      p_message: body.message || '',
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true, requestId: data })
  }

  if (body.action === 'reply' && body.requestId) {
    const { error } = await supabase.rpc('reply_support_request', {
      p_request_id: body.requestId,
      p_message: body.message || '',
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Aksi support tidak valid.' }, { status: 400 })
}
