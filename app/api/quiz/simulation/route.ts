import { NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase/server'

type Body = {
  action?: 'start' | 'sync' | 'finish'
  quizId?: string
  attemptId?: string
  answers?: Record<string, string>
}

function response(data: unknown, status = 200) {
  const result = NextResponse.json(data, { status })
  result.headers.set('Cache-Control', 'private, no-store')
  return result
}

function mapError(message: string, code?: string) {
  if (message.includes('simulation_not_available') || message.includes('simulation_attempt_not_found') || code === '42501') {
    return response({ error: 'simulation_not_available' }, 403)
  }
  if (message.includes('quiz_has_no_questions')) return response({ error: 'quiz_has_no_questions' }, 400)
  if (message.includes('simulation_already_submitted')) return response({ error: 'simulation_already_submitted' }, 409)
  if (message.includes('answers_must_be_object') || message.includes('too_many_answers')) return response({ error: 'invalid_answers' }, 400)
  return response({ error: 'simulation_operation_failed' }, 400)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return response({ error: 'not_authenticated' }, 401)

  let body: Body
  try {
    body = await request.json()
  } catch {
    return response({ error: 'invalid_json' }, 400)
  }

  if (body.action === 'start') {
    if (!body.quizId) return response({ error: 'quiz_id_required' }, 400)
    const { data, error } = await supabase.rpc('start_or_resume_simulation', { p_quiz_id: body.quizId })
    if (error) return mapError(error.message, error.code)
    return response({ ok: true, state: data })
  }

  if (body.action === 'sync') {
    if (!body.attemptId || !body.answers || typeof body.answers !== 'object' || Array.isArray(body.answers)) {
      return response({ error: 'invalid_simulation_payload' }, 400)
    }
    const { data, error } = await supabase.rpc('save_simulation_progress', {
      p_attempt_id: body.attemptId,
      p_answers: body.answers,
    })
    if (error) return mapError(error.message, error.code)
    return response({ ok: true, state: data })
  }

  if (body.action === 'finish') {
    if (!body.attemptId) return response({ error: 'attempt_id_required' }, 400)

    if (body.answers && typeof body.answers === 'object' && !Array.isArray(body.answers)) {
      const { error: saveError } = await supabase.rpc('save_simulation_progress', {
        p_attempt_id: body.attemptId,
        p_answers: body.answers,
      })
      if (saveError && !saveError.message.includes('simulation_already_submitted')) {
        return mapError(saveError.message, saveError.code)
      }
    }

    const { data, error } = await supabase.rpc('finish_simulation_attempt', { p_attempt_id: body.attemptId })
    if (error) return mapError(error.message, error.code)
    return response({ ok: true, result: data })
  }

  return response({ error: 'invalid_simulation_action' }, 400)
}
