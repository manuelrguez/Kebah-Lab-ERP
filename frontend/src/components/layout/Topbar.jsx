import { Bell, MessageSquare } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth.js'

const ROLE_LABELS = {
  superadmin:  'Superadministrador',
  central:     'Servicios Centrales',
  empresa:     'Empresa',
  franquiciado:'Franquiciado',
}

const Topbar = ({ title, breadcrumb }) => {
  const { user } = useAuth()
  const initials = user?.nombre
    ? user.nombre.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : 'KL'

  return (
    <header className="topbar">
      <div className="topbar-left">
        <h1 className="topbar-title">{title}</h1>
        {breadcrumb && <span className="topbar-bread">/ {breadcrumb}</span>}
      </div>
      <div className="topbar-right">
        <button className="icon-btn">
          <Bell size={16} />
          <span className="notif-dot" />
        </button>
        <button className="icon-btn">
          <MessageSquare size={16} />
        </button>
        <div className="user-info">
          <div className="user-name">{user?.nombre || 'Admin'}</div>
          <div className="user-role">{ROLE_LABELS[user?.rol] || user?.rol}</div>
        </div>
        <div className="avatar">{initials}</div>
      </div>
    </header>
  )
}

export default Topbar
