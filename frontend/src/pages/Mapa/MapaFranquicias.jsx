import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import api from '../../services/api.js'
import { formatDate } from '../../utils/formatters.js'
import toast from 'react-hot-toast'

// Fix Leaflet default icon
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

// Custom colored marker
const makeIcon = (color) => L.divIcon({
  className: '',
  html: `<div style="
    width:14px;height:14px;border-radius:50%;
    background:${color};border:2px solid #0d1117;
    box-shadow:0 0 8px ${color}88;
  "></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
})

const COMUNIDAD_COLORS = [
  '#E5BC55', '#58a6ff', '#3fb950', '#bc8cff',
  '#e3a62a', '#f85149', '#79c0ff', '#56d364',
]

const FitBounds = ({ positions }) => {
  const map = useMap()
  useEffect(() => {
    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions)
      map.fitBounds(bounds, { padding: [40, 40] })
    }
  }, [positions])
  return null
}

const MapaFranquicias = () => {
  const [franquicias, setFranquicias]   = useState([])
  const [comunidades, setComunidades]   = useState([])
  const [empresas, setEmpresas]         = useState([])
  const [loading, setLoading]           = useState(true)
  const [selected, setSelected]         = useState(null)
  const [filters, setFilters]           = useState({
    comunidad_id: '', empresa_id: '', tipo: '', activo: 'true'
  })

  const TIPOS = [
    { value: '',               label: 'Todos los tipos' },
    { value: 'centro_ciudad',  label: 'Centro ciudad' },
    { value: 'centro_comercial', label: 'Centro comercial' },
    { value: 'poligono',       label: 'Polígono' },
    { value: 'barrio',         label: 'Barrio' },
    { value: 'turistico',      label: 'Turístico' },
  ]

  const load = async () => {
    try {
      const params = {}
      if (filters.comunidad_id) params.comunidad_id = filters.comunidad_id
      if (filters.empresa_id)   params.empresa_id   = filters.empresa_id
      if (filters.tipo)         params.tipo         = filters.tipo
      if (filters.activo !== '') params.activo      = filters.activo

      const [fData, cData, eData] = await Promise.all([
        api.get('/franquicias', { params }).then(r => r.data),
        api.get('/franquicias/meta/comunidades').then(r => r.data),
        api.get('/franquicias/meta/empresas').then(r => r.data),
      ])
      setFranquicias(fData)
      setComunidades(cData)
      setEmpresas(eData)
    } catch {
      toast.error('Error al cargar el mapa')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [filters])

  // Assign color per comunidad
  const comunidadColor = {}
  comunidades.forEach((c, i) => {
    comunidadColor[c.id] = COMUNIDAD_COLORS[i % COMUNIDAD_COLORS.length]
  })

  const withCoords = franquicias.filter(f => f.lat && f.lng)
  const positions  = withCoords.map(f => [parseFloat(f.lat), parseFloat(f.lng)])

  // Group by comunidad for legend
  const byComunidad = comunidades.map(c => ({
    ...c,
    count: franquicias.filter(f => f.comunidad_id === c.id).length,
    color: comunidadColor[c.id],
  })).filter(c => c.count > 0)

  return (
    <div className="page-content" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)' }}>
      {/* Filters */}
      <div className="filter-row" style={{ flexShrink: 0 }}>
        <select className="input-select" value={filters.comunidad_id}
          onChange={e => setFilters(f => ({ ...f, comunidad_id: e.target.value }))}>
          <option value="">Todas las comunidades</option>
          {comunidades.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        <select className="input-select" value={filters.empresa_id}
          onChange={e => setFilters(f => ({ ...f, empresa_id: e.target.value }))}>
          <option value="">Todas las empresas</option>
          {empresas.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
        </select>
        <select className="input-select" value={filters.tipo}
          onChange={e => setFilters(f => ({ ...f, tipo: e.target.value }))}>
          {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select className="input-select" value={filters.activo}
          onChange={e => setFilters(f => ({ ...f, activo: e.target.value }))}>
          <option value="">Todas</option>
          <option value="true">Activas</option>
          <option value="false">Inactivas</option>
        </select>
        <span style={{ color: 'var(--text3)', fontSize: 13 }}>
          {franquicias.length} franquicias · {withCoords.length} en mapa
        </span>
      </div>

      <div style={{ display: 'flex', gap: 16, flex: 1, minHeight: 0 }}>
        {/* Map */}
        <div style={{ flex: 1, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
          {loading ? (
            <div className="loading">Cargando mapa...</div>
          ) : (
            <MapContainer
              center={[40.4168, -3.7038]}
              zoom={6}
              style={{ width: '100%', height: '100%' }}
            >
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                attribution='© <a href="https://carto.com/">CARTO</a>'
              />
              {positions.length > 0 && <FitBounds positions={positions} />}
              {withCoords.map(f => (
                <Marker
                  key={f.id}
                  position={[parseFloat(f.lat), parseFloat(f.lng)]}
                  icon={makeIcon(comunidadColor[f.comunidad_id] || '#E5BC55')}
                  eventHandlers={{ click: () => setSelected(f) }}
                >
                  <Popup>
                    <div style={{ minWidth: 180 }}>
                      <strong>{f.nombre}</strong><br />
                      <span style={{ fontSize: 12 }}>{f.ciudad}</span><br />
                      <span style={{ fontSize: 11, color: '#666' }}>{f.Empresa?.nombre}</span>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          )}
        </div>

        {/* Sidebar panel */}
        <div style={{ width: 280, display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>
          {/* Legend */}
          <div className="card" style={{ padding: 16, marginBottom: 0 }}>
            <div className="card-title" style={{ marginBottom: 12 }}>Comunidades</div>
            {byComunidad.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--text3)' }}>Sin datos</p>
            ) : byComunidad.map(c => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
                <span style={{ fontSize: 13, flex: 1 }}>{c.nombre}</span>
                <span style={{ fontSize: 12, color: 'var(--text3)' }}>{c.count}</span>
              </div>
            ))}
          </div>

          {/* Selected franchise detail */}
          {selected && (
            <div className="card" style={{ padding: 16, marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div className="card-title">🏪 Detalle</div>
                <button style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 16 }}
                  onClick={() => setSelected(null)}>✕</button>
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{selected.nombre}</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 12 }}>{selected.Empresa?.nombre}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
                {selected.ciudad && <div>📍 {selected.ciudad} {selected.cp}</div>}
                {selected.direccion && <div style={{ color: 'var(--text3)' }}>{selected.direccion}</div>}
                {selected.telefono && <div>📞 {selected.telefono}</div>}
                {selected.email && <div>✉️ {selected.email}</div>}
                {selected.fecha_apertura && <div>📅 Apertura: {formatDate(selected.fecha_apertura)}</div>}
                <div>
                  <span className={`status ${selected.activo ? 'status--green' : 'status--red'}`}>
                    {selected.activo ? 'Activa' : 'Inactiva'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* List of franchises without coords */}
          {franquicias.filter(f => !f.lat || !f.lng).length > 0 && (
            <div className="card" style={{ padding: 16, marginBottom: 0 }}>
              <div className="card-title" style={{ marginBottom: 8 }}>
                ⚠️ Sin coordenadas ({franquicias.filter(f => !f.lat || !f.lng).length})
              </div>
              {franquicias.filter(f => !f.lat || !f.lng).map(f => (
                <div key={f.id} style={{ fontSize: 12, color: 'var(--text3)', padding: '3px 0' }}>
                  • {f.nombre}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default MapaFranquicias
