import { Op } from 'sequelize'
import models from '../models/index.js'
import redisClient from '../../config/redis.js'
import { SLA_CONFIG, SLA_WARNING_THRESHOLD } from '../helpers/slaConfig.js'
import { TICKET_STATUS } from '../helpers/constants.js'
import { notifySlaBreached } from './notificationService.js'
import logger from '../../config/winston.js'

const pauseKey = (ticketId) => `sla:pause_start:${ticketId}`

/**
 * Hitung data SLA awal saat priority pertama kali diisi.
 * Return object siap di-merge ke updateData.
 */
export const startSla = (priority) => {
  const cfg = SLA_CONFIG[priority]
  if (!cfg) return {}
  const now = new Date()
  return {
    sla_started_at: now,
    sla_deadline: new Date(now.getTime() + cfg.hours * 3600 * 1000),
    sla_paused_minutes: 0,
  }
}

/**
 * Catat waktu mulai pause di Redis saat tiket masuk status Pending.
 */
export const pauseSla = async (ticketId) => {
  try {
    await redisClient.set(pauseKey(ticketId), String(Date.now()))
  } catch (err) {
    logger.warn(`pauseSla Redis error [ticket ${ticketId}]: ${err.message}`)
  }
}

/**
 * Hitung durasi pause, akumulasi sla_paused_minutes, geser sla_deadline.
 * Hapus Redis key setelah selesai.
 * Return object siap di-merge ke updateData.
 */
export const resumeSla = async (ticket) => {
  try {
    const raw = await redisClient.get(pauseKey(ticket.id))
    await redisClient.del(pauseKey(ticket.id))

    if (!raw) return {}

    const pausedAtMs = parseInt(raw, 10)
    const elapsedMs = Date.now() - pausedAtMs
    const elapsedMinutes = Math.floor(elapsedMs / 60000)

    return {
      sla_paused_minutes: (ticket.sla_paused_minutes || 0) + elapsedMinutes,
      sla_deadline: new Date(new Date(ticket.sla_deadline).getTime() + elapsedMs),
    }
  } catch (err) {
    logger.warn(`resumeSla Redis error [ticket ${ticket.id}]: ${err.message}`)
    return {}
  }
}

/**
 * Hitung status SLA dari data tiket untuk ditampilkan di view.
 * Return: { colorClass, label, isBreached, remainingLabel, remainingMs }
 */
export const checkSla = (ticket) => {
  if (!ticket.sla_deadline) {
    return { colorClass: 'light', label: '-', isBreached: false, remainingLabel: null, remainingMs: null }
  }

  const now = Date.now()
  const deadline = new Date(ticket.sla_deadline).getTime()
  const startedAt = new Date(ticket.sla_started_at).getTime()
  const remaining = deadline - now

  if (ticket.sla_breached || remaining <= 0) {
    return { colorClass: 'danger', label: 'Breach', isBreached: true, remainingLabel: 'Terlampaui', remainingMs: 0 }
  }

  const total = deadline - startedAt
  const ratio = total > 0 ? remaining / total : 1
  const hours = Math.floor(remaining / 3600000)
  const minutes = Math.floor((remaining % 3600000) / 60000)
  const remainingLabel = hours > 0 ? `${hours}j ${minutes}m` : `${minutes} menit`

  if (ratio <= SLA_WARNING_THRESHOLD) {
    return { colorClass: 'warning', label: 'Mendekati', isBreached: false, remainingLabel, remainingMs: remaining }
  }
  return { colorClass: 'success', label: 'On Track', isBreached: false, remainingLabel, remainingMs: remaining }
}

/**
 * Tandai tiket sebagai breach: update DB + kirim notifikasi helpdesk.
 */
export const markBreached = async (ticket) => {
  try {
    await ticket.update({ sla_breached: true })
    await notifySlaBreached(ticket)
    logger.info(`SLA breach: ${ticket.ticket_number} (priority: ${ticket.priority})`)
  } catch (err) {
    logger.error(`markBreached error [${ticket.ticket_number}]: ${err.message}`)
  }
}

/**
 * Background job: cari tiket yang deadline-nya sudah lewat tapi belum ditandai breach.
 * Hanya untuk status Open dan In Progress (Pending di-skip karena SLA sedang di-pause).
 */
export const runBreachCheck = async () => {
  try {
    const tickets = await models.Ticket.findAll({
      where: {
        sla_breached: false,
        sla_deadline: { [Op.lt]: new Date() },
        status: { [Op.in]: [TICKET_STATUS.OPEN, TICKET_STATUS.IN_PROGRESS] },
      },
    })

    for (const ticket of tickets) {
      await markBreached(ticket)
    }

    if (tickets.length > 0) {
      logger.info(`SLA breach check: ${tickets.length} tiket baru breach`)
    }
  } catch (err) {
    logger.error(`runBreachCheck error: ${err.message}`)
  }
}
