const { DataTypes } = require('sequelize')
const sequelize = require('../config/database.js')

module.exports = sequelize.define('Nomina', {
  id:          { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  empleado_id: { type: DataTypes.INTEGER, allowNull: false },
  periodo:     { type: DataTypes.STRING(7), allowNull: false }, // e.g. "2026-04"
  salario_bruto:  { type: DataTypes.DECIMAL(10,2) },
  deducciones:    { type: DataTypes.DECIMAL(10,2) },
  salario_neto:   { type: DataTypes.DECIMAL(10,2) },
  irpf_pct:       { type: DataTypes.DECIMAL(5,2) },
  ss_empleado_pct:{ type: DataTypes.DECIMAL(5,2) },
  pdf_path:       { type: DataTypes.TEXT },
  estado:  { type: DataTypes.ENUM('procesada','pagada','anulada'), defaultValue: 'procesada' },
}, { tableName: 'nominas', timestamps: true })
