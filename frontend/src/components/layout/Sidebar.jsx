import { NavLink } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.js'
import {
  LayoutDashboard, Map, Store, CreditCard, Bike,
  Users, DollarSign, FileText, BarChart3, Bot,
  Settings, LogOut
} from 'lucide-react'

const NAV = [
  { section: 'PRINCIPAL' },
  { to: '/',            label: 'Dashboard',    icon: LayoutDashboard, module: 'dashboard'   },
  { to: '/mapa',        label: 'Mapa',         icon: Map,             module: 'mapa'        },
  { section: 'OPERACIONES' },
  { to: '/ventas',      label: 'Ventas / TPV', icon: CreditCard,      module: 'ventas'      },
  { to: '/delivery',    label: 'Delivery',     icon: Bike,            module: 'delivery', badge: 'Sync' },
  { section: 'GESTIÓN' },
  { to: '/franquicias', label: 'Franquicias',  icon: Store,           module: 'franquicias' },
  { to: '/rrhh',        label: 'RRHH',         icon: Users,           module: 'rrhh'        },
  { to: '/nominas',     label: 'Nóminas',      icon: DollarSign,      module: 'nominas'     },
  { section: 'FINANZAS' },
  { to: '/facturacion', label: 'Facturación',  icon: FileText,        module: 'facturacion' },
  { section: 'HERRAMIENTAS' },
  { to: '/informes',    label: 'Informes IA',  icon: BarChart3,       module: 'informes', badge: 'IA' },
  { to: '/asistente',   label: 'Asistente IA', icon: Bot,             module: 'asistente', badge: 'Nuevo' },
  { to: '/configuracion',label: 'Configuración',icon: Settings,       module: 'configuracion' },
]

const Sidebar = () => {
  const { user, can, logout } = useAuth()

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">K</div>
        <div>
          <div className="logo-name">Kebah Lab</div>
          <div className="logo-sub">ERP Suite</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {NAV.map((item, i) => {
          if (item.section) {
            return <div key={i} className="nav-section">{item.section}</div>
          }
          if (!can(item.module)) return null
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={16} />
              <span>{item.label}</span>
              {item.badge && <span className={`badge ${item.badge === 'Nuevo' ? 'new' : 'gold'}`}>{item.badge}</span>}
            </NavLink>
          )
        })}
      </nav>

      <div className="sidebar-footer">
        <button className="nav-item" onClick={logout} style={{ width: '100%', background: 'none', border: 'none' }}>
          <LogOut size={16} />
          <span>Cerrar sesión</span>
        </button>
        <div className="sidebar-version">Kebab Lab ERP v1.0</div>
      </div>
    </aside>
  )
}

export default Sidebar
