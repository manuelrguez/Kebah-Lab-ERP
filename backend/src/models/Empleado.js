const { DataTypes } = require('sequelize')
const sequelize = require('../config/database.js')

module.exports = sequelize.define('Empleado', {
  id:           { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  franquicia_id:{ type: DataTypes.INTEGER, allowNull: false },
  nombre:       { type: DataTypes.STRING(200), allowNull: false },
  dni:          { type: DataTypes.STRING(20) },
  email:        { type: DataTypes.STRING(200) },
  telefono:     { type: DataTypes.STRING(20) },
  puesto:       { type: DataTypes.STRING(100) },
  departamento: { type: DataTypes.STRING(100) },
  fecha_alta:   { type: DataTypes.DATEONLY },
  salario_bruto_anual: { type: DataTypes.DECIMAL(10,2) },
  iban:         { type: DataTypes.STRING(34) },
  num_ss:       { type: DataTypes.STRING(30) },
  tipo_contrato:{ type: DataTypes.ENUM('indefinido','temporal','practicas') },
  estado:       { type: DataTypes.ENUM('activo','baja','vacaciones'), defaultValue: 'activo' },
}, { tableName: 'empleados', timestamps: true })
