import morgan from 'morgan'
import logger from './winston.js'

const stream = {
  write: (message) => logger.http(message.trim()),
}

const morganMiddleware = morgan(
  process.env.NODE_ENV === 'production' ? 'combined' : 'dev',
  { stream },
)

export default morganMiddleware
