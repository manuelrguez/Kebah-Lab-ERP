const StatCard = ({ icon, label, value, trend, trendDown, color = 'blue' }) => (
  <div className={`stat-card stat-card--${color}`}>
    <div className="stat-icon">{icon}</div>
    <div className="stat-label">{label}</div>
    <div className="stat-value">{value}</div>
    {trend && <div className={`stat-trend ${trendDown ? 'stat-trend--down' : ''}`}>{trend}</div>}
  </div>
)

export default StatCard
