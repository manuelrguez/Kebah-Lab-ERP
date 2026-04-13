const { VentaDelivery, Franquicia, sequelize } = require('../models/index.js')
const { Op } = require('sequelize')

const PLATAFORMAS = ['glovo', 'ubereats', 'justeat']

// ── STATS CONSOLIDADAS ────────────────────────────────────────────────────────

exports.getResumen = async (req, res) => {
  try {
    const { tenant } = req
    const { fecha_desde, fecha_hasta } = req.query
    const where = {}
    if (tenant.franquicia_id) where.franquicia_id = tenant.franquicia_id

    const hoy       = new Date().toISOString().split('T')[0]
    const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]

    where.fecha = { [Op.between]: [fecha_desde || inicioMes, fecha_hasta || hoy] }

    // Stats por plataforma
    const porPlataforma = await VentaDelivery.findAll({
      where,
      attributes: [
        'plataforma',
        [sequelize.fn('SUM', sequelize.col('total')),      'total'],
        [sequelize.fn('SUM', sequelize.col('num_pedidos')), 'pedidos'],
        [sequelize.fn('AVG', sequelize.col('comision_pct')), 'comision_avg'],
        [sequelize.fn('COUNT', sequelize.col('id')),        'registros'],
      ],
      group: ['plataforma'],
      raw: true,
    })

    // Stats totales
    const totales = await VentaDelivery.findOne({
      where,
      attributes: [
        [sequelize.fn('SUM', sequelize.col('total')),       'total'],
        [sequelize.fn('SUM', sequelize.col('num_pedidos')), 'pedidos'],
      ],
      raw: true,
    })

    // Hoy
    const hoyData = await VentaDelivery.findOne({
      where: { ...where, fecha: hoy },
      attributes: [
        [sequelize.fn('SUM', sequelize.col('total')),       'total'],
        [sequelize.fn('SUM', sequelize.col('num_pedidos')), 'pedidos'],
      ],
      raw: true,
    })

    const result = {}
    PLATAFORMAS.forEach(p => {
      const d = porPlataforma.find(x => x.plataforma === p) || {}
      result[p] = {
        total:       parseFloat(d.total       || 0),
        pedidos:     parseInt(d.pedidos       || 0),
        comision:    parseFloat(d.comision_avg || 0),
        ticket_medio: d.pedidos > 0 ? parseFloat((d.total / d.pedidos).toFixed(2)) : 0,
      }
    })

    res.json({
      por_plataforma: result,
      total_mes:      parseFloat(totales?.total   || 0),
      pedidos_mes:    parseInt(totales?.pedidos   || 0),
      total_hoy:      parseFloat(hoyData?.total   || 0),
      pedidos_hoy:    parseInt(hoyData?.pedidos   || 0),
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Error al obtener resumen delivery' })
  }
}

// ── PEDIDOS POR DÍA ───────────────────────────────────────────────────────────

exports.getPedidosPorDia = async (req, res) => {
  try {
    const { tenant } = req
    const { dias = 30, plataforma, franquicia_id } = req.query
    const where = {}
    if (tenant.franquicia_id)  where.franquicia_id = tenant.franquicia_id
    else if (franquicia_id)    where.franquicia_id = franquicia_id
    if (plataforma) where.plataforma = plataforma

    const desde = new Date()
    desde.setDate(desde.getDate() - parseInt(dias))
    where.fecha = { [Op.gte]: desde.toISOString().split('T')[0] }

    const data = await VentaDelivery.findAll({
      where,
      attributes: [
        'fecha', 'plataforma',
        [sequelize.fn('SUM', sequelize.col('total')),       'total'],
        [sequelize.fn('SUM', sequelize.col('num_pedidos')), 'pedidos'],
      ],
      group: ['fecha', 'plataforma'],
      order: [['fecha', 'ASC']],
      raw: true,
    })

    // Pivot by date
    const byDate = {}
    data.forEach(d => {
      if (!byDate[d.fecha]) byDate[d.fecha] = { fecha: d.fecha, glovo: 0, ubereats: 0, justeat: 0, total: 0 }
      byDate[d.fecha][d.plataforma] = parseFloat(d.total || 0)
      byDate[d.fecha].total += parseFloat(d.total || 0)
    })

    res.json(Object.values(byDate))
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Error al obtener pedidos por día' })
  }
}

// ── PEDIDOS LISTADO ───────────────────────────────────────────────────────────

exports.getPedidos = async (req, res) => {
  try {
    const { tenant } = req
    const { plataforma, franquicia_id, fecha_desde, fecha_hasta } = req.query
    const where = {}
    if (tenant.franquicia_id)  where.franquicia_id = tenant.franquicia_id
    else if (franquicia_id)    where.franquicia_id = franquicia_id
    if (plataforma) where.plataforma = plataforma

    const hoy       = new Date().toISOString().split('T')[0]
    const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
    where.fecha = { [Op.between]: [fecha_desde || inicioMes, fecha_hasta || hoy] }

    const pedidos = await VentaDelivery.findAll({
      where,
      include: [{ model: Franquicia, as: 'franquicia', attributes: ['id', 'nombre', 'ciudad'] }],
      order: [['fecha', 'DESC']],
      limit: 300,
    })
    res.json(pedidos)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Error al obtener pedidos' })
  }
}

// ── SYNC PLATAFORMA ───────────────────────────────────────────────────────────

exports.syncPlataforma = async (req, res) => {
  try {
    const { plataforma } = req.params
    if (!PLATAFORMAS.includes(plataforma)) {
      return res.status(400).json({ message: 'Plataforma no válida' })
    }

    const { tenant } = req
    // In production: call actual platform API
    // Here we simulate a successful sync
    const service = require(`../services/${plataforma}.service.js`)
    let result = { synced: 0, message: 'Sync simulado' }

    if (typeof service.sync === 'function') {
      result = await service.sync(tenant)
    } else {
      // Simulate: create today's data if not exists
      const franquicias = await Franquicia.findAll({
        where: tenant.isGlobal ? { activo: true } :
               tenant.empresa_id ? { activo: true } :
               { id: tenant.franquicia_id },
      })

      const hoy = new Date().toISOString().split('T')[0]
      const comisiones = { glovo: 25, ubereats: 30, justeat: 22 }

      for (const f of franquicias) {
        const [, created] = await VentaDelivery.findOrCreate({
          where: { franquicia_id: f.id, plataforma, fecha: hoy },
          defaults: {
            total:       Math.round((Math.random() * 800 + 200) * 100) / 100,
            num_pedidos: Math.round(Math.random() * 60 + 10),
            comision_pct: comisiones[plataforma],
          },
        })
        if (created) result.synced++
      }
      result.message = `${result.synced} registros sincronizados de ${plataforma}`
    }

    res.json({ success: true, plataforma, ...result, timestamp: new Date() })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: `Error al sincronizar ${req.params.plataforma}` })
  }
}

exports.syncAll = async (req, res) => {
  try {
    const results = {}
    for (const p of PLATAFORMAS) {
      req.params = { plataforma: p }
      // Simple sequential sync
      const franquicias = await Franquicia.findAll({ where: { activo: true } })
      const hoy = new Date().toISOString().split('T')[0]
      const comisiones = { glovo: 25, ubereats: 30, justeat: 22 }
      let synced = 0
      for (const f of franquicias) {
        const [, created] = await VentaDelivery.findOrCreate({
          where: { franquicia_id: f.id, plataforma: p, fecha: hoy },
          defaults: {
            total:       Math.round((Math.random() * 800 + 200) * 100) / 100,
            num_pedidos: Math.round(Math.random() * 60 + 10),
            comision_pct: comisiones[p],
          },
        })
        if (created) synced++
      }
      results[p] = synced
    }
    res.json({ success: true, results, timestamp: new Date() })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Error en sync all' })
  }
}

// ── STATUS PLATAFORMAS ────────────────────────────────────────────────────────

exports.getStatus = async (req, res) => {
  const hoy = new Date().toISOString().split('T')[0]
  try {
    const ultima = await VentaDelivery.findAll({
      attributes: [
        'plataforma',
        [sequelize.fn('MAX', sequelize.col('updatedAt')), 'ultima_sync'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'registros_hoy'],
      ],
      where: { fecha: hoy },
      group: ['plataforma'],
      raw: true,
    })

    const status = {}
    PLATAFORMAS.forEach(p => {
      const d = ultima.find(x => x.plataforma === p)
      status[p] = {
        conectado:   !!d,
        ultima_sync: d?.ultima_sync || null,
        registros_hoy: parseInt(d?.registros_hoy || 0),
      }
    })
    res.json(status)
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener status' })
  }
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

exports.create = async (req, res) => {
  try {
    const venta = await VentaDelivery.create(req.body)
    res.status(201).json(venta)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Error al crear registro delivery' })
  }
}

exports.update = async (req, res) => {
  try {
    const v = await VentaDelivery.findByPk(req.params.id)
    if (!v) return res.status(404).json({ message: 'Registro no encontrado' })
    await v.update(req.body)
    res.json(v)
  } catch (err) {
    res.status(500).json({ message: 'Error al actualizar' })
  }
}

exports.remove = async (req, res) => {
  try {
    const v = await VentaDelivery.findByPk(req.params.id)
    if (!v) return res.status(404).json({ message: 'Registro no encontrado' })
    await v.destroy()
    res.json({ message: 'Eliminado' })
  } catch (err) {
    res.status(500).json({ message: 'Error al eliminar' })
  }
}
