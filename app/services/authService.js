import { randomBytes } from 'crypto'
import jwt from 'jsonwebtoken'
import models from '../models/index.js'
import { hashPassword, comparePassword } from '../helpers/password.js'
import { USER_ROLE } from '../helpers/constants.js'
import { sendEmail } from './emailService.js'
import { resetPasswordTemplate } from '../helpers/emailTemplates.js'
import redisClient from '../../config/redis.js'
import logger from '../../config/winston.js'

const RESET_TOKEN_TTL = 24 * 60 * 60 // 24 jam dalam detik

const verifyCaptcha = async (token) => {
  if (process.env.LOGIN_BYPASS === 'true') return true
  if (!token) return false
  const params = new URLSearchParams({
    secret: process.env.CAPTCHA_SECRET_KEY,
    response: token,
  })
  const res = await fetch(`https://www.google.com/recaptcha/api/siteverify`, {
    method: 'POST',
    body: params,
  })
  const data = await res.json()
  return data.success && data.score >= 0.5

}

export const login = async (email, password, captchaToken) => {
  const captchaOk = await verifyCaptcha(captchaToken)
  if (!captchaOk) throw Object.assign(new Error('Verifikasi reCAPTCHA gagal.'), { status: 422 })

  const user = await models.User.findOne({ where: { email } })
  if (!user || !user.is_active) {
    throw Object.assign(new Error('Email atau password salah.'), { status: 401 })
  }

  const match = await comparePassword(password, user.password)
  if (!match) {
    throw Object.assign(new Error('Email atau password salah.'), { status: 401 })
  }

  return {
    id: user.id,
    uuid: user.uuid,
    name: user.name,
    email: user.email,
    role_id: user.role_id,
    hospital_name: user.hospital_name,
  }
}

export const register = async ({ name, email, password, hospital_name, phone }) => {
  const existing = await models.User.findOne({ where: { email } })
  if (existing) throw Object.assign(new Error('Email sudah terdaftar.'), { status: 422 })

  const hashed = await hashPassword(password)
  const user = await models.User.create({
    name,
    email,
    password: hashed,
    hospital_name: hospital_name || null,
    phone: phone || null,
    role_id: USER_ROLE.REPORTER,
    is_active: true,
  })

  return user
}

export const generateResetToken = async (email) => {
  const user = await models.User.findOne({ where: { email } })
  if (!user) return

  const token = randomBytes(32).toString('hex')
  await redisClient.set(`reset:${token}`, String(user.id), { EX: RESET_TOKEN_TTL })

  try {
    const { subject, html } = resetPasswordTemplate(token)
    await sendEmail({ to: user.email, subject, html })
  } catch (err) {
    logger.error(`Reset email gagal dikirim ke ${email}: ${err.message}`)
  }
}

export const verifyResetToken = async (token) => {
  const userId = await redisClient.get(`reset:${token}`)
  if (!userId) throw Object.assign(new Error('Link reset tidak valid atau sudah kadaluarsa.'), { status: 400 })

  const user = await models.User.findByPk(userId)
  if (!user || !user.is_active) throw Object.assign(new Error('Pengguna tidak ditemukan.'), { status: 404 })

  return user
}

export const resetPassword = async (token, newPassword) => {
  const user = await verifyResetToken(token)
  const hashed = await hashPassword(newPassword)
  await user.update({ password: hashed })
  await redisClient.del(`reset:${token}`)
}

export const generateJwt = (user) => jwt.sign(
  { id: user.id, uuid: user.uuid, role_id: user.role_id },
  process.env.SESSION_SECRET,
  { expiresIn: '1d' },
)

export const verifyJwt = (token) => jwt.verify(token, process.env.SESSION_SECRET)
