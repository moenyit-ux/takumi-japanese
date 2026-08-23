import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '../../../../../lib/supabase/server'
import AssetUploader from './asset-uploader'
import MaterialWorkflowStudio from './material-workflow-studio'
import BulkImport from './bulk-import'
import styles from '../../admin.module.css'

type StructuredKind = 'vocabulary' | 'kanji' | 'grammar' | 'reading' | 'listening'

const validKinds: StructuredKind[] = ['vocabulary', 'kanji', 'grammar', 'reading', 'listening']

type EditorData = {
  role: 'content_admin' | 'super_admin'
  session: {
    id: string
    level_id: string
    level_code: string
    level_name: string
    session_no: number
    title: string
    slug: string
    summary: string | null
    estimated_minutes: number
    access_tier: 'free' | 'paid'
    content_status: string
    published_at: string | null
    updated_at: string
  }
  blocks: Array<{
    id: string
    position: number
    kind: string
    title: string | null
    body: unknown
    audio_url: string | null
    image_url: string | null
    review_status?: 'saved' | 'needs_revision' | 'approved'
    review_note?: string | null
    reviewed_by?: string | null
    reviewed_at?: string | null
    updated_at: string
  }>
}

const compactToolStyle = {
  marginTop: 14,
  border: '1px solid #d9eaf2',
  borderRadius: 0,
  background: '#fff',
  overflow: 'hidden',
} as const

const compactSummaryStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 16,
  padding: '16px 18px',
  cursor: 'pointer',
  color: '#17324d',
  fontWeight: 800,
} as const

export default async function AdminSessionPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ kind?: string }> }) {
  const { id } = await params
  const query = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'content_admin' && profile?.role !== 'super_admin') redirect('/portal/dashboard')

  const { data, error } = await supabase.rpc('admin_get_session_editor', { p_session_id: id })
  if (error || !data) notFound()

  const editorData = data as EditorData
  const requestedKind = query.kind as StructuredKind | undefined
  const selectedKind: StructuredKind = requestedKind && validKinds.includes(requestedKind) ? requestedKind : 'vocabulary'
  const nextPosition = editorData.blocks.reduce((max, block) => Math.max(max, block.position), 0) + 1

  return (
    <main className={`takumi-admin-page takumi-admin-editor ${styles.editorShell}`}>
      <style>{`
        #session-material-extras { display: none; }
        #material-studio:has(button[role="tab"]:first-child[aria-selected="true"]) + #session-material-extras { display: contents; }
      `}</style>

      <div className={styles.editorTop}>
        <Link href={`/portal/admin?level=${editorData.session.level_code}`}>← Kembali ke kategori {editorData.session.level_code}</Link>
        <div className={styles.editorTopActions}>
          <Link className={styles.secondary} href={`/portal/admin/session/${editorData.session.id}/preview`}>Preview</Link>
          <Link href="/portal/dashboard">Dashboard siswa</Link>
        </div>
      </div>

      <header className={styles.editorHeader}>
        <div>
          <div className={styles.eyebrow}>{editorData.session.level_code} · CONTENT STUDIO</div>
          <h1>Isi Materi {editorData.session.level_code}</h1>
          <p>Satu kategori ditampilkan per layar agar penambahan, revisi, dan persetujuan materi dapat dikelola per item.</p>
        </div>
      </header>

      <div id="material-studio">
        <MaterialWorkflowStudio
          sessionId={editorData.session.id}
          levelCode={editorData.session.level_code}
          role={editorData.role}
          kind={selectedKind}
          blocks={editorData.blocks}
        />
      </div>

      <div id="session-material-extras">
        <details style={compactToolStyle}>
          <summary style={compactSummaryStyle}>
            <span>
              <span style={{ display: 'block', color: '#146f9f', fontSize: 10, letterSpacing: '.12em', marginBottom: 3 }}>ALAT TAMBAHAN</span>
              Bulk import materi / soal
            </span>
            <span style={{ color: '#71889a', fontSize: 12, fontWeight: 700 }}>Buka bila diperlukan</span>
          </summary>
          <div style={{ padding: '0 12px 12px' }}>
            <BulkImport sessionId={editorData.session.id} />
          </div>
        </details>

        <details style={compactToolStyle}>
          <summary style={compactSummaryStyle}>
            <span>
              <span style={{ display: 'block', color: '#146f9f', fontSize: 10, letterSpacing: '.12em', marginBottom: 3 }}>ALAT TAMBAHAN</span>
              Upload gambar atau audio
            </span>
            <span style={{ color: '#71889a', fontSize: 12, fontWeight: 700 }}>Buka bila diperlukan</span>
          </summary>
          <div style={{ padding: '0 12px 12px' }}>
            <AssetUploader sessionId={editorData.session.id} nextPosition={nextPosition} />
          </div>
        </details>
      </div>
    </main>
  )
}
