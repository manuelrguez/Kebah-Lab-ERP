const { DataTypes } = require('sequelize')
const sequelize = require('../config/database.js')

module.exports = sequelize.define('Factura', {
  id:         { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  empresa_id: { type: DataTypes.INTEGER, allowNull: false },
  numero:     { type: DataTypes.STRING(20), allowNull: false, unique: true },
  tipo:       { type: DataTypes.ENUM('emitida','recibida'), allowNull: false },
  cliente_proveedor_nombre: { type: DataTypes.STRING(200) },
  cliente_proveedor_cif:    { type: DataTypes.STRING(20) },
  concepto:   { type: DataTypes.TEXT },
  base_imponible: { type: DataTypes.DECIMAL(12,2) },
  porcentaje_iva: { type: DataTypes.DECIMAL(5,2), defaultValue: 21 },
  cuota_iva:  { type: DataTypes.DECIMAL(12,2) },
  total:      { type: DataTypes.DECIMAL(12,2) },
  fecha:      { type: DataTypes.DATEONLY },
  fecha_vencimiento: { type: DataTypes.DATEONLY },
  estado:     { type: DataTypes.ENUM('pendiente','pagada','vencida','anulada'), defaultValue: 'pendiente' },
  pdf_path:   { type: DataTypes.TEXT },
  ocr_raw:    { type: DataTypes.JSONB },
}, { tableName: 'facturas', timestamps: true })
