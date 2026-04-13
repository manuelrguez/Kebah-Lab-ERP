const { DataTypes } = require('sequelize')
const sequelize = require('../config/database.js')

module.exports = sequelize.define('VentaDelivery', {
  id:           { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  franquicia_id:{ type: DataTypes.INTEGER, allowNull: false },
  plataforma:   { type: DataTypes.ENUM('glovo','ubereats','justeat'), allowNull: false },
  fecha:        { type: DataTypes.DATEONLY, allowNull: false },
  total:        { type: DataTypes.DECIMAL(10,2) },
  num_pedidos:  { type: DataTypes.INTEGER },
  comision_pct: { type: DataTypes.DECIMAL(5,2) },
  raw_data:     { type: DataTypes.JSONB },
}, { tableName: 'ventas_delivery', timestamps: true })
