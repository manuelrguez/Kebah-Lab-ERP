import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../services/api.js'

export const fetchFacturas = createAsyncThunk('facturacion/fetch', async (params) =>
  api.get('/facturacion', { params }).then(r => r.data)
)

export default createSlice({
  name: 'facturacion',
  initialState: { facturas: [], loading: false },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchFacturas.pending,   s => { s.loading = true })
     .addCase(fetchFacturas.fulfilled, (s, { payload }) => { s.loading = false; s.facturas = payload })
     .addCase(fetchFacturas.rejected,  s => { s.loading = false })
  }
}).reducer
