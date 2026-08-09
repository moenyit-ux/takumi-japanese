import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Silakan masuk terlebih dahulu.' }, { status: 401 })

  const body = await request.json().catch(() => ({})) as Record<string, unknown>
  const levelId = typeof body.levelId === 'string' ? body.levelId : ''
  const planCode = typeof body.planCode === 'string' ? body.planCode : ''
  const paymentMethodId = typeof body.paymentMethodId === 'string' ? body.paymentMethodId : ''
  const proofUrl = typeof body.proofUrl === 'string' ? body.proofUrl : ''
  const referenceNo = typeof body.referenceNo === 'string' ? body.referenceNo : null

  if (!levelId || !planCode || !paymentMethodId || !proofUrl) {
    return NextResponse.json({ error: 'Data pembayaran belum lengkap.' }, { status: 400 })
  }

  const { data, error } = await supabase.rpc('submit_manual_payment', {
    p_level_id: levelId,
    p_plan_code: planCode,
    p_payment_method_id: paymentMethodId,
    p_proof_url: proofUrl,
    p_reference_no: referenceNo,
  })

  if (error) {
    const message = error.message.includes('payment_already_pending_for_level')
      ? 'Masih ada pembayaran yang menunggu verifikasi untuk level ini.'
      : error.message.includes('payment_proof_not_found')
        ? 'Bukti pembayaran tidak ditemukan. Silakan unggah ulang.'
        : 'Pembayaran gagal dikirim. Periksa data lalu coba lagi.'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  return NextResponse.json({ ok: true, data })
}
