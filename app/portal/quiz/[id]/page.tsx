import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '../../../../lib/supabase/server'
import { resolveLearningAsset } from '../../../../lib/supabase/assets'
import QuizForm from './quiz-form'
import SimulationForm from './simulation-form'

type QuestionRow = {
  id: string
  position: number
  kind: string
  prompt: string
  passage: string | null
  audio_url: string | null
  points: number
}

type OptionRow = {
  id: string
  question_id: string
  position: number
  label: string | null
  option_text: string
}

export default async function QuizPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: quiz, error: quizError } = await supabase
    .from('quizzes')
    .select('id, session_id, title, pass_score, time_limit_minutes, kind')
    .eq('id', id)
    .eq('published', true)
    .maybeSingle()

  if (quizError || !quiz) notFound()

  const { data: questionData, error: questionError } = await supabase
    .from('quiz_questions')
    .select('id, position, kind, prompt, passage, audio_url, points')
    .eq('quiz_id', quiz.id)
    .order('position')

  if (questionError) notFound()
  const rawQuestions = (questionData || []) as QuestionRow[]
  const questions = await Promise.all(rawQuestions.map(async (question) => ({
    ...question,
    audio_url: await resolveLearningAsset(supabase, question.audio_url),
  })))
  const ids = questions.map((question) => question.id)

  let options: OptionRow[] = []
  if (ids.length > 0) {
    const { data: optionData, error: optionError } = await supabase
      .from('question_options')
      .select('id, question_id, position, label, option_text')
      .in('question_id', ids)
      .order('position')

    if (optionError) notFound()
    options = (optionData || []) as OptionRow[]
  }

  const prepared = questions.map((question) => ({
    ...question,
    options: options.filter((option) => option.question_id === question.id),
  }))

  return (
    <main className="learning-shell quiz-shell">
      <div className="learning-topbar">
        {quiz.session_id
          ? <Link className="back-link" href={`/portal/session/${quiz.session_id}`}>← Kembali ke sesi</Link>
          : <Link className="back-link" href="/portal/dashboard">← Dashboard</Link>}
        <span>{quiz.kind === 'simulation' ? 'Simulasi' : quiz.kind === 'checkpoint' ? 'Evaluasi' : 'Latihan sesi'}</span>
      </div>

      {prepared.length === 0 ? (
        <section className="panel empty learning-empty">
          <h1>{quiz.title}</h1>
          <h2>Bank soal belum diisi</h2>
          <p>Kerangka latihan sudah tersedia, tetapi belum ada soal yang dipublikasikan.</p>
        </section>
      ) : quiz.kind === 'simulation' ? (
        <SimulationForm
          quizId={quiz.id}
          title={quiz.title}
          passScore={quiz.pass_score}
          timeLimitMinutes={quiz.time_limit_minutes}
          questions={prepared}
        />
      ) : (
        <QuizForm
          quizId={quiz.id}
          sessionId={quiz.session_id}
          title={quiz.title}
          passScore={quiz.pass_score}
          timeLimitMinutes={quiz.time_limit_minutes}
          questions={prepared}
        />
      )}
    </main>
  )
}
