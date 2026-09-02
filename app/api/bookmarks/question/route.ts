import { NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase/server'

type BookmarkCategory = 'review' | 'uncertain'
type Body = { questionId?: string; category?: BookmarkCategory }

function json(data: unknown, status = 200) {
  const response = NextResponse.json(data, { status })
  response.headers.set('Cache-Control', 'private, no-store')
  return response
}

async function bodyOf(request: Request): Promise<Body> {
  try { return await request.json() as Body } catch { return {} }
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return json({ error: 'not_authenticated' }, 401)
  const body = await bodyOf(request)
  if (!body.questionId) return json({ error: 'question_id_required' }, 400)
  const category: BookmarkCategory = body.category === 'uncertain' ? 'uncertain' : 'review'

  const { data: question } = await supabase.from('quiz_questions').select('id').eq('id', body.questionId).maybeSingle()
  if (!question) return json({ error: 'question_not_available' }, 403)

  const { data: existing } = await supabase.from('bookmarks').select('id').eq('user_id', user.id).eq('question_id', body.questionId).maybeSingle()
  if (existing) {
    const { error } = await supabase.from('bookmarks').update({ category, source: 'manual' }).eq('id', existing.id)
    if (error) return json({ error: 'bookmark_save_failed' }, 400)
    return json({ ok: true, bookmarked: true, category })
  }

  const { error } = await supabase.from('bookmarks').insert({
    user_id: user.id,
    question_id: body.questionId,
    content_block_id: null,
    source: 'manual',
    category,
  })
  if (error && error.code !== '23505') return json({ error: 'bookmark_save_failed' }, 400)
  return json({ ok: true, bookmarked: true, category })
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return json({ error: 'not_authenticated' }, 401)
  const body = await bodyOf(request)
  if (!body.questionId) return json({ error: 'question_id_required' }, 400)

  const { error } = await supabase.from('bookmarks').delete().eq('user_id', user.id).eq('question_id', body.questionId).eq('source', 'manual')
  if (error) return json({ error: 'bookmark_delete_failed' }, 400)
  return json({ ok: true, bookmarked: false })
}
