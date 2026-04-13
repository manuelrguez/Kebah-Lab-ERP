const { DataTypes } = require('sequelize')
const sequelize = require('../config/database.js')

module.exports = sequelize.define('VentaTPV', {
  id:           { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  franquicia_id:{ type: DataTypes.INTEGER, allowNull: false },
  fecha:        { type: DataTypes.DATEONLY, allowNull: false },
  hora_inicio:  { type: DataTypes.TIME },
  hora_fin:     { type: DataTypes.TIME },
  total:        { type: DataTypes.DECIMAL(10,2) },
  num_tickets:  { type: DataTypes.INTEGER },
  efectivo:     { type: DataTypes.DECIMAL(10,2) },
  tarjeta:      { type: DataTypes.DECIMAL(10,2) },
}, { tableName: 'ventas_tpv', timestamps: true })
