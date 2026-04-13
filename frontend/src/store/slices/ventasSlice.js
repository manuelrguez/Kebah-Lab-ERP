import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../services/api.js'

export const fetchVentas = createAsyncThunk('ventas/fetch', async (params) =>
  api.get('/ventas', { params }).then(r => r.data)
)

export default createSlice({
  name: 'ventas',
  initialState: { data: [], loading: false, error: null },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchVentas.pending,   s => { s.loading = true })
     .addCase(fetchVentas.fulfilled, (s, { payload }) => { s.loading = false; s.data = payload })
     .addCase(fetchVentas.rejected,  s => { s.loading = false })
  }
}).reducer
