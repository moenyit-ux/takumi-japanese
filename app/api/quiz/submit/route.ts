import { NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase/server'

type SubmitBody = {
  quizId?: string
  answers?: Record<string, string>
  timeSpentSeconds?: number
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })

  let body: SubmitBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  if (!body.quizId || !body.answers || typeof body.answers !== 'object' || Array.isArray(body.answers)) {
    return NextResponse.json({ error: 'invalid_quiz_payload' }, { status: 400 })
  }

  const { data, error } = await supabase.rpc('submit_quiz_attempt', {
    p_quiz_id: body.quizId,
    p_answers: body.answers,
    p_time_spent_seconds: Number.isFinite(body.timeSpentSeconds) ? Math.max(0, Math.round(body.timeSpentSeconds || 0)) : null,
  })

  if (error) {
    const unavailable = error.message.includes('quiz_not_available') || error.code === '42501'
    const empty = error.message.includes('quiz_has_no_questions')
    return NextResponse.json(
      { error: unavailable ? 'quiz_not_available' : empty ? 'quiz_has_no_questions' : 'quiz_submit_failed' },
      { status: unavailable ? 403 : 400 },
    )
  }

  return NextResponse.json({ ok: true, result: data })
}
