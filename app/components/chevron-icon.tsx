type Props = {
  direction?: 'up' | 'down'
}

export default function ChevronIcon({ direction = 'down' }: Props) {
  const path = direction === 'up' ? 'm5 12.5 5-5 5 5' : 'm5 7.5 5 5 5-5'

  return (
    <svg
      aria-hidden="true"
      fill="none"
      focusable="false"
      height="1em"
      style={{ display: 'block' }}
      viewBox="0 0 20 20"
      width="1em"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d={path} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  )
}
