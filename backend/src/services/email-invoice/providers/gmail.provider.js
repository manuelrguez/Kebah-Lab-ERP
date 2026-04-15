/**
 * GMAIL PROVIDER — OAuth2
 * ─────────────────────────────────────────────────────────────
 * Usa la Gmail API con OAuth2. Más robusto que IMAP para Gmail
 * ya que Google está deprecando acceso IMAP con contraseña.
 *
 * SETUP en Google Cloud Console:
 * 1. Crear proyecto en console.cloud.google.com
 * 2. Activar Gmail API
 * 3. Crear credenciales OAuth2 (tipo "Web application")
 * 4. Añadir redirect URI: http://localhost:3001/api/email/gmail/callback
 * 5. Copiar client_id y client_secret
 *
 * CREDENTIALS:
 * {
 *   client_id:     'xxx.apps.googleusercontent.com',
 *   client_secret: 'GOCSPX-xxx',
 *   refresh_token: 'xxx',   // obtenido tras autorizar la app
 *   // O access_token si ya tienes uno válido:
 *   access_token:  'ya29.xxx',
 * }
 *
 * PARA OBTENER EL REFRESH TOKEN:
 * Llama a GET /api/email/gmail/auth para iniciar el flujo OAuth2
 */

const { google } = require('googleapis')

const conectar = async (credentials) => {
  const oauth2Client = new google.auth.OAuth2(
    credentials.client_id,
    credentials.client_secret,
    credentials.redirect_uri || 'http://localhost:3001/api/email/gmail/callback'
  )

  if (credentials.refresh_token) {
    oauth2Client.setCredentials({ refresh_token: credentials.refresh_token })
  } else if (credentials.access_token) {
    oauth2Client.setCredentials({ access_token: credentials.access_token })
  } else {
    throw new Error('Gmail requiere refresh_token o access_token')
  }

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client })
  return { gmail, oauth2Client }
}

const listarEmails = async ({ gmail }, opts) => {
  // Build Gmail search query
  const queries = []
  if (opts.soloNoLeidos) queries.push('is:unread')
  if (opts.filtros?.desde) queries.push(`from:${opts.filtros.desde}`)
  if (opts.filtros?.desde_fecha) {
    const d = opts.filtros.desde_fecha
    queries.push(`after:${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()}`)
  }
  if (opts.filtros?.asunto?.length) {
    const subjectQ = opts.filtros.asunto.map(k => `subject:${k}`).join(' OR ')
    queries.push(`(${subjectQ})`)
  }
  if (opts.carpeta && opts.carpeta !== 'INBOX') queries.push(`in:${opts.carpeta}`)

  const q = queries.join(' ') || 'has:attachment'

  const res = await gmail.users.messages.list({
    userId: 'me',
    q,
    maxResults: opts.maxEmails || 50,
  })

  return (res.data.messages || []).map(m => ({ id: m.id }))
}

const obtenerContenido = async ({ gmail }, emailId) => {
  const res = await gmail.users.messages.get({
    userId: 'me',
    id: emailId,
    format: 'full',
  })

  const msg     = res.data
  const payload = msg.payload || {}
  const parts   = payload.parts || [payload]

  const adjuntos    = []
  let   cuerpoHtml  = ''
  let   cuerpoTexto = ''

  const procesarParte = async (part) => {
    const mimeType = part.mimeType || ''
    const body     = part.body || {}

    if (mimeType === 'text/html' && body.data) {
      cuerpoHtml = Buffer.from(body.data, 'base64').toString('utf8')
    } else if (mimeType === 'text/plain' && body.data) {
      cuerpoTexto = Buffer.from(body.data, 'base64').toString('utf8')
    } else if (body.attachmentId) {
      // Descargar adjunto
      const att = await gmail.users.messages.attachments.get({
        userId: 'me',
        messageId: emailId,
        id: body.attachmentId,
      })
      adjuntos.push({
        nombre: part.filename || 'adjunto',
        tipo:   mimeType,
        datos:  Buffer.from(att.data.data, 'base64'),
      })
    }

    if (part.parts) {
      for (const subpart of part.parts) await procesarParte(subpart)
    }
  }

  for (const part of parts) await procesarParte(part)

  return { adjuntos, cuerpoHtml, cuerpoTexto }
}

const marcarLeido = async ({ gmail }, emailId) => {
  await gmail.users.messages.modify({
    userId: 'me',
    id: emailId,
    requestBody: { removeLabelIds: ['UNREAD'] },
  })
}

const desconectar = async () => {} // Gmail API no requiere desconexión explícita

module.exports = { conectar, listarEmails, obtenerContenido, marcarLeido, desconectar }
