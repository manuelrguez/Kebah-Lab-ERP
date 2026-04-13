const { Franquicia, Empresa, Comunidad } = require('../models/index.js')
const { Op } = require('sequelize')

// GET /api/franquicias
exports.getAll = async (req, res) => {
  try {
    const { comunidad_id, empresa_id, tipo, activo, search } = req.query
    const { tenant } = req

    const where = {}

    // Multi-tenant filtering
    if (tenant.franquicia_id) {
      where.id = tenant.franquicia_id
    } else if (!tenant.isGlobal && tenant.empresa_id) {
      where.empresa_id = tenant.empresa_id
    }

    // Optional filters
    if (comunidad_id) where.comunidad_id = comunidad_id
    if (empresa_id && tenant.isGlobal) where.empresa_id = empresa_id
    if (tipo) where.tipo = tipo
    if (activo !== undefined) where.activo = activo === 'true'
    if (search) where.nombre = { [Op.iLike]: `%${search}%` }

    const franquicias = await Franquicia.findAll({
      where,
      include: [
        { model: Empresa,   attributes: ['id', 'nombre', 'cif'] },
        { model: Comunidad, attributes: ['id', 'nombre', 'codigo'] },
      ],
      order: [['nombre', 'ASC']],
    })

    res.json(franquicias)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Error al obtener franquicias' })
  }
}

// GET /api/franquicias/:id
exports.getById = async (req, res) => {
  try {
    const franquicia = await Franquicia.findByPk(req.params.id, {
      include: [
        { model: Empresa,   attributes: ['id', 'nombre', 'cif', 'email'] },
        { model: Comunidad, attributes: ['id', 'nombre', 'codigo'] },
      ],
    })
    if (!franquicia) return res.status(404).json({ message: 'Franquicia no encontrada' })
    res.json(franquicia)
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener franquicia' })
  }
}

// GET /api/franquicias/:id/stats
exports.getStats = async (req, res) => {
  try {
    const { VentaTPV, VentaDelivery, Empleado } = require('../models/index.js')
    const { Op } = require('sequelize')
    const { sequelize } = require('../models/index.js')

    const id = req.params.id
    const hoy = new Date().toISOString().split('T')[0]
    const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString().split('T')[0]

    const [ventasMes, ventasDeliveryMes, empleados] = await Promise.all([
      VentaTPV.findOne({
        where: { franquicia_id: id, fecha: { [Op.between]: [inicioMes, hoy] } },
        attributes: [
          [sequelize.fn('SUM', sequelize.col('total')), 'total'],
          [sequelize.fn('SUM', sequelize.col('num_tickets')), 'tickets'],
        ],
        raw: true,
      }),
      VentaDelivery.findOne({
        where: { franquicia_id: id, fecha: { [Op.between]: [inicioMes, hoy] } },
        attributes: [
          [sequelize.fn('SUM', sequelize.col('total')), 'total'],
          [sequelize.fn('SUM', sequelize.col('num_pedidos')), 'pedidos'],
        ],
        raw: true,
      }),
      Empleado.count({ where: { franquicia_id: id, estado: 'activo' } }),
    ])

    res.json({
      ventas_mes_tpv:      parseFloat(ventasMes?.total)          || 0,
      tickets_mes:         parseInt(ventasMes?.tickets)           || 0,
      ventas_mes_delivery: parseFloat(ventasDeliveryMes?.total)   || 0,
      pedidos_mes:         parseInt(ventasDeliveryMes?.pedidos)   || 0,
      empleados_activos:   empleados,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Error al obtener stats' })
  }
}

// POST /api/franquicias
exports.create = async (req, res) => {
  try {
    const franquicia = await Franquicia.create(req.body)
    res.status(201).json(franquicia)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Error al crear franquicia' })
  }
}

// PUT /api/franquicias/:id
exports.update = async (req, res) => {
  try {
    const franquicia = await Franquicia.findByPk(req.params.id)
    if (!franquicia) return res.status(404).json({ message: 'Franquicia no encontrada' })
    await franquicia.update(req.body)
    res.json(franquicia)
  } catch (err) {
    res.status(500).json({ message: 'Error al actualizar franquicia' })
  }
}

// DELETE /api/franquicias/:id
exports.remove = async (req, res) => {
  try {
    const franquicia = await Franquicia.findByPk(req.params.id)
    if (!franquicia) return res.status(404).json({ message: 'Franquicia no encontrada' })
    await franquicia.update({ activo: false }) // Soft delete
    res.json({ message: 'Franquicia desactivada' })
  } catch (err) {
    res.status(500).json({ message: 'Error al eliminar franquicia' })
  }
}

// GET /api/franquicias/meta/comunidades — lista de comunidades para filtros
exports.getComunidades = async (req, res) => {
  try {
    const comunidades = await Comunidad.findAll({ order: [['nombre', 'ASC']] })
    res.json(comunidades)
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener comunidades' })
  }
}

// GET /api/franquicias/meta/empresas
exports.getEmpresas = async (req, res) => {
  try {
    const where = {}
    if (!req.tenant.isGlobal && req.tenant.empresa_id) {
      where.id = req.tenant.empresa_id
    }
    const empresas = await Empresa.findAll({ where, order: [['nombre', 'ASC']] })
    res.json(empresas)
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener empresas' })
  }
}
