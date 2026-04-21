import AppClient from '@/components/app-client'
import LogoutButton from '@/components/logout-button'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  const userId = user?.id ?? null

  const { data: profile, error: profileError } = userId
    ? await supabase
        .from('profiles')
        .select('id, email, azienda_id, role')
        .eq('id', userId)
        .maybeSingle()
    : { data: null, error: null }

  console.log('USER:', user)
  console.log('USER ERROR:', userError)
  console.log('USER ID:', userId)
  console.log('PROFILE:', profile)
  console.log('PROFILE ERROR:', profileError)

  const { data: schede = [] } = await supabase
    .from('schede')
    .select('id, titolo, tipo, ordine')
    .order('ordine', { ascending: true })

  const { data: schedeVoci = [] } = await supabase
    .from('schede_voci')
    .select('id, scheda_id, testo, ordine')
    .order('scheda_id', { ascending: true })
    .order('ordine', { ascending: true })

  const { data: aziende = [] } = await supabase
    .from('aziende')
    .select('id, ragione_sociale, piva, sede')
    .order('ragione_sociale', { ascending: true })

  const { data: registrazioni = [] } = await supabase
    .from('registrazioni')
    .select('id, data, note, operatore_sigla, conferma, scheda_id, azienda_id, payload')
    .order('data', { ascending: false })

  return (
    <main className="min-h-screen bg-slate-100 p-10">
      <div className="mx-auto max-w-6xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Polaris Registro Antincendio Cloud
            </h1>
            <p className="mt-2 text-slate-600">
              Accesso effettuato come: {user?.email ?? 'utente non rilevato'}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Ruolo: {profile?.role ?? 'non configurato'}
            </p>
          </div>

          <LogoutButton />
        </div>

        <AppClient
          initialSchede={schede}
          initialSchedeVoci={schedeVoci}
          initialAziende={aziende}
          initialRegistrazioni={registrazioni}
          userRole={profile?.role ?? 'cliente'}
          userAziendaId={profile?.azienda_id ?? null}
        />
      </div>
    </main>
  )
}