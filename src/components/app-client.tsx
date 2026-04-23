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

type Scadenza = {
  id: string
  azienda_id: string
  titolo: string
  descrizione: string | null
  categoria: string
  data: string
  stato: string | null
  priorita: string
  origine: string
  ricorrenza: string
  completata_il: string | null
  completata_da: string | null
  note: string | null
  collegata_a_registrazione_id: string | null
  attiva: boolean
  created_at: string
  updated_at: string
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
  const [scadenze, setScadenze] = useState<Scadenza[]>([])
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

  // scadenze
  const [scadenzaInModificaId, setScadenzaInModificaId] = useState<string | null>(null)
  const [scadenzaAziendaId, setScadenzaAziendaId] = useState('')
  const [titoloScadenza, setTitoloScadenza] = useState('')
  const [descrizioneScadenza, setDescrizioneScadenza] = useState('')
  const [categoriaScadenza, setCategoriaScadenza] = useState('antincendio')
  const [dataScadenza, setDataScadenza] = useState('')
  const [prioritaScadenza, setPrioritaScadenza] = useState('media')
  const [ricorrenzaScadenza, setRicorrenzaScadenza] = useState('nessuna')
  const [noteScadenza, setNoteScadenza] = useState('')
  const [filtroScadenzaAziendaId, setFiltroScadenzaAziendaId] = useState('')
  const [filtroScadenzaStato, setFiltroScadenzaStato] = useState('tutte')
  const [filtroScadenzaRicerca, setFiltroScadenzaRicerca] = useState('')

  useEffect(() => {
    if (isCliente && userAziendaId) {
      setAziendaSelezionata(userAziendaId)
      setFiltroAziendaId(userAziendaId)
      setScadenzaAziendaId(userAziendaId)
      setFiltroScadenzaAziendaId(userAziendaId)
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

      const { data: scadenzeData, error: scadenzeError } = await supabase
        .from('scadenze')
        .select(
          'id, azienda_id, titolo, descrizione, categoria, data, stato, priorita, origine, ricorrenza, completata_il, completata_da, note, collegata_a_registrazione_id, attiva, created_at, updated_at'
        )
        .eq('attiva', true)
        .order('data', { ascending: true })
      if (scadenzeError) throw scadenzeError

      let profilesData: Profile[] = []
      if (isConsulente) {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, email, azienda_id, role')
          .order('email', { ascending: true })
        if (!error) profilesData = (data as Profile[]) || []
      }

      setSchede(schedeData || [])
      setSchedeVoci(schedeVociData || [])
      setAziende(aziendeData || [])
      setRegistrazioni((registrazioniData as Registrazione[]) || [])
      setScadenze((scadenzeData as Scadenza[]) || [])
      setProfiles(profilesData)
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

      resetFormAzienda()
      await loadData()
      return
    }

    const { error } = await supabase.from('aziende').insert({
      ragione_sociale,
      piva: piva || null,
      sede: sede || null,
    })

    if (error) {
      setErrore(error.message)
      return
    }

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

  function resetFormScadenza() {
    setScadenzaInModificaId(null)
    setScadenzaAziendaId(isCliente && userAziendaId ? userAziendaId : '')
    setTitoloScadenza('')
    setDescrizioneScadenza('')
    setCategoriaScadenza('antincendio')
    setDataScadenza('')
    setPrioritaScadenza('media')
    setRicorrenzaScadenza('nessuna')
    setNoteScadenza('')
  }

  async function handleScadenzaSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrore('')

    const aziendaEffettiva = isCliente && userAziendaId ? userAziendaId : scadenzaAziendaId

    if (!aziendaEffettiva || !titoloScadenza.trim() || !dataScadenza) {
      setErrore('Compila azienda, titolo e data della scadenza')
      return
    }

    const supabase = createClient()

    const values = {
      azienda_id: aziendaEffettiva,
      titolo: titoloScadenza.trim(),
      descrizione: descrizioneScadenza.trim() || null,
      categoria: categoriaScadenza,
      data: dataScadenza,
      stato: 'da_fare',
      priorita: prioritaScadenza,
      origine: 'manuale',
      ricorrenza: ricorrenzaScadenza,
      note: noteScadenza.trim() || null,
      attiva: true,
    }

    const query = scadenzaInModificaId
      ? supabase
          .from('scadenze')
          .update(values)
          .eq('id', scadenzaInModificaId)
          .select('id, azienda_id, titolo, data, stato, priorita, categoria, ricorrenza')
          .single()
      : supabase
          .from('scadenze')
          .insert(values)
          .select('id, azienda_id, titolo, data, stato, priorita, categoria, ricorrenza')
          .single()

    const { data: scadenzaRow, error } = await query

    if (error) {
      setErrore(error.message)
      return
    }

    await writeAuditLog({
      aziendaId: scadenzaRow?.azienda_id ?? aziendaEffettiva,
      azione: scadenzaInModificaId ? 'UPDATE' : 'INSERT',
      tabella: 'scadenze',
      recordId: scadenzaRow?.id ?? scadenzaInModificaId,
      dettagli: {
        titolo: scadenzaRow?.titolo ?? titoloScadenza.trim(),
        data: scadenzaRow?.data ?? dataScadenza,
        stato: scadenzaRow?.stato ?? 'da_fare',
        priorita: scadenzaRow?.priorita ?? prioritaScadenza,
        categoria: scadenzaRow?.categoria ?? categoriaScadenza,
        ricorrenza: scadenzaRow?.ricorrenza ?? ricorrenzaScadenza,
        descrizione: descrizioneScadenza.trim() || null,
        note: noteScadenza.trim() || null,
      },
    })

    setStatus(scadenzaInModificaId ? 'Scadenza aggiornata' : 'Scadenza salvata')
    resetFormScadenza()
    await loadData()
  }

  function handleEditScadenza(scadenza: Scadenza) {
    setErrore('')
    setScadenzaInModificaId(scadenza.id)
    setScadenzaAziendaId(scadenza.azienda_id)
    setTitoloScadenza(scadenza.titolo || '')
    setDescrizioneScadenza(scadenza.descrizione || '')
    setCategoriaScadenza(scadenza.categoria || 'antincendio')
    setDataScadenza(scadenza.data || '')
    setPrioritaScadenza(scadenza.priorita || 'media')
    setRicorrenzaScadenza(scadenza.ricorrenza || 'nessuna')
    setNoteScadenza(scadenza.note || '')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function addMonthsIsoDate(baseDate: string, monthsToAdd: number) {
    const [year, month, day] = baseDate.split('-').map(Number)
    const firstOfTargetMonth = new Date(Date.UTC(year, (month - 1) + monthsToAdd, 1))
    const lastDayOfTargetMonth = new Date(
      Date.UTC(firstOfTargetMonth.getUTCFullYear(), firstOfTargetMonth.getUTCMonth() + 1, 0)
    ).getUTCDate()
    const safeDay = Math.min(day, lastDayOfTargetMonth)
    const result = new Date(
      Date.UTC(firstOfTargetMonth.getUTCFullYear(), firstOfTargetMonth.getUTCMonth(), safeDay)
    )
    return result.toISOString().slice(0, 10)
  }

  function getProssimaDataScadenza(dataBase: string, ricorrenza: string) {
    switch (ricorrenza) {
      case 'mensile':
        return addMonthsIsoDate(dataBase, 1)
      case 'trimestrale':
        return addMonthsIsoDate(dataBase, 3)
      case 'semestrale':
        return addMonthsIsoDate(dataBase, 6)
      case 'annuale':
        return addMonthsIsoDate(dataBase, 12)
      default:
        return null
    }
  }

  async function handleCompletaScadenza(id: string) {
    const scadenzaDaCompletare = scadenze.find((s) => s.id === id) || null

    if (!scadenzaDaCompletare) {
      setErrore('Scadenza non trovata')
      return
    }

    if (scadenzaDaCompletare.stato === 'completata') {
      setStatus('Scadenza già completata')
      return
    }

    const completataIl = new Date().toISOString()
    const supabase = createClient()

    const { error } = await supabase
      .from('scadenze')
      .update({
        stato: 'completata',
        completata_il: completataIl,
      })
      .eq('id', id)

    if (error) {
      setErrore(error.message)
      return
    }

    await writeAuditLog({
      aziendaId: scadenzaDaCompletare.azienda_id,
      azione: 'UPDATE',
      tabella: 'scadenze',
      recordId: id,
      dettagli: {
        titolo: scadenzaDaCompletare.titolo,
        data: scadenzaDaCompletare.data,
        stato_precedente: scadenzaDaCompletare.stato ?? null,
        nuovo_stato: 'completata',
        completata_il: completataIl,
      },
    })

    const prossimaData = getProssimaDataScadenza(
      scadenzaDaCompletare.data,
      scadenzaDaCompletare.ricorrenza
    )

    if (prossimaData) {
      const nuovaScadenzaValues = {
        azienda_id: scadenzaDaCompletare.azienda_id,
        titolo: scadenzaDaCompletare.titolo,
        descrizione: scadenzaDaCompletare.descrizione,
        categoria: scadenzaDaCompletare.categoria,
        data: prossimaData,
        stato: 'da_fare',
        priorita: scadenzaDaCompletare.priorita,
        origine: 'automatica',
        ricorrenza: scadenzaDaCompletare.ricorrenza,
        note: scadenzaDaCompletare.note,
        collegata_a_registrazione_id: null,
        attiva: true,
        completata_il: null,
        completata_da: null,
      }

      const { data: nuovaScadenza, error: insertError } = await supabase
        .from('scadenze')
        .insert(nuovaScadenzaValues)
        .select('id, azienda_id, titolo, data, stato, priorita, categoria, ricorrenza, origine')
        .single()

      if (insertError) {
        setErrore(`Scadenza completata, ma errore nella generazione automatica: ${insertError.message}`)
        await loadData()
        return
      }

      await writeAuditLog({
        aziendaId: nuovaScadenza?.azienda_id ?? scadenzaDaCompletare.azienda_id,
        azione: 'INSERT',
        tabella: 'scadenze',
        recordId: nuovaScadenza?.id ?? null,
        dettagli: {
          titolo: nuovaScadenza?.titolo ?? scadenzaDaCompletare.titolo,
          data: nuovaScadenza?.data ?? prossimaData,
          stato: nuovaScadenza?.stato ?? 'da_fare',
          priorita: nuovaScadenza?.priorita ?? scadenzaDaCompletare.priorita,
          categoria: nuovaScadenza?.categoria ?? scadenzaDaCompletare.categoria,
          ricorrenza: nuovaScadenza?.ricorrenza ?? scadenzaDaCompletare.ricorrenza,
          origine: nuovaScadenza?.origine ?? 'automatica',
          generata_da_scadenza_id: scadenzaDaCompletare.id,
          data_origine: scadenzaDaCompletare.data,
        },
      })

      setStatus('Scadenza completata e nuova scadenza automatica generata')
      await loadData()
      return
    }

    setStatus('Scadenza completata')
    await loadData()
  }

  async function handleAnnullaScadenza(id: string) {
    const ok = window.confirm('Vuoi annullare questa scadenza?')
    if (!ok) return

    const scadenzaDaAnnullare = scadenze.find((s) => s.id === id) || null

    const supabase = createClient()
    const { error } = await supabase
      .from('scadenze')
      .update({ stato: 'annullata' })
      .eq('id', id)

    if (error) {
      setErrore(error.message)
      return
    }

    await writeAuditLog({
      aziendaId: scadenzaDaAnnullare?.azienda_id ?? null,
      azione: 'UPDATE',
      tabella: 'scadenze',
      recordId: id,
      dettagli: {
        titolo: scadenzaDaAnnullare?.titolo ?? null,
        data: scadenzaDaAnnullare?.data ?? null,
        stato_precedente: scadenzaDaAnnullare?.stato ?? null,
        nuovo_stato: 'annullata',
      },
    })

    setStatus('Scadenza annullata')
    await loadData()
  }

  function getStatoScadenzaVisuale(scadenza: Scadenza) {
    if (scadenza.stato === 'completata') return 'completata'
    if (scadenza.stato === 'annullata') return 'annullata'

    const oggi = new Date()
    oggi.setHours(0, 0, 0, 0)
    const data = new Date(`${scadenza.data}T00:00:00`)

    if (data.getTime() < oggi.getTime()) return 'scaduta'

    const diffGiorni = Math.ceil((data.getTime() - oggi.getTime()) / (1000 * 60 * 60 * 24))
    if (diffGiorni <= 7) return 'in_scadenza'

    return 'da_fare'
  }

  function resetFiltriScadenze() {
    setFiltroScadenzaAziendaId(isCliente && userAziendaId ? userAziendaId : '')
    setFiltroScadenzaStato('tutte')
    setFiltroScadenzaRicerca('')
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

      const { error } = await supabase.from('registrazioni').insert(payloads)

      if (error) {
        setErrore(error.message)
        return
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
        ? supabase.from('registrazioni').update(values).eq('id', registrazioneInModificaId)
        : supabase.from('registrazioni').insert(values)

      const { error } = await query

      if (error) {
        setErrore(error.message)
        return
      }

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
        ? supabase.from('registrazioni').update(values).eq('id', registrazioneInModificaId)
        : supabase.from('registrazioni').insert(values)

      const { error } = await query

      if (error) {
        setErrore(error.message)
        return
      }

      resetFormRegistrazione()
      await loadData()
    }
  }

  async function handleDeleteRegistrazione(id: string) {
    const ok = window.confirm('Vuoi davvero cancellare questa registrazione?')
    if (!ok) return

    const supabase = createClient()
    const { error } = await supabase.from('registrazioni').delete().eq('id', id)

    if (error) {
      setErrore(error.message)
      return
    }

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
    doc.setFontSize(9)
    doc.text('Firma operatore', 14, y + 5)

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
    doc.setFontSize(9)
    doc.text('Firma operatore', 14, y + 5)

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
    doc.setFontSize(9)
    doc.text('Firma operatore', 14, y + 5)

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

  const scadenzeVisibiliBase = useMemo(() => {
    if (!isCliente) return scadenze
    return scadenze.filter((s) => s.azienda_id === userAziendaId)
  }, [scadenze, isCliente, userAziendaId])

  const scadenzeFiltrate = useMemo(() => {
    return scadenzeVisibiliBase.filter((scadenza) => {
      if (filtroScadenzaAziendaId && scadenza.azienda_id !== filtroScadenzaAziendaId) return false

      const statoVisuale = getStatoScadenzaVisuale(scadenza)
      if (filtroScadenzaStato !== 'tutte' && statoVisuale !== filtroScadenzaStato) return false

      if (filtroScadenzaRicerca.trim()) {
        const q = filtroScadenzaRicerca.toLowerCase().trim()
        const haystack = [
          scadenza.titolo,
          scadenza.descrizione || '',
          scadenza.categoria || '',
          scadenza.note || '',
          nomeAzienda(scadenza.azienda_id),
        ]
          .join(' ')
          .toLowerCase()

        if (!haystack.includes(q)) return false
      }

      return true
    })
  }, [
    scadenzeVisibiliBase,
    filtroScadenzaAziendaId,
    filtroScadenzaStato,
    filtroScadenzaRicerca,
    aziende,
  ])

  const totaleScadenze = scadenze.length
  const totaleScadenzeScadute = scadenzeVisibiliBase.filter(
    (s) => getStatoScadenzaVisuale(s) === 'scaduta'
  ).length
  const totaleScadenzeInScadenza = scadenzeVisibiliBase.filter(
    (s) => getStatoScadenzaVisuale(s) === 'in_scadenza'
  ).length
  const totaleScadenzeCompletate = scadenzeVisibiliBase.filter(
    (s) => getStatoScadenzaVisuale(s) === 'completata'
  ).length

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

          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <div className="text-sm text-slate-500">Scadenze totali</div>
              <div className="mt-2 text-3xl font-bold text-slate-900">{totaleScadenze}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <div className="text-sm text-slate-500">Scadenze scadute</div>
              <div className="mt-2 text-3xl font-bold text-red-600">{totaleScadenzeScadute}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <div className="text-sm text-slate-500">In scadenza (7 gg)</div>
              <div className="mt-2 text-3xl font-bold text-amber-600">{totaleScadenzeInScadenza}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <div className="text-sm text-slate-500">Completate</div>
              <div className="mt-2 text-3xl font-bold text-green-600">{totaleScadenzeCompletate}</div>
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
        </div>
      )}

      <div className="mt-10">
        <h2 className="mb-4 text-xl font-semibold text-slate-800">Gestione Scadenze</h2>

        {scadenzaInModificaId && (
          <div className="mb-4 rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
            Stai modificando una scadenza esistente.
          </div>
        )}

        <form
          onSubmit={handleScadenzaSubmit}
          className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-3"
        >
          <select
            value={scadenzaAziendaId}
            onChange={(e) => setScadenzaAziendaId(e.target.value)}
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

          <input
            value={titoloScadenza}
            onChange={(e) => setTitoloScadenza(e.target.value)}
            placeholder="Titolo scadenza"
            className="rounded border border-slate-300 p-3"
          />

          <input
            type="date"
            value={dataScadenza}
            onChange={(e) => setDataScadenza(e.target.value)}
            className="rounded border border-slate-300 p-3"
          />

          <select
            value={categoriaScadenza}
            onChange={(e) => setCategoriaScadenza(e.target.value)}
            className="rounded border border-slate-300 p-3"
          >
            <option value="antincendio">Antincendio</option>
            <option value="primo_soccorso">Primo soccorso</option>
            <option value="impianti">Impianti</option>
            <option value="formazione">Formazione</option>
            <option value="documentazione">Documentazione</option>
            <option value="manutenzione">Manutenzione</option>
            <option value="sopralluogo">Sopralluogo</option>
            <option value="altro">Altro</option>
          </select>

          <select
            value={prioritaScadenza}
            onChange={(e) => setPrioritaScadenza(e.target.value)}
            className="rounded border border-slate-300 p-3"
          >
            <option value="bassa">Priorità bassa</option>
            <option value="media">Priorità media</option>
            <option value="alta">Priorità alta</option>
          </select>

          <select
            value={ricorrenzaScadenza}
            onChange={(e) => setRicorrenzaScadenza(e.target.value)}
            className="rounded border border-slate-300 p-3"
          >
            <option value="nessuna">Ricorrenza: nessuna</option>
            <option value="mensile">Mensile</option>
            <option value="trimestrale">Trimestrale</option>
            <option value="semestrale">Semestrale</option>
            <option value="annuale">Annuale</option>
          </select>

          <textarea
            value={descrizioneScadenza}
            onChange={(e) => setDescrizioneScadenza(e.target.value)}
            placeholder="Descrizione"
            className="rounded border border-slate-300 p-3 md:col-span-2"
          />

          <textarea
            value={noteScadenza}
            onChange={(e) => setNoteScadenza(e.target.value)}
            placeholder="Note operative"
            className="rounded border border-slate-300 p-3"
          />

          <div className="flex gap-3 md:col-span-3">
            <button className="rounded bg-indigo-600 px-4 py-3 text-white">
              {scadenzaInModificaId ? 'Aggiorna scadenza' : 'Salva scadenza'}
            </button>
            <button
              type="button"
              onClick={resetFormScadenza}
              className="rounded bg-slate-200 px-4 py-3 text-slate-800"
            >
              Pulisci campi
            </button>
          </div>
        </form>

        <div className="mt-6 grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-4">
          <select
            value={filtroScadenzaAziendaId}
            onChange={(e) => setFiltroScadenzaAziendaId(e.target.value)}
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

          <select
            value={filtroScadenzaStato}
            onChange={(e) => setFiltroScadenzaStato(e.target.value)}
            className="rounded border border-slate-300 p-3"
          >
            <option value="tutte">Tutti gli stati</option>
            <option value="da_fare">Da fare</option>
            <option value="in_scadenza">In scadenza</option>
            <option value="scaduta">Scaduta</option>
            <option value="completata">Completata</option>
            <option value="annullata">Annullata</option>
          </select>

          <input
            value={filtroScadenzaRicerca}
            onChange={(e) => setFiltroScadenzaRicerca(e.target.value)}
            placeholder="Cerca titolo, categoria, azienda..."
            className="rounded border border-slate-300 p-3"
          />

          <button
            type="button"
            onClick={resetFiltriScadenze}
            className="rounded bg-slate-200 px-4 py-3 text-slate-800"
          >
            Reset filtri
          </button>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
          <table className="min-w-full border-collapse">
            <thead className="bg-slate-100">
              <tr>
                <th className="border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700">Data</th>
                <th className="border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700">Azienda</th>
                <th className="border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700">Titolo</th>
                <th className="border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700">Categoria</th>
                <th className="border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700">Priorità</th>
                <th className="border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700">Stato</th>
                <th className="border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {scadenzeFiltrate.length > 0 ? (
                scadenzeFiltrate.map((scadenza) => {
                  const statoVisuale = getStatoScadenzaVisuale(scadenza)
                  const badgeClass =
                    statoVisuale === 'completata'
                      ? 'bg-green-100 text-green-700'
                      : statoVisuale === 'annullata'
                        ? 'bg-slate-200 text-slate-700'
                        : statoVisuale === 'scaduta'
                          ? 'bg-red-100 text-red-700'
                          : statoVisuale === 'in_scadenza'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-blue-100 text-blue-700'

                  return (
                    <tr key={scadenza.id} className="odd:bg-white even:bg-slate-50">
                      <td className="border-b border-slate-200 px-4 py-3 text-sm text-slate-800">{scadenza.data}</td>
                      <td className="border-b border-slate-200 px-4 py-3 text-sm text-slate-800">{nomeAzienda(scadenza.azienda_id)}</td>
                      <td className="border-b border-slate-200 px-4 py-3 text-sm text-slate-800">{scadenza.titolo}</td>
                      <td className="border-b border-slate-200 px-4 py-3 text-sm text-slate-800">{scadenza.categoria}</td>
                      <td className="border-b border-slate-200 px-4 py-3 text-sm text-slate-800">{scadenza.priorita}</td>
                      <td className="border-b border-slate-200 px-4 py-3 text-sm">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeClass}`}>
                          {statoVisuale.replaceAll('_', ' ')}
                        </span>
                      </td>
                      <td className="border-b border-slate-200 px-4 py-3 text-sm">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleEditScadenza(scadenza)}
                            className="rounded bg-amber-500 px-3 py-1 text-white"
                          >
                            Modifica
                          </button>
                          {scadenza.stato !== 'completata' && scadenza.stato !== 'annullata' && (
                            <button
                              type="button"
                              onClick={() => handleCompletaScadenza(scadenza.id)}
                              className="rounded bg-green-600 px-3 py-1 text-white"
                            >
                              Completa
                            </button>
                          )}
                          {scadenza.stato !== 'annullata' && (
                            <button
                              type="button"
                              onClick={() => handleAnnullaScadenza(scadenza.id)}
                              className="rounded bg-red-600 px-3 py-1 text-white"
                            >
                              Annulla
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-4 text-sm text-slate-500">
                    Nessuna scadenza trovata con i filtri selezionati
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

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