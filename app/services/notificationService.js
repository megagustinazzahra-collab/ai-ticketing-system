import models from '../models/index.js'
import { USER_ROLE, TICKET_STATUS_LABEL } from '../helpers/constants.js'
import * as emailService from './emailService.js'
import { ticketStatusTemplate, slaBreachTemplate } from '../helpers/emailTemplates.js'
import logger from '../../config/winston.js'

/**
 * Kirim notifikasi in-app ke semua helpdesk saat tiket baru masuk.
 */
export const notifyHelpdesk = async (ticket) => {
  try {
    const helpdeskUsers = await models.User.findAll({
      where: { role_id: USER_ROLE.HELPDESK, is_active: true },
      attributes: ['id'],
    })

    if (helpdeskUsers.length === 0) return

    const notifications = helpdeskUsers.map((u) => ({
      user_id: u.id,
      ticket_id: ticket.id,
      title: 'Tiket Baru Masuk',
      message: `Tiket ${ticket.ticket_number} telah disubmit dan menunggu penanganan.`,
      is_read: false,
    }))

    await models.Notification.bulkCreate(notifications)
  } catch (err) {
    logger.error(`notifyHelpdesk error: ${err.message}`)
  }
}

/**
 * Kirim notifikasi in-app + email ke reporter saat status tiket berubah.
 */
export const notifyReporter = async (ticket, newStatus, reason = null) => {
  try {
    const statusLabel = TICKET_STATUS_LABEL[newStatus] || String(newStatus)

    let title = `Status Tiket ${ticket.ticket_number} Berubah`
    let message = `Status tiket ${ticket.ticket_number} telah diubah menjadi "${statusLabel}".`

    if (newStatus === 6 && reason) {
      title = `Tiket ${ticket.ticket_number} Ditolak`
      message = `Tiket ${ticket.ticket_number} ditolak. Alasan: ${reason}`
    } else if (newStatus === 4) {
      title = `Tiket ${ticket.ticket_number} Selesai`
      message = `Tiket ${ticket.ticket_number} telah diselesaikan. Silakan konfirmasi jika issue sudah teratasi.`
    }

    await models.Notification.create({
      user_id: ticket.reporter_id,
      ticket_id: ticket.id,
      title,
      message,
      is_read: false,
    })

    // Email ke reporter
    const reporter = await models.User.findByPk(ticket.reporter_id, { attributes: ['email', 'name'] })
    if (reporter) {
      const tmpl = ticketStatusTemplate(ticket, statusLabel, reason)
      await emailService.sendEmail({ to: reporter.email, subject: tmpl.subject, html: tmpl.html }).catch((e) => {
        logger.warn(`Email reporter gagal: ${e.message}`)
      })
    }
  } catch (err) {
    logger.error(`notifyReporter error: ${err.message}`)
  }
}

/**
 * Kirim notifikasi SLA breach ke helpdesk (in-app + email).
 */
export const notifySlaBreached = async (ticket) => {
  try {
    const helpdeskUsers = await models.User.findAll({
      where: { role_id: USER_ROLE.HELPDESK, is_active: true },
      attributes: ['id', 'email'],
    })

    if (helpdeskUsers.length === 0) return

    const notifications = helpdeskUsers.map((u) => ({
      user_id: u.id,
      ticket_id: ticket.id,
      title: `⚠ SLA Breach: ${ticket.ticket_number}`,
      message: `Tiket ${ticket.ticket_number} telah melampaui batas SLA (${ticket.priority}).`,
      is_read: false,
    }))

    await models.Notification.bulkCreate(notifications)

    const tmpl = slaBreachTemplate(ticket)
    for (const u of helpdeskUsers) {
      await emailService.sendEmail({ to: u.email, subject: tmpl.subject, html: tmpl.html }).catch((e) => {
        logger.warn(`Email SLA breach gagal: ${e.message}`)
      })
    }
  } catch (err) {
    logger.error(`notifySlaBreached error: ${err.message}`)
  }
}
