import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import franquiciasService from '../../services/franquicias.service.js'

export const fetchFranquicias = createAsyncThunk(
  'franquicias/fetchAll',
  async (filters = {}, { rejectWithValue }) => {
    try { return await franquiciasService.getAll(filters) }
    catch (err) { return rejectWithValue(err.response?.data?.message) }
  }
)

const franquiciasSlice = createSlice({
  name: 'franquicias',
  initialState: {
    list: [],
    loading: false,
    error: null,
    filters: { comunidad: null, empresa: null, tipo: null, estado: null },
  },
  reducers: {
    setFilters(state, action) {
      state.filters = { ...state.filters, ...action.payload }
    },
    resetFilters(state) {
      state.filters = { comunidad: null, empresa: null, tipo: null, estado: null }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFranquicias.pending, (state) => { state.loading = true })
      .addCase(fetchFranquicias.fulfilled, (state, { payload }) => {
        state.loading = false
        state.list = payload
      })
      .addCase(fetchFranquicias.rejected, (state, { payload }) => {
        state.loading = false
        state.error = payload
      })
  },
})

export const { setFilters, resetFilters } = franquiciasSlice.actions
export default franquiciasSlice.reducer
