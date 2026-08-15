import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '../../../../lib/supabase/server'

const allowedStatuses = new Set(['not_started', 'review', 'learned'])

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })

  const body = await request.json().catch(() => null) as { blockId?: string; learningStatus?: string } | null
  if (!body?.blockId || !body.learningStatus || !allowedStatuses.has(body.learningStatus)) {
    return NextResponse.json({ error: 'invalid_learning_status_payload' }, { status: 400 })
  }

  const { data, error } = await supabase.rpc('set_content_block_learning_status', {
    p_content_block_id: body.blockId,
    p_learning_status: body.learningStatus,
  })

  if (error) {
    const forbidden = error.message.includes('session_not_available') || error.code === '42501'
    return NextResponse.json({ error: forbidden ? 'session_not_available' : 'learning_status_save_failed' }, { status: forbidden ? 403 : 400 })
  }

  revalidatePath('/portal/dashboard')
  revalidatePath('/portal/materi')

  return NextResponse.json({ ok: true, status: data })
}
