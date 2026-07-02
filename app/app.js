import 'dotenv/config'
import express from 'express'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import hbs from 'hbs'
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import session from 'express-session'
import { RedisStore } from 'connect-redis'
import { xss } from 'express-xss-sanitizer'
import { rateLimit } from 'express-rate-limit'

import redisClient from '../config/redis.js'
import morganMiddleware from '../config/logger.js'
import logger from '../config/winston.js'
import router from './routes/index.js'
import { csrfTokenMiddleware } from './helpers/csrf.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()

// ── Trust proxy (untuk rate limit + secure cookies di balik Nginx) ──
app.set('trust proxy', 1)

// ── HTTP Logger ──
app.use(morganMiddleware)

// ── Security Headers ──
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        'https://www.google.com',
        'https://www.gstatic.com',
        'https://code.jquery.com',
        'https://cdn.jsdelivr.net',
        "'unsafe-inline'",
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        'https://fonts.googleapis.com',
        'https://cdn.jsdelivr.net',
        'https://cdnjs.cloudflare.com',
      ],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'https://cdnjs.cloudflare.com'],
      imgSrc: ["'self'", 'data:'],
      frameSrc: ['https://www.google.com'],
    },
  },
}))

// ── CSP Nonce per request ──
app.use((req, res, next) => {
  res.locals.cspNonce = Buffer.from(Math.random().toString()).toString('base64')
  next()
})

// ── CORS ──
app.use(cors({
  origin: process.env.APP_URL,
  credentials: true,
}))

// ── Rate Limiter (global — skip static assets) ──
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Terlalu banyak permintaan, coba lagi nanti.' },
  skip: (req) => /^\/(css|js|img|fonts|vendor)\//.test(req.path),
}))

// ── Body Parsers ──
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use(cookieParser(process.env.COOKIE_SECRET))

// ── Session (Redis store) ──
const redisStore = new RedisStore({ client: redisClient, prefix: 'wms:sess:' })
app.use(session({
  store: redisStore,
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: parseInt(process.env.SESSION_MAX_AGE, 10) || 86400000,
  },
}))

// ── XSS Sanitizer (untuk API routes — web SSR handle sendiri via validator) ──
app.use('/api', xss())

// ── Handlebars (HBS) View Engine ──
const viewsDir = path.join(__dirname, '..', 'views')
app.set('view engine', 'hbs')
app.set('views', viewsDir)

// Registrasi synchronous agar semua partial tersedia sebelum request pertama
const partialsDir = path.join(viewsDir, 'partials')
fs.readdirSync(partialsDir)
  .filter((f) => f.endsWith('.hbs'))
  .forEach((f) => {
    hbs.registerPartial(f.replace('.hbs', ''), fs.readFileSync(path.join(partialsDir, f), 'utf8'))
  })

// HBS Helpers
hbs.registerHelper('equal', function (a, b, options) {
  // Support block syntax {{#equal a b}}...{{/equal}} dan inline {{equal a b}}
  if (options && typeof options.fn === 'function') {
    return (a == b) ? options.fn(this) : (options.inverse ? options.inverse(this) : '') // eslint-disable-line eqeqeq
  }
  return a == b // eslint-disable-line eqeqeq
})
hbs.registerHelper('notEqual', function (a, b, options) {
  if (options && typeof options.fn === 'function') {
    return (a != b) ? options.fn(this) : (options.inverse ? options.inverse(this) : '') // eslint-disable-line eqeqeq
  }
  return a != b // eslint-disable-line eqeqeq
})
hbs.registerHelper('gt', (a, b) => Number(a) > Number(b))
hbs.registerHelper('lt', (a, b) => Number(a) < Number(b))
hbs.registerHelper('getEnv', (key) => process.env[key] || '')
hbs.registerHelper('json', (ctx) => JSON.stringify(ctx))
hbs.registerHelper('appTitle', (title) => `${title} — ${process.env.APP_NAME || 'WMS Ticketing'}`)
hbs.registerHelper('getLocalTime', (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
})
hbs.registerHelper('add', (a, b) => Number(a) + Number(b))
hbs.registerHelper('sub', (a, b) => Number(a) - Number(b))
hbs.registerHelper('mul', (a, b) => Number(a) * Number(b))
hbs.registerHelper('fileSizeKb', (bytes) => bytes ? Math.ceil(Number(bytes) / 1024) : 0)

// ── Static Files ──
app.use(express.static(path.join(__dirname, '..', 'public')))

// ── CSRF Token helper (agar req.csrfToken() tersedia di semua controller) ──
// app.use(csrfTokenMiddleware)

// ── Pass APP_URL & user session ke semua view ──
app.use((req, res, next) => {
  res.locals.APP_URL = process.env.APP_URL
  res.locals.APP_NAME = process.env.APP_NAME
  res.locals.user = req.session?.user || null
  res.locals.csrfToken = req.csrfToken?.()
  next()
})

// ── Routes ──
app.use('/', router)

// ── 404 Handler ──
app.use((req, res) => {
  res.status(404).render('error', { title: 'Halaman Tidak Ditemukan', message: 'Halaman yang Anda cari tidak ditemukan.', code: 404 })
})

// ── Global Error Handler ──
app.use((err, req, res, next) => {
  logger.error(err)
  const status = err.status || 500
  const message = process.env.NODE_ENV === 'production' ? 'Terjadi kesalahan pada server.' : err.message
  if (req.path.startsWith('/api')) {
    return res.status(status).json({ message })
  }
  return res.status(status).render('error', { title: 'Terjadi Kesalahan', message, code: status })
})

export default app
