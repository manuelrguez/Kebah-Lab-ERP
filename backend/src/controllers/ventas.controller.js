const { VentaTPV, Franquicia, sequelize } = require('../models/index.js')
const { Op } = require('sequelize')

// ── STATS DASHBOARD ───────────────────────────────────────────────────────────

exports.getDashboardStats = async (req, res) => {
  try {
    const { tenant } = req
    const where = {}
    if (tenant.franquicia_id) where.franquicia_id = tenant.franquicia_id

    const hoy       = new Date().toISOString().split('T')[0]
    const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
    const inicioAnt = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().split('T')[0]
    const finAnt    = new Date(new Date().getFullYear(), new Date().getMonth(), 0).toISOString().split('T')[0]

    const [hoyData, mesData, mesAntData, franquicias] = await Promise.all([
      VentaTPV.findOne({
        where: { ...where, fecha: hoy },
        attributes: [
          [sequelize.fn('SUM', sequelize.col('total')),       'total'],
          [sequelize.fn('SUM', sequelize.col('num_tickets')), 'tickets'],
        ],
        raw: true,
      }),
      VentaTPV.findOne({
        where: { ...where, fecha: { [Op.between]: [inicioMes, hoy] } },
        attributes: [
          [sequelize.fn('SUM', sequelize.col('total')),       'total'],
          [sequelize.fn('SUM', sequelize.col('num_tickets')), 'tickets'],
        ],
        raw: true,
      }),
      VentaTPV.findOne({
        where: { ...where, fecha: { [Op.between]: [inicioAnt, finAnt] } },
        attributes: [[sequelize.fn('SUM', sequelize.col('total')), 'total']],
        raw: true,
      }),
      Franquicia.count({ where: { activo: true } }),
    ])

    const ventasMes    = parseFloat(mesData?.total    || 0)
    const ventasAntMes = parseFloat(mesAntData?.total || 0)
    const pctVsMes     = ventasAntMes > 0
      ? parseFloat(((ventasMes - ventasAntMes) / ventasAntMes * 100).toFixed(1))
      : 0

    const ventasHoy  = parseFloat(hoyData?.total   || 0)
    const ticketsHoy = parseInt(hoyData?.tickets   || 0)
    const ticketMedio = ticketsHoy > 0 ? parseFloat((ventasHoy / ticketsHoy).toFixed(2)) : 0

    res.json({
      ventas_hoy:      ventasHoy,
      tickets_hoy:     ticketsHoy,
      ticket_medio:    ticketMedio,
      ventas_mes:      ventasMes,
      pct_vs_mes_ant:  pctVsMes,
      franquicias_activas: franquicias,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Error al obtener stats' })
  }
}

// ── VENTAS POR DÍA (para gráfica) ────────────────────────────────────────────

exports.getVentasPorDia = async (req, res) => {
  try {
    const { tenant } = req
    const { dias = 30, franquicia_id } = req.query
    const where = {}

    if (tenant.franquicia_id)        where.franquicia_id = tenant.franquicia_id
    else if (franquicia_id)          where.franquicia_id = franquicia_id

    const desde = new Date()
    desde.setDate(desde.getDate() - parseInt(dias))
    where.fecha = { [Op.gte]: desde.toISOString().split('T')[0] }

    const ventas = await VentaTPV.findAll({
      where,
      attributes: [
        'fecha',
        [sequelize.fn('SUM', sequelize.col('total')),       'total'],
        [sequelize.fn('SUM', sequelize.col('num_tickets')), 'tickets'],
        [sequelize.fn('SUM', sequelize.col('efectivo')),    'efectivo'],
        [sequelize.fn('SUM', sequelize.col('tarjeta')),     'tarjeta'],
      ],
      group: ['fecha'],
      order: [['fecha', 'ASC']],
      raw: true,
    })

    res.json(ventas.map(v => ({
      fecha:    v.fecha,
      total:    parseFloat(v.total    || 0),
      tickets:  parseInt(v.tickets   || 0),
      efectivo: parseFloat(v.efectivo || 0),
      tarjeta:  parseFloat(v.tarjeta  || 0),
    })))
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Error al obtener ventas por día' })
  }
}

// ── VENTAS POR FRANQUICIA ─────────────────────────────────────────────────────

exports.getVentasPorFranquicia = async (req, res) => {
  try {
    const { tenant } = req
    const { fecha_desde, fecha_hasta } = req.query
    const where = {}

    if (tenant.franquicia_id) where.franquicia_id = tenant.franquicia_id

    const hoy       = new Date().toISOString().split('T')[0]
    const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]

    where.fecha = {
      [Op.between]: [fecha_desde || inicioMes, fecha_hasta || hoy]
    }

    const ventas = await VentaTPV.findAll({
      where,
      attributes: [
        'franquicia_id',
        [sequelize.fn('SUM', sequelize.col('VentaTPV.total')),       'total'],
        [sequelize.fn('SUM', sequelize.col('VentaTPV.num_tickets')), 'tickets'],
      ],
      include: [{
        model: Franquicia,
        as: 'franquicia',
        attributes: ['nombre', 'ciudad'],
      }],
      group: ['franquicia_id', 'franquicia.id', 'franquicia.nombre', 'franquicia.ciudad'],
      order: [[sequelize.fn('SUM', sequelize.col('VentaTPV.total')), 'DESC']],
      raw: false,
    })

    res.json(ventas.map(v => ({
      franquicia_id: v.franquicia_id,
      nombre:        v.franquicia?.nombre || '—',
      ciudad:        v.franquicia?.ciudad || '—',
      total:         parseFloat(v.dataValues.total   || 0),
      tickets:       parseInt(v.dataValues.tickets   || 0),
    })))
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Error al obtener ventas por franquicia' })
  }
}

// ── CRUD VENTAS ───────────────────────────────────────────────────────────────

exports.getAll = async (req, res) => {
  try {
    const { tenant } = req
    const { franquicia_id, fecha_desde, fecha_hasta } = req.query
    const where = {}

    if (tenant.franquicia_id)  where.franquicia_id = tenant.franquicia_id
    else if (franquicia_id)    where.franquicia_id = franquicia_id

    if (fecha_desde || fecha_hasta) {
      where.fecha = {}
      if (fecha_desde) where.fecha[Op.gte] = fecha_desde
      if (fecha_hasta) where.fecha[Op.lte] = fecha_hasta
    }

    const ventas = await VentaTPV.findAll({
      where,
      include: [{ model: Franquicia, as: 'franquicia', attributes: ['id', 'nombre', 'ciudad'] }],
      order: [['fecha', 'DESC'], ['createdAt', 'DESC']],
      limit: 200,
    })
    res.json(ventas)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Error al obtener ventas' })
  }
}

exports.create = async (req, res) => {
  try {
    const { franquicia_id, fecha, total, num_tickets, efectivo, tarjeta, hora_inicio, hora_fin } = req.body
    if (!franquicia_id || !fecha || !total) {
      return res.status(400).json({ message: 'franquicia_id, fecha y total son obligatorios' })
    }
    const venta = await VentaTPV.create({
      franquicia_id, fecha, total: parseFloat(total),
      num_tickets: parseInt(num_tickets || 0),
      efectivo:    parseFloat(efectivo  || 0),
      tarjeta:     parseFloat(tarjeta   || 0),
      hora_inicio, hora_fin,
    })
    res.status(201).json(venta)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Error al crear venta' })
  }
}

exports.update = async (req, res) => {
  try {
    const venta = await VentaTPV.findByPk(req.params.id)
    if (!venta) return res.status(404).json({ message: 'Venta no encontrada' })
    await venta.update(req.body)
    res.json(venta)
  } catch (err) {
    res.status(500).json({ message: 'Error al actualizar venta' })
  }
}

exports.remove = async (req, res) => {
  try {
    const venta = await VentaTPV.findByPk(req.params.id)
    if (!venta) return res.status(404).json({ message: 'Venta no encontrada' })
    await venta.destroy()
    res.json({ message: 'Venta eliminada' })
  } catch (err) {
    res.status(500).json({ message: 'Error al eliminar venta' })
  }
}
