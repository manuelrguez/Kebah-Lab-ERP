const { DataTypes } = require('sequelize')
const sequelize = require('../config/database.js')
const bcrypt    = require('bcryptjs')

const Usuario = sequelize.define('Usuario', {
  id:           { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nombre:       { type: DataTypes.STRING(200), allowNull: false },
  email:        { type: DataTypes.STRING(200), allowNull: false, unique: true },
  password_hash:{ type: DataTypes.STRING(255), allowNull: false },
  rol:          { type: DataTypes.ENUM('superadmin','central','empresa','franquiciado'), allowNull: false },
  empresa_id:   { type: DataTypes.INTEGER },
  franquicia_id:{ type: DataTypes.INTEGER },
  activo:       { type: DataTypes.BOOLEAN, defaultValue: true },
  ultimo_acceso:{ type: DataTypes.DATE },
}, {
  tableName: 'usuarios',
  timestamps: true,
})

Usuario.prototype.checkPassword = function(plain) {
  return bcrypt.compare(plain, this.password_hash)
}

Usuario.beforeCreate(async (user) => {
  if (user.password_hash && !user.password_hash.match(/^\$2[ab]\$/)) {
    user.password_hash = await bcrypt.hash(user.password_hash, 12)
  }
})

module.exports = Usuario