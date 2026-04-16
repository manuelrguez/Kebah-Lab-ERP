/**
 * Email Invoice Controller
 * Endpoints para gestionar configuraciones de email y disparar syncs manuales.
 */

const emailInvoiceService = require('../services/email-invoice/email-invoice.service.js')

// Configuraciones en memoria (en producción guardar en DB)
const configs = {}

// POST /api/email-invoice/config — guardar configuración de buzón
exports.saveConfig = async (req, res) => {
  try {
    const { tenant } = req
    const empresa_id = tenant.empresa_id || req.user.empresa_id

    const config = {
      id:               `${empresa_id}_${Date.now()}`,
      empresa_id,
      provider:         req.body.provider,
      credentials:      req.body.credentials,
      carpeta:          req.body.carpeta          || 'INBOX',
      solo_no_leidos:   req.body.solo_no_leidos   !== false,
      marcar_leido:     req.body.marcar_leido      !== false,
      max_emails:       req.body.max_emails        || 50,
      filtros_asunto:   req.body.filtros_asunto    || ['factura','invoice','recibo'],
      auto_sync:        req.body.auto_sync         || false,
      cron_expression:  req.body.cron_expression   || '0 */4 * * *',
    }

    configs[config.id] = config

    // Iniciar cron si auto_sync está activo
    if (config.auto_sync) {
      emailInvoiceService.iniciarCron(config.id, config.cron_expression, () =>
        emailInvoiceService.sincronizar(config, { empresa_id })
      )
    }

    res.json({ success: true, config_id: config.id, message: 'Configuración guardada' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Error al guardar configuración' })
  }
}

// POST /api/email-invoice/sync/:configId — sync manual
exports.syncManual = async (req, res) => {
  try {
    const { tenant } = req
    const empresa_id = tenant.empresa_id || req.user.empresa_id
    const { configId } = req.params

    const config = configs[configId]
    if (!config) return res.status(404).json({ message: 'Configuración no encontrada' })
    if (config.empresa_id !== empresa_id && req.user.rol !== 'superadmin') {
      return res.status(403).json({ message: 'Sin acceso a esta configuración' })
    }

    const resultado = await emailInvoiceService.sincronizar(config, { empresa_id })
    res.json({ success: true, ...resultado })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: `Error en sync: ${err.message}` })
  }
}

// POST /api/email-invoice/sync-directo — sync sin configuración guardada
exports.syncDirecto = async (req, res) => {
  try {
    const { tenant } = req
    const empresa_id = tenant.empresa_id || req.user.empresa_id
    const { provider, credentials, opciones } = req.body

    if (!provider || !credentials) {
      return res.status(400).json({ message: 'provider y credentials son obligatorios' })
    }

    const config = {
      provider,
      credentials,
      ...(opciones || {}),
    }

    const resultado = await emailInvoiceService.sincronizar(config, { empresa_id })
    res.json({ success: true, ...resultado })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: `Error en sync: ${err.message}` })
  }
}

// GET /api/email-invoice/configs — listar configuraciones activas
exports.getConfigs = async (req, res) => {
  try {
    const empresa_id = req.user.empresa_id
    const misConfigs = Object.values(configs)
      .filter(c => c.empresa_id === empresa_id || req.user.rol === 'superadmin')
      .map(c => ({
        id:              c.id,
        provider:        c.provider,
        carpeta:         c.carpeta,
        auto_sync:       c.auto_sync,
        cron_expression: c.cron_expression,
        // No exponer credentials
      }))
    res.json(misConfigs)
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener configuraciones' })
  }
}

// DELETE /api/email-invoice/config/:configId
exports.deleteConfig = async (req, res) => {
  try {
    const { configId } = req.params
    emailInvoiceService.detenerCron(configId)
    delete configs[configId]
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ message: 'Error al eliminar configuración' })
  }
}

// POST /api/email-invoice/sync-guardado — sync usando config guardada en DB
exports.syncGuardado = async (req, res) => {
  try {
    const { tenant } = req
    const empresa_id = tenant?.empresa_id || req.user?.empresa_id || 1
    const { max_emails, filtros_asunto } = req.body

    const getCredentials = require('./email-config.controller.js').getCredentials
    const credentials = await getCredentials(empresa_id)
    if (!credentials) {
      return res.status(404).json({ message: 'No hay configuración de correo guardada. Ve a Configuración → Correo.' })
    }

    const config = {
      provider:       credentials.provider,
      credentials:    { host: credentials.host, port: credentials.port, tls: credentials.tls, usuario: credentials.usuario, password: credentials.password },
      carpeta:        credentials.carpeta,
      solo_no_leidos: false,
      marcar_leido:   false,
      max_emails:     max_emails || 20,
      filtros_asunto: filtros_asunto?.length ? filtros_asunto : (credentials.filtros_asunto || []),
    }

    res.json({ success: true, mensaje: 'Sync iniciado', importadas: 0, procesados: 0, duplicadas: 0, errores: 0, facturas: [] })

    emailInvoiceService.sincronizar(config, { empresa_id })
      .then(r => console.log(`[EmailInvoice] Sync guardado completado: ${r.importadas} importadas`))
      .catch(e => console.error('[EmailInvoice] Error sync guardado:', e.message))

  } catch (err) {
    console.error(err)
    if (!res.headersSent) res.status(500).json({ message: `Error: ${err.message}` })
  }
}
