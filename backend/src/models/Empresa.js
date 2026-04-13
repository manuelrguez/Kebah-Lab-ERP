const { DataTypes } = require('sequelize')
const sequelize = require('../config/database.js')

module.exports = sequelize.define('Empresa', {
  id:          { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nombre:      { type: DataTypes.STRING(200), allowNull: false },
  cif:         { type: DataTypes.STRING(20),  allowNull: false, unique: true },
  comunidad_id:{ type: DataTypes.INTEGER },
  plan:        { type: DataTypes.ENUM('basico','profesional','enterprise'), defaultValue: 'profesional' },
  activo:      { type: DataTypes.BOOLEAN, defaultValue: true },
  logo_url:    { type: DataTypes.TEXT },
  email:       { type: DataTypes.STRING(200) },
  telefono:    { type: DataTypes.STRING(20) },
  direccion:   { type: DataTypes.TEXT },
}, { tableName: 'empresas', timestamps: true })
