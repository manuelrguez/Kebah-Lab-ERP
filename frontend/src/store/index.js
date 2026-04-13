import { configureStore } from '@reduxjs/toolkit'
import authReducer from './slices/authSlice.js'
import franquiciasReducer from './slices/franquiciasSlice.js'
import ventasReducer from './slices/ventasSlice.js'
import rrhhReducer from './slices/rrhhSlice.js'
import facturacionReducer from './slices/facturacionSlice.js'

export const store = configureStore({
  reducer: {
    auth:        authReducer,
    franquicias: franquiciasReducer,
    ventas:      ventasReducer,
    rrhh:        rrhhReducer,
    facturacion: facturacionReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false }),
})

export default store
