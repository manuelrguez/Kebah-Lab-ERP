const gmailProvider   = require('./providers/gmail.provider')
const outlookProvider = require('./providers/outlook.provider')
const imapProvider    = require('./providers/imap.provider')
const pdfExtractor    = require('./extractors/pdf.extractor')
const imageExtractor  = require('./extractors/image.extractor')
const htmlExtractor   = require('./extractors/html.extractor')

const PROVIDERS = {
  gmail:   gmailProvider,
  outlook: outlookProvider,
  imap:    imapProvider,
}

const DEFAULT_OPTIONS = {
  carpeta:      'INBOX',
  soloNoLeidos: false,
  marcarLeido:  false,
  maxEmails:    20,
  filtros: {
    asunto:      ['factura', 'invoice', 'recibo', 'albarán', 'receipt'],
    desde:       null,
    desde_fecha: null,
  },
}

const procesarAdjunto = async (adjunto, emailMeta) => {
  const tipo   = adjunto.tipo?.toLowerCase()   || ''
  const nombre = adjunto.nombre?.toLowerCase() || ''

  if (tipo.includes('pdf') || nombre.endsWith('.pdf')) {
    return await pdfExtractor.extraer(adjunto.datos, emailMeta)
  } else if (tipo.includes('image') || /\.(jpg|jpeg|png|gif|webp)$/.test(nombre)) {
    return await imageExtractor.extraer(adjunto.datos, tipo, emailMeta)
  } else if (tipo.includes('html') || tipo.includes('text')) {
    return await htmlExtractor.extraer(adjunto.datos, emailMeta)
  }
  return null
}

const sync = async (config = {}) => {
  const { provider: providerName, credentials, options = {}, onFactura, onError } = config

  if (!providerName || !PROVIDERS[providerName]) {
    throw new Error(`Provider "${providerName}" no soportado. Usa: gmail, outlook, imap`)
  }
  if (!credentials) throw new Error('credentials es obligatorio')

  const opts = {
    ...DEFAULT_OPTIONS,
    ...options,
    filtros: { ...DEFAULT_OPTIONS.filtros, ...(options.filtros || {}) },
  }

  const provider  = PROVIDERS[providerName]
  const resultados = { procesados: 0, facturas: [], errores: [] }

  const conexion = await provider.conectar(credentials)

  try {
    const emails = await provider.listarEmails(conexion, opts)
    console.log(`[EmailInvoice] ${emails.length} emails en ${opts.carpeta}`)

    for (const emailMeta of emails) {
      try {
        // Filtrar por asunto antes de descargar el cuerpo completo
        const filtrosAsunto = opts.filtros?.asunto || []
        if (filtrosAsunto.length > 0) {
          const asuntoLower = (emailMeta.asunto || '').toLowerCase()
          const coincide = filtrosAsunto.some(f => asuntoLower.includes(f.toLowerCase()))
          if (!coincide) {
            console.log(`[EmailInvoice] Ignorado (asunto no coincide): "${emailMeta.asunto}"`)
            continue
          }
        }

        resultados.procesados++
        console.log(`[EmailInvoice] Procesando: "${emailMeta.asunto}" de ${emailMeta.de}`)

        // Pasar emailMeta completo para que el provider use el UID
        const { adjuntos, cuerpoHtml, cuerpoTexto, asunto, de, fecha } =
          await provider.obtenerContenido(conexion, emailMeta.id, emailMeta)

        emailMeta.asunto = asunto || emailMeta.asunto || ''
        emailMeta.de     = de    || emailMeta.de    || ''
        emailMeta.fecha  = fecha || emailMeta.fecha  || ''

        const facturasEmail = []

        for (const adjunto of adjuntos) {
          const factura = await procesarAdjunto(adjunto, emailMeta)
          if (factura) {
            factura.fuente         = adjunto.tipo?.includes('pdf') ? 'pdf' : 'imagen'
            factura.adjunto_nombre = adjunto.nombre
            facturasEmail.push(factura)
          }
        }

        if (facturasEmail.length === 0 && cuerpoHtml) {
          const factura = await htmlExtractor.extraer(cuerpoHtml, emailMeta)
          if (factura) { factura.fuente = 'html'; facturasEmail.push(factura) }
        }

        for (const factura of facturasEmail) {
          resultados.facturas.push(factura)
          if (onFactura) await onFactura(factura, emailMeta)
        }

        if (opts.marcarLeido && facturasEmail.length > 0) {
          await provider.marcarLeido(conexion, emailMeta.id, emailMeta)
        }

      } catch (err) {
        console.error(`[EmailInvoice] Error email "${emailMeta.asunto}":`, err.message)
        resultados.errores.push({ email: emailMeta, error: err.message })
        if (onError) onError(err, emailMeta)
      }
    }
  } finally {
    await provider.desconectar(conexion)
  }

  console.log(`[EmailInvoice] Completado: ${resultados.facturas.length} facturas, ${resultados.procesados} procesados, ${resultados.errores.length} errores`)
  return resultados
}

module.exports = { sync, procesarAdjunto }
