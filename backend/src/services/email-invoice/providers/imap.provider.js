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
      if (box.messages.total === 0) return resolve([])

      const criteria = opts.soloNoLeidos ? ['UNSEEN'] : ['ALL']
      if (opts.filtros?.desde) criteria.push(['FROM', opts.filtros.desde])

      // Buscar por UID usando el método UID search
      imap.search(criteria, (err, results) => {
        if (err) return reject(err)
        if (!results?.length) return resolve([])

        const limited = results.slice(-(opts.maxEmails || 20))
        console.log(`[IMAP] ${results.length} results, limitando a ${limited.length}`)
        resolve(limited.map(n => ({ id: n })))
      })
    })
  })
}

const obtenerContenido = (imap, seqNo) => {
  return new Promise((resolve, reject) => {
    const chunks = []
    let resolved = false

    // Intentar con seq.fetch usando rango de 1
    const f = imap.seq.fetch(`${seqNo}`, {
      bodies: '',
      struct: true,
    })

    f.on('message', (msg, seqno) => {
      console.log(`[IMAP] Procesando mensaje seqno=${seqno}`)
      msg.on('body', (stream, info) => {
        const c = []
        stream.on('data', d => c.push(d))
        stream.once('end', () => chunks.push(...c))
      })
      msg.once('attributes', attrs => {
        console.log(`[IMAP] attrs uid=${attrs.uid}, size=${attrs.size}`)
      })
    })

    f.once('error', err => { if (!resolved) { resolved = true; reject(err) } })
    f.once('end', async () => {
      if (resolved) return
      resolved = true
      if (!chunks.length) {
        console.warn(`[IMAP] seq ${seqNo}: 0 chunks`)
        return resolve({ adjuntos:[], cuerpoHtml:'', cuerpoTexto:'', asunto:'', de:'', fecha:'' })
      }
      try {
        const raw = Buffer.concat(chunks.map(c => Buffer.isBuffer(c) ? c : Buffer.from(c)))
        console.log(`[IMAP] seq ${seqNo}: ${raw.length} bytes`)
        const parsed = await simpleParser(raw)
        console.log(`[IMAP] seq ${seqNo}: subject="${parsed.subject}"`)
        resolve({
          adjuntos:    (parsed.attachments || []).map(a => ({ nombre: a.filename || 'adjunto', tipo: a.contentType, datos: a.content })),
          cuerpoHtml:  parsed.html    || '',
          cuerpoTexto: parsed.text    || '',
          asunto:      parsed.subject || '',
          de:          parsed.from?.text || '',
          fecha:       parsed.date?.toISOString() || '',
        })
      } catch (e) { reject(e) }
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