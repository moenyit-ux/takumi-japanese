import { notFound, redirect } from 'next/navigation'
import TakumiStudyHeader from '../../../components/takumi-study-header'
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

function getLearningStatus(status?: string | null) {
  if (status === 'completed') return 'Sudah dipelajari'
  if (status === 'review') return 'Perlu dipelajari lagi'
  return 'Belum dipelajari'
}

export default async function QuizPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: quiz, error: quizError } = await supabase
    .from('quizzes')
    .select('id, level_id, session_id, title, pass_score, time_limit_minutes, kind, group_no')
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
  let bookmarkedQuestionIds: string[] = []
  if (ids.length > 0) {
    const [optionResult, bookmarkResult] = await Promise.all([
      supabase
        .from('question_options')
        .select('id, question_id, position, label, option_text')
        .in('question_id', ids)
        .order('position'),
      supabase
        .from('bookmarks')
        .select('question_id')
        .in('question_id', ids),
    ])

    if (optionResult.error) notFound()
    options = (optionResult.data || []) as OptionRow[]
    bookmarkedQuestionIds = (bookmarkResult.data || []).map((item) => item.question_id).filter((value): value is string => Boolean(value))
  }

  const prepared = questions.map((question) => ({
    ...question,
    options: options.filter((option) => option.question_id === question.id),
  }))

  const [levelResult, progressResult, siblingResult] = await Promise.all([
    supabase.from('levels').select('code').eq('id', quiz.level_id).maybeSingle(),
    quiz.session_id
      ? supabase.from('session_progress').select('read_percent, status').eq('session_id', quiz.session_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    quiz.session_id && quiz.kind === 'session'
      ? supabase.from('quizzes').select('id, group_no').eq('session_id', quiz.session_id).eq('kind', 'session').eq('published', true).order('group_no').order('created_at')
      : Promise.resolve({ data: [] as Array<{ id: string; group_no: number | null }>, error: null }),
  ])

  const levelCode = levelResult.data?.code || 'N4'
  const progress = progressResult.data
  const siblings = siblingResult.data || []
  const currentIndex = siblings.findIndex((item) => item.id === quiz.id)
  const nextQuiz = currentIndex >= 0 ? siblings[currentIndex + 1] : null
  const backHref = quiz.session_id ? `/portal/session/${quiz.session_id}` : `/portal/materi?level=${levelCode}`
  const nextHref = nextQuiz ? `/portal/quiz/${nextQuiz.id}` : (quiz.session_id ? `/portal/session/${quiz.session_id}` : `/portal/materi?level=${levelCode}`)

  return (
    <main className="tm-material-page">
      <TakumiStudyHeader
        backHref={backHref}
        active="quiz"
        title={quiz.title}
        meta={`${levelCode} · ${quiz.kind === 'session' ? `Kuis ${quiz.group_no || Math.max(1, currentIndex + 1)}` : 'Simulasi JLPT'}`}
        progressPercent={progress?.read_percent || 0}
        learningStatus={getLearningStatus(progress?.status)}
        quizHref={`/portal/quiz/${quiz.id}`}
        compact={quiz.kind === 'simulation'}
      />

      {prepared.length === 0 ? (
        <section className="tm-material-card tm-empty-card">
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
          initialBookmarkedQuestionIds={bookmarkedQuestionIds}
          nextHref={nextHref}
        />
      )}
    </main>
  )
}
