import { Sequelize } from 'sequelize'
import config from '../../config/database.js'
import modelDefs from './models.js'

const env = process.env.NODE_ENV || 'development'
const dbConfig = config[env]

const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  dbConfig,
)

const db = {}

Object.entries(modelDefs).forEach(([name, factory]) => {
  db[name] = factory(sequelize, Sequelize.DataTypes)
})

Object.values(db).forEach((model) => {
  if (typeof model.associate === 'function') {
    model.associate(db)
  }
})

db.sequelize = sequelize
db.Sequelize = Sequelize

export default db
