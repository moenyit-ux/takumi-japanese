'use client'

import { createPortal } from 'react-dom'
import { useEffect, useState } from 'react'
import QuizEditor from './quiz/quiz-editor'

type Option = {
  id?: string
  position: number
  label: string | null
  option_text: string
  is_correct: boolean
}

type Question = {
  id: string
  position: number
  kind: string
  prompt: string
  passage: string | null
  audio_url: string | null
  explanation_id: string | null
  explanation_text: string | null
  points: number
  options: Option[]
}

type Props = {
  sessionId: string
  quizId: string
  questions: Question[]
}

export default function QuizTabPortal({ sessionId, quizId, questions }: Props) {
  const [target, setTarget] = useState<Element | null>(null)
  const [slot, setSlot] = useState<HTMLElement | null>(null)
  const [quizActive, setQuizActive] = useState(false)

  useEffect(() => {
    const tablist = document.querySelector('[role="tablist"][aria-label="Jenis materi"]')
    if (!tablist) return

    setTarget(tablist)

    const section = tablist.closest('section')
    if (!section) return

    let quizSlot = section.querySelector<HTMLElement>('[data-quiz-inline-slot]')
    if (!quizSlot) {
      quizSlot = document.createElement('div')
      quizSlot.dataset.quizInlineSlot = 'true'
      quizSlot.style.display = 'none'
      quizSlot.style.marginTop = '18px'
      tablist.insertAdjacentElement('afterend', quizSlot)
    }
    setSlot(quizSlot)

    const handleMaterialTab = (event: Event) => {
      const element = event.target as HTMLElement | null
      const button = element?.closest('button')
      if (!button || button.hasAttribute('data-quiz-tab')) return
      setQuizActive(false)
    }

    tablist.addEventListener('click', handleMaterialTab)

    return () => {
      tablist.removeEventListener('click', handleMaterialTab)
      const extras = document.getElementById('session-material-extras')
      if (extras) extras.style.display = 'contents'
      Array.from(section.children).forEach((child) => {
        if (child instanceof HTMLElement) child.style.removeProperty('display')
      })
      quizSlot?.remove()
    }
  }, [])

  useEffect(() => {
    if (!target || !slot) return

    const section = target.closest('section')
    if (!section) return

    const children = Array.from(section.children).filter((child) => child !== section.firstElementChild && child !== target && child !== slot)
    children.forEach((child) => {
      if (!(child instanceof HTMLElement)) return
      if (quizActive) child.style.display = 'none'
      else child.style.removeProperty('display')
    })

    slot.style.display = quizActive ? 'block' : 'none'

    const materialTabs = Array.from(target.querySelectorAll('button:not([data-quiz-tab])')) as HTMLButtonElement[]
    materialTabs.forEach((button) => {
      if (quizActive) {
        button.style.borderColor = '#d9eaf2'
        button.style.background = '#fbfdfe'
        button.style.boxShadow = 'none'
      } else {
        button.style.removeProperty('border-color')
        button.style.removeProperty('background')
        button.style.removeProperty('box-shadow')
      }
    })

    const extras = document.getElementById('session-material-extras')
    if (extras) extras.style.display = quizActive ? 'none' : 'contents'
  }, [quizActive, slot, target])

  if (!target || !slot) return null

  return <>
    {createPortal(
      <button
        type="button"
        data-quiz-tab
        role="tab"
        aria-selected={quizActive}
        onClick={() => setQuizActive(true)}
        aria-label="Isi kuis sesi"
        style={quizActive ? {
          borderColor: '#64bee9',
          background: '#eaf7fd',
          boxShadow: 'inset 0 0 0 1px #64bee9',
        } : undefined}
      >
        <b>{questions.length}</b>
        <span>Kuis</span>
        <small>Klik untuk isi</small>
      </button>,
      target,
    )}

    {quizActive && createPortal(
      <div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 16,
          alignItems: 'center',
          padding: '14px 16px',
          marginBottom: 12,
          border: '1px solid #d9eaf2',
          borderRadius: 15,
          background: '#fff',
        }}>
          <div>
            <small style={{ display: 'block', color: '#146f9f', fontSize: 9, letterSpacing: '.12em', fontWeight: 900 }}>KUIS</small>
            <h3 style={{ margin: '3px 0 2px', fontSize: 17 }}>{questions.length > 0 ? `${questions.length} soal tersimpan` : 'Belum ada soal kuis'}</h3>
            <p style={{ margin: 0, color: '#71889a', fontSize: 11, lineHeight: 1.5 }}>Isi dan kelola soal latihan sesi di sini. Saat tab Kuis aktif, isian materi lain disembunyikan.</p>
          </div>
        </div>
        <QuizEditor sessionId={sessionId} quizId={quizId} questions={questions} />
      </div>,
      slot,
    )}
  </>
}
