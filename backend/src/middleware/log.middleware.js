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

const getAccion = (method, ruta, statusCode, body) => {
  if (statusCode >= 400) return 'ERROR'
  if (ruta?.includes('/auth/login'))  return 'LOGIN'
  if (ruta?.includes('/auth/logout')) return 'LOGOUT'

  // Franquicias
  if (ruta?.match(/\/franquicias\/\d+$/) && method === 'PUT')    return 'EDITAR_FRANQUICIA'
  if (ruta?.match(/\/franquicias\/\d+$/) && method === 'DELETE') return 'BORRAR_FRANQUICIA'
  if (ruta?.includes('/franquicias') && method === 'POST')       return 'CREAR_FRANQUICIA'

  // Empleados
  if (ruta?.match(/\/empleados\/\d+$/) && method === 'PUT')    return 'EDITAR_EMPLEADO'
  if (ruta?.match(/\/empleados\/\d+$/) && method === 'DELETE') return 'BAJA_EMPLEADO'
  if (ruta?.includes('/empleados') && method === 'POST')       return 'CREAR_EMPLEADO'

  // Nóminas
  if (ruta?.includes('/nominas/generar') && method === 'POST') return 'GENERAR_NOMINAS'
  if (ruta?.match(/\/nominas\/\d+$/) && method === 'PUT')      return 'EDITAR_NOMINA'

  // Ventas
  if (ruta?.match(/\/ventas\/\d+$/) && method === 'PUT')    return 'EDITAR_VENTA'
  if (ruta?.match(/\/ventas\/\d+$/) && method === 'DELETE') return 'BORRAR_VENTA'
  if (ruta?.includes('/ventas') && method === 'POST')       return 'REGISTRAR_VENTA'

  // Delivery
  if (ruta?.includes('/sync/all'))                              return 'SYNC_DELIVERY_ALL'
  if (ruta?.includes('/sync/') && method === 'POST')           return 'SYNC_DELIVERY'

  // Facturación
  if (ruta?.match(/\/facturacion\/\d+$/) && method === 'PUT')    return 'EDITAR_FACTURA'
  if (ruta?.match(/\/facturacion\/\d+$/) && method === 'DELETE') return 'ANULAR_FACTURA'
  if (ruta?.includes('/facturacion') && method === 'POST' && !ruta?.includes('ocr') && !ruta?.includes('zip')) return 'CREAR_FACTURA'
  if (ruta?.includes('/export/zip') && method === 'POST')        return 'EXPORT_ZIP_GESTORIA'
  if (ruta?.includes('/ocr') && method === 'POST')               return 'OCR_FACTURA'

  // IA
  if (ruta?.includes('/ia/chat'))       return 'CONSULTA_IA'
  if (ruta?.includes('/analizar-cv'))   return 'ANALISIS_CV'
  if (ruta?.includes('/ia/informe'))    return 'GENERAR_INFORME'

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
    case 'GENERAR_NOMINAS':    return `Nóminas generadas para periodo ${body?.periodo || ''}`
    case 'EDITAR_NOMINA':      return `Editada nómina ID ${ruta.split('/').pop()}`
    case 'REGISTRAR_VENTA':    return `Venta registrada — franquicia ID ${body?.franquicia_id || ''}`
    case 'EDITAR_VENTA':       return `Editada venta ID ${ruta.split('/').pop()}`
    case 'BORRAR_VENTA':       return `Eliminada venta ID ${ruta.split('/').pop()}`
    case 'SYNC_DELIVERY_ALL':  return `Sincronización de todas las plataformas delivery`
    case 'SYNC_DELIVERY':      return `Sync delivery: ${ruta.split('/').pop()}`
    case 'CREAR_FACTURA':      return `Nueva factura — ${body?.cliente_proveedor_nombre || ''}`
    case 'EDITAR_FACTURA':     return `Editada factura ID ${ruta.split('/').pop()}`
    case 'ANULAR_FACTURA':     return `Anulada factura ID ${ruta.split('/').pop()}`
    case 'EXPORT_ZIP_GESTORIA':return `Export ZIP gestoría — ${body?.ids?.length || 0} facturas`
    case 'OCR_FACTURA':        return `Escaneada factura con OCR`
    case 'CONSULTA_IA':        return `Consulta al Asistente IA`
    case 'ANALISIS_CV':        return `Análisis de CV con IA — puesto: ${body?.puesto || ''}`
    case 'GENERAR_INFORME':    return `Informe IA generado: ${body?.tipo || ''}`
    default:                   return `${method} ${ruta}`
  }
}

// Rutas que NO se loguean (demasiado verbosas)
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
      const accion = getAccion(req.method, req.path, res.statusCode, req.body)
      const modulo     = getModulo(req.path)
      const descripcion = getDescripcion(req.method, req.path, req.body, accion)
      const ip         = getIP(req)

      // Only log if user is authenticated OR it's a login attempt
      const userId = req.user?.id
      const esLogin = req.path.includes('/auth/login')
      if (!userId && !esLogin) return

      await Log.create({
        usuario_id:     userId || null,
        usuario_nombre: req.user?.nombre || (esLogin ? req.body?.email : '—') || '—',
        usuario_email:  req.user?.email  || (esLogin ? req.body?.email : '—') || '—',
        rol:            req.user?.rol    || (esLogin ? 'anon' : 'anon'),
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
