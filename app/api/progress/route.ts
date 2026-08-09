import { NextResponse } from 'next/server'
import { createClient } from '../../../lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })

  let body: { sessionId?: string; readPercent?: number; lastBlockId?: string | null }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  if (!body.sessionId || typeof body.readPercent !== 'number') {
    return NextResponse.json({ error: 'invalid_progress_payload' }, { status: 400 })
  }

  const readPercent = Math.max(0, Math.min(100, Math.round(body.readPercent)))
  const { data, error } = await supabase.rpc('save_session_progress', {
    p_session_id: body.sessionId,
    p_read_percent: readPercent,
    p_last_block_id: body.lastBlockId || null,
  })

  if (error) {
    const forbidden = error.message.includes('session_not_available') || error.code === '42501'
    return NextResponse.json({ error: forbidden ? 'session_not_available' : 'progress_save_failed' }, { status: forbidden ? 403 : 400 })
  }

  return NextResponse.json({ ok: true, progress: data })
}
