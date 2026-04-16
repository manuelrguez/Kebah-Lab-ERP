import { useState, useEffect } from 'react'
import { formatCurrency } from '../../utils/formatters.js'
import api from '../../services/api.js'
import toast from 'react-hot-toast'

const FILTROS_PRESET = ['factura', 'invoice', 'recibo', 'albarán', 'receipt', 'nota de cargo']

const EmailFacturas = () => {
  const [config, setConfig]           = useState(null)
  const [loadingConfig, setLoadingConfig] = useState(true)
  const [syncing, setSyncing]         = useState(false)
  const [resultado, setResultado]     = useState(null)
  const [historial, setHistorial]     = useState([])
  const [maxEmails, setMaxEmails]     = useState(20)
  const [filtrosAsunto, setFiltrosAsunto] = useState(['factura', 'invoice', 'recibo'])
  const [filtroCustom, setFiltroCustom]   = useState('')

  useEffect(() => {
    api.get('/email-config')
      .then(r => { setConfig(r.data); if (r.data?.filtros_asunto) setFiltrosAsunto(r.data.filtros_asunto) })
      .catch(() => setConfig(null))
      .finally(() => setLoadingConfig(false))
  }, [])

  const toggleFiltro = (f) => {
    setFiltrosAsunto(prev =>
      prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]
    )
  }

  const addFiltroCustom = () => {
    if (!filtroCustom.trim()) return
    if (!filtrosAsunto.includes(filtroCustom.trim())) {
      setFiltrosAsunto(prev => [...prev, filtroCustom.trim()])
    }
    setFiltroCustom('')
  }

  const handleSync = async () => {
    if (!config) {
      toast.error('Configura primero el correo en Configuración → Email')
      return
    }

    setSyncing(true)
    setResultado(null)

    try {
      const res = await api.post('/email-invoice/sync-guardado', {
        max_emails:     parseInt(maxEmails),
        filtros_asunto: filtrosAsunto,
      })

      toast.success('✅ Sync iniciado — las facturas aparecerán en 1-2 minutos')
      setHistorial(prev => [{
        ts: new Date(), procesados: 0, importadas: 0, duplicadas: 0, errores: 0
      }, ...prev.slice(0, 9)])
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al sincronizar')
    } finally {
      setSyncing(false)
    }
  }

  if (loadingConfig) return <div className="loading">Cargando...</div>

  return (
    <div>
      {/* Estado de configuración */}
      {!config ? (
        <div style={{
          background: 'rgba(248,81,73,.08)', border: '1px solid rgba(248,81,73,.3)',
          borderRadius: 10, padding: '20px 24px', marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 16,
        }}>
          <div style={{ fontSize: 32 }}>⚠️</div>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Correo no configurado</div>
            <div style={{ fontSize: 13, color: 'var(--text2)' }}>
              Ve a <strong>Configuración → Correo electrónico</strong> para configurar tu cuenta de email una sola vez.
            </div>
          </div>
        </div>
      ) : (
        <div style={{
          background: 'rgba(63,185,80,.08)', border: '1px solid rgba(63,185,80,.3)',
          borderRadius: 10, padding: '16px 20px', marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 16,
        }}>
          <div style={{ fontSize: 28 }}>✅</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Correo configurado</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
              {config.usuario} · {config.host} · {config.provider.toUpperCase()}
            </div>
          </div>
          <a href="/configuracion" style={{ fontSize: 12, color: 'var(--blue)' }}>
            Cambiar configuración →
          </a>
        </div>
      )}

      {/* Opciones de sync */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <span className="card-title">⚙️ Opciones</span>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Máximo de emails a revisar</label>
            <input type="number" value={maxEmails}
              onChange={e => setMaxEmails(e.target.value)}
              min={1} max={100} />
          </div>
        </div>

        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <span className="card-title">🔍 Filtros de asunto</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 8 }}>
            Solo se procesarán emails cuyo asunto contenga:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
            {FILTROS_PRESET.map(f => (
              <button key={f} onClick={() => toggleFiltro(f)} style={{
                background:   filtrosAsunto.includes(f) ? 'rgba(229,188,85,.2)' : 'var(--bg4)',
                border:       `1px solid ${filtrosAsunto.includes(f) ? 'rgba(229,188,85,.5)' : 'var(--border)'}`,
                color:        filtrosAsunto.includes(f) ? 'var(--gold)' : 'var(--text2)',
                borderRadius: 20, padding: '4px 12px', fontSize: 12, cursor: 'pointer',
              }}>{f}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={filtroCustom}
              onChange={e => setFiltroCustom(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addFiltroCustom()}
              placeholder="Añadir filtro..." style={{ flex: 1, fontSize: 12 }} />
            <button className="btn btn-secondary btn-sm" onClick={addFiltroCustom}>+</button>
          </div>
        </div>
      </div>

      {/* Botón sync */}
      <button
        className="btn btn-primary"
        onClick={handleSync}
        disabled={syncing || !config}
        style={{ fontSize: 14, padding: '12px 28px', marginBottom: 20 }}
      >
        {syncing ? '⏳ Conectando...' : '📬 Obtener últimas facturas del correo'}
      </button>

      {/* Historial */}
      {historial.length > 0 && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">📋 Historial de sincronizaciones</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Fecha</th><th>Importadas</th><th>Duplicadas</th><th>Errores</th></tr>
              </thead>
              <tbody>
                {historial.map((h, i) => (
                  <tr key={i}>
                    <td style={{ fontSize: 12 }}>{h.ts.toLocaleString('es-ES')}</td>
                    <td style={{ color: 'var(--green)', fontWeight: 600 }}>{h.importadas}</td>
                    <td style={{ color: 'var(--text3)' }}>{h.duplicadas}</td>
                    <td style={{ color: h.errores > 0 ? 'var(--red)' : 'var(--text3)' }}>{h.errores}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default EmailFacturas
