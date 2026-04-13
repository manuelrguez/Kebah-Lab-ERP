import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import authService from '../../services/auth.service.js'

export const login = createAsyncThunk('auth/login', async (credentials, { rejectWithValue }) => {
  try {
    return await authService.login(credentials)
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Error de autenticación')
  }
})

export const refreshMe = createAsyncThunk('auth/refreshMe', async (_, { rejectWithValue }) => {
  try {
    return await authService.me()
  } catch (err) {
    return rejectWithValue(err.message)
  }
})

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    token: localStorage.getItem('kl_token') || null,
    loading: false,
    error: null,
    // Multi-franchise selection (empresa/superadmin)
    selectedFranquicias: [],
  },
  reducers: {
    logout(state) {
      state.user = null
      state.token = null
      state.selectedFranquicias = []
      localStorage.removeItem('kl_token')
    },
    setSelectedFranquicias(state, action) {
      state.selectedFranquicias = action.payload
    },
    clearError(state) { state.error = null },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => { state.loading = true; state.error = null })
      .addCase(login.fulfilled, (state, { payload }) => {
        state.loading = false
        state.user = payload.user
        state.token = payload.token
        localStorage.setItem('kl_token', payload.token)
      })
      .addCase(login.rejected, (state, { payload }) => {
        state.loading = false
        state.error = payload
      })
      .addCase(refreshMe.fulfilled, (state, { payload }) => {
        state.user = payload
      })
      .addCase(refreshMe.rejected, (state) => {
        state.user = null
        state.token = null
        localStorage.removeItem('kl_token')
      })
  },
})

export const { logout, setSelectedFranquicias, clearError } = authSlice.actions
export default authSlice.reducer
