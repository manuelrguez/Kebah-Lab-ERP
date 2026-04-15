/**
 * IMAP PROVIDER
 * ─────────────────────────────────────────────────────────────
 * Soporta cualquier servidor IMAP: Gmail (con contraseña de app),
 * Outlook, Yahoo, servidores propios, etc.
 *
 * CREDENTIALS:
 * {
 *   host:     'imap.gmail.com',   // servidor IMAP
 *   port:     993,                // puerto (993 SSL, 143 sin SSL)
 *   tls:      true,               // usar TLS
 *   usuario:  'tu@email.com',
 *   password: 'contraseña_o_app_password',
 * }
 *
 * CONFIGURACIÓN POR PROVEEDOR:
 * Gmail:   host: imap.gmail.com, port: 993, tls: true
 *          Requiere "Contraseña de aplicación" si tiene 2FA
 * Outlook: host: outlook.office365.com, port: 993, tls: true
 * Yahoo:   host: imap.mail.yahoo.com, port: 993, tls: true
 * Custom:  según documentación del proveedor
 */

const Imap    = require('imap')
const { simpleParser } = require('mailparser')

const conectar = (credentials) => {
  return new Promise((resolve, reject) => {
    const imap = new Imap({
      user:     credentials.usuario,
      password: credentials.password,
      host:     credentials.host,
      port:     credentials.port || 993,
      tls:      credentials.tls !== false,
      tlsOptions: { rejectUnauthorized: false },
      connTimeout: 10000,
    })

    imap.once('ready',  () => resolve(imap))
    imap.once('error',  reject)
    imap.connect()
  })
}

const listarEmails = (imap, opts) => {
  return new Promise((resolve, reject) => {
    imap.openBox(opts.carpeta || 'INBOX', false, (err, box) => {
      if (err) return reject(err)

      // Build search criteria
      const criteria = []
      if (opts.soloNoLeidos) criteria.push('UNSEEN')
      if (opts.filtros?.desde) criteria.push(['FROM', opts.filtros.desde])
      if (opts.filtros?.desde_fecha) criteria.push(['SINCE', opts.filtros.desde_fecha])

      // Subject filter (OR between keywords)
      if (opts.filtros?.asunto?.length) {
        if (opts.filtros.asunto.length === 1) {
          criteria.push(['SUBJECT', opts.filtros.asunto[0]])
        } else {
          // IMAP OR is binary — chain them
          let orCriteria = ['OR', ['SUBJECT', opts.filtros.asunto[0]], ['SUBJECT', opts.filtros.asunto[1]]]
          for (let i = 2; i < opts.filtros.asunto.length; i++) {
            orCriteria = ['OR', orCriteria, ['SUBJECT', opts.filtros.asunto[i]]]
          }
          criteria.push(orCriteria)
        }
      }

      if (criteria.length === 0) criteria.push('ALL')

      imap.search(criteria, (err, uids) => {
        if (err) return reject(err)

        const limited = uids.slice(-( opts.maxEmails || 50))
        const emails  = limited.map(uid => ({ id: String(uid) }))
        resolve(emails)
      })
    })
  })
}

const obtenerContenido = (imap, uid) => {
  return new Promise((resolve, reject) => {
    const fetch = imap.fetch([uid], { bodies: '', struct: true })
    const mensajes = []

    fetch.on('message', (msg) => {
      let buffer = ''
      msg.on('body', (stream) => {
        stream.on('data', chunk => { buffer += chunk.toString('utf8') })
        stream.once('end', () => mensajes.push(buffer))
      })
    })

    fetch.once('error', reject)
    fetch.once('end', async () => {
      try {
        if (!mensajes.length) return resolve({ adjuntos: [], cuerpoHtml: '', cuerpoTexto: '' })

        const parsed = await simpleParser(mensajes[0])
        const adjuntos = (parsed.attachments || []).map(a => ({
          nombre: a.filename || 'adjunto',
          tipo:   a.contentType,
          datos:  a.content, // Buffer
        }))

        resolve({
          adjuntos,
          cuerpoHtml:   parsed.html  || '',
          cuerpoTexto:  parsed.text  || '',
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
    imap.once('end', resolve)
    imap.end()
  })
}

module.exports = { conectar, listarEmails, obtenerContenido, marcarLeido, desconectar }
