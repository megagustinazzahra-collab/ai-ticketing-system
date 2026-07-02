import { createClient } from 'redis'
import logger from './winston.js'

const redisClient = createClient({
  url: process.env.REDIS_URL,
})

redisClient.on('error', (err) => logger.error('Redis Client Error:', err))
redisClient.on('connect', () => logger.info('Redis connected'))

redisClient.connect().catch((err) => logger.error('Redis connect failed:', err))

export default redisClient
