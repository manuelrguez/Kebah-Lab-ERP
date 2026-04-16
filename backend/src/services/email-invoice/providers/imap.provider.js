const imapSimple       = require('imap-simple')
const { simpleParser } = require('mailparser')

const conectar = async (credentials) => {
  const config = {
    imap: {
      user:        credentials.usuario,
      password:    credentials.password,
      host:        credentials.host     || 'imap.gmail.com',
      port:        credentials.port     || 993,
      tls:         credentials.tls      !== false,
      tlsOptions:  { rejectUnauthorized: false },
      authTimeout: 15000,
    }
  }
  const connection = await imapSimple.connect(config)
  return connection
}

const listarEmails = async (connection, opts) => {
  await connection.openBox(opts.carpeta || 'INBOX')

  const searchCriteria = opts.soloNoLeidos ? ['UNSEEN'] : ['ALL']
  if (opts.filtros?.desde) searchCriteria.push(['FROM', opts.filtros.desde])
  if (opts.filtros?.desde_fecha) {
    const d     = new Date(opts.filtros.desde_fecha)
    const meses = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    searchCriteria.push(['SINCE', `${d.getDate()}-${meses[d.getMonth()]}-${d.getFullYear()}`])
  }

  // Traer solo headers para el listado — rápido
  const fetchOptions = {
    bodies:   ['HEADER.FIELDS (FROM TO SUBJECT DATE)'],
    struct:   true,
    markSeen: false,
  }

  const messages = await connection.search(searchCriteria, fetchOptions)
  console.log(`[IMAP] ${messages.length} emails encontrados`)

  const limited = messages.slice(-(opts.maxEmails || 20))

  return limited.map(msg => {
    const headerPart = msg.parts.find(p => p.which.includes('HEADER'))
    const headers    = headerPart?.body || {}
    return {
      id:     msg.attributes.uid,
      asunto: Array.isArray(headers.subject) ? headers.subject[0] : (headers.subject || ''),
      de:     Array.isArray(headers.from)    ? headers.from[0]    : (headers.from    || ''),
      fecha:  Array.isArray(headers.date)    ? headers.date[0]    : (headers.date    || ''),
      _uid:   msg.attributes.uid,
    }
  })
}

const obtenerContenido = async (connection, emailId, emailMeta) => {
  try {
    const uid = emailMeta?._uid || emailId
    console.log(`[IMAP] Fetching UID=${uid}, asunto="${emailMeta?.asunto}"`)

    // Fetch completo por UID
    const messages = await connection.search(
      [['UID', String(uid)]],
      { bodies: [''], struct: true, markSeen: false }
    )

    if (!messages.length) {
      console.warn(`[IMAP] No encontrado UID=${uid}`)
      return { adjuntos:[], cuerpoHtml:'', cuerpoTexto:'', asunto: emailMeta?.asunto||'', de: emailMeta?.de||'', fecha: emailMeta?.fecha||'' }
    }

    const msg  = messages[0]
    const part = msg.parts.find(p => p.which === '')

    if (!part?.body) {
      console.warn(`[IMAP] Cuerpo vacío UID=${uid}`)
      return { adjuntos:[], cuerpoHtml:'', cuerpoTexto:'', asunto: emailMeta?.asunto||'', de: emailMeta?.de||'', fecha: emailMeta?.fecha||'' }
    }

    const raw    = Buffer.isBuffer(part.body) ? part.body : Buffer.from(part.body)
    console.log(`[IMAP] UID=${uid}: ${raw.length} bytes`)

    const parsed = await simpleParser(raw)
    console.log(`[IMAP] UID=${uid}: subject="${parsed.subject}", adjuntos=${parsed.attachments?.length||0}`)

    return {
      adjuntos: (parsed.attachments || []).map(a => ({
        nombre: a.filename    || 'adjunto',
        tipo:   a.contentType || 'application/octet-stream',
        datos:  a.content,
      })),
      cuerpoHtml:  parsed.html    || '',
      cuerpoTexto: parsed.text    || '',
      asunto:      parsed.subject || emailMeta?.asunto || '',
      de:          parsed.from?.text || emailMeta?.de || '',
      fecha:       parsed.date?.toISOString() || emailMeta?.fecha || '',
    }
  } catch (err) {
    console.error(`[IMAP] Error obteniendo contenido UID=${emailMeta?._uid}:`, err.message)
    return { adjuntos:[], cuerpoHtml:'', cuerpoTexto:'', asunto: emailMeta?.asunto||'', de: emailMeta?.de||'', fecha: emailMeta?.fecha||'' }
  }
}

const marcarLeido = async (connection, emailId, emailMeta) => {
  try {
    const uid = emailMeta?._uid || emailId
    // imap-simple usa addFlags con la búsqueda UID
    await connection.search([['UID', String(uid)]], { bodies: [], markSeen: true })
  } catch (err) {
    console.error('[IMAP] Error marcando leído:', err.message)
  }
}

const desconectar = async (connection) => {
  try { connection.end() } catch {}
}

module.exports = { conectar, listarEmails, obtenerContenido, marcarLeido, desconectar }
