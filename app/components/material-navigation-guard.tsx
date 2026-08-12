'use client'

import { useEffect } from 'react'

export default function MaterialNavigationGuard() {
  useEffect(() => {
    function handleClick(event: MouseEvent) {
      const element = event.target instanceof Element ? event.target : null
      const link = element?.closest<HTMLAnchorElement>('.tm-material-actions a[href^="#block-"]')
      if (!link) return

      const href = link.getAttribute('href') || ''
      const targetId = href.slice(1)
      if (targetId && document.getElementById(targetId)) return

      const article = link.closest<HTMLElement>('.tm-material-card')
      const next = article?.nextElementSibling
      if (!(next instanceof HTMLElement)) return

      event.preventDefault()
      next.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  return null
}
