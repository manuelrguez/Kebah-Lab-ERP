const { Empleado, Nomina, Franquicia, sequelize } = require('../models/index.js')
const { Op } = require('sequelize')

// ── EMPLEADOS ─────────────────────────────────────────────────────────────────

exports.getEmpleados = async (req, res) => {
  try {
    const { franquicia_id, estado, search } = req.query
    const { tenant } = req
    const where = {}

    if (tenant.franquicia_id)       where.franquicia_id = tenant.franquicia_id
    else if (franquicia_id)         where.franquicia_id = franquicia_id

    if (estado)  where.estado = estado
    if (search)  where.nombre = { [Op.iLike]: `%${search}%` }

    const empleados = await Empleado.findAll({
      where,
      include: [{ model: Franquicia, as: 'franquicia', attributes: ['id', 'nombre', 'ciudad'] }],
      order: [['nombre', 'ASC']],
    })
    res.json(empleados)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Error al obtener empleados' })
  }
}

exports.getEmpleadoById = async (req, res) => {
  try {
    const emp = await Empleado.findByPk(req.params.id, {
      include: [{ model: Franquicia, as: 'franquicia', attributes: ['id', 'nombre'] }],
    })
    if (!emp) return res.status(404).json({ message: 'Empleado no encontrado' })
    res.json(emp)
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener empleado' })
  }
}

exports.createEmpleado = async (req, res) => {
  try {
    const emp = await Empleado.create(req.body)
    res.status(201).json(emp)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Error al crear empleado' })
  }
}

exports.updateEmpleado = async (req, res) => {
  try {
    const emp = await Empleado.findByPk(req.params.id)
    if (!emp) return res.status(404).json({ message: 'Empleado no encontrado' })
    await emp.update(req.body)
    res.json(emp)
  } catch (err) {
    res.status(500).json({ message: 'Error al actualizar empleado' })
  }
}

exports.deleteEmpleado = async (req, res) => {
  try {
    const emp = await Empleado.findByPk(req.params.id)
    if (!emp) return res.status(404).json({ message: 'Empleado no encontrado' })
    await emp.update({ estado: 'baja' })
    res.json({ message: 'Empleado dado de baja' })
  } catch (err) {
    res.status(500).json({ message: 'Error al dar de baja' })
  }
}

// ── NÓMINAS ───────────────────────────────────────────────────────────────────

exports.getNominas = async (req, res) => {
  try {
    const { empleado_id, periodo } = req.query
    const where = {}
    if (empleado_id) where.empleado_id = empleado_id
    if (periodo)     where.periodo     = periodo

    const nominas = await Nomina.findAll({
      where,
      include: [{
        model: Empleado,
        as: 'empleado',
        attributes: ['id', 'nombre', 'puesto'],
        include: [{ model: Franquicia, as: 'franquicia', attributes: ['id', 'nombre'] }],
      }],
      order: [['periodo', 'DESC']],
    })
    res.json(nominas)
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener nóminas' })
  }
}

exports.generarNominas = async (req, res) => {
  try {
    const { periodo, franquicia_id } = req.body
    if (!periodo) return res.status(400).json({ message: 'Periodo requerido (YYYY-MM)' })

    const where = { estado: 'activo' }
    if (franquicia_id) where.franquicia_id = franquicia_id
    else if (req.tenant.franquicia_id) where.franquicia_id = req.tenant.franquicia_id

    const empleados = await Empleado.findAll({ where })
    if (!empleados.length) return res.status(400).json({ message: 'No hay empleados activos' })

    const IRPF    = 0.15  // 15% simplificado
    const SS_EMP  = 0.0635 // 6.35% SS empleado

    const nominas = await Promise.all(empleados.map(async (emp) => {
      const salario_bruto  = parseFloat(emp.salario_bruto_anual || 0) / 12
      const irpf           = parseFloat((salario_bruto * IRPF).toFixed(2))
      const ss             = parseFloat((salario_bruto * SS_EMP).toFixed(2))
      const deducciones    = parseFloat((irpf + ss).toFixed(2))
      const salario_neto   = parseFloat((salario_bruto - deducciones).toFixed(2))

      // Upsert — avoid duplicates per employee+period
      const [nomina] = await Nomina.findOrCreate({
        where: { empleado_id: emp.id, periodo },
        defaults: {
          salario_bruto:    parseFloat(salario_bruto.toFixed(2)),
          deducciones,
          salario_neto,
          irpf_pct:         IRPF * 100,
          ss_empleado_pct:  SS_EMP * 100,
          estado:           'procesada',
        },
      })
      return nomina
    }))

    res.json({ message: `${nominas.length} nóminas generadas para ${periodo}`, nominas })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Error al generar nóminas' })
  }
}

exports.updateNomina = async (req, res) => {
  try {
    const nomina = await Nomina.findByPk(req.params.id)
    if (!nomina) return res.status(404).json({ message: 'Nómina no encontrada' })
    await nomina.update(req.body)
    res.json(nomina)
  } catch (err) {
    res.status(500).json({ message: 'Error al actualizar nómina' })
  }
}

// ── ESTADÍSTICAS RRHH ─────────────────────────────────────────────────────────

exports.getStats = async (req, res) => {
  try {
    //const { sequelize } = require('../models/index.js')
    const where = {}
    if (req.tenant.franquicia_id) where.franquicia_id = req.tenant.franquicia_id

    const [total, activos, bajas, masaSalarial] = await Promise.all([
      Empleado.count({ where }),
      Empleado.count({ where: { ...where, estado: 'activo' } }),
      Empleado.count({ where: { ...where, estado: 'baja' } }),
      Empleado.findOne({
        where: { ...where, estado: 'activo' },
        attributes: [[sequelize.fn('SUM', sequelize.col('salario_bruto_anual')), 'total']],
        raw: true,
      }),
    ])

    res.json({
      total,
      activos,
      bajas,
      vacaciones: await Empleado.count({ where: { ...where, estado: 'vacaciones' } }),
      masa_salarial_anual:  parseFloat(masaSalarial?.total || 0),
      masa_salarial_mensual: parseFloat((masaSalarial?.total || 0) / 12),
    })
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener stats' })
  }
}
