import { useSelector, useDispatch } from 'react-redux'
import { setSelectedFranquicias } from '../../store/slices/authSlice.js'
import { useAuth } from '../../hooks/useAuth.js'
import styles from './FranchiseSelector.module.css'

/**
 * Dropdown to select one or multiple franchises (visible to empresa/superadmin/central).
 * Stores selection in Redux so all modules can filter accordingly.
 */
const FranchiseSelector = () => {
  const dispatch = useDispatch()
  const { user }  = useAuth()
  const { list }  = useSelector(s => s.franquicias)
  const selected  = useSelector(s => s.auth.selectedFranquicias)

  if (!['superadmin', 'central', 'empresa'].includes(user?.rol)) return null

  const toggle = (id) => {
    const next = selected.includes(id)
      ? selected.filter(f => f !== id)
      : [...selected, id]
    dispatch(setSelectedFranquicias(next))
  }

  const selectAll = () => dispatch(setSelectedFranquicias(list.map(f => f.id)))
  const clearAll  = () => dispatch(setSelectedFranquicias([]))

  return (
    <div className="franchise-selector">
      <div className="fs-header">
        <span>Franquicias ({selected.length || 'todas'})</span>
        <button onClick={selected.length ? clearAll : selectAll}>
          {selected.length ? 'Todas' : 'Limpiar'}
        </button>
      </div>
      <div className="fs-list">
        {list.map(f => (
          <label key={f.id} className={`fs-item ${selected.includes(f.id) ? 'active' : ''}`}>
            <input
              type="checkbox"
              checked={selected.includes(f.id)}
              onChange={() => toggle(f.id)}
            />
            {f.nombre}
          </label>
        ))}
      </div>
    </div>
  )
}

export default FranchiseSelector
