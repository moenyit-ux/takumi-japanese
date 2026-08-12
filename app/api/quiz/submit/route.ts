import { NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase/server'

type SubmitBody = {
  quizId?: string
  answers?: Record<string, string>
  timeSpentSeconds?: number
}

function json(data: unknown, status = 200) {
  const response = NextResponse.json(data, { status })
  response.headers.set('Cache-Control', 'private, no-store')
  return response
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return json({ error: 'not_authenticated' }, 401)

  let body: SubmitBody
  try {
    body = await request.json()
  } catch {
    return json({ error: 'invalid_json' }, 400)
  }

  if (!body.quizId || !body.answers || typeof body.answers !== 'object' || Array.isArray(body.answers)) {
    return json({ error: 'invalid_quiz_payload' }, 400)
  }

  const { data, error } = await supabase.rpc('submit_quiz_attempt', {
    p_quiz_id: body.quizId,
    p_answers: body.answers,
    p_time_spent_seconds: Number.isFinite(body.timeSpentSeconds) ? Math.max(0, Math.round(body.timeSpentSeconds || 0)) : null,
  })

  if (error) {
    const unavailable = error.message.includes('quiz_not_available') || error.code === '42501'
    const empty = error.message.includes('quiz_has_no_questions')
    return json(
      { error: unavailable ? 'quiz_not_available' : empty ? 'quiz_has_no_questions' : 'quiz_submit_failed' },
      unavailable ? 403 : 400,
    )
  }

  const result = data as { attempt_id?: string } | null
  let review: unknown = null
  if (result?.attempt_id) {
    const reviewResult = await supabase.rpc('get_attempt_review', { p_attempt_id: result.attempt_id })
    if (!reviewResult.error) review = reviewResult.data
  }

  return json({ ok: true, result: data, review })
}
