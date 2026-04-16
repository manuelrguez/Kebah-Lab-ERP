const EmailConfig    = require('../models/EmailConfig.js')
const { encrypt, decrypt } = require('../helpers/crypto.helper.js')

// GET /api/email-config — obtener config de la empresa (sin password)
exports.getConfig = async (req, res) => {
  try {
    const empresa_id = req.tenant?.empresa_id || req.user?.empresa_id || 1
    const config = await EmailConfig.findOne({ where: { empresa_id } })
    if (!config) return res.json(null)

    // Nunca devolver la password cifrada al frontend
    res.json({
      id:             config.id,
      provider:       config.provider,
      host:           config.host,
      port:           config.port,
      tls:            config.tls,
      usuario:        config.usuario,
      carpeta:        config.carpeta,
      filtros_asunto: config.filtros_asunto,
      activo:         config.activo,
      configurado:    true,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Error al obtener configuración' })
  }
}

// POST /api/email-config — guardar/actualizar config
exports.saveConfig = async (req, res) => {
  try {
    const empresa_id = req.tenant?.empresa_id || req.user?.empresa_id || 1
    //if (!empresa_id) return res.status(400).json({ message: 'empresa_id requerido' })

    const { provider, host, port, tls, usuario, password, carpeta, filtros_asunto } = req.body
    if (!usuario || !password) {
      return res.status(400).json({ message: 'usuario y password son obligatorios' })
    }

    const password_enc = encrypt(password)

    const [config, created] = await EmailConfig.findOrCreate({
      where: { empresa_id },
      defaults: { empresa_id, provider, host, port, tls, usuario, password_enc, carpeta, filtros_asunto }
    })

    if (!created) {
      await config.update({ provider, host, port, tls, usuario, password_enc, carpeta, filtros_asunto, activo: true })
    }

    res.json({ success: true, message: created ? 'Configuración guardada' : 'Configuración actualizada' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Error al guardar configuración' })
  }
}

// DELETE /api/email-config — eliminar config
exports.deleteConfig = async (req, res) => {
  try {
    const empresa_id = req.tenant?.empresa_id || req.user?.empresa_id || 1
    await EmailConfig.destroy({ where: { empresa_id } })
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ message: 'Error al eliminar configuración' })
  }
}

// POST /api/email-config/test — probar conexión
exports.testConexion = async (req, res) => {
  try {
    const empresa_id = req.tenant?.empresa_id || req.user?.empresa_id || 1
    const config = await EmailConfig.findOne({ where: { empresa_id } })
    if (!config) return res.status(404).json({ message: 'No hay configuración guardada' })

    const password    = decrypt(config.password_enc)
    const imapProvider = require('../services/email-invoice/providers/imap.provider.js')
    const conexion    = await imapProvider.conectar({
      host: config.host, port: config.port, tls: config.tls,
      usuario: config.usuario, password,
    })
    await imapProvider.desconectar(conexion)
    res.json({ success: true, message: 'Conexión exitosa' })
  } catch (err) {
    res.status(500).json({ message: `Error de conexión: ${err.message}` })
  }
}

// Función interna para obtener credenciales descifradas (usada por sync)
exports.getCredentials = async (empresa_id) => {
  const config = await EmailConfig.findOne({ where: { empresa_id, activo: true } })
  if (!config) return null
  return {
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
