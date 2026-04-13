import { useAuth } from '../../hooks/useAuth.js'
import { formatCurrency } from '../../utils/formatters.js'
import StatCard from '../../components/ui/StatCard.jsx'

const DashboardFranquicia = () => {
  const { user } = useAuth()

  return (
    <div className="page-content">
      <div className="welcome-banner">
        <div className="welcome-avatar">{user?.nombre?.[0] || 'F'}</div>
        <div>
          <h2>Bienvenido/a, {user?.nombre?.split(' ')[0]}</h2>
          <p>Dashboard de tu franquicia</p>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard color="green" icon="💳" label="Ventas Hoy"      value={formatCurrency(1310)}  trend="↑ 14% vs ayer" />
        <StatCard color="blue"  icon="🧾" label="Tickets Hoy"     value="54"                    trend="↑ 8% vs ayer" />
        <StatCard color="gold"  icon="💵" label="Ticket Medio"    value={formatCurrency(24.26)} trend="↑ 1.2%" />
        <StatCard color="red"   icon="🛵" label="Pedidos Delivery" value="93"                   trend="Glovo+Uber+JE" />
      </div>
    </div>
  )
}

export default DashboardFranquicia
