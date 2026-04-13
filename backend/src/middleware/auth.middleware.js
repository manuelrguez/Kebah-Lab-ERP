const jwt = require('jsonwebtoken')

const authMiddleware = (req, res, next) => {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token no proporcionado' })
  }
  try {
    const token = header.split(' ')[1]
    req.user = jwt.verify(token, process.env.JWT_SECRET)
    next()
  } catch {
    res.status(401).json({ message: 'Token inválido o expirado' })
  }
}

module.exports = authMiddleware
