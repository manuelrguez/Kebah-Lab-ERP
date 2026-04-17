const EmailConfig    = require('../models/EmailConfig.js')
const { encrypt, decrypt } = require('../helpers/crypto.helper.js')

const getEmpresaId = (req) => req.tenant?.empresa_id || req.user?.empresa_id || 1

// GET /api/email-config — listar todas las configs de la empresa
exports.getConfigs = async (req, res) => {
  try {
    const empresa_id = getEmpresaId(req)
    const configs = await EmailConfig.findAll({
      where: { empresa_id },
      attributes: ['id','nombre','provider','host','port','tls','usuario','carpeta','filtros_asunto','activo','createdAt'],
      order: [['createdAt', 'ASC']],
    })
    res.json(configs)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Error al obtener configuraciones' })
  }
}

// POST /api/email-config — crear nueva config
exports.createConfig = async (req, res) => {
  try {
    const empresa_id = getEmpresaId(req)
    const { nombre, provider, host, port, tls, usuario, password, carpeta, filtros_asunto } = req.body

    if (!usuario || !password) {
      return res.status(400).json({ message: 'usuario y password son obligatorios' })
    }

    const password_enc = encrypt(password)
    const config = await EmailConfig.create({
      empresa_id,
      nombre:         nombre || 'Principal',
      provider:       provider || 'imap',
      host:           host    || 'imap.gmail.com',
      port:           port    || 993,
      tls:            tls     !== false,
      usuario,
      password_enc,
      carpeta:        carpeta || 'INBOX',
      filtros_asunto: filtros_asunto || ['factura','invoice','recibo'],
    })

    res.json({ success: true, id: config.id, message: 'Configuración creada' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Error al crear configuración' })
  }
}

// PUT /api/email-config/:id — actualizar config
exports.updateConfig = async (req, res) => {
  try {
    const empresa_id = getEmpresaId(req)
    const config = await EmailConfig.findOne({ where: { id: req.params.id, empresa_id } })
    if (!config) return res.status(404).json({ message: 'Configuración no encontrada' })

    const { nombre, provider, host, port, tls, usuario, password, carpeta, filtros_asunto, activo } = req.body
    const updates = { nombre, provider, host, port, tls, usuario, carpeta, filtros_asunto, activo }

    // Solo actualizar password si se envía una nueva
    if (password) updates.password_enc = encrypt(password)

    await config.update(updates)
    res.json({ success: true, message: 'Configuración actualizada' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Error al actualizar configuración' })
  }
}

// DELETE /api/email-config/:id — eliminar config
exports.deleteConfig = async (req, res) => {
  try {
    const empresa_id = getEmpresaId(req)
    await EmailConfig.destroy({ where: { id: req.params.id, empresa_id } })
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ message: 'Error al eliminar configuración' })
  }
}

// POST /api/email-config/:id/test — probar conexión
exports.testConexion = async (req, res) => {
  try {
    const empresa_id = getEmpresaId(req)
    const config = await EmailConfig.findOne({ where: { id: req.params.id, empresa_id } })
    if (!config) return res.status(404).json({ message: 'Configuración no encontrada' })

    const password     = decrypt(config.password_enc)
    const imapProvider = require('../services/email-invoice/providers/imap.provider.js')
    const conexion     = await imapProvider.conectar({
      host: config.host, port: config.port, tls: config.tls,
      usuario: config.usuario, password,
    })
    await imapProvider.desconectar(conexion)
    res.json({ success: true, message: 'Conexión exitosa' })
  } catch (err) {
    res.status(500).json({ message: `Error de conexión: ${err.message}` })
  }
}

// Función interna para obtener credenciales (usada por sync)
exports.getCredentials = async (empresa_id, config_id) => {
  const where = { empresa_id, activo: true }
  if (config_id) where.id = config_id

  const config = await EmailConfig.findOne({ where, order: [['createdAt', 'ASC']] })
  if (!config) return null

  return {
    id:             config.id,
    nombre:         config.nombre,
    provider:       config.provider,
    host:           config.host,
    port:           config.port,
    tls:            config.tls,
    usuario:        config.usuario,
    password:       decrypt(config.password_enc),
    carpeta:        config.carpeta,
    filtros_asunto: config.filtros_asunto,
  }
}
