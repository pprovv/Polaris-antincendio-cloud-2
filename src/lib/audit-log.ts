import { createClient } from '@/lib/supabase/client'

type AuditLogInput = {
  aziendaId?: string | null
  azione: 'INSERT' | 'UPDATE' | 'DELETE'
  tabella: string
  recordId?: string | null
  dettagli?: Record<string, unknown> | null
}

export async function writeAuditLog({
  aziendaId = null,
  azione,
  tabella,
  recordId = null,
  dettagli = null,
}: AuditLogInput) {
  try {
    const supabase = createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const userId = user?.id ?? null
    const userEmail = user?.email ?? null

    let role: string | null = null

    if (userId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle()

      role = profile?.role ?? null
    }

    const { error } = await supabase.from('audit_log').insert({
      user_id: userId,
      user_email: userEmail,
      role,
      azienda_id: aziendaId,
      azione,
      tabella,
      record_id: recordId,
      dettagli,
    })

    if (error) {
      console.error('Audit log error:', error.message)
    }
  } catch (err) {
    console.error('Audit log unexpected error:', err)
  }
}
