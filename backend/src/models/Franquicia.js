const { DataTypes } = require('sequelize')
const sequelize = require('../config/database.js')

module.exports = sequelize.define('Franquicia', {
  id:          { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nombre:      { type: DataTypes.STRING(200), allowNull: false },
  empresa_id:  { type: DataTypes.INTEGER, allowNull: false },
  comunidad_id:{ type: DataTypes.INTEGER },
  direccion:   { type: DataTypes.TEXT },
  ciudad:      { type: DataTypes.STRING(100) },
  cp:          { type: DataTypes.STRING(10) },
  lat:         { type: DataTypes.DECIMAL(10, 7) },
  lng:         { type: DataTypes.DECIMAL(10, 7) },
  tipo:        { type: DataTypes.ENUM('centro_ciudad','centro_comercial','poligono','barrio','turistico') },
  telefono:    { type: DataTypes.STRING(20) },
  email:       { type: DataTypes.STRING(200) },
  activo:      { type: DataTypes.BOOLEAN, defaultValue: true },
  fecha_apertura: { type: DataTypes.DATEONLY },
}, { tableName: 'franquicias', timestamps: true })
