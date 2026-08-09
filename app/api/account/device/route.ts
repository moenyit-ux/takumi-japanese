import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '../../../../lib/supabase/server'

const DEVICE_COOKIE = 'takumi_device_id'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  const body = await request.json().catch(() => ({})) as { deviceId?: string }
  if (!body.deviceId) return NextResponse.json({ error: 'Device ID diperlukan.' }, { status: 400 })

  const { data, error } = await supabase.rpc('revoke_own_device', { p_device_id: body.deviceId })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: Boolean(data) })
}

export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  const response = NextResponse.json({ ok: true })
  response.cookies.set(DEVICE_COOKIE, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 0 })
  response.headers.set('Cache-Control', 'private, no-store')
  return response
}
