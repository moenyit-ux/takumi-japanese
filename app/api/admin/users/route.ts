import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '../../../../lib/supabase/server'

async function removePaymentProofs(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data: files, error: listError } = await supabase.storage.from('payment-proofs').list(userId, { limit: 1000 })
  if (listError) throw new Error(listError.message)
  const paths = (files || []).filter((file) => file.name).map((file) => `${userId}/${file.name}`)
  if (paths.length > 0) {
    const { error: removeError } = await supabase.storage.from('payment-proofs').remove(paths)
    if (removeError) throw new Error(removeError.message)
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'super_admin') return NextResponse.json({ error: 'Super Admin required' }, { status: 403 })

  const body = await request.json().catch(() => ({})) as {
    action?: string
    userId?: string
    role?: string
    deviceId?: string
    requestId?: string
    status?: string
  }

  try {
    let result: { data: unknown; error: { message: string } | null }
    if (body.action === 'set_role' && body.userId && body.role) {
      result = await supabase.rpc('admin_set_user_role', { p_user_id: body.userId, p_role: body.role })
    } else if (body.action === 'revoke_device' && body.deviceId) {
      result = await supabase.rpc('admin_revoke_device', { p_device_id: body.deviceId })
    } else if (body.action === 'deletion_status' && body.requestId && body.status) {
      result = await supabase.rpc('admin_set_deletion_status', { p_request_id: body.requestId, p_status: body.status })
    } else if (body.action === 'finalize_deletion' && body.requestId && body.userId) {
      await removePaymentProofs(supabase, body.userId)
      result = await supabase.rpc('admin_finalize_account_deletion', { p_request_id: body.requestId })
    } else {
      return NextResponse.json({ error: 'Aksi admin tidak valid.' }, { status: 400 })
    }

    if (result.error) return NextResponse.json({ error: result.error.message }, { status: 400 })
    return NextResponse.json({ ok: true, data: result.data })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Operasi akun gagal.' }, { status: 400 })
  }
}
