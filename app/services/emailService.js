import nodemailer from 'nodemailer'
import logger from '../../config/winston.js'

const createTransport = () => nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT, 10) || 587,
  secure: parseInt(process.env.SMTP_PORT, 10) === 465,
  ignoreTLS: process.env.SMTP_IGNORE_TLS === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
})

export const sendEmail = async ({ to, subject, html }) => {
  try {
    const transporter = createTransport()
    await transporter.sendMail({
      from: process.env.SMTP_SENDER,
      to,
      subject,
      html,
    })
    logger.info(`Email sent to ${to}: ${subject}`)
  } catch (err) {
    logger.error(`Email failed to ${to}: ${err.message}`)
    throw err
  }
}
