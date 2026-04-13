const { Factura, Empresa, sequelize } = require('../models/index.js')
const { Op } = require('sequelize')
const path = require('path')
const fs   = require('fs')

// ── HELPERS ───────────────────────────────────────────────────────────────────

const getNextNumero = async (empresa_id) => {
  const year = new Date().getFullYear()
  const last = await Factura.findOne({
    where: {
      empresa_id,
      numero: { [Op.like]: `FAC-${year}-%` },
    },
    order: [['numero', 'DESC']],
  })
  if (!last) return `FAC-${year}-001`
  const seq = parseInt(last.numero.split('-')[2]) + 1
  return `FAC-${year}-${String(seq).padStart(3, '0')}`
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

exports.getAll = async (req, res) => {
  try {
    const { tipo, estado, search, fecha_desde, fecha_hasta } = req.query
    const { tenant } = req
    const where = {}

    if (!tenant.isGlobal && tenant.empresa_id) where.empresa_id = tenant.empresa_id
    if (tipo)   where.tipo   = tipo
    if (estado) where.estado = estado
    if (search) {
      where[Op.or] = [
        { numero: { [Op.iLike]: `%${search}%` } },
        { cliente_proveedor_nombre: { [Op.iLike]: `%${search}%` } },
        { concepto: { [Op.iLike]: `%${search}%` } },
      ]
    }
    if (fecha_desde || fecha_hasta) {
      where.fecha = {}
      if (fecha_desde) where.fecha[Op.gte] = fecha_desde
      if (fecha_hasta) where.fecha[Op.lte] = fecha_hasta
    }

    const facturas = await Factura.findAll({
      where,
      include: [{ model: Empresa, attributes: ['id', 'nombre', 'cif'] }],
      order: [['numero', 'DESC']],
    })
    res.json(facturas)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Error al obtener facturas' })
  }
}

exports.getById = async (req, res) => {
  try {
    const f = await Factura.findByPk(req.params.id, {
      include: [{ model: Empresa, attributes: ['id', 'nombre', 'cif'] }],
    })
    if (!f) return res.status(404).json({ message: 'Factura no encontrada' })
    res.json(f)
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener factura' })
  }
}

exports.create = async (req, res) => {
  try {
    const { tenant } = req
    const empresa_id = req.body.empresa_id || tenant.empresa_id
    if (!empresa_id) return res.status(400).json({ message: 'empresa_id requerido' })

    const numero = await getNextNumero(empresa_id)
    const base   = parseFloat(req.body.base_imponible || 0)
    const ivaPct = parseFloat(req.body.porcentaje_iva || 21)
    const iva    = parseFloat((base * ivaPct / 100).toFixed(2))
    const total  = parseFloat((base + iva).toFixed(2))

    const factura = await Factura.create({
      ...req.body,
      empresa_id,
      numero,
      cuota_iva: iva,
      total,
    })
    res.status(201).json(factura)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Error al crear factura' })
  }
}

exports.update = async (req, res) => {
  try {
    const factura = await Factura.findByPk(req.params.id)
    if (!factura) return res.status(404).json({ message: 'Factura no encontrada' })

    // Recalculate totals if base changes
    if (req.body.base_imponible !== undefined) {
      const base   = parseFloat(req.body.base_imponible)
      const ivaPct = parseFloat(req.body.porcentaje_iva || factura.porcentaje_iva || 21)
      req.body.cuota_iva = parseFloat((base * ivaPct / 100).toFixed(2))
      req.body.total     = parseFloat((base + req.body.cuota_iva).toFixed(2))
    }

    await factura.update(req.body)
    res.json(factura)
  } catch (err) {
    res.status(500).json({ message: 'Error al actualizar factura' })
  }
}

exports.remove = async (req, res) => {
  try {
    const factura = await Factura.findByPk(req.params.id)
    if (!factura) return res.status(404).json({ message: 'Factura no encontrada' })
    await factura.update({ estado: 'anulada' })
    res.json({ message: 'Factura anulada' })
  } catch (err) {
    res.status(500).json({ message: 'Error al anular factura' })
  }
}

// ── STATS ─────────────────────────────────────────────────────────────────────

exports.getStats = async (req, res) => {
  try {
    const { tenant } = req
    const where = {}
    if (!tenant.isGlobal && tenant.empresa_id) where.empresa_id = tenant.empresa_id

    const year  = new Date().getFullYear()
    const month = new Date().getMonth() + 1
    const mesStr = `${year}-${String(month).padStart(2, '0')}`

    const [emitidas, recibidas, pendientes, vencidas, totalMes] = await Promise.all([
      Factura.findOne({
        where: { ...where, tipo: 'emitida', estado: { [Op.ne]: 'anulada' } },
        attributes: [[sequelize.fn('SUM', sequelize.col('total')), 'total'],
                     [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
        raw: true,
      }),
      Factura.findOne({
        where: { ...where, tipo: 'recibida', estado: { [Op.ne]: 'anulada' } },
        attributes: [[sequelize.fn('SUM', sequelize.col('total')), 'total'],
                     [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
        raw: true,
      }),
      Factura.count({ where: { ...where, estado: 'pendiente' } }),
      Factura.count({ where: { ...where, estado: 'vencida' } }),
      Factura.findOne({
        where: {
          ...where,
          tipo: 'emitida',
          estado: 'pagada',
          numero: { [Op.like]: `FAC-${year}-%` },
        },
        attributes: [[sequelize.fn('SUM', sequelize.col('total')), 'total']],
        raw: true,
      }),
    ])

    res.json({
      total_emitido:  parseFloat(emitidas?.total  || 0),
      count_emitidas: parseInt(emitidas?.count    || 0),
      total_recibido: parseFloat(recibidas?.total || 0),
      count_recibidas:parseInt(recibidas?.count   || 0),
      pendientes,
      vencidas,
      cobrado_mes:    parseFloat(totalMes?.total  || 0),
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Error al obtener stats' })
  }
}

// ── EXPORT ZIP ────────────────────────────────────────────────────────────────

exports.exportZip = async (req, res) => {
  try {
    const { ids } = req.body
    if (!ids?.length) return res.status(400).json({ message: 'Selecciona al menos una factura' })

    const archiver = require('archiver')
    const PDFDocument = require('pdfkit')

    const facturas = await Factura.findAll({
      where: { id: { [Op.in]: ids } },
      include: [{ model: Empresa, attributes: ['nombre', 'cif'] }],
    })

    res.setHeader('Content-Type', 'application/zip')
    res.setHeader('Content-Disposition', `attachment; filename="facturas-gestoria-${Date.now()}.zip"`)

    const archive = archiver('zip', { zlib: { level: 9 } })
    archive.pipe(res)

    for (const f of facturas) {
      // Generate PDF in memory
      const pdfBuffer = await new Promise((resolve, reject) => {
        const doc    = new PDFDocument({ margin: 50, size: 'A4' })
        const chunks = []
        doc.on('data',  chunk => chunks.push(chunk))
        doc.on('end',   () => resolve(Buffer.concat(chunks)))
        doc.on('error', reject)

        const gold   = '#C49A2A'
        const dark   = '#1a1a2e'
        const gray   = '#666666'
        const light  = '#f5f5f5'

        // Header bar
        doc.rect(0, 0, 595, 80).fill(dark)
        doc.fontSize(22).fillColor('#FFFFFF').font('Helvetica-Bold')
           .text('KEBAB LAB ERP', 50, 25)
        doc.fontSize(10).fillColor(gold)
           .text('Sistema de Gestión de Franquicias', 50, 52)

        // Factura number badge
        doc.rect(400, 15, 145, 50).fill(gold)
        doc.fontSize(9).fillColor(dark).font('Helvetica')
           .text('FACTURA', 415, 22)
        doc.fontSize(16).fillColor(dark).font('Helvetica-Bold')
           .text(f.numero, 415, 34)

        doc.moveDown(3)

        // Empresa info
        doc.fontSize(9).fillColor(gray).font('Helvetica')
           .text(`Empresa: ${f.Empresa?.nombre || ''}  ·  CIF: ${f.Empresa?.cif || ''}`, 50, 100)

        // Divider
        doc.moveTo(50, 115).lineTo(545, 115).strokeColor(gold).lineWidth(1.5).stroke()

        // Two columns: bill from / bill to
        doc.rect(50, 125, 230, 90).fill(light)
        doc.rect(310, 125, 230, 90).fill(light)

        doc.fontSize(8).fillColor(gray).font('Helvetica')
        doc.text(f.tipo === 'emitida' ? 'FACTURADO A:' : 'PROVEEDOR:', 60, 133)
        doc.text('DATOS FACTURA:', 320, 133)

        doc.fontSize(11).fillColor(dark).font('Helvetica-Bold')
           .text(f.cliente_proveedor_nombre || '—', 60, 147, { width: 210 })
        doc.fontSize(9).fillColor(gray).font('Helvetica')
        if (f.cliente_proveedor_cif) doc.text(`CIF: ${f.cliente_proveedor_cif}`, 60, 165)

        doc.fontSize(9).fillColor(dark).font('Helvetica')
           .text(`Fecha emisión: ${f.fecha || '—'}`, 320, 147)
           .text(`Vencimiento:   ${f.fecha_vencimiento || '—'}`, 320, 161)
           .text(`Estado:        ${(f.estado || '').toUpperCase()}`, 320, 175)
           .text(`Tipo:          ${(f.tipo   || '').toUpperCase()}`, 320, 189)

        // Concept table header
        doc.rect(50, 230, 495, 22).fill(dark)
        doc.fontSize(9).fillColor('#FFFFFF').font('Helvetica-Bold')
           .text('CONCEPTO', 60, 237)
           .text('BASE', 350, 237)
           .text('IVA', 420, 237)
           .text('TOTAL', 480, 237)

        // Concept row
        doc.rect(50, 252, 495, 30).fill(light)
        doc.fontSize(10).fillColor(dark).font('Helvetica')
           .text(f.concepto || '—', 60, 260, { width: 280 })
           .text(`${parseFloat(f.base_imponible || 0).toFixed(2)} €`,  350, 260)
           .text(`${f.porcentaje_iva || 21}%`, 420, 260)
           .text(`${parseFloat(f.total || 0).toFixed(2)} €`,           480, 260)

        // Totals box
        doc.rect(350, 300, 195, 80).fill(dark)
        doc.fontSize(9).fillColor(gold).font('Helvetica')
           .text('Base imponible:', 360, 312)
           .text('IVA:', 360, 328)
           .text('Retención IRPF:', 360, 344)
        doc.fontSize(9).fillColor('#FFFFFF')
           .text(`${parseFloat(f.base_imponible || 0).toFixed(2)} €`, 480, 312, { align: 'right', width: 55 })
           .text(`${parseFloat(f.cuota_iva || 0).toFixed(2)} €`,      480, 328, { align: 'right', width: 55 })
           .text('0,00 €',                                             480, 344, { align: 'right', width: 55 })

        doc.moveTo(360, 358).lineTo(535, 358).strokeColor(gold).lineWidth(0.5).stroke()
        doc.fontSize(13).fillColor(gold).font('Helvetica-Bold')
           .text('TOTAL:', 360, 363)
           .text(`${parseFloat(f.total || 0).toFixed(2)} €`, 430, 363, { align: 'right', width: 105 })

        // Footer
        doc.rect(0, 750, 595, 92).fill(dark)
        doc.fontSize(8).fillColor(gray).font('Helvetica')
           .text('Kebab Lab ERP · Sistema de Gestión de Franquicias', 50, 762, { align: 'center', width: 495 })
           .text(`Documento generado automáticamente el ${new Date().toLocaleDateString('es-ES')}`, 50, 776, { align: 'center', width: 495 })

        doc.end()
      })

      archive.append(pdfBuffer, { name: `${f.numero}.pdf` })
    }

    await archive.finalize()
  } catch (err) {
    console.error(err)
    if (!res.headersSent) res.status(500).json({ message: 'Error al generar ZIP' })
  }
}

// ── OCR IMPORT ────────────────────────────────────────────────────────────────

exports.importOCR = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Archivo requerido' })
    const iaCtrl = require('./ia.controller.js')
    // Reuse ia OCR logic
    await iaCtrl.ocr(req, res)
  } catch (err) {
    res.status(500).json({ message: 'Error en OCR' })
  }
}
