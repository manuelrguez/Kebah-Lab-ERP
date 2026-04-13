const path = require('path')
const fs   = require('fs')

const getClient = () => {
  const Anthropic = require('@anthropic-ai/sdk')
  return new Anthropic.default({ apiKey: process.env.ANTHROPIC_API_KEY })
}

// ── CONTEXT BUILDER — fetches real ERP data for Claude ────────────────────────

const buildERPContext = async (tenant) => {
  try {
    const {
      Empleado, Franquicia, Empresa, VentaTPV, VentaDelivery,
      Factura, Nomina, sequelize
    } = require('../models/index.js')
    const { Op } = require('sequelize')

    const where = {}
    if (tenant?.franquicia_id) where.franquicia_id = tenant.franquicia_id

    const hoy       = new Date().toISOString().split('T')[0]
    const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]

    const [
      franquicias, empleados, ventasMes, deliveryMes,
      facturasPendientes, nominasMes
    ] = await Promise.all([
      Franquicia.findAll({
        where: tenant?.isGlobal ? {} : (tenant?.empresa_id ? {} : where),
        attributes: ['id', 'nombre', 'ciudad', 'activo'],
        limit: 20,
      }),
      Empleado.findAll({
        where: { ...where, estado: 'activo' },
        attributes: ['id', 'nombre', 'puesto', 'salario_bruto_anual', 'franquicia_id'],
        limit: 50,
      }),
      VentaTPV.findOne({
        where: { ...where, fecha: { [Op.between]: [inicioMes, hoy] } },
        attributes: [
          [sequelize.fn('SUM', sequelize.col('total')),       'total'],
          [sequelize.fn('SUM', sequelize.col('num_tickets')), 'tickets'],
          [sequelize.fn('COUNT', sequelize.col('id')),        'dias'],
        ],
        raw: true,
      }),
      VentaDelivery.findAll({
        where: { ...where, fecha: { [Op.between]: [inicioMes, hoy] } },
        attributes: [
          'plataforma',
          [sequelize.fn('SUM', sequelize.col('total')),       'total'],
          [sequelize.fn('SUM', sequelize.col('num_pedidos')), 'pedidos'],
        ],
        group: ['plataforma'],
        raw: true,
      }),
      Factura.findAll({
        where: { estado: { [Op.in]: ['pendiente', 'vencida'] } },
        attributes: ['numero', 'cliente_proveedor_nombre', 'total', 'estado', 'fecha_vencimiento'],
        limit: 10,
        order: [['fecha_vencimiento', 'ASC']],
      }),
      Nomina.findOne({
        attributes: [
          [sequelize.fn('SUM', sequelize.col('salario_neto')), 'total_neto'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        ],
        where: {
          periodo: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
        },
        raw: true,
      }),
    ])

    const ventasDeliveryTotal = deliveryMes.reduce((s, d) => s + parseFloat(d.total || 0), 0)
    const masaSalarial = empleados.reduce((s, e) => s + parseFloat(e.salario_bruto_anual || 0), 0)

    return `
## CONTEXTO DEL ERP — KEBAB LAB (datos en tiempo real)
Fecha actual: ${hoy}

### RED DE FRANQUICIAS
- Total franquicias activas: ${franquicias.filter(f => f.activo).length}
- Franquicias: ${franquicias.map(f => `${f.nombre} (${f.ciudad})`).join(', ')}

### RECURSOS HUMANOS
- Empleados activos: ${empleados.length}
- Masa salarial bruta anual: ${masaSalarial.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
- Masa salarial mensual: ${(masaSalarial / 12).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
- Empleados por franquicia: ${
  franquicias.map(f => {
    const count = empleados.filter(e => e.franquicia_id === f.id).length
    return `${f.nombre}: ${count}`
  }).join(', ')
}

### VENTAS TPV (mes actual: ${inicioMes} a ${hoy})
- Total ventas TPV: ${parseFloat(ventasMes?.total || 0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
- Total tickets: ${parseInt(ventasMes?.tickets || 0).toLocaleString()}
- Ticket medio: ${ventasMes?.tickets > 0 ? (ventasMes.total / ventasMes.tickets).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }) : '—'}

### DELIVERY (mes actual)
- Total delivery: ${ventasDeliveryTotal.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
${deliveryMes.map(d => `- ${d.plataforma}: ${parseFloat(d.total).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })} (${d.pedidos} pedidos)`).join('\n')}

### FACTURACIÓN PENDIENTE
${facturasPendientes.length === 0
  ? '- Sin facturas pendientes'
  : facturasPendientes.map(f => `- ${f.numero} · ${f.cliente_proveedor_nombre} · ${parseFloat(f.total).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })} · ${f.estado} · vence: ${f.fecha_vencimiento || '—'}`).join('\n')
}

### NÓMINAS MES ACTUAL
- Nóminas generadas: ${nominasMes?.count || 0}
- Total neto a pagar: ${parseFloat(nominasMes?.total_neto || 0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
`
  } catch (err) {
    console.error('Error building ERP context:', err.message)
    return '## CONTEXTO ERP\nNo se pudo cargar el contexto completo del ERP.'
  }
}

// ── CHAT ──────────────────────────────────────────────────────────────────────

exports.chat = async (req, res) => {
  try {
    const { messages, context } = req.body
    if (!messages?.length) return res.status(400).json({ message: 'messages requerido' })

    const claude     = getClient()
    const erpContext = await buildERPContext(req.tenant)

    const systemPrompt = `Eres el asistente IA de Kebab Lab ERP, un sistema de gestión de franquicias de restaurantes kebab.
Tienes acceso a datos reales del sistema en tiempo real.
Usuario actual: rol=${req.user?.rol}, empresa_id=${req.user?.empresa_id || 'N/A'}.

${erpContext}

## INSTRUCCIONES
- Responde SIEMPRE en español
- Sé conciso pero completo. Usa listas cuando sea apropiado.
- Cuando hagas cálculos, muéstralos brevemente
- Si no tienes datos suficientes para responder con precisión, indícalo
- Puedes hacer recomendaciones de negocio basadas en los datos
- Usa emojis con moderación para mejorar la legibilidad
- Formatea los importes en euros con el símbolo €
${context ? `\nContexto adicional del usuario: ${JSON.stringify(context)}` : ''}`

    const response = await claude.messages.create({
      model:      'claude-opus-4-6',
      max_tokens: 1024,
      system:     systemPrompt,
      messages:   messages.map(m => ({ role: m.role, content: m.content })),
    })

    res.json({ content: response.content[0].text })
  } catch (err) {
    console.error('Chat error:', err)
    res.status(500).json({ message: 'Error al procesar la consulta IA' })
  }
}

// ── OCR ───────────────────────────────────────────────────────────────────────

exports.ocr = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Archivo requerido' })
    const claude   = getClient()
    const fileData = fs.readFileSync(req.file.path)
    const base64   = fileData.toString('base64')
    const isImage  = req.file.mimetype.startsWith('image/')

    const response = await claude.messages.create({
      model:      'claude-opus-4-6',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          isImage
            ? { type: 'image',    source: { type: 'base64', media_type: req.file.mimetype, data: base64 } }
            : { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
          {
            type: 'text',
            text: `Extrae todos los datos de esta factura en formato JSON con exactamente estos campos:
{
  "numero_factura": "",
  "fecha": "YYYY-MM-DD",
  "fecha_vencimiento": "YYYY-MM-DD",
  "proveedor_nombre": "",
  "proveedor_cif": "",
  "concepto": "",
  "base_imponible": 0,
  "porcentaje_iva": 21,
  "cuota_iva": 0,
  "total": 0,
  "moneda": "EUR"
}
Devuelve SOLO el JSON, sin texto adicional ni markdown.`
          }
        ]
      }]
    })

    const raw  = response.content[0].text.replace(/```json|```/g, '').trim()
    const data = JSON.parse(raw)
    fs.unlinkSync(req.file.path)
    res.json({ success: true, data })
  } catch (err) {
    console.error('OCR error:', err)
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path)
    res.status(500).json({ message: 'Error al procesar OCR' })
  }
}

// ── ANALIZAR CV ───────────────────────────────────────────────────────────────

exports.analizarCV = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'CV requerido' })
    const claude   = getClient()
    const { puesto = 'personal de restauración' } = req.body
    const base64   = fs.readFileSync(req.file.path).toString('base64')

    const response = await claude.messages.create({
      model:      'claude-opus-4-6',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
          {
            type: 'text',
            text: `Analiza este CV para el puesto de "${puesto}" en un restaurante de kebab.
Devuelve SOLO un JSON con exactamente esta estructura:
{
  "nombre": "",
  "email": "",
  "telefono": "",
  "puntuacion_adecuacion": 0,
  "puntuacion_experiencia": 0,
  "puntuacion_idiomas": 0,
  "puntuacion_total": 0,
  "experiencia_años": 0,
  "idiomas": [],
  "certificaciones": [],
  "fortalezas": [],
  "areas_mejora": [],
  "recomendacion": "contratar|revisar|descartar",
  "resumen_ia": ""
}
Sin texto adicional ni markdown.`
          }
        ]
      }]
    })

    const raw  = response.content[0].text.replace(/```json|```/g, '').trim()
    const data = JSON.parse(raw)
    fs.unlinkSync(req.file.path)
    res.json({ success: true, data })
  } catch (err) {
    console.error('CV error:', err)
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path)
    res.status(500).json({ message: 'Error al analizar CV' })
  }
}

// ── GENERAR INFORME ───────────────────────────────────────────────────────────

exports.generarInforme = async (req, res) => {
  try {
    const { tipo, periodo, franquicias } = req.body
    const claude     = getClient()
    const erpContext = await buildERPContext(req.tenant)

    const response = await claude.messages.create({
      model:      'claude-opus-4-6',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: `Genera un informe ejecutivo de tipo "${tipo}" para el periodo "${periodo}".
${franquicias?.length ? `Franquicias a analizar: ${franquicias.join(', ')}` : 'Análisis global de toda la red.'}

${erpContext}

El informe debe incluir:
1. Resumen ejecutivo (3-4 párrafos)
2. Análisis de puntos clave con datos concretos
3. Tendencias identificadas
4. Puntos de atención y riesgos
5. Recomendaciones accionables (mínimo 3)

Responde en español con formato estructurado usando markdown.`
      }]
    })

    res.json({ success: true, informe: response.content[0].text })
  } catch (err) {
    console.error('Informe error:', err)
    res.status(500).json({ message: 'Error al generar informe' })
  }
}
