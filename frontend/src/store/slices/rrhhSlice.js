import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../services/api.js'

export const fetchEmpleados = createAsyncThunk('rrhh/fetchEmpleados', async (params) =>
  api.get('/rrhh/empleados', { params }).then(r => r.data)
)

export default createSlice({
  name: 'rrhh',
  initialState: { empleados: [], loading: false },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchEmpleados.pending,   s => { s.loading = true })
     .addCase(fetchEmpleados.fulfilled, (s, { payload }) => { s.loading = false; s.empleados = payload })
     .addCase(fetchEmpleados.rejected,  s => { s.loading = false })
  }
}).reducer
