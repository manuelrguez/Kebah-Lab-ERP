import { useState, useEffect, useCallback } from 'react'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, PieChart, Pie, Cell
} from 'recharts'
import { formatCurrency, formatDate } from '../../utils/formatters.js'
import api from '../../services/api.js'
import toast from 'react-hot-toast'

const PLATAFORMAS = {
  glovo:    { nombre: 'Glovo',     color: '#00A082', emoji: '🟢', comision: 25 },
  ubereats: { nombre: 'Uber Eats', color: '#000000', emoji: '⬛', comision: 30 },
  justeat:  { nombre: 'Just Eat',  color: '#E6007E', emoji: '🩷', comision: 22 },
}

const fmtDia = d => { if (!d) return ''; const p = d.split('-'); return `${p[2]}/${p[1]}` }

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:8, padding:'10px 14px', fontSize:12 }}>
      <div style={{ color:'var(--text3)', marginBottom:6 }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color:p.color, marginBottom:3 }}>
          {p.name}: <strong>{formatCurrency(p.value)}</strong>
        </div>
      ))}
    </div>
  )
}

// ── Tarjeta plataforma ────────────────────────────────────────────────────────
const PlatCard = ({ plat, data, status, onSync, syncing }) => {
  const p   = PLATAFORMAS[plat]
  const st  = status?.[plat]
  const connected = st?.conectado
  const lastSync  = st?.ultima_sync
    ? new Date(st.ultima_sync).toLocaleTimeString('es-ES', { hour:'2-digit', minute:'2-digit' })
    : null

  const comisionEur = data?.total ? (data.total * (p.comision / 100)) : 0
  const neto        = data?.total ? data.total - comisionEur : 0

  return (
    <div style={{
      background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:12,
      padding:20, display:'flex', flexDirection:'column', gap:12,
    }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <div style={{
          width:48, height:48, borderRadius:12, background:p.color,
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:24, flexShrink:0, border:'1px solid rgba(255,255,255,.1)',
        }}>{p.emoji}</div>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:'Syne', fontWeight:700, fontSize:16 }}>{p.nombre}</div>
          <div style={{ fontSize:11, display:'flex', alignItems:'center', gap:6, marginTop:2 }}>
            <span style={{
              width:7, height:7, borderRadius:'50%', background: connected ? 'var(--green)' : 'var(--red)',
              boxShadow: connected ? '0 0 6px var(--green)' : 'none', display:'inline-block',
            }}/>
            <span style={{ color: connected ? 'var(--green)' : 'var(--text3)' }}>
              {connected ? `Conectado · sync ${lastSync || 'hoy'}` : 'Sin datos hoy'}
            </span>
          </div>
        </div>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => onSync(plat)}
          disabled={syncing === plat || syncing === 'all'}
          style={{ flexShrink:0 }}
        >
          {syncing === plat ? '⏳' : '🔄'} Sync
        </button>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
        <div style={{ background:'var(--bg3)', borderRadius:8, padding:'10px 12px' }}>
          <div style={{ fontSize:10, color:'var(--text3)', marginBottom:4 }}>INGRESOS BRUTOS</div>
          <div style={{ fontFamily:'Syne', fontWeight:700, fontSize:18, color:'var(--gold)' }}>
            {formatCurrency(data?.total || 0)}
          </div>
        </div>
        <div style={{ background:'var(--bg3)', borderRadius:8, padding:'10px 12px' }}>
          <div style={{ fontSize:10, color:'var(--text3)', marginBottom:4 }}>PEDIDOS</div>
          <div style={{ fontFamily:'Syne', fontWeight:700, fontSize:18 }}>
            {(data?.pedidos || 0).toLocaleString()}
          </div>
        </div>
        <div style={{ background:'var(--bg3)', borderRadius:8, padding:'10px 12px' }}>
          <div style={{ fontSize:10, color:'var(--text3)', marginBottom:4 }}>COMISIÓN ({p.comision}%)</div>
          <div style={{ fontFamily:'Syne', fontWeight:700, fontSize:16, color:'var(--red)' }}>
            -{formatCurrency(comisionEur)}
          </div>
        </div>
        <div style={{ background:'var(--bg3)', borderRadius:8, padding:'10px 12px' }}>
          <div style={{ fontSize:10, color:'var(--text3)', marginBottom:4 }}>NETO ESTIMADO</div>
          <div style={{ fontFamily:'Syne', fontWeight:700, fontSize:16, color:'var(--green)' }}>
            {formatCurrency(neto)}
          </div>
        </div>
      </div>

      {/* Ticket medio */}
      {data?.ticket_medio > 0 && (
        <div style={{ fontSize:12, color:'var(--text3)', borderTop:'1px solid var(--border)', paddingTop:10 }}>
          Ticket medio: <strong style={{ color:'var(--text)' }}>{formatCurrency(data.ticket_medio)}</strong>
        </div>
      )}
    </div>
  )
}

// ── PÁGINA PRINCIPAL ──────────────────────────────────────────────────────────
const DeliveryPanel = () => {
  const [resumen, setResumen]       = useState(null)
  const [porDia, setPorDia]         = useState([])
  const [pedidos, setPedidos]       = useState([])
  const [status, setStatus]         = useState(null)
  const [franquicias, setFranquicias] = useState([])
  const [loading, setLoading]       = useState(true)
  const [syncing, setSyncing]       = useState(null) // null | 'all' | 'glovo' | ...
  const [tab, setTab]               = useState('dashboard')
  const [filtros, setFiltros]       = useState({ franquicia_id:'', plataforma:'', dias:30 })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = {
        franquicia_id: filtros.franquicia_id || undefined,
        plataforma:    filtros.plataforma    || undefined,
        dias:          filtros.dias,
      }
      const [rData, dData, pData, stData, fData] = await Promise.all([
        api.get('/delivery/resumen').then(r => r.data),
        api.get('/delivery/por-dia', { params }).then(r => r.data),
        api.get('/delivery/pedidos', { params }).then(r => r.data),
        api.get('/delivery/status').then(r => r.data),
        api.get('/franquicias').then(r => r.data),
      ])
      setResumen(rData)
      setPorDia(dData)
      setPedidos(pData)
      setStatus(stData)
      setFranquicias(fData)
    } catch {
      toast.error('Error al cargar datos de delivery')
    } finally {
      setLoading(false)
    }
  }, [filtros])

  useEffect(() => { load() }, [load])

  const handleSync = async (plat) => {
    setSyncing(plat)
    try {
      const url = plat === 'all' ? '/delivery/sync/all' : `/delivery/sync/${plat}`
      const res = await api.post(url)
      const data = res.data
      if (plat === 'all') {
        const total = Object.values(data.results || {}).reduce((a, b) => a + b, 0)
        toast.success(`Sync completado — ${total} nuevos registros`)
      } else {
        toast.success(data.message || `${plat} sincronizado`)
      }
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || `Error al sincronizar ${plat}`)
    } finally {
      setSyncing(null)
    }
  }

  // Pie chart data
  const pieData = resumen ? Object.entries(PLATAFORMAS).map(([k, p]) => ({
    name:  p.nombre,
    value: resumen.por_plataforma?.[k]?.total || 0,
    color: p.color === '#000000' ? '#444' : p.color,
  })).filter(d => d.value > 0) : []

  const totalDeliv = resumen ? Object.values(resumen.por_plataforma || {})
    .reduce((s, p) => s + (p.total || 0), 0) : 0

  return (
    <div className="page-content">
      {/* Stats globales */}
      {resumen && (
        <div className="stats-grid" style={{ marginBottom:20 }}>
          <div className="stat-card stat-card--green">
            <div className="stat-icon">🛵</div>
            <div className="stat-label">Ingresos Delivery (mes)</div>
            <div className="stat-value">{formatCurrency(resumen.total_mes)}</div>
            <div className="stat-trend">{resumen.pedidos_mes.toLocaleString()} pedidos</div>
          </div>
          <div className="stat-card stat-card--blue">
            <div className="stat-icon">📦</div>
            <div className="stat-label">Pedidos Hoy</div>
            <div className="stat-value">{resumen.pedidos_hoy.toLocaleString()}</div>
            <div className="stat-trend">{formatCurrency(resumen.total_hoy)} hoy</div>
          </div>
          <div className="stat-card stat-card--gold">
            <div className="stat-icon">💰</div>
            <div className="stat-label">Ticket Medio Global</div>
            <div className="stat-value">
              {resumen.pedidos_mes > 0
                ? formatCurrency(resumen.total_mes / resumen.pedidos_mes)
                : '—'}
            </div>
          </div>
          <div className="stat-card stat-card--red">
            <div className="stat-icon">💸</div>
            <div className="stat-label">Comisiones Est. (mes)</div>
            <div className="stat-value" style={{ fontSize:20 }}>
              {formatCurrency(
                Object.entries(PLATAFORMAS).reduce((s, [k, p]) =>
                  s + (resumen.por_plataforma?.[k]?.total || 0) * (p.comision / 100), 0)
              )}
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div style={{ display:'flex', gap:8, marginBottom:16, alignItems:'center', flexWrap:'wrap' }}>
        {[
          { key:'dashboard', label:'📊 Dashboard' },
          { key:'listado',   label:'📋 Pedidos' },
        ].map(t => (
          <button key={t.key}
            className={`btn ${tab === t.key ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
        <select className="input-select" value={filtros.franquicia_id}
          onChange={e => setFiltros(f => ({ ...f, franquicia_id:e.target.value }))}>
          <option value="">Todas las franquicias</option>
          {franquicias.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
        </select>
        {tab === 'dashboard' && (
          <select className="input-select" value={filtros.dias}
            onChange={e => setFiltros(f => ({ ...f, dias:e.target.value }))}>
            <option value={7}>7 días</option>
            <option value={30}>30 días</option>
            <option value={90}>90 días</option>
          </select>
        )}
        {tab === 'listado' && (
          <select className="input-select" value={filtros.plataforma}
            onChange={e => setFiltros(f => ({ ...f, plataforma:e.target.value }))}>
            <option value="">Todas las plataformas</option>
            {Object.entries(PLATAFORMAS).map(([k, p]) =>
              <option key={k} value={k}>{p.emoji} {p.nombre}</option>)}
          </select>
        )}
        <button
          className="btn btn-primary"
          style={{ marginLeft:'auto' }}
          onClick={() => handleSync('all')}
          disabled={syncing !== null}
        >
          {syncing === 'all' ? '⏳ Sincronizando...' : '🔄 Sync todas'}
        </button>
      </div>

      {/* DASHBOARD TAB */}
      {tab === 'dashboard' && (
        <>
          {/* Platform cards */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:16 }}>
            {Object.keys(PLATAFORMAS).map(p => (
              <PlatCard
                key={p} plat={p}
                data={resumen?.por_plataforma?.[p]}
                status={status}
                onSync={handleSync}
                syncing={syncing}
              />
            ))}
          </div>

          {/* Area chart + Pie */}
          <div className="grid-2" style={{ marginBottom:16 }}>
            <div className="card">
              <div className="card-header">
                <span className="card-title">📈 Ingresos por plataforma — últimos {filtros.dias} días</span>
              </div>
              {loading ? <div className="loading">Cargando...</div> :
                porDia.length === 0 ? (
                  <div style={{ textAlign:'center', color:'var(--text3)', padding:40, fontSize:13 }}>
                    Sin datos. Pulsa "Sync todas" para cargar.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={porDia} margin={{ top:10, right:10, left:0, bottom:0 }}>
                      <defs>
                        {Object.entries(PLATAFORMAS).map(([k, p]) => (
                          <linearGradient key={k} id={`grad_${k}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor={p.color === '#000000' ? '#555' : p.color} stopOpacity={0.3}/>
                            <stop offset="95%" stopColor={p.color === '#000000' ? '#555' : p.color} stopOpacity={0}/>
                          </linearGradient>
                        ))}
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)"/>
                      <XAxis dataKey="fecha" tickFormatter={fmtDia} tick={{ fontSize:11, fill:'var(--text3)' }}/>
                      <YAxis tickFormatter={v => `${(v/1000).toFixed(0)}k€`} tick={{ fontSize:11, fill:'var(--text3)' }}/>
                      <Tooltip content={<CustomTooltip />}/>
                      <Legend wrapperStyle={{ fontSize:12, color:'var(--text2)' }}/>
                      <Area type="monotone" dataKey="glovo"    name="Glovo"    stroke="#00A082" fill="url(#grad_glovo)"    strokeWidth={2} dot={false}/>
                      <Area type="monotone" dataKey="ubereats" name="Uber Eats" stroke="#888"  fill="url(#grad_ubereats)" strokeWidth={2} dot={false}/>
                      <Area type="monotone" dataKey="justeat"  name="Just Eat"  stroke="#E6007E" fill="url(#grad_justeat)" strokeWidth={2} dot={false}/>
                    </AreaChart>
                  </ResponsiveContainer>
                )
              }
            </div>

            {/* Pie chart cuota */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">🥧 Cuota de ingresos por plataforma</span>
              </div>
              {pieData.length === 0 ? (
                <div style={{ textAlign:'center', color:'var(--text3)', padding:40, fontSize:13 }}>Sin datos</div>
              ) : (
                <div style={{ display:'flex', alignItems:'center', gap:24 }}>
                  <ResponsiveContainer width="50%" height={200}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                        dataKey="value" paddingAngle={3}>
                        {pieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={v => formatCurrency(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ flex:1, display:'flex', flexDirection:'column', gap:10 }}>
                    {pieData.map(d => (
                      <div key={d.name} style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{ width:10, height:10, borderRadius:'50%', background:d.color, flexShrink:0 }}/>
                        <div style={{ flex:1, fontSize:13 }}>{d.name}</div>
                        <div style={{ textAlign:'right' }}>
                          <div style={{ fontFamily:'Syne', fontWeight:700, fontSize:13, color:'var(--gold)' }}>
                            {formatCurrency(d.value)}
                          </div>
                          <div style={{ fontSize:10, color:'var(--text3)' }}>
                            {totalDeliv > 0 ? ((d.value / totalDeliv) * 100).toFixed(1) : 0}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* LISTADO TAB */}
      {tab === 'listado' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">📋 Registros de delivery ({pedidos.length})</span>
          </div>
          {loading ? <div className="loading">Cargando...</div> : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th><th>Plataforma</th><th>Franquicia</th>
                    <th>Pedidos</th><th>Ingresos</th><th>Comisión</th>
                    <th>Neto</th><th>Ticket medio</th>
                  </tr>
                </thead>
                <tbody>
                  {pedidos.length === 0 ? (
                    <tr><td colSpan={8} style={{ textAlign:'center', color:'var(--text3)', padding:40 }}>
                      No hay registros. Pulsa "Sync todas" para cargar datos.
                    </td></tr>
                  ) : pedidos.map(p => {
                    const plat     = PLATAFORMAS[p.plataforma] || {}
                    const total    = parseFloat(p.total || 0)
                    const comPct   = parseFloat(p.comision_pct || plat.comision || 0)
                    const comEur   = total * comPct / 100
                    const neto     = total - comEur
                    const pedNum   = parseInt(p.num_pedidos || 0)
                    const tMedio   = pedNum > 0 ? total / pedNum : 0
                    return (
                      <tr key={p.id}>
                        <td>{formatDate(p.fecha)}</td>
                        <td>
                          <span style={{ display:'flex', alignItems:'center', gap:6, fontSize:13 }}>
                            <span>{plat.emoji}</span>
                            <span style={{ fontWeight:500 }}>{plat.nombre || p.plataforma}</span>
                          </span>
                        </td>
                        <td>{p.franquicia?.nombre || '—'}</td>
                        <td style={{ fontWeight:600 }}>{pedNum}</td>
                        <td className="amount-gold">{formatCurrency(total)}</td>
                        <td style={{ color:'var(--red)', fontSize:12 }}>
                          -{formatCurrency(comEur)} <span style={{ color:'var(--text3)' }}>({comPct}%)</span>
                        </td>
                        <td style={{ color:'var(--green)', fontWeight:600 }}>{formatCurrency(neto)}</td>
                        <td style={{ fontSize:12, color:'var(--text3)' }}>{tMedio > 0 ? formatCurrency(tMedio) : '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default DeliveryPanel
