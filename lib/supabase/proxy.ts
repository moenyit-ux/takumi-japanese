import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { supabasePublishableKey, supabaseUrl } from './config'

const DEVICE_COOKIE = 'takumi_device_id'

function deviceNameFromUserAgent(userAgent: string | null) {
  const ua = userAgent || ''
  const browser = /Edg\//.test(ua) ? 'Edge'
    : /Firefox\//.test(ua) ? 'Firefox'
      : /Chrome\//.test(ua) ? 'Chrome'
        : /Safari\//.test(ua) ? 'Safari'
          : 'Browser'
  const device = /iPhone/.test(ua) ? 'iPhone'
    : /iPad/.test(ua) ? 'iPad'
      : /Android/.test(ua) ? 'Android'
        : /Macintosh|Mac OS X/.test(ua) ? 'Mac'
          : /Windows/.test(ua) ? 'Windows'
            : /Linux/.test(ua) ? 'Linux'
              : 'Perangkat'
  return `${browser} · ${device}`
}

function needsDeviceCheck(path: string) {
  if (path === '/device-limit') return false
  if (path.startsWith('/api/account/device')) return false
  if (path.startsWith('/auth/')) return false
  return path.startsWith('/portal') || path.startsWith('/api/')
}

function applyDeviceCookie(response: NextResponse, fingerprint: string, shouldSet: boolean) {
  if (shouldSet) {
    response.cookies.set(DEVICE_COOKIE, fingerprint, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    })
  }
  response.headers.set('Cache-Control', 'private, no-store')
  return response
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })

  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname

  if (!user && (path.startsWith('/portal') || path === '/device-limit')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', path)
    return NextResponse.redirect(url)
  }

  if (user && path === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/portal/dashboard'
    url.search = ''
    return NextResponse.redirect(url)
  }

  if (user && needsDeviceCheck(path)) {
    const existingFingerprint = request.cookies.get(DEVICE_COOKIE)?.value
    const fingerprint = existingFingerprint || crypto.randomUUID()
    const shouldSetCookie = !existingFingerprint
    const { data, error } = await supabase.rpc('register_current_device', {
      p_fingerprint: fingerprint,
      p_device_name: deviceNameFromUserAgent(request.headers.get('user-agent')),
    })

    const result = data as { allowed?: boolean; reason?: string } | null
    if (error || !result?.allowed) {
      if (path.startsWith('/api/')) {
        const apiResponse = NextResponse.json(
          { error: error ? 'Pemeriksaan perangkat gagal.' : 'Batas maksimal 2 perangkat aktif telah tercapai.', reason: result?.reason || 'check_failed' },
          { status: error ? 503 : 403 },
        )
        return applyDeviceCookie(apiResponse, fingerprint, shouldSetCookie)
      }

      const url = request.nextUrl.clone()
      url.pathname = '/device-limit'
      url.search = ''
      if (result?.reason) url.searchParams.set('reason', result.reason)
      const redirectResponse = NextResponse.redirect(url)
      return applyDeviceCookie(redirectResponse, fingerprint, shouldSetCookie)
    }

    return applyDeviceCookie(response, fingerprint, shouldSetCookie)
  }

  response.headers.set('Cache-Control', 'private, no-store')
  return response
}
