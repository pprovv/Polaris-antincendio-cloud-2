'use client'

import { useEffect, useMemo, useState } from 'react'
import { jsPDF } from 'jspdf'
import { createClient } from '@/lib/supabase/client'
import { writeAuditLog } from '@/lib/audit-log'

type Scheda = {
  id: string
  titolo: string
  tipo: string
  ordine: number
}

type Azienda = {
  id: string
  ragione_sociale: string
  piva: string | null
  sede: string | null
}

type RegistrazionePayload = {
  tipo_registrazione?: string
  voci_visualizzate?: { testo: string; ordine: number }[]
  persone_presenti?: string
  descrizione?: string
  durata?: string
  osservazioni?: string
  responsabile?: string
  descrizione_nc?: string
  azione_correttiva?: string
  documentazione?: string
  verifica_finale?: string
  data_chiusura?: string
} | null

type Registrazione = {
  id: string
  data: string
  note: null
  operatore_sigla: string | null
  conferma: boolean | null
  scheda_id: string
  azienda_id: string
  payload?: RegistrazionePayload
}

type SchedaVoce = {
  id: string
  scheda_id: string
  testo: string
  ordine: number
}

type Profile = {
  id: string
  email: string | null
  azienda_id: string | null
  role: string
}

type AuditLogRow = {
  id: string
  created_at: string
  user_email: string | null
  role: string | null
  azienda_id: string | null
  azione: string
  tabella: string
  record_id: string | null
  dettagli: Record<string, unknown> | null
}


type Props = {
  initialSchede: Scheda[]
  initialSchedeVoci: SchedaVoce[]
  initialAziende: Azienda[]
  initialRegistrazioni: Registrazione[]
  initialProfiles?: Profile[]
  userRole: string
  userAziendaId: string | null
}

export default function AppClient({
  initialSchede,
  initialSchedeVoci,
  initialAziende,
  initialRegistrazioni,
  initialProfiles = [],
  userRole,
  userAziendaId,
}: Props) {
  const [schede, setSchede] = useState<Scheda[]>(initialSchede)
  const [schedeVoci, setSchedeVoci] = useState<SchedaVoce[]>(initialSchedeVoci)
  const [aziende, setAziende] = useState<Azienda[]>(initialAziende)
  const [registrazioni, setRegistrazioni] = useState<Registrazione[]>(initialRegistrazioni)
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles)
  const [auditLogs, setAuditLogs] = useState<AuditLogRow[]>([])
  const [errore, setErrore] = useState('')
  const [status, setStatus] = useState('Dati caricati correttamente')

  const isCliente = userRole === 'cliente'
  const isConsulente = userRole === 'consulente' || userRole === 'admin'

  // dettaglio azienda
  const [aziendaDettaglioId, setAziendaDettaglioId] = useState<string | null>(null)
  const [filtroDettaglioTipo, setFiltroDettaglioTipo] = useState('tutte')
  const [exportDataDa, setExportDataDa] = useState('')
  const [exportDataA, setExportDataA] = useState('')

  // form azienda
  const [aziendaInModificaId, setAziendaInModificaId] = useState<string | null>(null)
  const [ragioneSocialeAzienda, setRagioneSocialeAzienda] = useState('')
  const [pivaAzienda, setPivaAzienda] = useState('')
  const [sedeAzienda, setSedeAzienda] = useState('')

  // form registrazione
  const [aziendaSelezionata, setAziendaSelezionata] = useState('')
  const [schedaSelezionata, setSchedaSelezionata] = useState('')
  const [schedeChecklistSelezionate, setSchedeChecklistSelezionate] = useState<string[]>([])
  const [dataRegistrazione, setDataRegistrazione] = useState('')
  const [siglaOperatore, setSiglaOperatore] = useState('')

  // filtri registrazioni
  const [filtroAziendaId, setFiltroAziendaId] = useState('')
  const [filtroDataDa, setFiltroDataDa] = useState('')
  const [filtroDataA, setFiltroDataA] = useState('')

  // filtro aziende consulente
  const [filtroTestoAzienda, setFiltroTestoAzienda] = useState('')
  const [auditFiltroAziendaId, setAuditFiltroAziendaId] = useState('')
  const [auditFiltroAzione, setAuditFiltroAzione] = useState('')
  const [auditFiltroDataDa, setAuditFiltroDataDa] = useState('')
  const [auditFiltroDataA, setAuditFiltroDataA] = useState('')
  const [auditFiltroTesto, setAuditFiltroTesto] = useState('')

  // esercitazione
  const [personePresenti, setPersonePresenti] = useState('')
  const [descrizioneEsercitazione, setDescrizioneEsercitazione] = useState('')
  const [durataEsercitazione, setDurataEsercitazione] = useState('')
  const [osservazioniEsercitazione, setOsservazioniEsercitazione] = useState('')
  const [responsabileEsercitazione, setResponsabileEsercitazione] = useState('')

  // non conformità
  const [descrizioneNC, setDescrizioneNC] = useState('')
  const [azioneCorrettiva, setAzioneCorrettiva] = useState('')
  const [documentazioneNC, setDocumentazioneNC] = useState('')
  const [verificaFinaleNC, setVerificaFinaleNC] = useState('')
  const [dataChiusuraNC, setDataChiusuraNC] = useState('')

  // registrazioni
  const [registrazioneDettaglioId, setRegistrazioneDettaglioId] = useState<string | null>(null)
  const [registrazioneInModificaId, setRegistrazioneInModificaId] = useState<string | null>(null)

  useEffect(() => {
    if (isCliente && userAziendaId) {
      setAziendaSelezionata(userAziendaId)
      setFiltroAziendaId(userAziendaId)
    }
  }, [isCliente, userAziendaId])

  async function loadData() {
    try {
      const supabase = createClient()

      const { data: schedeData, error: schedeError } = await supabase
        .from('schede')
        .select('id, titolo, tipo, ordine')
        .order('ordine', { ascending: true })
      if (schedeError) throw schedeError

      const { data: schedeVociData, error: schedeVociError } = await supabase
        .from('schede_voci')
        .select('id, scheda_id, testo, ordine')
        .order('scheda_id', { ascending: true })
        .order('ordine', { ascending: true })
      if (schedeVociError) throw schedeVociError

      const { data: aziendeData, error: aziendeError } = await supabase
        .from('aziende')
        .select('id, ragione_sociale, piva, sede')
        .order('ragione_sociale', { ascending: true })
      if (aziendeError) throw aziendeError

      const { data: registrazioniData, error: registrazioniError } = await supabase
        .from('registrazioni')
        .select('id, data, note, operatore_sigla, conferma, scheda_id, azienda_id, payload')
        .order('data', { ascending: false })
      if (registrazioniError) throw registrazioniError

      let profilesData: Profile[] = []
      let auditLogsData: AuditLogRow[] = []

      if (isConsulente) {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, email, azienda_id, role')
          .order('email', { ascending: true })
        if (!error) profilesData = (data as Profile[]) || []

        const { data: auditData, error: auditError } = await supabase
          .from('audit_log')
          .select('id, created_at, user_email, role, azienda_id, azione, tabella, record_id, dettagli')
          .order('created_at', { ascending: false })
          .limit(100)

        if (!auditError) auditLogsData = (auditData as AuditLogRow[]) || []
      }

      setSchede(schedeData || [])
      setSchedeVoci(schedeVociData || [])
      setAziende(aziendeData || [])
      setRegistrazioni((registrazioniData as Registrazione[]) || [])
      setProfiles(profilesData)
      setAuditLogs(auditLogsData)
      setErrore('')
      setStatus('Dati aggiornati')
    } catch (err) {
      setErrore(err instanceof Error ? err.message : 'Errore sconosciuto')
    }
  }

  async function handleAziendaSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrore('')
    const supabase = createClient()

    const ragione_sociale = ragioneSocialeAzienda.trim()
    const piva = pivaAzienda.trim()
    const sede = sedeAzienda.trim()

    if (!ragione_sociale) {
      setErrore('La ragione sociale è obbligatoria')
      return
    }

    if (aziendaInModificaId) {
      const { error } = await supabase
        .from('aziende')
        .update({
          ragione_sociale,
          piva: piva || null,
          sede: sede || null,
        })
        .eq('id', aziendaInModificaId)

      if (error) {
        setErrore(error.message)
        return
      }

      await writeAuditLog({
        aziendaId: aziendaInModificaId,
        azione: 'UPDATE',
        tabella: 'aziende',
        recordId: aziendaInModificaId,
        dettagli: {
          ragione_sociale,
          piva: piva || null,
          sede: sede || null,
        },
      })

      resetFormAzienda()
      await loadData()
      return
    }

    const { data: nuovaAzienda, error } = await supabase
      .from('aziende')
      .insert({
        ragione_sociale,
        piva: piva || null,
        sede: sede || null,
      })
      .select('id')
      .single()

    if (error) {
      setErrore(error.message)
      return
    }

    await writeAuditLog({
      aziendaId: nuovaAzienda?.id ?? null,
      azione: 'INSERT',
      tabella: 'aziende',
      recordId: nuovaAzienda?.id ?? null,
      dettagli: {
        ragione_sociale,
        piva: piva || null,
        sede: sede || null,
      },
    })

    resetFormAzienda()
    await loadData()
  }

  function resetFormAzienda() {
    setAziendaInModificaId(null)
    setRagioneSocialeAzienda('')
    setPivaAzienda('')
    setSedeAzienda('')
  }

  function handleEditAzienda(azienda: Azienda) {
    setErrore('')
    setAziendaInModificaId(azienda.id)
    setRagioneSocialeAzienda(azienda.ragione_sociale || '')
    setPivaAzienda(azienda.piva || '')
    setSedeAzienda(azienda.sede || '')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleDeleteAzienda(id: string) {
    const ok = window.confirm(
      'Vuoi davvero cancellare questa azienda? Saranno cancellate anche le registrazioni collegate.'
    )
    if (!ok) return

    const supabase = createClient()
    const { error } = await supabase.from('aziende').delete().eq('id', id)

    if (error) {
      setErrore(error.message)
      return
    }

    await writeAuditLog({
      aziendaId: id,
      azione: 'DELETE',
      tabella: 'aziende',
      recordId: id,
      dettagli: {
        deleted: true,
      },
    })

    if (aziendaInModificaId === id) resetFormAzienda()
    if (aziendaDettaglioId === id) setAziendaDettaglioId(null)

    await loadData()
  }

  function resetFormRegistrazione() {
    setRegistrazioneInModificaId(null)
    setAziendaSelezionata(isCliente && userAziendaId ? userAziendaId : '')
    setSchedaSelezionata('')
    setSchedeChecklistSelezionate([])
    setDataRegistrazione('')
    setSiglaOperatore('')
    setPersonePresenti('')
    setDescrizioneEsercitazione('')
    setDurataEsercitazione('')
    setOsservazioniEsercitazione('')
    setResponsabileEsercitazione('')
    setDescrizioneNC('')
    setAzioneCorrettiva('')
    setDocumentazioneNC('')
    setVerificaFinaleNC('')
    setDataChiusuraNC('')
  }

  function resetFiltriRegistrazioni() {
    setFiltroAziendaId(isCliente && userAziendaId ? userAziendaId : '')
    setFiltroDataDa('')
    setFiltroDataA('')
  }

  async function handleRegistrazioneSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrore('')

    const aziendaEffettiva =
      isCliente && userAziendaId ? userAziendaId : aziendaSelezionata

    if (!aziendaEffettiva || !dataRegistrazione) {
      setErrore('Compila almeno azienda e data')
      return
    }

    const supabase = createClient()
    const schedaAttuale = schede.find((s) => s.id === schedaSelezionata)

    if (!schedaAttuale) {
      setErrore('Scheda non valida')
      return
    }

    if (schedaAttuale.tipo === 'checklist') {
      if (schedeChecklistSelezionate.length === 0) {
        setErrore('Seleziona almeno una scheda checklist')
        return
      }

      if (registrazioneInModificaId) {
        if (schedeChecklistSelezionate.length !== 1) {
          setErrore('In modifica puoi aggiornare una sola scheda checklist alla volta')
          return
        }

        const schedaId = schedeChecklistSelezionate[0]
        const vociScheda = schedeVoci
          .filter((voce) => voce.scheda_id === schedaId)
          .sort((a, b) => a.ordine - b.ordine)
          .map((voce) => ({
            testo: voce.testo,
            ordine: voce.ordine,
          }))

        const { error } = await supabase
          .from('registrazioni')
          .update({
            azienda_id: aziendaEffettiva,
            scheda_id: schedaId,
            data: dataRegistrazione,
            note: null,
            operatore_sigla: siglaOperatore || null,
            conferma: true,
            payload: {
              tipo_registrazione: 'checklist',
              voci_visualizzate: vociScheda,
            },
          })
          .eq('id', registrazioneInModificaId)

        if (error) {
          setErrore(error.message)
          return
        }

        await writeAuditLog({
          aziendaId: aziendaEffettiva,
          azione: 'UPDATE',
          tabella: 'registrazioni',
          recordId: registrazioneInModificaId,
          dettagli: {
            scheda_id: schedaId,
            data: dataRegistrazione,
            operatore_sigla: siglaOperatore || null,
            tipo_registrazione: 'checklist',
          },
        })

        resetFormRegistrazione()
        await loadData()
        return
      }

      const payloads = schedeChecklistSelezionate.map((schedaId) => {
        const vociScheda = schedeVoci
          .filter((voce) => voce.scheda_id === schedaId)
          .sort((a, b) => a.ordine - b.ordine)
          .map((voce) => ({
            testo: voce.testo,
            ordine: voce.ordine,
          }))

        return {
          azienda_id: aziendaEffettiva,
          scheda_id: schedaId,
          data: dataRegistrazione,
          note: null,
          operatore_sigla: siglaOperatore || null,
          conferma: true,
          payload: {
            tipo_registrazione: 'checklist',
            voci_visualizzate: vociScheda,
          },
        }
      })

      const { data: insertedChecklistRows, error } = await supabase
        .from('registrazioni')
        .insert(payloads)
        .select('id, azienda_id, scheda_id, data, operatore_sigla')

      if (error) {
        setErrore(error.message)
        return
      }

      for (const row of insertedChecklistRows || []) {
        await writeAuditLog({
          aziendaId: row.azienda_id,
          azione: 'INSERT',
          tabella: 'registrazioni',
          recordId: row.id,
          dettagli: {
            scheda_id: row.scheda_id,
            data: row.data,
            operatore_sigla: row.operatore_sigla ?? null,
            tipo_registrazione: 'checklist',
          },
        })
      }

      resetFormRegistrazione()
      await loadData()
      return
    }

    if (schedaAttuale.tipo === 'esercitazione') {
      if (!descrizioneEsercitazione.trim()) {
        setErrore("Inserisci almeno la descrizione dell'esercitazione")
        return
      }

      const values = {
        azienda_id: aziendaEffettiva,
        scheda_id: schedaSelezionata,
        data: dataRegistrazione,
        note: null,
        operatore_sigla: siglaOperatore || null,
        conferma: true,
        payload: {
          tipo_registrazione: 'esercitazione',
          persone_presenti: personePresenti || '',
          descrizione: descrizioneEsercitazione || '',
          durata: durataEsercitazione || '',
          osservazioni: osservazioniEsercitazione || '',
          responsabile: responsabileEsercitazione || '',
        },
      }

      const query = registrazioneInModificaId
        ? supabase
            .from('registrazioni')
            .update(values)
            .eq('id', registrazioneInModificaId)
            .select('id, azienda_id, scheda_id, data, operatore_sigla')
            .single()
        : supabase
            .from('registrazioni')
            .insert(values)
            .select('id, azienda_id, scheda_id, data, operatore_sigla')
            .single()

      const { data: esercitazioneRow, error } = await query

      if (error) {
        setErrore(error.message)
        return
      }

      await writeAuditLog({
        aziendaId: esercitazioneRow?.azienda_id ?? aziendaEffettiva,
        azione: registrazioneInModificaId ? 'UPDATE' : 'INSERT',
        tabella: 'registrazioni',
        recordId: esercitazioneRow?.id ?? registrazioneInModificaId,
        dettagli: {
          scheda_id: esercitazioneRow?.scheda_id ?? schedaSelezionata,
          data: esercitazioneRow?.data ?? dataRegistrazione,
          operatore_sigla: esercitazioneRow?.operatore_sigla ?? (siglaOperatore || null),
          tipo_registrazione: 'esercitazione',
          persone_presenti: personePresenti || '',
          descrizione: descrizioneEsercitazione || '',
          durata: durataEsercitazione || '',
          osservazioni: osservazioniEsercitazione || '',
          responsabile: responsabileEsercitazione || '',
        },
      })

      resetFormRegistrazione()
      await loadData()
      return
    }

    if (schedaAttuale.tipo === 'nc') {
      if (!descrizioneNC.trim()) {
        setErrore('Inserisci la descrizione della non conformità')
        return
      }

      const values = {
        azienda_id: aziendaEffettiva,
        scheda_id: schedaSelezionata,
        data: dataRegistrazione,
        note: null,
        operatore_sigla: siglaOperatore || null,
        conferma: true,
        payload: {
          tipo_registrazione: 'non_conformita',
          descrizione_nc: descrizioneNC || '',
          azione_correttiva: azioneCorrettiva || '',
          documentazione: documentazioneNC || '',
          verifica_finale: verificaFinaleNC || '',
          data_chiusura: dataChiusuraNC || '',
        },
      }

      const query = registrazioneInModificaId
        ? supabase
            .from('registrazioni')
            .update(values)
            .eq('id', registrazioneInModificaId)
            .select('id, azienda_id, scheda_id, data, operatore_sigla')
            .single()
        : supabase
            .from('registrazioni')
            .insert(values)
            .select('id, azienda_id, scheda_id, data, operatore_sigla')
            .single()

      const { data: ncRow, error } = await query

      if (error) {
        setErrore(error.message)
        return
      }

      await writeAuditLog({
        aziendaId: ncRow?.azienda_id ?? aziendaEffettiva,
        azione: registrazioneInModificaId ? 'UPDATE' : 'INSERT',
        tabella: 'registrazioni',
        recordId: ncRow?.id ?? registrazioneInModificaId,
        dettagli: {
          scheda_id: ncRow?.scheda_id ?? schedaSelezionata,
          data: ncRow?.data ?? dataRegistrazione,
          operatore_sigla: ncRow?.operatore_sigla ?? (siglaOperatore || null),
          tipo_registrazione: 'non_conformita',
          descrizione_nc: descrizioneNC || '',
          azione_correttiva: azioneCorrettiva || '',
          documentazione: documentazioneNC || '',
          verifica_finale: verificaFinaleNC || '',
          data_chiusura: dataChiusuraNC || '',
        },
      })

      resetFormRegistrazione()
      await loadData()
    }
  }

  async function handleDeleteRegistrazione(id: string) {
    const ok = window.confirm('Vuoi davvero cancellare questa registrazione?')
    if (!ok) return

    const regDaCancellare = registrazioni.find((r) => r.id === id) || null

    const supabase = createClient()
    const { error } = await supabase.from('registrazioni').delete().eq('id', id)

    if (error) {
      setErrore(error.message)
      return
    }

    await writeAuditLog({
      aziendaId: regDaCancellare?.azienda_id ?? null,
      azione: 'DELETE',
      tabella: 'registrazioni',
      recordId: id,
      dettagli: {
        scheda_id: regDaCancellare?.scheda_id ?? null,
        data: regDaCancellare?.data ?? null,
        operatore_sigla: regDaCancellare?.operatore_sigla ?? null,
      },
    })

    if (registrazioneDettaglioId === id) setRegistrazioneDettaglioId(null)
    if (registrazioneInModificaId === id) resetFormRegistrazione()

    await loadData()
  }

  function handleEditRegistrazione(reg: Registrazione) {
    setErrore('')
    setRegistrazioneInModificaId(reg.id)
    setAziendaSelezionata(reg.azienda_id)
    setSchedaSelezionata(reg.scheda_id)
    setDataRegistrazione(reg.data)
    setSiglaOperatore(reg.operatore_sigla || '')

    setSchedeChecklistSelezionate([])
    setPersonePresenti('')
    setDescrizioneEsercitazione('')
    setDurataEsercitazione('')
    setOsservazioniEsercitazione('')
    setResponsabileEsercitazione('')
    setDescrizioneNC('')
    setAzioneCorrettiva('')
    setDocumentazioneNC('')
    setVerificaFinaleNC('')
    setDataChiusuraNC('')

    const scheda = schede.find((s) => s.id === reg.scheda_id)
    const payload = reg.payload || null

    if (scheda?.tipo === 'checklist') {
      setSchedeChecklistSelezionate([reg.scheda_id])
    }

    if (scheda?.tipo === 'esercitazione' && payload) {
      setPersonePresenti(payload.persone_presenti || '')
      setDescrizioneEsercitazione(payload.descrizione || '')
      setDurataEsercitazione(payload.durata || '')
      setOsservazioniEsercitazione(payload.osservazioni || '')
      setResponsabileEsercitazione(payload.responsabile || '')
    }

    if (scheda?.tipo === 'nc' && payload) {
      setDescrizioneNC(payload.descrizione_nc || '')
      setAzioneCorrettiva(payload.azione_correttiva || '')
      setDocumentazioneNC(payload.documentazione || '')
      setVerificaFinaleNC(payload.verifica_finale || '')
      setDataChiusuraNC(payload.data_chiusura || '')
    }

    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const aziendeVisibili = useMemo(() => {
    if (!isCliente) return aziende
    return aziende.filter((a) => a.id === userAziendaId)
  }, [aziende, isCliente, userAziendaId])

  const registrazioniVisibiliBase = useMemo(() => {
    if (!isCliente) return registrazioni
    return registrazioni.filter((r) => r.azienda_id === userAziendaId)
  }, [registrazioni, isCliente, userAziendaId])

  const aziendeFiltrateConsulente = useMemo(() => {
    if (!filtroTestoAzienda.trim()) return aziendeVisibili
    const q = filtroTestoAzienda.toLowerCase().trim()
    return aziendeVisibili.filter((a) =>
      [a.ragione_sociale, a.piva || '', a.sede || '']
        .join(' ')
        .toLowerCase()
        .includes(q)
    )
  }, [aziendeVisibili, filtroTestoAzienda])

  function nomeAzienda(id: string) {
    return aziende.find((a) => a.id === id)?.ragione_sociale || id
  }

  function nomeScheda(id: string) {
    return schede.find((s) => s.id === id)?.titolo || id
  }

  function formatDateTime(value: string) {
    if (!value) return '—'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleString('it-IT')
  }

  function formatDateOnly(value: string) {
    if (!value) return '—'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleDateString('it-IT')
  }

  function auditActionLabel(value: string) {
    switch (value) {
      case 'INSERT':
        return 'Creazione'
      case 'UPDATE':
        return 'Modifica'
      case 'DELETE':
        return 'Eliminazione'
      default:
        return value
    }
  }

  function auditTableLabel(value: string) {
    switch (value) {
      case 'registrazioni':
        return 'Registro controlli'
      case 'aziende':
        return 'Anagrafica aziende'
      case 'audit_log':
        return 'Storico attività'
      default:
        return value
    }
  }

  function auditActionBadgeClass(value: string) {
    switch (value) {
      case 'INSERT':
        return 'bg-green-100 text-green-800'
      case 'UPDATE':
        return 'bg-amber-100 text-amber-800'
      case 'DELETE':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-slate-100 text-slate-700'
    }
  }

  function auditDettagliSintesi(log: AuditLogRow) {
    const dettagli = log.dettagli || {}
    const tipoRegistrazione = typeof dettagli.tipo_registrazione === 'string' ? dettagli.tipo_registrazione : null
    const schedaId = typeof dettagli.scheda_id === 'string' ? dettagli.scheda_id : null

    if (log.tabella === 'registrazioni') {
      const pezzi: string[] = []
      if (schedaId) pezzi.push(nomeScheda(schedaId))
      if (tipoRegistrazione === 'checklist') pezzi.push('Checklist')
      if (tipoRegistrazione === 'esercitazione') pezzi.push('Esercitazione')
      if (tipoRegistrazione === 'non_conformita') pezzi.push('Non conformità')
      if (typeof dettagli.operatore_sigla === 'string' && dettagli.operatore_sigla) {
        pezzi.push(`Operatore ${dettagli.operatore_sigla}`)
      }
      return pezzi.length ? pezzi.join(' • ') : 'Operazione su registrazione'
    }

    if (log.tabella === 'aziende') {
      if (typeof dettagli.ragione_sociale === 'string' && dettagli.ragione_sociale) {
        return dettagli.ragione_sociale
      }
      return log.azienda_id ? nomeAzienda(log.azienda_id) : 'Operazione su azienda'
    }

    return '—'
  }

  function ultimaRegistrazioneAzienda(aziendaId: string) {
    const reg = registrazioni
      .filter((r) => r.azienda_id === aziendaId)
      .sort((a, b) => b.data.localeCompare(a.data))[0]
    return reg?.data || '—'
  }

  function ultimaSchedaAzienda(aziendaId: string) {
    const reg = registrazioni
      .filter((r) => r.azienda_id === aziendaId)
      .sort((a, b) => b.data.localeCompare(a.data))[0]
    return reg ? nomeScheda(reg.scheda_id) : '—'
  }

  function sanitizeFileName(value: string) {
    return value
      .replace(/[\\/:*?"<>|]/g, '-')
      .replace(/\s+/g, '_')
      .trim()
  }

  function splitText(doc: jsPDF, text: string, maxWidth = 170) {
    return doc.splitTextToSize(text || '-', maxWidth)
  }

  function drawWrappedBlock(
    doc: jsPDF,
    label: string,
    value: string,
    y: number,
    options?: { indent?: number; lineHeight?: number; maxWidth?: number }
  ) {
    const indent = options?.indent ?? 14
    const lineHeight = options?.lineHeight ?? 6
    const maxWidth = options?.maxWidth ?? 170

    doc.setFont('helvetica', 'bold')
    doc.text(label, 14, y)
    doc.setFont('helvetica', 'normal')

    const lines = splitText(doc, value, maxWidth)
    let currentY = y + lineHeight
    lines.forEach((line: string) => {
      doc.text(line, indent, currentY)
      currentY += lineHeight
    })

    return currentY + 2
  }

  function createBasePdf(title: string, reg: Registrazione) {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const azienda = nomeAzienda(reg.azienda_id)
    const scheda = nomeScheda(reg.scheda_id)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.text('Registro sorveglianza antincendio', 14, 18)

    doc.setFontSize(13)
    doc.text(title, 14, 27)

    doc.setDrawColor(180)
    doc.line(14, 31, 196, 31)

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Azienda: ${azienda}`, 14, 40)
    doc.text(`Scheda: ${scheda}`, 14, 46)
    doc.text(`Data: ${reg.data}`, 14, 52)
    doc.text(`Sigla operatore: ${reg.operatore_sigla || '-'}`, 120, 40)

    return { doc, azienda, scheda }
  }

  function exportChecklistPdf(reg: Registrazione) {
    const { doc, azienda, scheda } = createBasePdf('Scheda di registrazione checklist', reg)
    let y = 64

    doc.setFont('helvetica', 'bold')
    doc.text('Controlli previsti', 14, y)
    y += 8

    doc.setFont('helvetica', 'normal')
    const voci = reg.payload?.voci_visualizzate || []

    if (voci.length === 0) {
      doc.text('Nessun controllo disponibile.', 14, y)
      y += 8
    } else {
      voci.forEach((voce, index) => {
        const lines = splitText(doc, `${index + 1}. ${voce.testo}`, 175)

        if (y > 270) {
          doc.addPage()
          y = 20
        }

        lines.forEach((line: string) => {
          doc.text(line, 16, y)
          y += 6
        })
        y += 2
      })
    }

    if (y > 250) {
      doc.addPage()
      y = 20
    }

    y += 6
    doc.line(14, y, 80, y)
    doc.line(120, y, 186, y)
    doc.setFontSize(9)
    doc.text('Firma operatore', 14, y + 5)
    doc.text('Firma responsabile', 120, y + 5)

    const fileName = sanitizeFileName(`Checklist_${reg.data}_${azienda}_${scheda}.pdf`)
    doc.save(fileName)
  }

  function exportEsercitazionePdf(reg: Registrazione) {
    const { doc, azienda, scheda } = createBasePdf('Verbale esercitazione antincendio', reg)
    let y = 64
    const p = reg.payload || {}

    y = drawWrappedBlock(doc, 'Persone presenti:', p.persone_presenti || '-', y)
    y = drawWrappedBlock(doc, 'Descrizione esercitazione:', p.descrizione || '-', y)
    y = drawWrappedBlock(doc, 'Durata:', p.durata || '-', y)
    y = drawWrappedBlock(doc, 'Osservazioni:', p.osservazioni || '-', y)
    y = drawWrappedBlock(doc, 'Responsabile:', p.responsabile || '-', y)

    if (y > 250) {
      doc.addPage()
      y = 20
    }

    y += 10
    doc.line(14, y, 80, y)
    doc.line(120, y, 186, y)
    doc.setFontSize(9)
    doc.text('Firma operatore', 14, y + 5)
    doc.text('Firma responsabile', 120, y + 5)

    const fileName = sanitizeFileName(`Esercitazione_${reg.data}_${azienda}_${scheda}.pdf`)
    doc.save(fileName)
  }

  function exportNonConformitaPdf(reg: Registrazione) {
    const { doc, azienda, scheda } = createBasePdf('Scheda registrazione non conformità', reg)
    let y = 64
    const p = reg.payload || {}

    y = drawWrappedBlock(doc, 'Descrizione non conformità:', p.descrizione_nc || '-', y)
    y = drawWrappedBlock(doc, 'Azione correttiva:', p.azione_correttiva || '-', y)
    y = drawWrappedBlock(doc, 'Documentazione prodotta:', p.documentazione || '-', y)
    y = drawWrappedBlock(doc, 'Verifica finale:', p.verifica_finale || '-', y)
    y = drawWrappedBlock(doc, 'Data chiusura:', p.data_chiusura || '-', y)

    if (y > 250) {
      doc.addPage()
      y = 20
    }

    y += 10
    doc.line(14, y, 80, y)
    doc.line(120, y, 186, y)
    doc.setFontSize(9)
    doc.text('Firma operatore', 14, y + 5)
    doc.text('Firma responsabile', 120, y + 5)

    const fileName = sanitizeFileName(`NonConformita_${reg.data}_${azienda}_${scheda}.pdf`)
    doc.save(fileName)
  }

  function exportRegistrazionePdf(reg: Registrazione) {
    const tipo = reg.payload?.tipo_registrazione

    if (tipo === 'checklist') {
      exportChecklistPdf(reg)
      return
    }

    if (tipo === 'esercitazione') {
      exportEsercitazionePdf(reg)
      return
    }

    if (tipo === 'non_conformita') {
      exportNonConformitaPdf(reg)
      return
    }

    const { doc, azienda, scheda } = createBasePdf('Scheda registrazione', reg)
    doc.text('Formato registrazione non riconosciuto.', 14, 64)
    const fileName = sanitizeFileName(`Registrazione_${reg.data}_${azienda}_${scheda}.pdf`)
    doc.save(fileName)
  }

  function getRegistrazioniAziendaPerRange(aziendaId: string, dataDa: string, dataA: string) {
    return registrazioni
      .filter((r) => r.azienda_id === aziendaId)
      .filter((r) => {
        if (dataDa && r.data < dataDa) return false
        if (dataA && r.data > dataA) return false
        return true
      })
      .sort((a, b) => a.data.localeCompare(b.data))
  }

  function exportAziendaRangePdf() {
    if (!aziendaDettaglio) {
      setErrore('Nessuna azienda selezionata')
      return
    }

    const regs = getRegistrazioniAziendaPerRange(
      aziendaDettaglio.id,
      exportDataDa,
      exportDataA
    )

    if (regs.length === 0) {
      setErrore('Nessuna registrazione trovata per il range di date selezionato')
      return
    }

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const azienda = aziendaDettaglio.ragione_sociale
    const titoloFile = sanitizeFileName(
      `Registro_Azienda_${azienda}_${exportDataDa || 'inizio'}_${exportDataA || 'fine'}.pdf`
    )

    regs.forEach((reg, index) => {
      if (index > 0) doc.addPage()

      const scheda = nomeScheda(reg.scheda_id)
      const tipo = reg.payload?.tipo_registrazione || 'registrazione'

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(16)
      doc.text('Registro sorveglianza antincendio', 14, 18)

      doc.setDrawColor(180)
      doc.line(14, 24, 196, 24)

      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')

    doc.text(`Azienda: ${azienda}`, 14, 34)

    const schedaLines = doc.splitTextToSize(`Scheda: ${scheda}`, 100)
    doc.text(schedaLines, 14, 40)

    const ySchedaEnd = 40 + schedaLines.length * 6

    doc.text(`Data: ${reg.data}`, 14, ySchedaEnd + 6)

    doc.text(`Tipo: ${tipo}`, 120, 34)
    doc.text(`Sigla operatore: ${reg.operatore_sigla || '-'}`, 120, 40)

let y = ySchedaEnd + 16

      if (tipo === 'checklist') {
        doc.setFont('helvetica', 'bold')
        doc.text('Controlli previsti', 14, y)
        y += 8
        doc.setFont('helvetica', 'normal')

        const voci = reg.payload?.voci_visualizzate || []
        if (voci.length === 0) {
          doc.text('Nessun controllo disponibile.', 14, y)
          y += 8
        } else {
          voci.forEach((voce, idx) => {
            const lines = splitText(doc, `${idx + 1}. ${voce.testo}`, 175)
            lines.forEach((line: string) => {
              if (y > 280) {
                doc.addPage()
                y = 20
              }
              doc.text(line, 16, y)
              y += 6
            })
            y += 2
          })
        }
      } else if (tipo === 'esercitazione') {
        const p = reg.payload || {}
        y = drawWrappedBlock(doc, 'Persone presenti:', p.persone_presenti || '-', y)
        y = drawWrappedBlock(doc, 'Descrizione esercitazione:', p.descrizione || '-', y)
        y = drawWrappedBlock(doc, 'Durata:', p.durata || '-', y)
        y = drawWrappedBlock(doc, 'Osservazioni:', p.osservazioni || '-', y)
        y = drawWrappedBlock(doc, 'Responsabile:', p.responsabile || '-', y)
      } else if (tipo === 'non_conformita') {
        const p = reg.payload || {}
        y = drawWrappedBlock(doc, 'Descrizione non conformità:', p.descrizione_nc || '-', y)
        y = drawWrappedBlock(doc, 'Azione correttiva:', p.azione_correttiva || '-', y)
        y = drawWrappedBlock(doc, 'Documentazione prodotta:', p.documentazione || '-', y)
        y = drawWrappedBlock(doc, 'Verifica finale:', p.verifica_finale || '-', y)
        y = drawWrappedBlock(doc, 'Data chiusura:', p.data_chiusura || '-', y)
      } else {
        doc.text('Formato registrazione non riconosciuto.', 14, y)
        y += 8
      }

      if (y > 250) {
        doc.addPage()
        y = 20
      }

      y += 10
      doc.line(14, y, 80, y)
      doc.line(120, y, 186, y)
      doc.setFontSize(9)
      doc.text('Firma operatore', 14, y + 5)
      doc.text('Firma responsabile', 120, y + 5)
    })

    doc.save(titoloFile)
  }

  const aziendaDettaglio = useMemo(() => {
    return aziende.find((a) => a.id === aziendaDettaglioId) || null
  }, [aziende, aziendaDettaglioId])

  const registrazioniAziendaDettaglio = useMemo(() => {
    if (!aziendaDettaglioId) return []

    const base = registrazioni
      .filter((r) => r.azienda_id === aziendaDettaglioId)
      .sort((a, b) => b.data.localeCompare(a.data))

    if (filtroDettaglioTipo === 'tutte') return base

    if (filtroDettaglioTipo === 'checklist') {
      return base.filter((r) => r.payload?.tipo_registrazione === 'checklist')
    }

    if (filtroDettaglioTipo === 'esercitazione') {
      return base.filter((r) => r.payload?.tipo_registrazione === 'esercitazione')
    }

    if (filtroDettaglioTipo === 'non_conformita') {
      return base.filter((r) => r.payload?.tipo_registrazione === 'non_conformita')
    }

    return base
  }, [registrazioni, aziendaDettaglioId, filtroDettaglioTipo])

  const totaleNonConformitaAziendaDettaglio = registrazioni
    .filter((r) => r.azienda_id === aziendaDettaglioId)
    .filter((r) => r.payload?.tipo_registrazione === 'non_conformita').length

  const ultimaRegistrazioneDettaglio =
    registrazioni
      .filter((r) => r.azienda_id === aziendaDettaglioId)
      .sort((a, b) => b.data.localeCompare(a.data))[0] || null

  const schedaAttuale = useMemo(() => {
    return schede.find((s) => s.id === schedaSelezionata)
  }, [schedaSelezionata, schede])

  const checklistSchede = useMemo(() => {
    return schede.filter((s) => s.tipo === 'checklist')
  }, [schede])

  const schedeChecklistDaMostrare = useMemo(() => {
    if (schedaAttuale?.tipo !== 'checklist') return []
    return checklistSchede.filter((s) => schedeChecklistSelezionate.includes(s.id))
  }, [schedaAttuale, checklistSchede, schedeChecklistSelezionate])

  const registrazioneDettaglio = useMemo(() => {
    return registrazioniVisibiliBase.find((r) => r.id === registrazioneDettaglioId) || null
  }, [registrazioneDettaglioId, registrazioniVisibiliBase])

  const registrazioniFiltrate = useMemo(() => {
    return registrazioniVisibiliBase.filter((reg) => {
      if (filtroAziendaId && reg.azienda_id !== filtroAziendaId) return false
      if (filtroDataDa && reg.data < filtroDataDa) return false
      if (filtroDataA && reg.data > filtroDataA) return false
      return true
    })
  }, [registrazioniVisibiliBase, filtroAziendaId, filtroDataDa, filtroDataA])

  const totaleAziende = aziende.length
  const totaleRegistrazioni = registrazioni.length
  const totaleClientiCollegati = profiles.filter((p) => p.role === 'cliente').length
  const totaleNonConformita = registrazioni.filter(
    (r) => r.payload?.tipo_registrazione === 'non_conformita'
  ).length

  const ultime5Registrazioni = [...registrazioni].slice(0, 5)

  const aziendeDaMonitorare = useMemo(() => {
    return [...aziende]
      .map((azienda) => ({
        ...azienda,
        ultimaData: ultimaRegistrazioneAzienda(azienda.id),
        ultimaScheda: ultimaSchedaAzienda(azienda.id),
      }))
      .sort((a, b) => {
        if (a.ultimaData === '—' && b.ultimaData === '—') return 0
        if (a.ultimaData === '—') return -1
        if (b.ultimaData === '—') return 1
        return a.ultimaData.localeCompare(b.ultimaData)
      })
      .slice(0, 5)
  }, [aziende, registrazioni])

  const auditLogsFiltrati = useMemo(() => {
    return auditLogs.filter((log) => {
      if (auditFiltroAziendaId && log.azienda_id !== auditFiltroAziendaId) return false
      if (auditFiltroAzione && log.azione !== auditFiltroAzione) return false

      const logDate = log.created_at ? log.created_at.slice(0, 10) : ''
      if (auditFiltroDataDa && logDate < auditFiltroDataDa) return false
      if (auditFiltroDataA && logDate > auditFiltroDataA) return false

      if (auditFiltroTesto.trim()) {
        const q = auditFiltroTesto.toLowerCase().trim()
        const searchable = [
          log.user_email || '',
          log.role || '',
          log.azione || '',
          auditActionLabel(log.azione),
          log.tabella || '',
          auditTableLabel(log.tabella),
          log.record_id || '',
          log.azienda_id ? nomeAzienda(log.azienda_id) : '',
          auditDettagliSintesi(log),
        ]
          .join(' ')
          .toLowerCase()

        if (!searchable.includes(q)) return false
      }

      return true
    })
  }, [auditLogs, auditFiltroAziendaId, auditFiltroAzione, auditFiltroDataDa, auditFiltroDataA, auditFiltroTesto, aziende, schede])

  function resetAuditFiltri() {
    setAuditFiltroAziendaId('')
    setAuditFiltroAzione('')
    setAuditFiltroDataDa('')
    setAuditFiltroDataA('')
    setAuditFiltroTesto('')
  }

  return (
    <>
      <p className="mt-4 text-slate-700">{status}</p>

      {registrazioneInModificaId && (
        <div className="mt-4 rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
          Stai modificando una registrazione esistente.
        </div>
      )}

      {errore && (
        <div className="mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">
          {errore}
        </div>
      )}

      {isConsulente && (
        <div className="mt-8">
          <h2 className="mb-4 text-2xl font-semibold text-slate-800">
            Dashboard consulente
          </h2>

          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <div className="text-sm text-slate-500">Aziende gestite</div>
              <div className="mt-2 text-3xl font-bold text-slate-900">{totaleAziende}</div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <div className="text-sm text-slate-500">Registrazioni totali</div>
              <div className="mt-2 text-3xl font-bold text-slate-900">{totaleRegistrazioni}</div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <div className="text-sm text-slate-500">Clienti collegati</div>
              <div className="mt-2 text-3xl font-bold text-slate-900">{totaleClientiCollegati}</div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <div className="text-sm text-slate-500">Non conformità registrate</div>
              <div className="mt-2 text-3xl font-bold text-slate-900">{totaleNonConformita}</div>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="text-lg font-semibold text-slate-800">Ultime 5 registrazioni</h3>
              <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
                <table className="min-w-full border-collapse">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700">Data</th>
                      <th className="border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700">Azienda</th>
                      <th className="border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700">Scheda</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ultime5Registrazioni.length > 0 ? (
                      ultime5Registrazioni.map((reg) => (
                        <tr key={reg.id} className="odd:bg-white even:bg-slate-50">
                          <td className="border-b border-slate-200 px-4 py-3 text-sm text-slate-800">{reg.data}</td>
                          <td className="border-b border-slate-200 px-4 py-3 text-sm text-slate-800">{nomeAzienda(reg.azienda_id)}</td>
                          <td className="border-b border-slate-200 px-4 py-3 text-sm text-slate-800">{nomeScheda(reg.scheda_id)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="px-4 py-4 text-sm text-slate-500">
                          Nessuna registrazione disponibile
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="text-lg font-semibold text-slate-800">Aziende da monitorare</h3>
              <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
                <table className="min-w-full border-collapse">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700">Azienda</th>
                      <th className="border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700">Ultima data</th>
                      <th className="border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700">Ultima scheda</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aziendeDaMonitorare.length > 0 ? (
                      aziendeDaMonitorare.map((azienda) => (
                        <tr key={azienda.id} className="odd:bg-white even:bg-slate-50">
                          <td className="border-b border-slate-200 px-4 py-3 text-sm text-slate-800">{azienda.ragione_sociale}</td>
                          <td className="border-b border-slate-200 px-4 py-3 text-sm text-slate-800">{azienda.ultimaData}</td>
                          <td className="border-b border-slate-200 px-4 py-3 text-sm text-slate-800">{azienda.ultimaScheda}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="px-4 py-4 text-sm text-slate-500">
                          Nessuna azienda disponibile
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Storico attività</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Ultime 100 operazioni registrate nell'audit log, con filtri rapidi e descrizioni più leggibili.
                </p>
              </div>

              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
                Totale visibili: {auditLogsFiltrati.length}
              </span>
            </div>

            <div className="mt-4 grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-5">
              <select
                value={auditFiltroAziendaId}
                onChange={(e) => setAuditFiltroAziendaId(e.target.value)}
                className="rounded border border-slate-300 p-3"
              >
                <option value="">Tutte le aziende</option>
                {aziende.map((az) => (
                  <option key={az.id} value={az.id}>
                    {az.ragione_sociale}
                  </option>
                ))}
              </select>

              <select
                value={auditFiltroAzione}
                onChange={(e) => setAuditFiltroAzione(e.target.value)}
                className="rounded border border-slate-300 p-3"
              >
                <option value="">Tutte le azioni</option>
                <option value="INSERT">Creazioni</option>
                <option value="UPDATE">Modifiche</option>
                <option value="DELETE">Eliminazioni</option>
              </select>

              <input
                type="date"
                value={auditFiltroDataDa}
                onChange={(e) => setAuditFiltroDataDa(e.target.value)}
                className="rounded border border-slate-300 p-3"
              />

              <input
                type="date"
                value={auditFiltroDataA}
                onChange={(e) => setAuditFiltroDataA(e.target.value)}
                className="rounded border border-slate-300 p-3"
              />

              <button
                type="button"
                onClick={resetAuditFiltri}
                className="rounded bg-slate-200 px-4 py-3 text-slate-800"
              >
                Reset filtri
              </button>

              <input
                type="text"
                value={auditFiltroTesto}
                onChange={(e) => setAuditFiltroTesto(e.target.value)}
                placeholder="Cerca per utente, azienda, record o dettaglio"
                className="rounded border border-slate-300 p-3 md:col-span-5"
              />
            </div>

            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
              <table className="min-w-full border-collapse">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700">Quando</th>
                    <th className="border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700">Utente</th>
                    <th className="border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700">Azienda</th>
                    <th className="border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700">Operazione</th>
                    <th className="border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700">Ambito</th>
                    <th className="border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700">Dettaglio</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogsFiltrati.length > 0 ? (
                    auditLogsFiltrati.map((log) => (
                      <tr key={log.id} className="odd:bg-white even:bg-slate-50 align-top">
                        <td className="border-b border-slate-200 px-4 py-3 text-sm text-slate-800">
                          <div className="font-medium">{formatDateTime(log.created_at)}</div>
                          <div className="mt-1 text-xs text-slate-500">{formatDateOnly(log.created_at)}</div>
                        </td>
                        <td className="border-b border-slate-200 px-4 py-3 text-sm text-slate-800">
                          <div className="font-medium">{log.user_email || '—'}</div>
                          <div className="mt-1 text-xs text-slate-500">Ruolo: {log.role || '—'}</div>
                        </td>
                        <td className="border-b border-slate-200 px-4 py-3 text-sm text-slate-800">
                          {log.azienda_id ? nomeAzienda(log.azienda_id) : '—'}
                        </td>
                        <td className="border-b border-slate-200 px-4 py-3 text-sm">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${auditActionBadgeClass(log.azione)}`}>
                            {auditActionLabel(log.azione)}
                          </span>
                        </td>
                        <td className="border-b border-slate-200 px-4 py-3 text-sm text-slate-800">
                          <div className="font-medium">{auditTableLabel(log.tabella)}</div>
                          <div className="mt-1 text-xs text-slate-500">Record: {log.record_id || '—'}</div>
                        </td>
                        <td className="border-b border-slate-200 px-4 py-3 text-sm text-slate-800">
                          {auditDettagliSintesi(log)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-4 text-sm text-slate-500">
                        Nessuna attività trovata con i filtri selezionati.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8">
        <h2 className="mb-4 text-xl font-semibold text-slate-800">Schede</h2>
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="min-w-full border-collapse">
            <thead className="bg-slate-100">
              <tr>
                <th className="border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700">ID</th>
                <th className="border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700">Titolo</th>
                <th className="border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700">Tipo</th>
                <th className="border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700">Ordine</th>
              </tr>
            </thead>
            <tbody>
              {schede.map((scheda) => (
                <tr key={scheda.id} className="odd:bg-white even:bg-slate-50">
                  <td className="border-b border-slate-200 px-4 py-3 text-sm text-slate-800">{scheda.id}</td>
                  <td className="border-b border-slate-200 px-4 py-3 text-sm text-slate-800">{scheda.titolo}</td>
                  <td className="border-b border-slate-200 px-4 py-3 text-sm text-slate-800">{scheda.tipo}</td>
                  <td className="border-b border-slate-200 px-4 py-3 text-sm text-slate-800">{scheda.ordine}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isConsulente && (
        <>
          <div className="mt-10">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-xl font-semibold text-slate-800">Aziende</h2>
              <input
                type="text"
                value={filtroTestoAzienda}
                onChange={(e) => setFiltroTestoAzienda(e.target.value)}
                placeholder="Cerca azienda, P.IVA o sede"
                className="w-full rounded border border-slate-300 p-3 md:w-80"
              />
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="min-w-full border-collapse">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700">
                      Ragione sociale
                    </th>
                    <th className="border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700">
                      P.IVA
                    </th>
                    <th className="border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700">
                      Sede
                    </th>
                    <th className="border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700">
                      Ultima registrazione
                    </th>
                    <th className="border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700">
                      Azioni
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {aziendeFiltrateConsulente.length > 0 ? (
                    aziendeFiltrateConsulente.map((az) => (
                      <tr key={az.id} className="odd:bg-white even:bg-slate-50">
                        <td className="border-b border-slate-200 px-4 py-3 text-sm text-slate-800">
                          {az.ragione_sociale}
                        </td>
                        <td className="border-b border-slate-200 px-4 py-3 text-sm text-slate-800">
                          {az.piva || '—'}
                        </td>
                        <td className="border-b border-slate-200 px-4 py-3 text-sm text-slate-800">
                          {az.sede || '—'}
                        </td>
                        <td className="border-b border-slate-200 px-4 py-3 text-sm text-slate-800">
                          {ultimaRegistrazioneAzienda(az.id)}
                        </td>
                        <td className="border-b border-slate-200 px-4 py-3 text-sm">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setFiltroDettaglioTipo('tutte')
                                setAziendaDettaglioId((prev) => (prev === az.id ? null : az.id))
                              }}
                              className="rounded bg-slate-200 px-3 py-1 text-slate-800"
                            >
                              Dettaglio
                            </button>

                            <button
                              type="button"
                              onClick={() => handleEditAzienda(az)}
                              className="rounded bg-amber-500 px-3 py-1 text-white"
                            >
                              Modifica
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteAzienda(az.id)}
                              className="rounded bg-red-600 px-3 py-1 text-white"
                            >
                              Cancella
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={5}
                        className="border-b border-slate-200 px-4 py-4 text-sm text-slate-500"
                      >
                        Nessuna azienda trovata
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {aziendaDettaglio && (
              <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-semibold text-slate-800">
                      Dettaglio azienda
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Vista operativa completa della singola azienda
                    </p>
                  </div>

                  <div className="flex flex-wrap items-end gap-3">
                    <div>
                      <label className="mb-1 block text-xs text-slate-500">Data da</label>
                      <input
                        type="date"
                        value={exportDataDa}
                        onChange={(e) => setExportDataDa(e.target.value)}
                        className="rounded border border-slate-300 bg-white px-3 py-2 text-sm"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs text-slate-500">Data a</label>
                      <input
                        type="date"
                        value={exportDataA}
                        onChange={(e) => setExportDataA(e.target.value)}
                        className="rounded border border-slate-300 bg-white px-3 py-2 text-sm"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={exportAziendaRangePdf}
                      className="rounded bg-indigo-600 px-4 py-2 text-white"
                    >
                      Esporta PDF range
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setAziendaSelezionata(aziendaDettaglio.id)
                        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
                      }}
                      className="rounded bg-blue-600 px-4 py-2 text-white"
                    >
                      Nuova registrazione per questa azienda
                    </button>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-4">
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="text-sm text-slate-500">Ragione sociale</div>
                    <div className="mt-2 text-base font-semibold text-slate-900">
                      {aziendaDettaglio.ragione_sociale}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="text-sm text-slate-500">P.IVA</div>
                    <div className="mt-2 text-base font-semibold text-slate-900">
                      {aziendaDettaglio.piva || '—'}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="text-sm text-slate-500">Sede</div>
                    <div className="mt-2 text-base font-semibold text-slate-900">
                      {aziendaDettaglio.sede || '—'}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="text-sm text-slate-500">Ultima registrazione</div>
                    <div className="mt-2 text-base font-semibold text-slate-900">
                      {ultimaRegistrazioneAzienda(aziendaDettaglio.id)}
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-4">
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="text-sm text-slate-500">Ultima scheda</div>
                    <div className="mt-2 text-base font-semibold text-slate-900">
                      {ultimaSchedaAzienda(aziendaDettaglio.id)}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="text-sm text-slate-500">Totale registrazioni</div>
                    <div className="mt-2 text-2xl font-bold text-slate-900">
                      {registrazioni.filter((r) => r.azienda_id === aziendaDettaglio.id).length}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="text-sm text-slate-500">Non conformità</div>
                    <div className="mt-2 text-2xl font-bold text-slate-900">
                      {totaleNonConformitaAziendaDettaglio}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="text-sm text-slate-500">Ultimo operatore</div>
                    <div className="mt-2 text-base font-semibold text-slate-900">
                      {ultimaRegistrazioneDettaglio?.operatore_sigla || '—'}
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <h4 className="text-lg font-semibold text-slate-800">
                      Storico registrazioni azienda
                    </h4>

                    <select
                      value={filtroDettaglioTipo}
                      onChange={(e) => setFiltroDettaglioTipo(e.target.value)}
                      className="rounded border border-slate-300 bg-white px-3 py-2 text-sm"
                    >
                      <option value="tutte">Tutte</option>
                      <option value="checklist">Solo checklist</option>
                      <option value="esercitazione">Solo esercitazioni</option>
                      <option value="non_conformita">Solo non conformità</option>
                    </select>
                  </div>

                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <table className="min-w-full border-collapse">
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700">
                            Data
                          </th>
                          <th className="border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700">
                            Scheda
                          </th>
                          <th className="border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700">
                            Sigla
                          </th>
                          <th className="border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700">
                            Note
                          </th>
                          <th className="border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700">
                            PDF
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {registrazioniAziendaDettaglio.length > 0 ? (
                          registrazioniAziendaDettaglio.map((reg) => (
                            <tr key={reg.id} className="odd:bg-white even:bg-slate-50">
                              <td className="border-b border-slate-200 px-4 py-3 text-sm text-slate-800">
                                {reg.data}
                              </td>
                              <td className="border-b border-slate-200 px-4 py-3 text-sm text-slate-800">
                                {nomeScheda(reg.scheda_id)}
                              </td>
                              <td className="border-b border-slate-200 px-4 py-3 text-sm text-slate-800">
                                {reg.operatore_sigla || '—'}
                              </td>
                              <td className="border-b border-slate-200 px-4 py-3 text-sm">
                                <button
                                  type="button"
                                  onClick={() => exportRegistrazionePdf(reg)}
                                  className="rounded bg-blue-600 px-3 py-1 text-white"
                                >
                                  PDF
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td
                              colSpan={5}
                              className="px-4 py-4 text-sm text-slate-500"
                            >
                              Nessuna registrazione presente per questa azienda
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-10">
            <h2 className="mb-4 text-xl font-semibold text-slate-800">
              {aziendaInModificaId ? 'Modifica Azienda' : 'Nuova Azienda'}
            </h2>

            <form
              onSubmit={handleAziendaSubmit}
              className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-3"
            >
              <input
                value={ragioneSocialeAzienda}
                onChange={(e) => setRagioneSocialeAzienda(e.target.value)}
                placeholder="Ragione sociale"
                className="rounded border border-slate-300 p-3"
              />
              <input
                value={pivaAzienda}
                onChange={(e) => setPivaAzienda(e.target.value)}
                placeholder="P.IVA"
                className="rounded border border-slate-300 p-3"
              />
              <input
                value={sedeAzienda}
                onChange={(e) => setSedeAzienda(e.target.value)}
                placeholder="Sede"
                className="rounded border border-slate-300 p-3"
              />

              <div className="flex gap-3 md:col-span-3">
                <button className="rounded bg-blue-600 px-4 py-3 text-white">
                  {aziendaInModificaId ? 'Aggiorna azienda' : 'Salva azienda'}
                </button>

                <button
                  type="button"
                  onClick={resetFormAzienda}
                  className="rounded bg-slate-200 px-4 py-3 text-slate-800"
                >
                  Pulisci campi
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {isCliente && aziendeVisibili.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-4 text-xl font-semibold text-slate-800">La tua azienda</h2>
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="min-w-full border-collapse">
              <thead className="bg-slate-100">
                <tr>
                  <th className="border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700">
                    Ragione sociale
                  </th>
                  <th className="border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700">
                    P.IVA
                  </th>
                  <th className="border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700">
                    Sede
                  </th>
                  <th className="border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700">
                    Ultima registrazione
                  </th>
                </tr>
              </thead>
              <tbody>
                {aziendeVisibili.map((az) => (
                  <tr key={az.id} className="odd:bg-white even:bg-slate-50">
                    <td className="border-b border-slate-200 px-4 py-3 text-sm text-slate-800">
                      {az.ragione_sociale}
                    </td>
                    <td className="border-b border-slate-200 px-4 py-3 text-sm text-slate-800">
                      {az.piva || '—'}
                    </td>
                    <td className="border-b border-slate-200 px-4 py-3 text-sm text-slate-800">
                      {az.sede || '—'}
                    </td>
                    <td className="border-b border-slate-200 px-4 py-3 text-sm text-slate-800">
                      {ultimaRegistrazioneAzienda(az.id)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-10">
        <h2 className="mb-4 text-xl font-semibold text-slate-800">Nuova Registrazione</h2>

        <form
          onSubmit={handleRegistrazioneSubmit}
          className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2"
        >
          <select
            value={aziendaSelezionata}
            onChange={(e) => setAziendaSelezionata(e.target.value)}
            disabled={isCliente}
            className="rounded border border-slate-300 p-3 disabled:bg-slate-100"
          >
            <option value="">Seleziona azienda</option>
            {aziendeVisibili.map((az) => (
              <option key={az.id} value={az.id}>
                {az.ragione_sociale}
              </option>
            ))}
          </select>

          <select
            value={schedaSelezionata}
            onChange={(e) => {
              setSchedaSelezionata(e.target.value)
              setSchedeChecklistSelezionate([])
            }}
            className="rounded border border-slate-300 p-3"
          >
            <option value="">Seleziona tipologia scheda</option>
            {schede.map((scheda) => (
              <option key={scheda.id} value={scheda.id}>
                {scheda.titolo}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={dataRegistrazione}
            onChange={(e) => setDataRegistrazione(e.target.value)}
            className="rounded border border-slate-300 p-3"
          />

          <input
            type="text"
            placeholder="Sigla operatore"
            value={siglaOperatore}
            onChange={(e) => setSiglaOperatore(e.target.value)}
            className="rounded border border-slate-300 p-3"
          />

          {schedaAttuale?.tipo === 'checklist' && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 md:col-span-2">
              <h3 className="text-lg font-semibold text-slate-800">Schede checklist da registrare</h3>
              <p className="mt-1 text-sm text-slate-600">
                Seleziona una o più schede. Le relative voci saranno mostrate sotto come promemoria.
              </p>

              <div className="mt-4 grid gap-2 md:grid-cols-2">
                {checklistSchede.map((scheda) => (
                  <label
                    key={scheda.id}
                    className="flex items-start gap-3 rounded-lg border border-slate-200 p-3"
                  >
                    <input
                      type="checkbox"
                      checked={schedeChecklistSelezionate.includes(scheda.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSchedeChecklistSelezionate((prev) =>
                            Array.from(new Set([...prev, scheda.id]))
                          )
                        } else {
                          setSchedeChecklistSelezionate((prev) =>
                            prev.filter((id) => id !== scheda.id)
                          )
                        }
                      }}
                      className="mt-1"
                    />
                    <span className="text-sm text-slate-700">{scheda.titolo}</span>
                  </label>
                ))}
              </div>

              {schedeChecklistDaMostrare.length > 0 && (
                <div className="mt-6 space-y-4">
                  {schedeChecklistDaMostrare.map((scheda) => {
                    const voci = schedeVoci
                      .filter((voce) => voce.scheda_id === scheda.id)
                      .sort((a, b) => a.ordine - b.ordine)

                    return (
                      <div key={scheda.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                        <h4 className="font-semibold text-slate-800">{scheda.titolo}</h4>
                        {voci.length > 0 ? (
                          <ul className="mt-3 list-disc space-y-2 pl-6 text-sm text-slate-700">
                            {voci.map((voce) => (
                              <li key={voce.id}>{voce.testo}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-3 text-sm text-slate-500">Nessuna voce presente per questa scheda.</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {schedaAttuale?.tipo === 'esercitazione' && (
            <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 md:col-span-2 md:grid-cols-2">
              <div className="md:col-span-2">
                <h3 className="text-lg font-semibold text-slate-800">Dati esercitazione antincendio</h3>
              </div>

              <textarea
                placeholder="Persone presenti all’esercitazione"
                value={personePresenti}
                onChange={(e) => setPersonePresenti(e.target.value)}
                className="rounded border border-slate-300 p-3 md:col-span-2"
              />

              <textarea
                placeholder="Descrizione dell’esercitazione"
                value={descrizioneEsercitazione}
                onChange={(e) => setDescrizioneEsercitazione(e.target.value)}
                className="rounded border border-slate-300 p-3 md:col-span-2"
              />

              <input
                type="text"
                placeholder="Durata esercitazione"
                value={durataEsercitazione}
                onChange={(e) => setDurataEsercitazione(e.target.value)}
                className="rounded border border-slate-300 p-3"
              />

              <input
                type="text"
                placeholder="Responsabile esercitazione"
                value={responsabileEsercitazione}
                onChange={(e) => setResponsabileEsercitazione(e.target.value)}
                className="rounded border border-slate-300 p-3"
              />

              <textarea
                placeholder="Osservazioni"
                value={osservazioniEsercitazione}
                onChange={(e) => setOsservazioniEsercitazione(e.target.value)}
                className="rounded border border-slate-300 p-3 md:col-span-2"
              />
            </div>
          )}

          {schedaAttuale?.tipo === 'nc' && (
            <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 md:col-span-2 md:grid-cols-2">
              <div className="md:col-span-2">
                <h3 className="text-lg font-semibold text-slate-800">Dati non conformità</h3>
              </div>

              <textarea
                placeholder="Descrizione della non conformità"
                value={descrizioneNC}
                onChange={(e) => setDescrizioneNC(e.target.value)}
                className="rounded border border-slate-300 p-3 md:col-span-2"
              />

              <textarea
                placeholder="Azione correttiva intrapresa"
                value={azioneCorrettiva}
                onChange={(e) => setAzioneCorrettiva(e.target.value)}
                className="rounded border border-slate-300 p-3 md:col-span-2"
              />

              <textarea
                placeholder="Eventuale documentazione prodotta"
                value={documentazioneNC}
                onChange={(e) => setDocumentazioneNC(e.target.value)}
                className="rounded border border-slate-300 p-3 md:col-span-2"
              />

              <textarea
                placeholder="Verifica finale"
                value={verificaFinaleNC}
                onChange={(e) => setVerificaFinaleNC(e.target.value)}
                className="rounded border border-slate-300 p-3"
              />

              <input
                type="date"
                value={dataChiusuraNC}
                onChange={(e) => setDataChiusuraNC(e.target.value)}
                className="rounded border border-slate-300 p-3"
              />
            </div>
          )}

          <div className="flex gap-3 md:col-span-2">
            <button className="rounded bg-green-600 px-4 py-3 text-white">
              {registrazioneInModificaId ? 'Aggiorna registrazione' : 'Salva registrazione'}
            </button>
            <button
              type="button"
              onClick={resetFormRegistrazione}
              className="rounded bg-slate-200 px-4 py-3 text-slate-800"
            >
              Pulisci campi
            </button>
          </div>
        </form>
      </div>

      <div className="mt-10">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-slate-800">Ultime Registrazioni</h2>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
            Totale visibili: {registrazioniFiltrate.length}
          </span>
        </div>

        <div className="mb-4 grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-4">
          <select
            value={filtroAziendaId}
            onChange={(e) => setFiltroAziendaId(e.target.value)}
            disabled={isCliente}
            className="rounded border border-slate-300 p-3 disabled:bg-slate-100"
          >
            <option value="">Tutte le aziende</option>
            {aziendeVisibili.map((az) => (
              <option key={az.id} value={az.id}>
                {az.ragione_sociale}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={filtroDataDa}
            onChange={(e) => setFiltroDataDa(e.target.value)}
            className="rounded border border-slate-300 p-3"
          />

          <input
            type="date"
            value={filtroDataA}
            onChange={(e) => setFiltroDataA(e.target.value)}
            className="rounded border border-slate-300 p-3"
          />

          <button
            type="button"
            onClick={resetFiltriRegistrazioni}
            className="rounded bg-slate-200 px-4 py-3 text-slate-800"
          >
            Reset filtri
          </button>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="min-w-full border-collapse">
            <thead className="bg-slate-100">
              <tr>
                <th className="border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700">Data</th>
                <th className="border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700">Azienda</th>
                <th className="border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700">Scheda</th>
                <th className="border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700">Sigla</th>
                <th className="border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700">Note</th>
                <th className="border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {registrazioniFiltrate.length > 0 ? (
                registrazioniFiltrate.map((reg) => (
                  <tr key={reg.id} className="odd:bg-white even:bg-slate-50">
                    <td className="border-b border-slate-200 px-4 py-3 text-sm text-slate-800">{reg.data}</td>
                    <td className="border-b border-slate-200 px-4 py-3 text-sm text-slate-800">{nomeAzienda(reg.azienda_id)}</td>
                    <td className="border-b border-slate-200 px-4 py-3 text-sm text-slate-800">{nomeScheda(reg.scheda_id)}</td>
                    <td className="border-b border-slate-200 px-4 py-3 text-sm text-slate-800">{reg.operatore_sigla || '—'}</td>
                    <td className="border-b border-slate-200 px-4 py-3 text-sm">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setRegistrazioneDettaglioId(
                              registrazioneDettaglioId === reg.id ? null : reg.id
                            )
                          }
                          className="rounded bg-slate-200 px-3 py-1 text-slate-800"
                        >
                          Dettagli
                        </button>

                        <button
                          type="button"
                          onClick={() => handleEditRegistrazione(reg)}
                          className="rounded bg-amber-500 px-3 py-1 text-white"
                        >
                          Modifica
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteRegistrazione(reg.id)}
                          className="rounded bg-red-600 px-3 py-1 text-white"
                        >
                          Cancella
                        </button>

                        <button
                          type="button"
                          onClick={() => exportRegistrazionePdf(reg)}
                          className="rounded bg-blue-600 px-3 py-1 text-white"
                        >
                          PDF
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="border-b border-slate-200 px-4 py-4 text-sm text-slate-500">
                    Nessuna registrazione trovata con i filtri selezionati
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {registrazioneDettaglio && (
          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-slate-800">Dettagli registrazione</h3>
              <button
                type="button"
                onClick={() => exportRegistrazionePdf(registrazioneDettaglio)}
                className="rounded bg-blue-600 px-3 py-2 text-white"
              >
                Esporta PDF
              </button>
            </div>

            <div className="mt-3 space-y-2 text-sm text-slate-700">
              <div><strong>Data:</strong> {registrazioneDettaglio.data}</div>
              <div><strong>Azienda:</strong> {nomeAzienda(registrazioneDettaglio.azienda_id)}</div>
              <div><strong>Scheda:</strong> {nomeScheda(registrazioneDettaglio.scheda_id)}</div>
              <div><strong>Sigla operatore:</strong> {registrazioneDettaglio.operatore_sigla || '—'}</div>
              <div><strong>Note:</strong> {registrazioneDettaglio.note || '—'}</div>
            </div>

            {registrazioneDettaglio.payload?.tipo_registrazione === 'checklist' && (
              <div className="mt-4">
                <h4 className="font-semibold text-slate-800">Voci checklist</h4>
                {registrazioneDettaglio.payload.voci_visualizzate?.length ? (
                  <ul className="mt-2 list-disc space-y-1 pl-6 text-sm text-slate-700">
                    {registrazioneDettaglio.payload.voci_visualizzate.map((voce, idx) => (
                      <li key={idx}>{voce.testo}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">Nessuna voce disponibile.</p>
                )}
              </div>
            )}

            {registrazioneDettaglio.payload?.tipo_registrazione === 'esercitazione' && (
              <div className="mt-4 space-y-2 text-sm text-slate-700">
                <h4 className="font-semibold text-slate-800">Dati esercitazione</h4>
                <div><strong>Persone presenti:</strong> {registrazioneDettaglio.payload.persone_presenti || '—'}</div>
                <div><strong>Descrizione:</strong> {registrazioneDettaglio.payload.descrizione || '—'}</div>
                <div><strong>Durata:</strong> {registrazioneDettaglio.payload.durata || '—'}</div>
                <div><strong>Osservazioni:</strong> {registrazioneDettaglio.payload.osservazioni || '—'}</div>
                <div><strong>Responsabile:</strong> {registrazioneDettaglio.payload.responsabile || '—'}</div>
              </div>
            )}

            {registrazioneDettaglio.payload?.tipo_registrazione === 'non_conformita' && (
              <div className="mt-4 space-y-2 text-sm text-slate-700">
                <h4 className="font-semibold text-slate-800">Dati non conformità</h4>
                <div><strong>Descrizione NC:</strong> {registrazioneDettaglio.payload.descrizione_nc || '—'}</div>
                <div><strong>Azione correttiva:</strong> {registrazioneDettaglio.payload.azione_correttiva || '—'}</div>
                <div><strong>Documentazione:</strong> {registrazioneDettaglio.payload.documentazione || '—'}</div>
                <div><strong>Verifica finale:</strong> {registrazioneDettaglio.payload.verifica_finale || '—'}</div>
                <div><strong>Data chiusura:</strong> {registrazioneDettaglio.payload.data_chiusura || '—'}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}