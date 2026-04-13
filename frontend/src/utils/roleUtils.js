// Role hierarchy: superadmin > central > empresa > franquiciado
export const ROLES = {
  SUPERADMIN:    'superadmin',
  CENTRAL:       'central',
  EMPRESA:       'empresa',
  FRANQUICIADO:  'franquiciado',
}

const ROLE_LEVEL = {
  superadmin:   4,
  central:      3,
  empresa:      2,
  franquiciado: 1,
}

// Returns true if userRole has at least the required level
export const hasRole = (userRole, requiredRole) =>
  (ROLE_LEVEL[userRole] ?? 0) >= (ROLE_LEVEL[requiredRole] ?? 0)

// Visible nav items per role
export const MENU_PERMISSIONS = {
  dashboard:    ['superadmin', 'central', 'empresa', 'franquiciado'],
  mapa:         ['superadmin', 'central', 'empresa'],
  franquicias:  ['superadmin', 'central', 'empresa'],
  ventas:       ['superadmin', 'central', 'empresa', 'franquiciado'],
  delivery:     ['superadmin', 'central', 'empresa', 'franquiciado'],
  rrhh:         ['superadmin', 'central', 'empresa'],
  nominas:      ['superadmin', 'central', 'empresa'],
  facturacion:  ['superadmin', 'central'],
  informes:     ['superadmin', 'central', 'empresa'],
  asistente:    ['superadmin', 'central', 'empresa', 'franquiciado'],
  configuracion:['superadmin', 'central', 'empresa', 'franquiciado'],
}

export const canAccess = (userRole, module) =>
  MENU_PERMISSIONS[module]?.includes(userRole) ?? false
