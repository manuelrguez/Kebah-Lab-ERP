/**
 * EMAIL INVOICE SERVICE
 * ─────────────────────────────────────────────────────────────
 * Servicio de alto nivel que integra el extractor con la app.
 * Gestiona configuraciones guardadas, cron jobs y el historial
 * de sincronizaciones.
 *
 * Este archivo es específico de Kebab Lab ERP.
 * El módulo /email-invoice/index.js es el reutilizable.
 */

const cron      = require('node-cron')
const extractor = require('./index.js')

// Almacena los cron jobs activos por configuración
const cronJobs = {}

/**
 * Sincroniza un buzón y guarda las facturas encontradas en la DB.
 * @param {object} config - configuración de email guardada en DB
 * @param {object} empresaContext - { empresa_id, sequelize }
 */
const sincronizar = async (config, empresaContext) => {
  const { Factura, sequelize } = require('../models/index.js')
  const resultado = { importadas: 0, duplicadas: 0, errores: 0, facturas: [] }

  await extractor.sync({
    provider:    config.provider,
    credentials: config.credentials,
    options: {
      carpeta:      config.carpeta      || 'INBOX',
      soloNoLeidos: config.solo_no_leidos !== false,
      marcarLeido:  config.marcar_leido  !== false,
      maxEmails:    config.max_emails    || 50,
      filtros: {
        asunto:      config.filtros_asunto || ['factura', 'invoice', 'recibo', 'albarán'],
        desde:       config.filtros_desde  || null,
        desde_fecha: config.filtros_desde_fecha ? new Date(config.filtros_desde_fecha) : null,
      },
    },

    onFactura: async (factura, emailMeta) => {
      try {
        // Evitar duplicados por número de factura
        if (factura.numero_factura) {
          const existe = await Factura.findOne({
            where: { numero: factura.numero_factura, empresa_id: empresaContext.empresa_id }
          })
          if (existe) { resultado.duplicadas++; return }
        }

        // Generar número correlativo si no tiene
        let numero = factura.numero_factura
        if (!numero) {
          const year = new Date().getFullYear()
          const last = await Factura.findOne({
            where: { empresa_id: empresaContext.empresa_id, numero: { [require('sequelize').Op.like]: `FAC-${year}-%` } },
            order: [['numero', 'DESC']],
          })
          const seq = last ? parseInt(last.numero.split('-')[2]) + 1 : 1
          numero = `FAC-${year}-${String(seq).padStart(3, '0')}`
        }

        await Factura.create({
          empresa_id:               empresaContext.empresa_id,
          numero,
          tipo:                     'recibida',
          cliente_proveedor_nombre: factura.proveedor_nombre || emailMeta.de || '—',
          cliente_proveedor_cif:    factura.proveedor_cif    || null,
          concepto:                 factura.concepto         || emailMeta.asunto || '—',
          base_imponible:           factura.base_imponible   || 0,
          porcentaje_iva:           factura.porcentaje_iva   || 21,
          cuota_iva:                factura.cuota_iva        || 0,
          total:                    factura.total            || 0,
          fecha:                    factura.fecha            || new Date().toISOString().split('T')[0],
          fecha_vencimiento:        factura.fecha_vencimiento || null,
          estado:                   'pendiente',
          ocr_raw:                  factura,
        })

        resultado.importadas++
        resultado.facturas.push({ numero, proveedor: factura.proveedor_nombre, total: factura.total })
      } catch (err) {
        console.error('[EmailInvoice] Error guardando factura:', err.message)
        resultado.errores++
      }
    },

    onError: (err, emailMeta) => {
      console.error(`[EmailInvoice] Error en email ${emailMeta?.id}:`, err.message)
      resultado.errores++
    },
  })

  return resultado
}

// Inicia un cron job para sincronización automática.
// configId: ID de la configuración
// cronExpression: expresión cron de node-cron (ej: cada 4 horas)
// syncFn: función a ejecutar
const iniciarCron = (configId, cronExpression, syncFn) => {
  // Detener el anterior si existe
  if (cronJobs[configId]) {
    cronJobs[configId].stop()
  }

  const job = cron.schedule(cronExpression, async () => {
    console.log(`[EmailInvoice] Sync automático — config ${configId}`)
    try { await syncFn() }
    catch (err) { console.error('[EmailInvoice] Error en sync automático:', err.message) }
  }, { timezone: 'Europe/Madrid' })

  cronJobs[configId] = job
  console.log(`[EmailInvoice] Cron iniciado para config ${configId}: ${cronExpression}`)
  return job
}

const detenerCron = (configId) => {
  if (cronJobs[configId]) {
    cronJobs[configId].stop()
    delete cronJobs[configId]
  }
}

module.exports = { sincronizar, iniciarCron, detenerCron }
