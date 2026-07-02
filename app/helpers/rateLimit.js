import { rateLimit } from 'express-rate-limit'

export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Terlalu banyak percobaan login, coba lagi dalam 15 menit.' },
  skipSuccessfulRequests: true,
})
