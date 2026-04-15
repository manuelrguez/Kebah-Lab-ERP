/**
 * OUTLOOK / MICROSOFT 365 PROVIDER — Microsoft Graph API
 * ─────────────────────────────────────────────────────────────
 * Usa Microsoft Graph API con OAuth2.
 *
 * SETUP en Azure Portal (portal.azure.com):
 * 1. Azure Active Directory → App registrations → New registration
 * 2. Nombre: "Email Invoice Extractor"
 * 3. Redirect URI: http://localhost:3001/api/email/outlook/callback
 * 4. API permissions → Microsoft Graph → Mail.Read, Mail.ReadWrite
 * 5. Copiar Application (client) ID y crear un Client Secret
 *
 * CREDENTIALS:
 * {
 *   client_id:     'xxx-xxx-xxx',
 *   client_secret: 'xxx',
 *   tenant_id:     'common',  // o tu tenant específico
 *   refresh_token: 'xxx',     // obtenido tras autorizar
 * }
 */

const axios = require('axios')

const getAccessToken = async (credentials) => {
  const tenantId = credentials.tenant_id || 'common'
  const res = await axios.post(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    new URLSearchParams({
      client_id:     credentials.client_id,
      client_secret: credentials.client_secret,
      grant_type:    'refresh_token',
      refresh_token: credentials.refresh_token,
      scope:         'https://graph.microsoft.com/Mail.ReadWrite offline_access',
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  )
  return res.data.access_token
}

const conectar = async (credentials) => {
  const accessToken = credentials.access_token || await getAccessToken(credentials)
  const client = axios.create({
    baseURL: 'https://graph.microsoft.com/v1.0/me',
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  return { client }
}

const listarEmails = async ({ client }, opts) => {
  // Build OData filter
  const filters = []
  if (opts.soloNoLeidos) filters.push('isRead eq false')
  if (opts.filtros?.desde_fecha) {
    const d = opts.filtros.desde_fecha.toISOString()
    filters.push(`receivedDateTime ge ${d}`)
  }
  if (opts.filtros?.desde) {
    filters.push(`from/emailAddress/address eq '${opts.filtros.desde}'`)
  }

  // Subject search via $search
  const subjectTerms = opts.filtros?.asunto || []
  const searchQuery  = subjectTerms.length
    ? `"${subjectTerms.join('" OR "')}"` : null

  const params = {
    $top:     opts.maxEmails || 50,
    $select:  'id,subject,from,receivedDateTime,hasAttachments',
    $orderby: 'receivedDateTime desc',
  }
  if (filters.length)  params['$filter'] = filters.join(' and ')
  if (searchQuery)     params['$search'] = searchQuery

  const folder = opts.carpeta === 'INBOX' ? 'inbox' : (opts.carpeta || 'inbox')
  const res = await client.get(`/mailFolders/${folder}/messages`, { params })

  return (res.data.value || []).map(m => ({
    id:     m.id,
    asunto: m.subject,
    de:     m.from?.emailAddress?.address,
    fecha:  m.receivedDateTime,
  }))
}

const obtenerContenido = async ({ client }, emailId) => {
  // Get message with body
  const [msgRes, attRes] = await Promise.all([
    client.get(`/messages/${emailId}?$select=body,bodyPreview`),
    client.get(`/messages/${emailId}/attachments`),
  ])

  const body     = msgRes.data.body || {}
  const cuerpoHtml  = body.contentType === 'html'  ? body.content : ''
  const cuerpoTexto = body.contentType === 'text'  ? body.content : msgRes.data.bodyPreview || ''

  const adjuntos = []
  for (const att of (attRes.data.value || [])) {
    if (att['@odata.type'] === '#microsoft.graph.fileAttachment') {
      adjuntos.push({
        nombre: att.name,
        tipo:   att.contentType,
        datos:  Buffer.from(att.contentBytes, 'base64'),
      })
    }
  }

  return { adjuntos, cuerpoHtml, cuerpoTexto }
}

const marcarLeido = async ({ client }, emailId) => {
  await client.patch(`/messages/${emailId}`, { isRead: true })
}

const desconectar = async () => {}

module.exports = { conectar, listarEmails, obtenerContenido, marcarLeido, desconectar }
