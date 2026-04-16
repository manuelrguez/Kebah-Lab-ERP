import { useState, useEffect } from 'react'
import { formatCurrency, formatDate } from '../../utils/formatters.js'
import api from '../../services/api.js'
import toast from 'react-hot-toast'

const PROVIDERS = {
  imap: {
    label: 'IMAP genérico',
    desc:  'Gmail (con contraseña de app), Yahoo, servidor propio...',
    emoji: '📬',
    fields: [
      { key: 'host',     label: 'Servidor IMAP',  placeholder: 'imap.gmail.com',  type: 'text' },
      { key: 'port',     label: 'Puerto',          placeholder: '993',             type: 'number' },
      { key: 'usuario',  label: 'Email',           placeholder: 'tu@gmail.com',    type: 'email' },
      { key: 'password', label: 'Contraseña de app', placeholder: 'xxxx xxxx xxxx xxxx', type: 'password' },
    ],
    defaults: { host: 'imap.gmail.com', port: 993, tls: true },
  },
  gmail: {
    label: 'Gmail OAuth2',
    desc:  'Conexión segura via Google API (recomendado para producción)',
    emoji: '🔐',
    fields: [
      { key: 'client_id',     label: 'Client ID',     placeholder: 'xxx.apps.googleusercontent.com', type: 'text' },
      { key: 'client_secret', label: 'Client Secret', placeholder: 'GOCSPX-xxx', type: 'password' },
      { key: 'refresh_token', label: 'Refresh Token', placeholder: 'xxx',         type: 'password' },
    ],
    defaults: {},
  },
  outlook: {
    label: 'Outlook / M365',
    desc:  'Microsoft 365, Outlook.com, Hotmail via Graph API',
    emoji: '📧',
    fields: [
      { key: 'client_id',     label: 'Client ID',     placeholder: 'xxx-xxx-xxx', type: 'text' },
      { key: 'client_secret', label: 'Client Secret', placeholder: 'xxx',         type: 'password' },
      { key: 'refresh_token', label: 'Refresh Token', placeholder: 'xxx',         type: 'password' },
    ],
    defaults: { tenant_id: 'common' },
  },
}

const FILTROS_PRESET = [
  'factura', 'invoice', 'recibo', 'albarán', 'receipt', 'nota de cargo'
]

const EmailFacturas = () => {
  const [provider, setProvider]       = useState('imap')
  const [credentials, setCredentials] = useState({})
  const [opciones, setOpciones]       = useState({
    carpeta:        'INBOX',
    soloNoLeidos:   true,
    marcarLeido:    true,
    maxEmails:      30,
    filtrosAsunto:  ['factura', 'invoice', 'recibo'],
  })
  const [syncing, setSyncing]         = useState(false)
  const [resultado, setResultado]     = useState(null)
  const [historial, setHistorial]     = useState([])
  const [filtroCustom, setFiltroCustom] = useState('')

  const setCred = (k, v) => setCredentials(f => ({ ...f, [k]: v }))
  const setOpc  = (k, v) => setOpciones(f => ({ ...f, [k]: v }))

  const toggleFiltro = (f) => {
    setOpciones(prev => ({
      ...prev,
      filtrosAsunto: prev.filtrosAsunto.includes(f)
        ? prev.filtrosAsunto.filter(x => x !== f)
        : [...prev.filtrosAsunto, f]
    }))
  }

  const addFiltroCustom = () => {
    if (!filtroCustom.trim()) return
    if (!opciones.filtrosAsunto.includes(filtroCustom.trim())) {
      setOpc('filtrosAsunto', [...opciones.filtrosAsunto, filtroCustom.trim()])
    }
    setFiltroCustom('')
  }

  const handleSync = async () => {
    const prov = PROVIDERS[provider]
    const missingFields = prov.fields.filter(f => !credentials[f.key])
    if (missingFields.length) {
      toast.error(`Faltan campos: ${missingFields.map(f => f.label).join(', ')}`)
      return
    }
    /*if (!opciones.filtrosAsunto.length) {
      toast.error('Añade al menos un filtro de asunto')
      return
    }*/

    setSyncing(true)
    setResultado(null)

    try {
      const res = await api.post('/email-invoice/sync-directo', {
        provider,
        credentials: {
          ...PROVIDERS[provider].defaults,
          ...credentials,
          port: credentials.port ? parseInt(credentials.port) : PROVIDERS[provider].defaults.port,
        },
        opciones: {
          carpeta:        opciones.carpeta,
          soloNoLeidos:   opciones.soloNoLeidos,
          marcarLeido:    opciones.marcarLeido,
          maxEmails:      parseInt(opciones.maxEmails),
          filtros: {
            asunto: opciones.filtrosAsunto,
          },
        },
      })

      setResultado(res.data)
      toast.success('✅ Sync iniciado — las facturas aparecerán en Facturación en 1-2 minutos')

      // Add to history
      setHistorial(prev => [{
        ts:         new Date(),
        provider,
        procesados: res.data.procesados,
        importadas: res.data.importadas,
        duplicadas: res.data.duplicadas,
        errores:    res.data.errores,
      }, ...prev.slice(0, 9)])

    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al conectar con el correo')
    } finally {
      setSyncing(false)
    }
  }

  const prov = PROVIDERS[provider]

  return (
    <div>
      {/* Provider selector */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
        {Object.entries(PROVIDERS).map(([key, p]) => (
          <div key={key}
            onClick={() => { setProvider(key); setCredentials({}) }}
            style={{
              background:  provider === key ? 'rgba(229,188,85,.1)' : 'var(--bg3)',
              border:      `1px solid ${provider === key ? 'rgba(229,188,85,.4)' : 'var(--border)'}`,
              borderRadius: 10, padding: '14px 16px', cursor: 'pointer',
              transition: 'all .15s',
            }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>{p.emoji}</div>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{p.label}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>{p.desc}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Credentials */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">{prov.emoji} Credenciales — {prov.label}</span>
          </div>

          {provider === 'imap' && (
            <div style={{
              background: 'rgba(88,166,255,.08)', border: '1px solid rgba(88,166,255,.2)',
              borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 12,
            }}>
              💡 <strong>Gmail:</strong> Necesitas una <strong>Contraseña de aplicación</strong> de Google
              (no tu contraseña normal). Activa la verificación en 2 pasos y ve a
              <a href="https://myaccount.google.com/apppasswords" target="_blank"
                rel="noreferrer" style={{ color: 'var(--blue)', marginLeft: 4 }}>
                myaccount.google.com/apppasswords
              </a>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {prov.fields.map(field => (
              <div key={field.key} className="form-group" style={{ marginBottom: 0 }}>
                <label>{field.label}</label>
                <input
                  type={field.type}
                  value={credentials[field.key] || ''}
                  onChange={e => setCred(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  autoComplete="off"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card" style={{ marginBottom: 0 }}>
            <div className="card-header">
              <span className="card-title">⚙️ Opciones de búsqueda</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Carpeta</label>
                <input value={opciones.carpeta}
                  onChange={e => setOpc('carpeta', e.target.value)}
                  placeholder="INBOX" />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Máximo de emails a revisar</label>
                <input type="number" value={opciones.maxEmails}
                  onChange={e => setOpc('maxEmails', e.target.value)}
                  min={1} max={200} />
              </div>
              <div style={{ display: 'flex', gap: 16 }}>
                <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, cursor:'pointer' }}>
                  <input type="checkbox" checked={opciones.soloNoLeidos}
                    onChange={e => setOpc('soloNoLeidos', e.target.checked)}
                    style={{ width:'auto', padding:0 }} />
                  Solo no leídos
                </label>
                <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, cursor:'pointer' }}>
                  <input type="checkbox" checked={opciones.marcarLeido}
                    onChange={e => setOpc('marcarLeido', e.target.checked)}
                    style={{ width:'auto', padding:0 }} />
                  Marcar como leído
                </label>
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 0 }}>
            <div className="card-header">
              <span className="card-title">🔍 Filtros de asunto</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 10 }}>
              Solo se procesarán emails cuyo asunto contenga alguna de estas palabras:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {FILTROS_PRESET.map(f => (
                <button key={f}
                  onClick={() => toggleFiltro(f)}
                  style={{
                    background:   opciones.filtrosAsunto.includes(f) ? 'rgba(229,188,85,.2)' : 'var(--bg4)',
                    border:       `1px solid ${opciones.filtrosAsunto.includes(f) ? 'rgba(229,188,85,.5)' : 'var(--border)'}`,
                    color:        opciones.filtrosAsunto.includes(f) ? 'var(--gold)' : 'var(--text2)',
                    borderRadius: 20, padding: '4px 12px', fontSize: 12, cursor: 'pointer',
                  }}>
                  {f}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={filtroCustom}
                onChange={e => setFiltroCustom(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addFiltroCustom()}
                placeholder="Añadir filtro personalizado..."
                style={{ flex: 1, fontSize: 12 }} />
              <button className="btn btn-secondary btn-sm" onClick={addFiltroCustom}>+</button>
            </div>
            {opciones.filtrosAsunto.filter(f => !FILTROS_PRESET.includes(f)).map(f => (
              <div key={f} style={{ display:'flex', alignItems:'center', gap:6, marginTop:6, fontSize:12 }}>
                <span style={{ color:'var(--gold)' }}>✓ {f}</span>
                <button onClick={() => setOpc('filtrosAsunto', opciones.filtrosAsunto.filter(x => x !== f))}
                  style={{ background:'none', border:'none', color:'var(--red)', cursor:'pointer', fontSize:14 }}>×</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sync button */}
      <div style={{ margin: '20px 0', display: 'flex', gap: 12, alignItems: 'center' }}>
        <button
          className="btn btn-primary"
          onClick={handleSync}
          disabled={syncing}
          style={{ fontSize: 14, padding: '10px 24px' }}
        >
          {syncing ? '⏳ Conectando y procesando emails...' : '📬 Sincronizar correo ahora'}
        </button>
        {syncing && (
          <span style={{ fontSize: 12, color: 'var(--text3)' }}>
            Esto puede tardar 1-2 minutos dependiendo del número de emails
          </span>
        )}
      </div>

      {/* Resultado */}
      {resultado && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <span className="card-title">📊 Resultado del último sync</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
            {[
              { label: 'Emails revisados', value: resultado.procesados, color: 'var(--blue)'   },
              { label: 'Facturas importadas', value: resultado.importadas, color: 'var(--green)' },
              { label: 'Duplicadas omitidas', value: resultado.duplicadas, color: 'var(--text3)' },
              { label: 'Errores',             value: resultado.errores,   color: 'var(--red)'   },
            ].map(s => (
              <div key={s.label} style={{
                background: 'var(--bg3)', borderRadius: 8, padding: '12px 14px',
                border: '1px solid var(--border)',
              }}>
                <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase' }}>
                  {s.label}
                </div>
                <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 22, color: s.color }}>
                  {s.value}
                </div>
              </div>
            ))}
          </div>

          {resultado.facturas?.length > 0 && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                Facturas importadas:
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Número</th><th>Proveedor</th><th>Total</th></tr>
                  </thead>
                  <tbody>
                    {resultado.facturas.map((f, i) => (
                      <tr key={i}>
                        <td><strong>{f.numero}</strong></td>
                        <td>{f.proveedor || '—'}</td>
                        <td className="amount-gold">{f.total ? formatCurrency(parseFloat(f.total)) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Historial */}
      {historial.length > 0 && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">📋 Historial de sincronizaciones</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Fecha</th><th>Proveedor</th><th>Revisados</th><th>Importadas</th><th>Duplicadas</th><th>Errores</th></tr>
              </thead>
              <tbody>
                {historial.map((h, i) => (
                  <tr key={i}>
                    <td style={{ fontSize: 12 }}>{h.ts.toLocaleString('es-ES')}</td>
                    <td>{PROVIDERS[h.provider]?.emoji} {PROVIDERS[h.provider]?.label}</td>
                    <td>{h.procesados}</td>
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
