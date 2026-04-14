const jwt = require('jsonwebtoken')
const { Usuario } = require('../models/index.js')

const signToken = (user) => jwt.sign(
  { id: user.id, rol: user.rol, empresa_id: user.empresa_id, franquicia_id: user.franquicia_id },
  process.env.JWT_SECRET,
  { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
)

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ message: 'Email y contraseña requeridos' })

    const user = await Usuario.findOne({ where: { email, activo: true } })
    if (!user || !(await user.checkPassword(password))) {
      return res.status(401).json({ message: 'Credenciales incorrectas' })
    }

    await user.update({ ultimo_acceso: new Date() })
    const token = signToken(user)

    try {
      const Log = require('../models/Log.js')
      await Log.create({
        usuario_id:     user.id,
        usuario_nombre: user.nombre,
        usuario_email:  user.email,
        rol:            user.rol,
        accion:         'LOGIN',
        modulo:         'auth',
        descripcion:    `Inicio de sesión: ${user.email}`,
        ip:             req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip || '—',
        user_agent:     req.headers['user-agent']?.substring(0, 200) || '—',
        metodo:         'POST',
        ruta:           '/api/auth/login',
        status_code:    200,
        duracion_ms:    0,
      })
    } catch (e) { console.error('[LOG LOGIN]', e.message) }

    res.json({
      token,
      user: {
        id: user.id, nombre: user.nombre, email: user.email,
        rol: user.rol, empresa_id: user.empresa_id, franquicia_id: user.franquicia_id,
      }
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Error del servidor' })
  }
}

exports.logout = (_req, res) => res.json({ message: 'Sesión cerrada' })

exports.me = async (req, res) => {
  try {
    const user = await Usuario.findByPk(req.user.id)
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' })
    res.json(user)
  } catch (err) {
    res.status(500).json({ message: 'Error del servidor' })
  }
}
