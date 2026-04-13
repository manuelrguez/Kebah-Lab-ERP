const { DataTypes } = require('sequelize')
const sequelize = require('../config/database.js')

module.exports = sequelize.define('Comunidad', {
  id:     { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nombre: { type: DataTypes.STRING(100), allowNull: false },
  codigo: { type: DataTypes.STRING(10),  allowNull: false, unique: true },
}, { tableName: 'comunidades', timestamps: true })
