import { useState, useEffect } from 'react'

export const useTheme = () => {
  const [theme, setTheme] = useState(() =>
    localStorage.getItem('kl_theme') || 'dark'
  )

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('kl_theme', theme)
  }, [theme])

  const toggle = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  return { theme, toggle }
}
