const { DataTypes } = require('sequelize')
const sequelize = require('../config/database.js')

module.exports = sequelize.define('Informe', {
  id:         { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  empresa_id: { type: DataTypes.INTEGER },
  tipo:       { type: DataTypes.STRING(100) },
  periodo:    { type: DataTypes.STRING(20) },
  contenido:  { type: DataTypes.TEXT },
  pdf_path:   { type: DataTypes.TEXT },
  generado_por: { type: DataTypes.INTEGER }, // usuario_id
}, { tableName: 'informes', timestamps: true })
