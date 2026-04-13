import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { formatCurrency } from '../../utils/formatters.js'
import StatCard from '../../components/ui/StatCard.jsx'
import api from '../../services/api.js'

const DEFAULT_STATS = {
  franquicias_activas: 12,
  ventas_mes: 48320,
  ventas_mes_pct: 18.4,
  pedidos_delivery: 1847,
  pedidos_delivery_pct: 9.2,
  empleados_total: 67,
  delivery_hoy: { glovo: 4210, uber: 2890, justeat: 2340 },
}

const DashboardCentral = () => {
  const [stats, setStats] = useState(DEFAULT_STATS)

  useEffect(() => {
    api.get('/ventas/dashboard-stats')
      .then(r => {
        // Merge con defaults para evitar undefined en campos que falten
        setStats(prev => ({ ...prev, ...r.data }))
      })
      .catch(() => {}) // Ya tenemos DEFAULT_STATS cargado, no hace falta hacer nada
  }, [])

  return (
    <div className="page-content">
      <div className="stats-grid">
        <StatCard color="blue"  icon="🏪" label="Franquicias Activas"
          value={stats.franquicias_activas}
          trend="+2 este trimestre" />
        <StatCard color="green" icon="📦" label="Ventas Totales (mes)"
          value={formatCurrency(stats.ventas_mes)}
          trend={`↑ ${stats.ventas_mes_pct}% vs mes anterior`} />
        <StatCard color="gold"  icon="🛵" label="Pedidos Delivery"
          value={(stats.pedidos_delivery ?? 0).toLocaleString()}
          trend={`↑ ${stats.pedidos_delivery_pct}% vs mes anterior`} />
        <StatCard color="red"   icon="👥" label="Empleados Total"
          value={stats.empleados_total}
          trend="−1 baja este mes" trendDown />
      </div>

      <div className="grid-3-1-1">
        <div className="card">
          <div className="card-header">
            <span className="card-title">🗺️ Red de Franquicias</span>
            <Link to="/mapa" className="link-sm">Ver mapa →</Link>
          </div>
          <div className="map-placeholder">
            <span style={{ fontSize: 40 }}>🗺️</span>
            <p>Mapa interactivo con React-Leaflet</p>
            <small>Próximamente</small>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">🏆 Top Franquicias</span>
          </div>
          {[
            { pos: '🥇', name: 'KL Madrid Centro',   rev: 12840 },
            { pos: '🥈', name: 'KL Sevilla Sur',      rev: 9210  },
            { pos: '🥉', name: 'KL Valencia Norte',   rev: 8650  },
            { pos: '4️⃣', name: 'KL Barcelona Gracia', rev: 7420  },
          ].map(f => (
            <div key={f.name} className="list-row">
              <span style={{ fontSize: 18 }}>{f.pos}</span>
              <div className="list-info">
                <div className="list-name">{f.name}</div>
              </div>
              <span className="amount-gold">{formatCurrency(f.rev)}</span>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">🛵 Delivery Hoy</span>
            <Link to="/delivery" className="link-sm">Gestionar →</Link>
          </div>
          {[
            { name: 'Glovo',     emoji: '🟢', key: 'glovo'   },
            { name: 'Uber Eats', emoji: '⬛', key: 'uber'    },
            { name: 'Just Eat',  emoji: '🩷', key: 'justeat' },
          ].map(d => (
            <div key={d.name} className="list-row">
              <span style={{ fontSize: 20 }}>{d.emoji}</span>
              <div className="list-info">
                <div className="list-name">{d.name}</div>
              </div>
              <span className="amount-gold">
                {formatCurrency(stats.delivery_hoy?.[d.key] ?? 0)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="quick-actions">
        <Link to="/delivery"    className="btn btn-primary">🛵 Sync Delivery</Link>
        <Link to="/rrhh"        className="btn btn-secondary">👥 Nuevo Empleado</Link>
        <Link to="/facturacion" className="btn btn-secondary">🧾 Nueva Factura</Link>
        <Link to="/informes"    className="btn btn-secondary">📈 Informe IA</Link>
        <Link to="/asistente"   className="btn btn-secondary">🤖 Consultar IA</Link>
      </div>
    </div>
  )
}

export default DashboardCentral