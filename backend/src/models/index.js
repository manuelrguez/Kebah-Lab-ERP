const sequelize = require('../config/database.js')
const Comunidad   = require('./Comunidad.js')
const Empresa     = require('./Empresa.js')
const Franquicia  = require('./Franquicia.js')
const Usuario     = require('./Usuario.js')
const Empleado    = require('./Empleado.js')
const Nomina      = require('./Nomina.js')
const Factura     = require('./Factura.js')
const VentaTPV    = require('./VentaTPV.js')
const VentaDelivery = require('./VentaDelivery.js')
const Informe     = require('./Informe.js')
const Log         = require('./Log.js')

// ── Associations ──────────────────────────────────────────────────────────────
Comunidad.hasMany(Empresa,    { foreignKey: 'comunidad_id' })
Empresa.belongsTo(Comunidad,  { foreignKey: 'comunidad_id' })

Empresa.hasMany(Franquicia,   { foreignKey: 'empresa_id' })
Franquicia.belongsTo(Empresa, { foreignKey: 'empresa_id' })

Comunidad.hasMany(Franquicia, { foreignKey: 'comunidad_id' })
Franquicia.belongsTo(Comunidad,{ foreignKey: 'comunidad_id' })

Empresa.hasMany(Usuario,      { foreignKey: 'empresa_id' })
Usuario.belongsTo(Empresa,    { foreignKey: 'empresa_id' })

Franquicia.hasMany(Usuario,   { foreignKey: 'franquicia_id' })
Usuario.belongsTo(Franquicia, { foreignKey: 'franquicia_id' })

Franquicia.hasMany(Empleado,  { foreignKey: 'franquicia_id' })
Empleado.belongsTo(Franquicia,{ foreignKey: 'franquicia_id' })

Empleado.hasMany(Nomina,      { foreignKey: 'empleado_id' })
Nomina.belongsTo(Empleado,    { foreignKey: 'empleado_id' })

Empresa.hasMany(Factura,      { foreignKey: 'empresa_id' })
Factura.belongsTo(Empresa,    { foreignKey: 'empresa_id' })

Franquicia.hasMany(VentaTPV,  { foreignKey: 'franquicia_id', as: 'ventasTPV' })
VentaTPV.belongsTo(Franquicia,{ foreignKey: 'franquicia_id', as: 'franquicia' })

Franquicia.hasMany(VentaDelivery, { foreignKey: 'franquicia_id', as: 'ventasDelivery' })
VentaDelivery.belongsTo(Franquicia, { foreignKey: 'franquicia_id', as: 'franquicia' })

// Log has no associations — standalone
module.exports = {
  sequelize, Comunidad, Empresa, Franquicia, Usuario,
  Empleado, Nomina, Factura, VentaTPV, VentaDelivery, Informe, Log
}
