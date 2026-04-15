const Imap             = require('imap')
const { simpleParser } = require('mailparser')

const conectar = (credentials) => {
  return new Promise((resolve, reject) => {
    const imap = new Imap({
      user:        credentials.usuario,
      password:    credentials.password,
      host:        credentials.host,
      port:        credentials.port || 993,
      tls:         credentials.tls !== false,
      tlsOptions:  { rejectUnauthorized: false },
      connTimeout: 20000,
      authTimeout: 15000,
    })
    imap.once('ready', () => resolve(imap))
    imap.once('error', reject)
    imap.connect()
  })
}

const listarEmails = (imap, opts) => {
  return new Promise((resolve, reject) => {
    imap.openBox(opts.carpeta || 'INBOX', false, (err) => {
      if (err) return reject(err)

      const criteria = opts.soloNoLeidos ? ['UNSEEN'] : ['ALL']

      if (opts.filtros?.desde) {
        criteria.push(['FROM', opts.filtros.desde])
      }
      if (opts.filtros?.desde_fecha) {
        const d = new Date(opts.filtros.desde_fecha)
        const meses = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
        const fechaImap = `${d.getDate()}-${meses[d.getMonth()]}-${d.getFullYear()}`
        criteria.push(['SINCE', fechaImap])
      }

      imap.search(criteria, (err, seqNums) => {
        if (err) return reject(err)
        if (!seqNums || seqNums.length === 0) {
          console.log('[IMAP] No se encontraron emails con los criterios dados')
          return resolve([])
        }

        console.log(`[IMAP] ${seqNums.length} emails encontrados, limitando a ${opts.maxEmails || 20}`)
        // Coger los más recientes (últimos N)
        const limited = seqNums.slice(-(opts.maxEmails || 20))
        resolve(limited.map(seq => ({ id: seq })))  // seq como número, no string
      })
    })
  })
}

const obtenerContenido = (imap, seqNum) => {
  return new Promise((resolve, reject) => {
    // Usar sequence number directamente (número, no string ni array de string)
    const fetch = imap.seq.fetch(`${seqNum}`, {
      bodies:   '',      // cuerpo completo (headers + body)
      struct:   true,
      markSeen: false,
    })

    const chunks = []
    let resolved = false

    fetch.on('message', (msg) => {
      msg.on('body', (stream) => {
        stream.on('data', chunk => chunks.push(chunk))
      })
    })

    fetch.once('error', (err) => {
      if (!resolved) { resolved = true; reject(err) }
    })

    fetch.once('end', async () => {
      if (resolved) return
      resolved = true

      try {
        if (!chunks.length) {
          console.warn(`[IMAP] Email seq ${seqNum}: sin datos en buffer`)
          return resolve({ adjuntos: [], cuerpoHtml: '', cuerpoTexto: '', asunto: '', de: '', fecha: '' })
        }

        const raw    = Buffer.concat(chunks)
        const parsed = await simpleParser(raw)

        console.log(`[IMAP] Email seq ${seqNum}: asunto="${parsed.subject}", adjuntos=${parsed.attachments?.length || 0}`)

        const adjuntos = (parsed.attachments || []).map(a => ({
          nombre: a.filename   || 'adjunto',
          tipo:   a.contentType,
          datos:  a.content,   // Buffer binario
        }))

        resolve({
          adjuntos,
          cuerpoHtml:  parsed.html    || '',
          cuerpoTexto: parsed.text    || '',
          asunto:      parsed.subject || '',
          de:          parsed.from?.text || '',
          fecha:       parsed.date?.toISOString() || '',
        })
      } catch (err) {
        console.error(`[IMAP] Error parseando email seq ${seqNum}:`, err.message)
        reject(err)
      }
    })
  })
}

const marcarLeido = (imap, seqNum) => {
  return new Promise((resolve, reject) => {
    imap.seq.addFlags(`${seqNum}`, ['\\Seen'], (err) => {
      if (err) return reject(err)
      resolve()
    })
  })
}

const desconectar = (imap) => {
  return new Promise(resolve => {
    try {
      imap.once('end', resolve)
      imap.end()
    } catch {
      resolve()
    }
  })
}

module.exports = { conectar, listarEmails, obtenerContenido, marcarLeido, desconectar }