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
    imap.openBox(opts.carpeta || 'INBOX', false, (err, box) => {
      if (err) return reject(err)

      const total = box.messages.total
      if (total === 0) return resolve([])

      const criteria = opts.soloNoLeidos ? ['UNSEEN'] : ['ALL']
      if (opts.filtros?.desde) criteria.push(['FROM', opts.filtros.desde])
      if (opts.filtros?.desde_fecha) {
        const d = new Date(opts.filtros.desde_fecha)
        const meses = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
        criteria.push(['SINCE', `${d.getDate()}-${meses[d.getMonth()]}-${d.getFullYear()}`])
      }

      imap.search(criteria, (err, seqNos) => {
        if (err) return reject(err)
        if (!seqNos?.length) return resolve([])

        const limited = seqNos.slice(-(opts.maxEmails || 20))
        console.log(`[IMAP] ${seqNos.length} emails, usando últimos ${limited.length}: ${limited.join(',')}`)
        resolve(limited.map(seq => ({ id: seq })))
      })
    })
  })
}

const obtenerContenido = (imap, seqNo) => {
  return new Promise((resolve, reject) => {
    const chunks  = []
    let resolved  = false

    const f = imap.seq.fetch(seqNo + ':' + seqNo, {
      bodies:   '',
      struct:   true,
      markSeen: false,
    })

    f.on('message', (msg) => {
      msg.on('body', (stream) => {
        stream.on('data', c => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)))
      })
    })

    f.once('error', (err) => {
      if (!resolved) { resolved = true; reject(err) }
    })

    f.once('end', async () => {
      if (resolved) return
      resolved = true

      if (!chunks.length) {
        console.warn(`[IMAP] seq ${seqNo}: buffer vacío`)
        return resolve({ adjuntos:[], cuerpoHtml:'', cuerpoTexto:'', asunto:'', de:'', fecha:'' })
      }

      try {
        const raw    = Buffer.concat(chunks)
        const parsed = await simpleParser(raw)
        console.log(`[IMAP] seq ${seqNo}: asunto="${parsed.subject}", adjuntos=${parsed.attachments?.length || 0}, bytes=${raw.length}`)

        resolve({
          adjuntos:    (parsed.attachments || []).map(a => ({
            nombre: a.filename    || 'adjunto',
            tipo:   a.contentType || 'application/octet-stream',
            datos:  a.content,
          })),
          cuerpoHtml:  parsed.html    || '',
          cuerpoTexto: parsed.text    || '',
          asunto:      parsed.subject || '',
          de:          parsed.from?.text || '',
          fecha:       parsed.date?.toISOString() || '',
        })
      } catch (err) {
        console.error(`[IMAP] Error parseando seq ${seqNo}:`, err.message)
        reject(err)
      }
    })
  })
}

const marcarLeido = (imap, seqNo) => {
  return new Promise((resolve, reject) => {
    imap.seq.addFlags(seqNo + ':' + seqNo, ['\\Seen'], (err) => {
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