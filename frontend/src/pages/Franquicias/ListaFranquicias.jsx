import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { formatDate } from '../../utils/formatters.js'
import api from '../../services/api.js'
import toast from 'react-hot-toast'

const TIPOS = [
  { value: '',               label: 'Todos los tipos' },
  { value: 'centro_ciudad',  label: 'Centro ciudad' },
  { value: 'centro_comercial', label: 'Centro comercial' },
  { value: 'poligono',       label: 'Polígono' },
  { value: 'barrio',         label: 'Barrio' },
  { value: 'turistico',      label: 'Turístico' },
]

const ModalFranquicia = ({ franquicia, empresas, comunidades, onClose, onSaved }) => {
  const isEdit = !!franquicia?.id
  const [form, setForm] = useState({
    nombre:          franquicia?.nombre          || '',
    empresa_id:      franquicia?.empresa_id      ? String(franquicia.empresa_id)   : '',
    comunidad_id:    franquicia?.comunidad_id    ? String(franquicia.comunidad_id) : '',
    direccion:       franquicia?.direccion       || '',
    ciudad:          franquicia?.ciudad          || '',
    cp:              franquicia?.cp              || '',
    lat:             franquicia?.lat  != null ? String(parseFloat(franquicia.lat))  : '',
    lng:             franquicia?.lng  != null ? String(parseFloat(franquicia.lng))  : '',
    tipo:            franquicia?.tipo            || 'centro_ciudad',
    telefono:        franquicia?.telefono        || '',
    email:           franquicia?.email           || '',
    fecha_apertura:  franquicia?.fecha_apertura  || '',
    activo:          franquicia?.activo          ?? true,
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    if (!form.nombre || !form.empresa_id) {
      toast.error('Nombre y empresa son obligatorios')
      return
    }
    setSaving(true)
    try {
      if (isEdit) {
        await api.put(`/franquicias/${franquicia.id}`, form)
        toast.success('Franquicia actualizada')
      } else {
        await api.post('/franquicias', form)
        toast.success('Franquicia creada')
      }
      onSaved()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{isEdit ? 'Editar Franquicia' : 'Nueva Franquicia'}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-grid-2">
            <div className="form-group">
              <label>Nombre *</label>
              <input value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="KL Madrid Centro" />
            </div>
            <div className="form-group">
              <label>Empresa *</label>
              <select value={form.empresa_id} onChange={e => set('empresa_id', e.target.value)}>
                <option value="">Seleccionar empresa</option>
                {empresas.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Comunidad</label>
              <select value={form.comunidad_id} onChange={e => set('comunidad_id', e.target.value)}>
                <option value="">Seleccionar comunidad</option>
                {comunidades.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Tipo</label>
              <select value={form.tipo} onChange={e => set('tipo', e.target.value)}>
                {TIPOS.filter(t => t.value).map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Ciudad</label>
              <input value={form.ciudad} onChange={e => set('ciudad', e.target.value)} placeholder="Madrid" />
            </div>
            <div className="form-group">
              <label>Código Postal</label>
              <input value={form.cp} onChange={e => set('cp', e.target.value)} placeholder="28001" />
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label>Dirección</label>
              <input value={form.direccion} onChange={e => set('direccion', e.target.value)} placeholder="Calle Gran Vía 1" />
            </div>
            <div className="form-group">
              <label>Teléfono</label>
              <input value={form.telefono} onChange={e => set('telefono', e.target.value)} placeholder="911234567" />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="madrid@kebablab.com" />
            </div>
            <div className="form-group">
              <label>Latitud</label>
              <input type="number" step="any" value={form.lat} onChange={e => set('lat', e.target.value)} placeholder="40.4168" />
            </div>
            <div className="form-group">
              <label>Longitud</label>
              <input type="number" step="any" value={form.lng} onChange={e => set('lng', e.target.value)} placeholder="-3.7038" />
            </div>
            <div className="form-group">
              <label>Fecha apertura</label>
              <input type="date" value={form.fecha_apertura} onChange={e => set('fecha_apertura', e.target.value)} />
            </div>
            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 24 }}>
              <input type="checkbox" id="activo" checked={form.activo} onChange={e => set('activo', e.target.checked)} style={{ width: 'auto' }} />
              <label htmlFor="activo" style={{ marginBottom: 0 }}>Activa</label>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear franquicia'}
          </button>
        </div>
      </div>
    </div>
  )
}

const LIMIT = 15

const ListaFranquicias = () => {
  const [franquicias, setFranquicias] = useState([])
  const [empresas, setEmpresas]       = useState([])
  const [comunidades, setComunidades] = useState([])
  const [loading, setLoading]         = useState(true)
  const [modal, setModal]             = useState(null)
  const [filters, setFilters]         = useState({ search: '', comunidad_id: '', empresa_id: '', tipo: '', activo: '' })
  const [page, setPage]               = useState(1)

  const load = async () => {
    setLoading(true)
    try {
      const params = {}
      if (filters.search)       params.search       = filters.search
      if (filters.comunidad_id) params.comunidad_id = filters.comunidad_id
      if (filters.empresa_id)   params.empresa_id   = filters.empresa_id
      if (filters.tipo)         params.tipo         = filters.tipo
      if (filters.activo !== '') params.activo      = filters.activo

      const [fData, eData, cData] = await Promise.all([
        api.get('/franquicias', { params }).then(r => r.data),
        api.get('/franquicias/meta/empresas').then(r => r.data),
        api.get('/franquicias/meta/comunidades').then(r => r.data),
      ])
      setFranquicias(fData)
      setEmpresas(eData)
      setComunidades(cData)
    } catch (err) {
      toast.error('Error al cargar franquicias')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { setPage(1); load() }, [filters])

  const handleDelete = async (id, nombre) => {
    if (!confirm(`¿Desactivar la franquicia "${nombre}"?`)) return
    try {
      await api.delete(`/franquicias/${id}`)
      toast.success('Franquicia desactivada')
      load()
    } catch {
      toast.error('Error al desactivar')
    }
  }

  const tipoLabel = (tipo) => TIPOS.find(t => t.value === tipo)?.label || tipo

  const totalPages  = Math.ceil(franquicias.length / LIMIT)
  const franqPagina = franquicias.slice((page - 1) * LIMIT, page * LIMIT)

  return (
    <div className="page-content">
      {/* Filters */}
      <div className="filter-row">
        <div className="search-box">
          <span>🔍</span>
          <input
            placeholder="Buscar franquicia..."
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
          />
        </div>
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
        <button className="btn btn-primary" onClick={() => setModal('new')}>+ Nueva Franquicia</button>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">🏪 Franquicias ({franquicias.length})</span>
          <Link to="/mapa" className="btn btn-secondary btn-sm">🗺️ Ver en mapa</Link>
        </div>
        {loading ? (
          <div className="loading">Cargando...</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Empresa</th>
                  <th>Comunidad</th>
                  <th>Ciudad</th>
                  <th>Tipo</th>
                  <th>Apertura</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {franquicias.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text3)', padding: 40 }}>
                    No hay franquicias. <button className="link-sm" onClick={() => setModal('new')}>Crear la primera →</button>
                  </td></tr>
                ) : franqPagina.map(f => (
                  <tr key={f.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>🏪 {f.nombre}</div>
                      {f.email && <div style={{ fontSize: 11, color: 'var(--text3)' }}>{f.email}</div>}
                    </td>
                    <td>{f.Empresa?.nombre || '—'}</td>
                    <td>{f.Comunidad?.nombre || '—'}</td>
                    <td>{f.ciudad || '—'}</td>
                    <td>
                      <span className="status status--blue" style={{ fontSize: 11 }}>
                        {tipoLabel(f.tipo)}
                      </span>
                    </td>
                    <td>{f.fecha_apertura ? formatDate(f.fecha_apertura) : '—'}</td>
                    <td>
                      <span className={`status ${f.activo ? 'status--green' : 'status--red'}`}>
                        {f.activo ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-secondary btn-sm"
                          onClick={() => setModal(f)}>✏️</button>
                        <button className="btn btn-secondary btn-sm"
                          onClick={() => handleDelete(f.id, f.nombre)}
                          style={{ color: 'var(--red)' }}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div style={{ display:'flex', justifyContent:'center', gap:6, padding:'16px 0', borderTop:'1px solid var(--border)' }}>
            <button className="btn btn-secondary btn-sm"
              onClick={() => setPage(p => Math.max(1, p-1))}
              disabled={page === 1}>← Anterior</button>
            <span style={{ padding:'5px 12px', fontSize:13, color:'var(--text2)' }}>
              {page} / {totalPages} · {franquicias.length} franquicias
            </span>
            <button className="btn btn-secondary btn-sm"
              onClick={() => setPage(p => Math.min(totalPages, p+1))}
              disabled={page === totalPages}>Siguiente →</button>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <ModalFranquicia
          franquicia={modal === 'new' ? null : modal}
          empresas={empresas}
          comunidades={comunidades}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load() }}
        />
      )}
    </div>
  )
}

export default ListaFranquicias