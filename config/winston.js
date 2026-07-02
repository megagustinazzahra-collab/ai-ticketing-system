import winston from 'winston'
import path from 'path'

const { combine, timestamp, printf, colorize, errors } = winston.format

const logFormat = printf(({ level, message, timestamp: ts, stack }) => {
  return `${ts} [${level}]: ${stack || message}`
})

const isProduction = process.env.NODE_ENV === 'production'

const transports = [
  new winston.transports.Console({
    format: combine(colorize(), timestamp({ format: 'HH:mm:ss' }), logFormat),
  }),
]

// File logging hanya untuk environment non-production (lokal/dev)
// Vercel serverless filesystem read-only, kecuali /tmp
if (!isProduction) {
  transports.push(
    new winston.transports.File({
      filename: path.join('logs', 'error.log'),
      level: 'error',
    }),
    new winston.transports.File({
      filename: path.join('logs', 'app.log'),
    }),
  )
}

const logger = winston.createLogger({
  level: isProduction ? 'warn' : 'debug',
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    logFormat,
  ),
  transports,
})

export default logger
