import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Silakan masuk terlebih dahulu.' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'super_admin') return NextResponse.json({ error: 'Akses Super Admin diperlukan.' }, { status: 403 })

  const body = await request.json().catch(() => ({})) as Record<string, unknown>
  const action = typeof body.action === 'string' ? body.action : ''

  if (action === 'set_status') {
    const paymentId = typeof body.paymentId === 'string' ? body.paymentId : ''
    const status = typeof body.status === 'string' ? body.status : ''
    const note = typeof body.note === 'string' ? body.note : null
    const { data, error } = await supabase.rpc('admin_set_payment_status', {
      p_payment_id: paymentId,
      p_status: status,
      p_admin_note: note,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true, data })
  }

  if (action === 'save_method') {
    const { data, error } = await supabase.rpc('admin_upsert_payment_method', {
      p_id: typeof body.id === 'string' && body.id ? body.id : null,
      p_label: typeof body.label === 'string' ? body.label : '',
      p_bank_name: typeof body.bankName === 'string' ? body.bankName : null,
      p_account_name: typeof body.accountName === 'string' ? body.accountName : null,
      p_account_number: typeof body.accountNumber === 'string' ? body.accountNumber : null,
      p_instructions: typeof body.instructions === 'string' ? body.instructions : null,
      p_active: body.active !== false,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true, data })
  }

  return NextResponse.json({ error: 'Aksi tidak dikenali.' }, { status: 400 })
}
