import type { ReactNode } from 'react'

type Props = { text: string }

const tokenPattern = /(\*\*[^*\n]+\*\*|\+\+[^+\n]+\+\+|\*[^*\n]+\*)/g

export default function FormattedText({ text }: Props) {
  const lines = text.split('\n')
  return lines.map((line, lineIndex) => {
    const parts: ReactNode[] = []
    let cursor = 0
    for (const match of line.matchAll(tokenPattern)) {
      const index = match.index || 0
      if (index > cursor) parts.push(line.slice(cursor, index))
      const token = match[0]
      const key = `${lineIndex}-${index}`
      if (token.startsWith('**')) parts.push(<strong key={key}>{token.slice(2, -2)}</strong>)
      else if (token.startsWith('++')) parts.push(<u key={key}>{token.slice(2, -2)}</u>)
      else parts.push(<em key={key}>{token.slice(1, -1)}</em>)
      cursor = index + token.length
    }
    if (cursor < line.length) parts.push(line.slice(cursor))
    return <span key={lineIndex}>{parts}{lineIndex < lines.length - 1 && <br />}</span>
  })
}
