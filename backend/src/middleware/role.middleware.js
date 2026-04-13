const ROLE_LEVEL = { superadmin: 4, central: 3, empresa: 2, franquiciado: 1 }

/**
 * requireRole('central') → allows central, empresa, superadmin
 * requireRole('superadmin') → only superadmin
 */
const requireRole = (minRole) => (req, res, next) => {
  const userLevel = ROLE_LEVEL[req.user?.rol] ?? 0
  const minLevel  = ROLE_LEVEL[minRole] ?? 99
  if (userLevel < minLevel) {
    return res.status(403).json({ message: 'Acceso no autorizado para tu rol' })
  }
  next()
}

module.exports = requireRole
