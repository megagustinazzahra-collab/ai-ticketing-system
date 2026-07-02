import { createClient } from 'redis'
import logger from './winston.js'

const redisClient = createClient({
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
  },
  password: process.env.REDIS_PASSWORD || undefined,
})

redisClient.on('error', (err) => logger.error('Redis Client Error:', err))
redisClient.on('connect', () => logger.info('Redis connected'))

export default redisClient
