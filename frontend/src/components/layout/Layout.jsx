import Sidebar from './Sidebar.jsx'
import Topbar from './Topbar.jsx'

const Layout = ({ children, title, breadcrumb }) => (
  <div className="app-layout">
    <Sidebar />
    <div className="app-main">
      <Topbar title={title} breadcrumb={breadcrumb} />
      <main className="app-content">
        {children}
      </main>
    </div>
  </div>
)

export default Layout
