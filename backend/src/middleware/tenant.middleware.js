/**
 * Injects tenant scope into req so controllers can filter by empresa/franquicia.
 * superadmin/central → no filter (see all)
 * empresa → filter by empresa_id
 * franquiciado → filter by franquicia_id
 */
const tenantMiddleware = (req, _res, next) => {
  const { rol, empresa_id, franquicia_id } = req.user || {}
  req.tenant = {
    rol,
    empresa_id:   ['empresa', 'central', 'superadmin'].includes(rol) ? empresa_id : null,
    franquicia_id: rol === 'franquiciado' ? franquicia_id : null,
    isGlobal:      ['superadmin', 'central'].includes(rol),
  }
  next()
}

module.exports = tenantMiddleware
