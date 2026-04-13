import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuth } from './hooks/useAuth.js'
import RoleGuard from './components/shared/RoleGuard.jsx'
import Layout from './components/layout/Layout.jsx'

// Pages
import Login from './pages/Login/Login.jsx'
import DashboardCentral from './pages/Dashboard/DashboardCentral.jsx'
import DashboardFranquicia from './pages/Dashboard/DashboardFranquicia.jsx'
import MapaFranquicias from './pages/Mapa/MapaFranquicias.jsx'
import ListaFranquicias from './pages/Franquicias/ListaFranquicias.jsx'
import ResumenVentas from './pages/Ventas/ResumenVentas.jsx'
import DeliveryPanel from './pages/Delivery/DeliveryPanel.jsx'
import Personal from './pages/RRHH/Personal.jsx'
import Nominas from './pages/RRHH/Nominas.jsx'
import Facturas from './pages/Facturacion/Facturas.jsx'
import InformesIA from './pages/Informes/InformesIA.jsx'
import AsistenteIA from './pages/AsistenteIA/AsistenteIA.jsx'
import Perfil from './pages/Configuracion/Perfil.jsx'

// Route wrapper with Layout
const Page = ({ component: Component, title, breadcrumb, module }) => (
  <RoleGuard module={module}>
    <Layout title={title} breadcrumb={breadcrumb}>
      <Component />
    </Layout>
  </RoleGuard>
)

const App = () => {
  const { user, token, refresh } = useAuth()

  // Restore session on load
  useEffect(() => {
    if (token && !user) refresh()
  }, [])

  if (!token) return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )

  // Route to correct dashboard by role
  const DashboardComponent = ['franquiciado'].includes(user?.rol)
    ? DashboardFranquicia
    : DashboardCentral

  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/" replace />} />

      <Route path="/" element={
        <Page component={DashboardComponent} title="Dashboard"
          breadcrumb="Kebab Lab / Dashboard" module="dashboard" />
      } />
      <Route path="/mapa" element={
        <Page component={MapaFranquicias} title="Mapa de Franquicias"
          breadcrumb="Kebab Lab / Mapa" module="mapa" />
      } />
      <Route path="/franquicias" element={
        <Page component={ListaFranquicias} title="Franquicias"
          breadcrumb="Kebab Lab / Franquicias" module="franquicias" />
      } />
      <Route path="/ventas" element={
        <Page component={ResumenVentas} title="Ventas / TPV"
          breadcrumb="Kebab Lab / Ventas" module="ventas" />
      } />
      <Route path="/delivery" element={
        <Page component={DeliveryPanel} title="Delivery"
          breadcrumb="Kebab Lab / Delivery" module="delivery" />
      } />
      <Route path="/rrhh" element={
        <Page component={Personal} title="Recursos Humanos"
          breadcrumb="Kebab Lab / RRHH" module="rrhh" />
      } />
      <Route path="/nominas" element={
        <Page component={Nominas} title="Nóminas"
          breadcrumb="Kebab Lab / Nóminas" module="nominas" />
      } />
      <Route path="/facturacion" element={
        <Page component={Facturas} title="Facturación"
          breadcrumb="Kebab Lab / Facturación" module="facturacion" />
      } />
      <Route path="/informes" element={
        <Page component={InformesIA} title="Informes IA"
          breadcrumb="Kebab Lab / Informes" module="informes" />
      } />
      <Route path="/asistente" element={
        <Page component={AsistenteIA} title="Asistente IA"
          breadcrumb="Kebab Lab / Asistente" module="asistente" />
      } />
      <Route path="/configuracion" element={
        <Page component={Perfil} title="Configuración"
          breadcrumb="Kebab Lab / Configuración" module="configuracion" />
      } />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
