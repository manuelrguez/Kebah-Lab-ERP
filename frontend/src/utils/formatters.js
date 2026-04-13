import { format, parseISO, formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

export const formatCurrency = (amount, currency = 'EUR') =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency }).format(amount)

export const formatDate = (date, pattern = 'dd/MM/yyyy') =>
  format(typeof date === 'string' ? parseISO(date) : date, pattern, { locale: es })

export const formatRelative = (date) =>
  formatDistanceToNow(typeof date === 'string' ? parseISO(date) : date, {
    addSuffix: true, locale: es,
  })

export const formatPercent = (value, decimals = 1) =>
  `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`

export const formatInvoiceNumber = (year, seq) =>
  `FAC-${year}-${String(seq).padStart(3, '0')}`

export const capitalize = (str) =>
  str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : ''
