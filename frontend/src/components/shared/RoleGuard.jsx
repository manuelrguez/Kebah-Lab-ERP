import { Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.js'

const RoleGuard = ({ children, module, fallback = '/' }) => {
  const { user, token, can } = useAuth()

  // Aún cargando — no redirigir todavía
  if (token && !user) return null

  if (!token) return <Navigate to="/login" replace />
  if (module && !can(module)) return <Navigate to={fallback} replace />

  return children
}

export default RoleGuard