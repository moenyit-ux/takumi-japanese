import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '../../../../lib/supabase/server'

type Payload = Record<string, unknown>

function text(value: unknown) {
  return typeof value === 'string' ? value : ''
}

function nullableText(value: unknown) {
  const valueText = text(value).trim()
  return valueText || null
}

function numberValue(value: unknown, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function errorMessage(message: string) {
  const map: Record<string, string> = {
    admin_required: 'Akun ini tidak memiliki akses editor.',
    super_admin_required: 'Tindakan ini hanya dapat dilakukan Super Admin.',
    content_admin_transition_not_allowed: 'Admin konten hanya dapat menyimpan draft atau mengirim materi ke review.',
    published_session_requires_super_admin: 'Materi yang sudah dipublikasikan hanya dapat diubah Super Admin.',
    publish_requires_content: 'Tambahkan minimal satu blok materi sebelum dipublikasikan.',
    publish_requires_session_quiz: 'Latihan sesi belum tersedia.',
    publish_requires_questions: 'Tambahkan minimal satu soal sebelum dipublikasikan.',
    publish_requires_valid_options: 'Setiap soal harus memiliki minimal dua pilihan dan tepat satu jawaban benar.',
    exactly_one_correct_option_required: 'Pilih tepat satu jawaban benar.',
    at_least_two_options_required: 'Setiap soal harus memiliki minimal dua pilihan jawaban.',
    option_text_required: 'Minimal dua pilihan jawaban harus diisi.',
    question_has_attempt_history: 'Soal ini sudah memiliki riwayat jawaban siswa sehingga tidak dapat diubah atau dihapus.',
  }
  return map[message] || message.replaceAll('_', ' ')
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sesi login berakhir.' }, { status: 401 })

  const body = await request.json().catch(() => null) as Payload | null
  if (!body) return NextResponse.json({ error: 'Permintaan tidak valid.' }, { status: 400 })

  const action = text(body.action)
  const sessionId = text(body.sessionId)
  let result: { data: unknown; error: { message: string } | null } | null = null

  if (action === 'save_session') {
    result = await supabase.rpc('admin_save_session', {
      p_session_id: sessionId,
      p_title: text(body.title),
      p_summary: text(body.summary),
      p_estimated_minutes: Math.round(numberValue(body.estimatedMinutes, 60)),
      p_access_tier: text(body.accessTier),
    })
  } else if (action === 'upsert_block') {
    result = await supabase.rpc('admin_upsert_content_block', {
      p_session_id: sessionId,
      p_block_id: nullableText(body.blockId),
      p_position: Math.round(numberValue(body.position, 1)),
      p_kind: text(body.kind),
      p_title: text(body.title),
      p_body: body.contentBody && typeof body.contentBody === 'object' ? body.contentBody : {},
      p_audio_url: text(body.audioUrl),
      p_image_url: text(body.imageUrl),
    })
  } else if (action === 'delete_block') {
    result = await supabase.rpc('admin_delete_content_block', {
      p_session_id: sessionId,
      p_block_id: text(body.blockId),
    })
  } else if (action === 'upsert_question') {
    result = await supabase.rpc('admin_upsert_question', {
      p_quiz_id: text(body.quizId),
      p_question_id: nullableText(body.questionId),
      p_position: Math.round(numberValue(body.position, 1)),
      p_kind: text(body.kind),
      p_prompt: text(body.prompt),
      p_passage: text(body.passage),
      p_audio_url: text(body.audioUrl),
      p_explanation_id: text(body.explanationId),
      p_explanation_text: text(body.explanationText),
      p_points: numberValue(body.points, 1),
      p_options: Array.isArray(body.options) ? body.options : [],
    })
  } else if (action === 'delete_question') {
    result = await supabase.rpc('admin_delete_question', {
      p_quiz_id: text(body.quizId),
      p_question_id: text(body.questionId),
    })
  } else if (action === 'set_status') {
    result = await supabase.rpc('admin_set_content_status', {
      p_session_id: sessionId,
      p_status: text(body.status),
      p_note: text(body.note),
    })
  } else {
    return NextResponse.json({ error: 'Aksi editor tidak dikenal.' }, { status: 400 })
  }

  if (result.error) {
    return NextResponse.json({ error: errorMessage(result.error.message) }, { status: 400 })
  }

  revalidatePath('/portal/admin')
  if (sessionId) {
    revalidatePath(`/portal/admin/session/${sessionId}`)
    revalidatePath(`/portal/session/${sessionId}`)
  }
  revalidatePath('/portal/materi')
  revalidatePath('/portal/dashboard')

  return NextResponse.json({ ok: true, data: result.data })
}
