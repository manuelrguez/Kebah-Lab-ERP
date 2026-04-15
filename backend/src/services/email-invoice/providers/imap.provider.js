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
      connTimeout: 15000,
      authTimeout: 10000,
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

      // Búsqueda simple — solo no leídos + límite
      // Evitamos OR anidados complejos que cuelgan la conexión
      const criteria = opts.soloNoLeidos ? ['UNSEEN'] : ['ALL']

      // Filtro por remitente si existe
      if (opts.filtros?.desde) {
        criteria.push(['FROM', opts.filtros.desde])
      }

      // Filtro por fecha si existe
      if (opts.filtros?.desde_fecha) {
        criteria.push(['SINCE', opts.filtros.desde_fecha])
      }

      imap.search(criteria, (err, uids) => {
        if (err) return reject(err)

        // Limitar y devolver — el filtro de asunto lo hacemos al obtener contenido
        const limited = uids.slice(-(opts.maxEmails || 20))
        resolve(limited.map(uid => ({ id: String(uid) })))
      })
    })
  })
}

const obtenerContenido = (imap, uid) => {
  return new Promise((resolve, reject) => {
    const fetch    = imap.fetch([uid], { bodies: '', struct: true })
    const buffers  = []

    fetch.on('message', (msg) => {
      const chunks = []
      msg.on('body', (stream) => {
        stream.on('data', chunk => chunks.push(chunk))
        stream.once('end', () => buffers.push(Buffer.concat(chunks)))
      })
    })

    fetch.once('error', reject)
    fetch.once('end', async () => {
      try {
        if (!buffers.length) {
          return resolve({ adjuntos: [], cuerpoHtml: '', cuerpoTexto: '', asunto: '', de: '' })
        }

        const parsed   = await simpleParser(buffers[0])
        const adjuntos = (parsed.attachments || []).map(a => ({
          nombre: a.filename  || 'adjunto',
          tipo:   a.contentType,
          datos:  a.content,  // Buffer binario — no convertir a string
        }))

        resolve({
          adjuntos,
          cuerpoHtml:   parsed.html    || '',
          cuerpoTexto:  parsed.text    || '',
          asunto:       parsed.subject || '',
          de:           parsed.from?.text || '',
          fecha:        parsed.date?.toISOString() || '',
        })
      } catch (err) {
        reject(err)
      }
    })
  })
}

const marcarLeido = (imap, uid) => {
  return new Promise((resolve, reject) => {
    imap.addFlags([uid], ['\\Seen'], (err) => {
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
