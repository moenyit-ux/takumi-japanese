import type { ReactNode } from 'react'

export type PortalNavIconName =
  | 'home'
  | 'material'
  | 'bookmark'
  | 'results'
  | 'premium'
  | 'settings'
  | 'support'
  | 'admin'

function IconFrame({ children }: { children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      focusable="false"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8">
        {children}
      </g>
    </svg>
  )
}

export default function PortalNavIcon({ name }: { name: PortalNavIconName }) {
  switch (name) {
    case 'home':
      return (
        <IconFrame>
          <path d="m3.5 10.5 8.5-7 8.5 7" />
          <path d="M5.5 9v11h13V9M9.5 20v-6h5v6" />
        </IconFrame>
      )
    case 'material':
      return (
        <IconFrame>
          <path d="M3.5 5.5A3.5 3.5 0 0 1 7 4h4.5v16H7a3.5 3.5 0 0 0-3.5 1V5.5Z" />
          <path d="M20.5 5.5A3.5 3.5 0 0 0 17 4h-4.5v16H17a3.5 3.5 0 0 1 3.5 1V5.5Z" />
        </IconFrame>
      )
    case 'bookmark':
      return (
        <IconFrame>
          <path d="M6.5 3.5h11v17L12 17l-5.5 3.5v-17Z" />
        </IconFrame>
      )
    case 'results':
      return (
        <IconFrame>
          <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
          <path d="m4 8 6-5 6 7 5-5" />
        </IconFrame>
      )
    case 'premium':
      return (
        <IconFrame>
          <path d="m12 3 4 4-4 4-4-4 4-4Z" />
          <path d="m8 7-4 4 8 10 8-10-4-4M4 11h16M12 11v10" />
        </IconFrame>
      )
    case 'settings':
      return (
        <IconFrame>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
        </IconFrame>
      )
    case 'support':
      return (
        <IconFrame>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="3.5" />
          <path d="m5.6 5.6 3.9 3.9M14.5 14.5l3.9 3.9M18.4 5.6l-3.9 3.9M9.5 14.5l-3.9 3.9" />
        </IconFrame>
      )
    case 'admin':
      return (
        <IconFrame>
          <path d="M12 3 5.5 5.5v5.2c0 4.2 2.6 8.1 6.5 10.3 3.9-2.2 6.5-6.1 6.5-10.3V5.5L12 3Z" />
          <path d="m9 12 2 2 4-4" />
        </IconFrame>
      )
  }
}
