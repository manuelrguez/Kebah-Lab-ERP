import { useSelector, useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { login, logout, refreshMe } from '../store/slices/authSlice.js'
import { canAccess } from '../utils/roleUtils.js'

export const useAuth = () => {
  const dispatch  = useDispatch()
  const navigate  = useNavigate()
  const { user, token, loading, error } = useSelector(s => s.auth)

  const handleLogin = async (credentials) => {
    const result = await dispatch(login(credentials))
    if (login.fulfilled.match(result)) navigate('/')
    return result
  }

  const handleLogout = () => {
    dispatch(logout())
    navigate('/login')
  }

  const refresh = () => dispatch(refreshMe())

  const can = (module) => canAccess(user?.rol, module)

  return { user, token, loading, error, login: handleLogin, logout: handleLogout, refresh, can }
}
