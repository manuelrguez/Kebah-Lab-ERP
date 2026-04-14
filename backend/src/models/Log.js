const { DataTypes } = require('sequelize')
const sequelize = require('../config/database.js')

module.exports = sequelize.define('Log', {
  id:           { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  usuario_id:   { type: DataTypes.INTEGER },
  usuario_nombre: { type: DataTypes.STRING(200) },
  usuario_email:  { type: DataTypes.STRING(200) },
  rol:          { type: DataTypes.STRING(50) },
  accion:       { type: DataTypes.STRING(100), allowNull: false }, // LOGIN, LOGOUT, CREATE, UPDATE, DELETE, VIEW
  modulo:       { type: DataTypes.STRING(100) }, // franquicias, rrhh, facturacion, etc.
  descripcion:  { type: DataTypes.TEXT },
  ip:           { type: DataTypes.STRING(50) },
  user_agent:   { type: DataTypes.TEXT },
  metodo:       { type: DataTypes.STRING(10) }, // GET, POST, PUT, DELETE
  ruta:         { type: DataTypes.STRING(500) },
  status_code:  { type: DataTypes.INTEGER },
  duracion_ms:  { type: DataTypes.INTEGER },
  extra:        { type: DataTypes.JSONB },
}, {
  tableName: 'logs',
  timestamps: true,
  updatedAt: false, // logs are immutable
})
