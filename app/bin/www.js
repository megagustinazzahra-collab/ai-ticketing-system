import 'dotenv/config'
import http from 'http'
import app from '../app.js'
import logger from '../../config/winston.js'
import redisClient from '../../config/redis.js'
import { ensureBucket } from '../services/storageService.js'
import { runBreachCheck } from '../services/slaService.js'

const PORT = parseInt(process.env.PORT, 10) || 3000

const server = http.createServer(app)

async function start() {
  try {
    await redisClient.connect()
    await ensureBucket()

    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} [${process.env.NODE_ENV}]`)
      logger.info(`App URL: ${process.env.APP_URL}`)
    })

    // SLA breach monitoring — cek setiap 60 detik
    setInterval(runBreachCheck, 60 * 1000)
    logger.info('SLA breach monitoring started (interval: 60s)')
  } catch (err) {
    logger.error('Failed to start server:', err)
    process.exit(1)
  }
}

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    logger.error(`Port ${PORT} already in use`)
    process.exit(1)
  } else {
    throw err
  }
})

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...')
  await redisClient.quit()
  server.close(() => {
    logger.info('Server closed')
    process.exit(0)
  })
})

start()
