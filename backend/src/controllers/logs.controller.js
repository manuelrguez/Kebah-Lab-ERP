const Log      = require('../models/Log.js')
const { Op }   = require('sequelize')

const ADMIN_ROLES = ['superadmin', 'central']
const FRANC_ROLES = ['empresa', 'franquiciado']

exports.getLogs = async (req, res) => {
  try {
    const { tipo, fecha_desde, fecha_hasta, usuario_id, accion, search, page = 1, limit = 50 } = req.query
    const where = {}

    // tipo: 'admins' | 'franquiciados' | undefined (all)
    if (tipo === 'admins')        where.rol = { [Op.in]: ADMIN_ROLES }
    if (tipo === 'franquiciados') where.rol = { [Op.in]: FRANC_ROLES }

    if (usuario_id) where.usuario_id = usuario_id
    if (accion)     where.accion     = accion

    if (fecha_desde || fecha_hasta) {
      where.createdAt = {}
      if (fecha_desde) where.createdAt[Op.gte] = new Date(fecha_desde)
      if (fecha_hasta) {
        const hasta = new Date(fecha_hasta)
        hasta.setHours(23, 59, 59, 999)
        where.createdAt[Op.lte] = hasta
      }
    }

    if (search) {
      where[Op.or] = [
        { usuario_nombre: { [Op.iLike]: `%${search}%` } },
        { usuario_email:  { [Op.iLike]: `%${search}%` } },
        { descripcion:    { [Op.iLike]: `%${search}%` } },
        { ip:             { [Op.iLike]: `%${search}%` } },
      ]
    }

    const offset = (parseInt(page) - 1) * parseInt(limit)

    const { count, rows } = await Log.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit:  parseInt(limit),
      offset,
    })

    res.json({
      total: count,
      pages: Math.ceil(count / parseInt(limit)),
      page:  parseInt(page),
      logs:  rows,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Error al obtener logs' })
  }
}

exports.getStats = async (req, res) => {
  try {
    const hoy       = new Date(); hoy.setHours(0,0,0,0)
    const manana    = new Date(hoy); manana.setDate(manana.getDate() + 1)

    const [total, hoy_count, logins, errores] = await Promise.all([
      Log.count(),
      Log.count({ where: { createdAt: { [Op.between]: [hoy, manana] } } }),
      Log.count({ where: { accion: 'LOGIN', createdAt: { [Op.between]: [hoy, manana] } } }),
      Log.count({ where: { status_code: { [Op.gte]: 400 }, createdAt: { [Op.between]: [hoy, manana] } } }),
    ])

    res.json({ total, hoy: hoy_count, logins_hoy: logins, errores_hoy: errores })
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener stats de logs' })
  }
}
