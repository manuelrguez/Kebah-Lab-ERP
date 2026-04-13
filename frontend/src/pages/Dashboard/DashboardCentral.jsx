import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { formatCurrency, formatDate } from '../../utils/formatters.js'
import StatCard from '../../components/ui/StatCard.jsx'
import api from '../../services/api.js'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:8, padding:'10px 14px', fontSize:12 }}>
      <div style={{ color:'var(--text3)', marginBottom:4 }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color:p.color }}>
          {p.name}: <strong>{formatCurrency(p.value)}</strong>
        </div>
      ))}
    </div>
  )
}

const fmtDia = d => { if (!d) return ''; const p = d.split('-'); return `${p[2]}/${p[1]}` }

const DashboardCentral = () => {
  const [stats, setStats]         = useState(null)
  const [ventasDia, setVentasDia] = useState([])
  const [porFranq, setPorFranq]   = useState([])
  const [delivery, setDelivery]   = useState(null)
  const [facturas, setFacturas]   = useState([])
  const [empleados, setEmpleados] = useState(null)
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    const loadAll = async () => {
      try {
        const [sData, dData, fData, delData, facData, rrhhData] = await Promise.all([
          api.get('/ventas/dashboard-stats').then(r => r.data).catch(() => null),
          api.get('/ventas/por-dia', { params: { dias: 14 } }).then(r => r.data).catch(() => []),
          api.get('/ventas/por-franquicia').then(r => r.data).catch(() => []),
          api.get('/delivery/resumen').then(r => r.data).catch(() => null),
          api.get('/facturacion', { params: { estado: 'pendiente' } }).then(r => r.data).catch(() => []),
          api.get('/rrhh/stats').then(r => r.data).catch(() => null),
        ])
        setStats(sData)
        setVentasDia(dData)
        setPorFranq(fData)
        setDelivery(delData)
        setFacturas(facData.slice(0, 5))
        setEmpleados(rrhhData)
      } catch (err) {
        console.error('Dashboard load error:', err)
      } finally {
        setLoading(false)
      }
    }
    loadAll()
  }, [])

  const ventasMes     = stats?.ventas_mes     || 0
  const ticketsMes    = stats?.tickets_hoy    || 0
  const pctVsMes      = stats?.pct_vs_mes_ant || 0
  const franqActivas  = stats?.franquicias_activas || 0
  const deliveryMes   = delivery?.total_mes   || 0
  const pedidosMes    = delivery?.pedidos_mes || 0
  const empleadosAct  = empleados?.activos    || 0
  const masaSalarial  = empleados?.masa_salarial_mensual || 0

  // Totales delivery por plataforma
  const glovoTotal    = delivery?.por_plataforma?.glovo?.total    || 0
  const uberTotal     = delivery?.por_plataforma?.ubereats?.total || 0
  const justeatTotal  = delivery?.por_plataforma?.justeat?.total  || 0

  return (
    <div className="page-content">
      {/* ── Stats principales ── */}
      <div className="stats-grid" style={{ marginBottom: 20 }}>
        <StatCard color="green" icon="💳" label="Ventas TPV (mes)"
          value={formatCurrency(ventasMes)}
          trend={`${pctVsMes >= 0 ? '↑' : '↓'} ${Math.abs(pctVsMes)}% vs mes anterior`}
          trendDown={pctVsMes < 0} />
        <StatCard color="blue" icon="🛵" label="Ingresos Delivery (mes)"
          value={formatCurrency(deliveryMes)}
          trend={`${pedidosMes.toLocaleString()} pedidos`} />
        <StatCard color="gold" icon="🏪" label="Franquicias Activas"
          value={franqActivas}
          trend="Red activa" />
        <StatCard color="red" icon="👥" label="Empleados Activos"
          value={empleadosAct}
          trend={`Masa salarial: ${formatCurrency(masaSalarial)}/mes`} />
      </div>

      {/* ── Gráfica ventas + Delivery hoy ── */}
      <div className="grid-2" style={{ marginBottom: 16 }}>
        <div className="card">
          <div className="card-header">
            <span className="card-title">📈 Ventas últimos 14 días</span>
            <Link to="/ventas" className="link-sm">Ver detalle →</Link>
          </div>
          {loading ? <div className="loading">Cargando...</div> :
            ventasDia.length === 0 ? (
              <div style={{ textAlign:'center', color:'var(--text3)', padding:40, fontSize:13 }}>
                Sin datos de ventas aún
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={ventasDia} margin={{ top:8, right:8, left:0, bottom:0 }}>
                  <defs>
                    <linearGradient id="gradV" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#E5BC55" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#E5BC55" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)"/>
                  <XAxis dataKey="fecha" tickFormatter={fmtDia} tick={{ fontSize:10, fill:'var(--text3)' }}/>
                  <YAxis tickFormatter={v => `${(v/1000).toFixed(0)}k`} tick={{ fontSize:10, fill:'var(--text3)' }}/>
                  <Tooltip content={<CustomTooltip />}/>
                  <Area type="monotone" dataKey="total" name="Ventas" stroke="#E5BC55" fill="url(#gradV)" strokeWidth={2} dot={false}/>
                </AreaChart>
              </ResponsiveContainer>
            )
          }
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">🛵 Delivery — mes actual</span>
            <Link to="/delivery" className="link-sm">Gestionar →</Link>
          </div>
          {[
            { name:'Glovo',     emoji:'🟢', color:'#00A082', total:glovoTotal,   pedidos: delivery?.por_plataforma?.glovo?.pedidos    || 0, comision:25 },
            { name:'Uber Eats', emoji:'⬛', color:'#555',    total:uberTotal,    pedidos: delivery?.por_plataforma?.ubereats?.pedidos || 0, comision:30 },
            { name:'Just Eat',  emoji:'🩷', color:'#E6007E', total:justeatTotal, pedidos: delivery?.por_plataforma?.justeat?.pedidos  || 0, comision:22 },
          ].map(p => (
            <div key={p.name} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:'1px solid rgba(48,54,61,.4)' }}>
              <div style={{ width:36, height:36, borderRadius:8, background:p.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
                {p.emoji}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600, fontSize:13 }}>{p.name}</div>
                <div style={{ fontSize:11, color:'var(--text3)' }}>{p.pedidos} pedidos · com. {p.comision}%</div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontFamily:'Syne', fontWeight:700, color:'var(--gold)', fontSize:14 }}>{formatCurrency(p.total)}</div>
                <div style={{ fontSize:10, color:'var(--red)' }}>-{formatCurrency(p.total * p.comision / 100)}</div>
              </div>
            </div>
          ))}
          <div style={{ display:'flex', justifyContent:'space-between', paddingTop:10, fontSize:13 }}>
            <span style={{ color:'var(--text3)' }}>Total delivery</span>
            <span style={{ fontFamily:'Syne', fontWeight:700, color:'var(--gold)' }}>{formatCurrency(deliveryMes)}</span>
          </div>
        </div>
      </div>

      {/* ── Top franquicias + Facturas pendientes ── */}
      <div className="grid-2" style={{ marginBottom: 16 }}>
        <div className="card">
          <div className="card-header">
            <span className="card-title">🏆 Top Franquicias (mes)</span>
            <Link to="/franquicias" className="link-sm">Ver todas →</Link>
          </div>
          {loading ? <div className="loading">Cargando...</div> :
            porFranq.length === 0 ? (
              <div style={{ textAlign:'center', color:'var(--text3)', padding:30, fontSize:13 }}>Sin datos</div>
            ) : porFranq.slice(0, 5).map((f, i) => (
              <div key={f.franquicia_id} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 0', borderBottom: i < 4 ? '1px solid rgba(48,54,61,.4)' : 'none' }}>
                <div style={{
                  width:26, height:26, borderRadius:'50%', flexShrink:0,
                  background: i===0?'#E5BC55':i===1?'#8b949e':i===2?'#e3762a':'var(--bg4)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:11, fontWeight:700, color: i<3?'#000':'var(--text2)',
                }}>{i+1}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:600, fontSize:13 }}>{f.nombre}</div>
                  <div style={{ fontSize:11, color:'var(--text3)' }}>{f.ciudad} · {f.tickets} tickets</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontFamily:'Syne', fontWeight:700, color:'var(--gold)', fontSize:13 }}>{formatCurrency(f.total)}</div>
                  <div style={{ height:3, background:'var(--bg4)', borderRadius:2, marginTop:4, width:60, overflow:'hidden' }}>
                    <div style={{ height:'100%', background:'var(--gold)', borderRadius:2, width:`${(f.total/(porFranq[0]?.total||1))*100}%` }}/>
                  </div>
                </div>
              </div>
            ))
          }
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">⏳ Facturas Pendientes</span>
            <Link to="/facturacion" className="link-sm">Ver todas →</Link>
          </div>
          {loading ? <div className="loading">Cargando...</div> :
            facturas.length === 0 ? (
              <div style={{ textAlign:'center', color:'var(--green)', padding:30, fontSize:13 }}>
                ✅ Sin facturas pendientes
              </div>
            ) : facturas.map((f, i) => (
              <div key={f.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 0', borderBottom: i < facturas.length-1 ? '1px solid rgba(48,54,61,.4)':'none' }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:600, fontSize:13 }}>{f.numero}</div>
                  <div style={{ fontSize:11, color:'var(--text3)' }}>
                    {f.cliente_proveedor_nombre}
                    {f.fecha_vencimiento && ` · vence ${formatDate(f.fecha_vencimiento)}`}
                  </div>
                </div>
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <div style={{ fontFamily:'Syne', fontWeight:700, fontSize:13, color: f.estado==='vencida'?'var(--red)':'var(--orange)' }}>
                    {formatCurrency(parseFloat(f.total||0))}
                  </div>
                  <span className={`status ${f.estado==='vencida'?'status--red':'status--orange'}`} style={{ fontSize:10 }}>
                    {f.estado}
                  </span>
                </div>
              </div>
            ))
          }
        </div>
      </div>

      {/* ── Quick actions ── */}
      <div className="quick-actions">
        <Link to="/delivery"    className="btn btn-primary">🛵 Sync Delivery</Link>
        <Link to="/rrhh"        className="btn btn-secondary">👥 Nuevo Empleado</Link>
        <Link to="/facturacion" className="btn btn-secondary">🧾 Nueva Factura</Link>
        <Link to="/ventas"      className="btn btn-secondary">💳 Registrar Venta</Link>
        <Link to="/asistente"   className="btn btn-secondary">🤖 Consultar IA</Link>
      </div>
    </div>
  )
}

export default DashboardCentral
