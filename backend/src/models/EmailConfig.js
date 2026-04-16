const { DataTypes } = require('sequelize')
const sequelize = require('../config/database.js')

module.exports = sequelize.define('EmailConfig', {
  id:           { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  empresa_id:   { type: DataTypes.INTEGER, allowNull: false, unique: true },
  provider:     { type: DataTypes.STRING(20), defaultValue: 'imap' },
  host:         { type: DataTypes.STRING(100), defaultValue: 'imap.gmail.com' },
  port:         { type: DataTypes.INTEGER, defaultValue: 993 },
  tls:          { type: DataTypes.BOOLEAN, defaultValue: true },
  usuario:      { type: DataTypes.STRING(200), allowNull: false },
  password_enc: { type: DataTypes.TEXT, allowNull: false }, // AES-256 encrypted
  carpeta:      { type: DataTypes.STRING(100), defaultValue: 'INBOX' },
  filtros_asunto: { type: DataTypes.JSONB, defaultValue: ['factura','invoice','recibo'] },
  activo:       { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'email_configs', timestamps: true })
