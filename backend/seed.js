require('dotenv').config({ path: './.env' })
const { sequelize, Comunidad, Empresa, Franquicia } = require('./src/models/index.js')

async function seed() {
  await sequelize.authenticate()

  // Comunidades
  const comunidades = await Comunidad.bulkCreate([
    { nombre: 'Madrid',           codigo: 'MAD' },
    { nombre: 'Andalucía',        codigo: 'AND' },
    { nombre: 'Comunidad Valenciana', codigo: 'VAL' },
    { nombre: 'Cataluña',         codigo: 'CAT' },
    { nombre: 'País Vasco',       codigo: 'PVA' },
  ], { ignoreDuplicates: true })

  console.log('✅ Comunidades creadas:', comunidades.length)

  // Empresas
  const [mad, and, val, cat] = await Promise.all([
    Comunidad.findOne({ where: { codigo: 'MAD' } }),
    Comunidad.findOne({ where: { codigo: 'AND' } }),
    Comunidad.findOne({ where: { codigo: 'VAL' } }),
    Comunidad.findOne({ where: { codigo: 'CAT' } }),
  ])

  const empresas = await Empresa.bulkCreate([
    { nombre: 'KL Madrid SL',   cif: 'B12345001', comunidad_id: mad.id, plan: 'profesional' },
    { nombre: 'KL Sur SL',      cif: 'B12345002', comunidad_id: and.id, plan: 'profesional' },
    { nombre: 'KL Este SL',     cif: 'B12345003', comunidad_id: val.id, plan: 'basico' },
    { nombre: 'KL Cataluña SL', cif: 'B12345004', comunidad_id: cat.id, plan: 'enterprise' },
  ], { ignoreDuplicates: true })

  console.log('✅ Empresas creadas:', empresas.length)

  // Franquicias
  const [em, es, ev, ec] = await Promise.all([
    Empresa.findOne({ where: { cif: 'B12345001' } }),
    Empresa.findOne({ where: { cif: 'B12345002' } }),
    Empresa.findOne({ where: { cif: 'B12345003' } }),
    Empresa.findOne({ where: { cif: 'B12345004' } }),
  ])

  await Franquicia.bulkCreate([
    { nombre: 'KL Madrid Centro',   empresa_id: em.id, comunidad_id: mad.id, ciudad: 'Madrid',    cp: '28001', lat: 40.4168,  lng: -3.7038,  tipo: 'centro_ciudad',   activo: true,  fecha_apertura: '2022-03-15', telefono: '911001001', email: 'madrid.centro@kebablab.com' },
    { nombre: 'KL Madrid Vallecas', empresa_id: em.id, comunidad_id: mad.id, ciudad: 'Madrid',    cp: '28031', lat: 40.3953,  lng: -3.6537,  tipo: 'barrio',          activo: true,  fecha_apertura: '2023-06-01' },
    { nombre: 'KL Sevilla Centro',  empresa_id: es.id, comunidad_id: and.id, ciudad: 'Sevilla',   cp: '41001', lat: 37.3891,  lng: -5.9845,  tipo: 'centro_ciudad',   activo: true,  fecha_apertura: '2022-09-10', email: 'sevilla@kebablab.com' },
    { nombre: 'KL Málaga Puerto',   empresa_id: es.id, comunidad_id: and.id, ciudad: 'Málaga',    cp: '29016', lat: 36.7213,  lng: -4.4214,  tipo: 'turistico',       activo: true,  fecha_apertura: '2023-01-20' },
    { nombre: 'KL Valencia Ruzafa', empresa_id: ev.id, comunidad_id: val.id, ciudad: 'Valencia',  cp: '46004', lat: 39.4561,  lng: -0.3820,  tipo: 'barrio',          activo: true,  fecha_apertura: '2023-04-05' },
    { nombre: 'KL Valencia Centro', empresa_id: ev.id, comunidad_id: val.id, ciudad: 'Valencia',  cp: '46002', lat: 39.4699,  lng: -0.3763,  tipo: 'centro_ciudad',   activo: true,  fecha_apertura: '2024-01-15' },
    { nombre: 'KL Barcelona Gracia',empresa_id: ec.id, comunidad_id: cat.id, ciudad: 'Barcelona', cp: '08012', lat: 41.4036,  lng: 2.1569,   tipo: 'barrio',          activo: false, fecha_apertura: '2023-07-01' },
    { nombre: 'KL Barcelona Born',  empresa_id: ec.id, comunidad_id: cat.id, ciudad: 'Barcelona', cp: '08003', lat: 41.3851,  lng: 2.1819,   tipo: 'centro_ciudad',   activo: true,  fecha_apertura: '2024-03-10' },
  ], { ignoreDuplicates: true })

  console.log('✅ Franquicias creadas')
  console.log('\n🎉 Seed completado. Ya puedes ver el mapa con datos reales.')
  process.exit(0)
}

seed().catch(err => { console.error(err); process.exit(1) })
