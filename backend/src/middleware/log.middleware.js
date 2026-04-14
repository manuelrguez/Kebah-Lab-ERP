const getIP = (req) => {
  const forwarded = req.headers['x-forwarded-for']
  if (forwarded) return forwarded.split(',')[0].trim()
  return req.socket?.remoteAddress || req.ip || '—'
}

const getModulo = (ruta) => {
  if (!ruta) return '—'
  const parts = ruta.split('/').filter(Boolean)
  // /api/franquicias/123 → franquicias
  const modulos = ['franquicias','rrhh','ventas','delivery','facturacion','informes','ia','auth','logs']
  for (const m of modulos) {
    if (parts.includes(m)) return m
  }
  return parts[1] || '—'
}

const getAccion = (method, ruta, statusCode) => {
  if (ruta?.includes('/auth/login'))  return 'LOGIN'
  if (ruta?.includes('/auth/logout')) return 'LOGOUT'
  if (statusCode >= 400) return 'ERROR'
  switch (method) {
    case 'POST':   return 'CREATE'
    case 'PUT':
    case 'PATCH':  return 'UPDATE'
    case 'DELETE': return 'DELETE'
    case 'GET':    return 'VIEW'
    default:       return method
  }
}

const getDescripcion = (method, ruta, body) => {
  if (ruta?.includes('/auth/login'))  return `Inicio de sesión`
  if (ruta?.includes('/auth/logout')) return `Cierre de sesión`
  if (method === 'POST'   && ruta?.includes('franquicias')) return `Nueva franquicia: ${body?.nombre || ''}`
  if (method === 'PUT'    && ruta?.includes('franquicias')) return `Editar franquicia`
  if (method === 'DELETE' && ruta?.includes('franquicias')) return `Desactivar franquicia`
  if (method === 'POST'   && ruta?.includes('empleados'))   return `Nuevo empleado: ${body?.nombre || ''}`
  if (method === 'PUT'    && ruta?.includes('empleados'))   return `Editar empleado`
  if (method === 'POST'   && ruta?.includes('nominas/generar')) return `Generar nóminas: ${body?.periodo || ''}`
  if (method === 'POST'   && ruta?.includes('facturacion')) return `Nueva factura`
  if (method === 'POST'   && ruta?.includes('sync'))        return `Sync delivery: ${ruta.split('/').pop()}`
  if (method === 'POST'   && ruta?.includes('ia/chat'))     return `Consulta Asistente IA`
  if (method === 'POST'   && ruta?.includes('analizar-cv')) return `Análisis CV con IA`
  if (method === 'POST'   && ruta?.includes('export/zip'))  return `Export ZIP gestoría`
  return `${method} ${ruta}`
}

// Rutas que NO se loguean (demasiado verbosas)
const SKIP_ROUTES = [
  '/api/health',
  '/api/ventas/dashboard-stats',
  '/api/ventas/por-dia',
  '/api/ventas/por-franquicia',
  '/api/delivery/resumen',
  '/api/delivery/status',
  '/api/delivery/por-dia',
  '/api/rrhh/stats',
  '/api/facturacion/stats',
  '/api/logs', // no logear las propias peticiones de logs
]

const logMiddleware = (req, res, next) => {
  // Skip non-api and noisy routes
  if (!req.path.startsWith('/api')) return next()
  if (SKIP_ROUTES.some(r => req.path.startsWith(r))) return next()
  // Skip GET list requests to keep logs clean (only log mutations + logins)
  if (req.method === 'GET' && !req.path.includes('/auth')) return next()

  const start = Date.now()

  res.on('finish', async () => {
    try {
      const Log = require('../models/Log.js')
      const duracion   = Date.now() - start
      const accion     = getAccion(req.method, req.path, res.statusCode)
      const modulo     = getModulo(req.path)
      const descripcion = getDescripcion(req.method, req.path, req.body)
      const ip         = getIP(req)

      // Only log if user is authenticated OR it's a login attempt
      const userId = req.user?.id
      if (!userId && !req.path.includes('/auth/login')) return

      await Log.create({
        usuario_id:     userId || null,
        usuario_nombre: req.user?.nombre || req.body?.email || '—',
        usuario_email:  req.user?.email  || req.body?.email || '—',
        rol:            req.user?.rol    || 'anon',
        accion,
        modulo,
        descripcion,
        ip,
        user_agent:   req.headers['user-agent']?.substring(0, 200) || '—',
        metodo:       req.method,
        ruta:         req.path,
        status_code:  res.statusCode,
        duracion_ms:  duracion,
      })
    } catch (err) {
      // Never crash the app because of logging
      console.error('[LOG ERROR]', err.message)
    }
  })

  next()
}

module.exports = logMiddleware
