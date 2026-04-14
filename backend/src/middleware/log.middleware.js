const getIP = (req) => {
  const forwarded = req.headers['x-forwarded-for']
  if (forwarded) return forwarded.split(',')[0].trim()
  return req.socket?.remoteAddress || req.ip || '—'
}

const getModulo = (ruta) => {
  if (!ruta) return '—'
  const parts = ruta.split('/').filter(Boolean)
  const modulos = ['franquicias','rrhh','ventas','delivery','facturacion','informes','ia','auth','logs']
  for (const m of modulos) {
    if (parts.includes(m)) return m
  }
  return parts[1] || '—'
}

const getAccion = (method, ruta, statusCode, body) => {
  if (statusCode >= 400) return 'ERROR'
  if (ruta?.includes('/auth/login'))  return 'LOGIN'
  if (ruta?.includes('/auth/logout')) return 'LOGOUT'
  if (ruta?.match(/\/franquicias\/\d+$/) && method === 'PUT')    return 'EDITAR_FRANQUICIA'
  if (ruta?.match(/\/franquicias\/\d+$/) && method === 'DELETE') return 'BORRAR_FRANQUICIA'
  if (ruta?.includes('/franquicias') && method === 'POST')       return 'CREAR_FRANQUICIA'
  if (ruta?.match(/\/empleados\/\d+$/) && method === 'PUT')      return 'EDITAR_EMPLEADO'
  if (ruta?.match(/\/empleados\/\d+$/) && method === 'DELETE')   return 'BAJA_EMPLEADO'
  if (ruta?.includes('/empleados') && method === 'POST')         return 'CREAR_EMPLEADO'
  if (ruta?.includes('/nominas/generar') && method === 'POST')   return 'GENERAR_NOMINAS'
  if (ruta?.match(/\/nominas\/\d+$/) && method === 'PUT')        return 'EDITAR_NOMINA'
  if (ruta?.match(/\/ventas\/\d+$/) && method === 'PUT')         return 'EDITAR_VENTA'
  if (ruta?.match(/\/ventas\/\d+$/) && method === 'DELETE')      return 'BORRAR_VENTA'
  if (ruta?.includes('/ventas') && method === 'POST')            return 'REGISTRAR_VENTA'
  if (ruta?.includes('/sync/all') && method === 'POST')          return 'SYNC_DELIVERY_ALL'
  if (ruta?.includes('/sync/') && method === 'POST')             return 'SYNC_DELIVERY'
  if (ruta?.includes('/export/zip') && method === 'POST')        return 'EXPORT_ZIP_GESTORIA'
  if (ruta?.includes('/ocr') && method === 'POST')               return 'OCR_FACTURA'
  if (ruta?.match(/\/facturacion\/\d+$/) && method === 'PUT')    return 'EDITAR_FACTURA'
  if (ruta?.match(/\/facturacion\/\d+$/) && method === 'DELETE') return 'ANULAR_FACTURA'
  if (ruta?.includes('/facturacion') && method === 'POST')       return 'CREAR_FACTURA'
  if (ruta?.includes('/ia/chat'))                                return 'CONSULTA_IA'
  if (ruta?.includes('/analizar-cv'))                            return 'ANALISIS_CV'
  if (ruta?.includes('/ia/informe'))                             return 'GENERAR_INFORME'
  return method
}

const getDescripcion = (method, ruta, body, accion) => {
  switch (accion) {
    case 'LOGIN':              return `Inicio de sesión: ${body?.email || ''}`
    case 'LOGOUT':             return `Cierre de sesión`
    case 'CREAR_FRANQUICIA':   return `Nueva franquicia: ${body?.nombre || ''}`
    case 'EDITAR_FRANQUICIA':  return `Editada franquicia ID ${ruta.split('/').pop()}`
    case 'BORRAR_FRANQUICIA':  return `Desactivada franquicia ID ${ruta.split('/').pop()}`
    case 'CREAR_EMPLEADO':     return `Nuevo empleado: ${body?.nombre || ''}`
    case 'EDITAR_EMPLEADO':    return `Editado empleado ID ${ruta.split('/').pop()}`
    case 'BAJA_EMPLEADO':      return `Baja empleado ID ${ruta.split('/').pop()}`
    case 'GENERAR_NOMINAS':    return `Nóminas generadas: ${body?.periodo || ''}`
    case 'EDITAR_NOMINA':      return `Editada nómina ID ${ruta.split('/').pop()}`
    case 'REGISTRAR_VENTA':    return `Venta registrada — franquicia ID ${body?.franquicia_id || ''}`
    case 'EDITAR_VENTA':       return `Editada venta ID ${ruta.split('/').pop()}`
    case 'BORRAR_VENTA':       return `Eliminada venta ID ${ruta.split('/').pop()}`
    case 'SYNC_DELIVERY_ALL':  return `Sync todas las plataformas delivery`
    case 'SYNC_DELIVERY':      return `Sync delivery: ${ruta.split('/').pop()}`
    case 'CREAR_FACTURA':      return `Nueva factura — ${body?.cliente_proveedor_nombre || ''}`
    case 'EDITAR_FACTURA':     return `Editada factura ID ${ruta.split('/').pop()}`
    case 'ANULAR_FACTURA':     return `Anulada factura ID ${ruta.split('/').pop()}`
    case 'EXPORT_ZIP_GESTORIA':return `Export ZIP — ${body?.ids?.length || 0} facturas`
    case 'OCR_FACTURA':        return `Factura escaneada con OCR`
    case 'CONSULTA_IA':        return `Consulta Asistente IA`
    case 'ANALISIS_CV':        return `Análisis CV — puesto: ${body?.puesto || ''}`
    case 'GENERAR_INFORME':    return `Informe IA: ${body?.tipo || ''}`
    default:                   return `${method} ${ruta}`
  }
}

const SKIP_ROUTES = [
  '/api/health',
  '/api/auth/me',
  '/api/ventas/dashboard-stats',
  '/api/ventas/por-dia',
  '/api/ventas/por-franquicia',
  '/api/delivery/resumen',
  '/api/delivery/status',
  '/api/delivery/por-dia',
  '/api/rrhh/stats',
  '/api/facturacion/stats',
  '/api/logs',
  '/api/franquicias/meta',
  '/api/franquicias',   // skip GET list
  '/api/ventas',        // skip GET list
  '/api/delivery/pedidos',
  '/api/rrhh/empleados',
  '/api/rrhh/nominas',
  '/api/facturacion',
  '/api/informes',
]

const logMiddleware = (req, res, next) => {
  const fullPath = req.originalUrl.split('?')[0] // usar originalUrl, no path

  // Skip non-api
  if (!fullPath.startsWith('/api')) return next()

  // Skip noisy routes
  if (SKIP_ROUTES.some(r => fullPath === r || (r.endsWith('/') ? fullPath.startsWith(r) : fullPath.startsWith(r + '/')))) {
    // But allow mutations on these paths
    if (req.method === 'GET') return next()
  }

  // Skip all GETs except auth
  if (req.method === 'GET') return next()

  const start    = Date.now()
  const bodySnap = { ...req.body } // snapshot before async

  res.on('finish', async () => {
    try {
      const Log     = require('../models/Log.js')
      const duracion = Date.now() - start
      const accion   = getAccion(req.method, fullPath, res.statusCode, bodySnap)
      const modulo   = getModulo(fullPath)
      const desc     = getDescripcion(req.method, fullPath, bodySnap, accion)
      const ip       = getIP(req)
      const esLogin  = fullPath.includes('/auth/login')
      const userId   = req.user?.id

      // Skip if not authenticated and not a login
      if (!userId && !esLogin) return

      await Log.create({
        usuario_id:     userId || null,
        usuario_nombre: req.user?.nombre || (esLogin ? bodySnap?.email : null) || '—',
        usuario_email:  req.user?.email  || (esLogin ? bodySnap?.email : null) || '—',
        rol:            req.user?.rol    || 'anon',
        accion,
        modulo,
        descripcion: desc,
        ip,
        user_agent:  req.headers['user-agent']?.substring(0, 200) || '—',
        metodo:      req.method,
        ruta:        fullPath,
        status_code: res.statusCode,
        duracion_ms: duracion,
      })
    } catch (err) {
      console.error('[LOG ERROR]', err.message)
    }
  })

  next()
}

module.exports = logMiddleware