import { Op } from 'sequelize'
import models from '../models/index.js'
import { TICKET_STATUS, ALLOWED_TRANSITIONS, USER_ROLE } from '../helpers/constants.js'
import { generateTicketNumber } from '../helpers/ticketNumber.js'
import { uploadFile, buildObjectName } from './storageService.js'
import { notifyHelpdesk, notifyReporter } from './notificationService.js'
import { getClientIp } from '../helpers/common.js'
import { startSla, pauseSla, resumeSla } from './slaService.js'
import logger from '../../config/winston.js'

/**
 * Buat tiket baru (dipanggil oleh reporter).
 * Mengunggah attachment ke MinIO dan membuat record di DB dalam satu transaction.
 */
export const createTicket = async ({ reporterId, body, files = [], ipAddress = null }) => {
  const t = await models.sequelize.transaction()
  try {
    const ticketNumber = await generateTicketNumber()

    const ticket = await models.Ticket.create({
      ticket_number: ticketNumber,
      reporter_id: reporterId,
      issue_type: body.issue_type,
      device: body.device,
      wms_module: body.wms_module,
      problem_detail: body.problem_detail,
      notes: body.notes || null,
      status: TICKET_STATUS.OPEN,
      created_by: reporterId,
    }, { transaction: t })

    await models.TicketHistory.create({
      ticket_id: ticket.id,
      changed_by: reporterId,
      from_status: null,
      to_status: TICKET_STATUS.OPEN,
      reason: null,
    }, { transaction: t })

    const attachmentRecords = []
    for (const file of files) {
      const objectName = buildObjectName(ticketNumber, file.originalname)
      await uploadFile(file.path, objectName, file.mimetype)
      attachmentRecords.push({
        ticket_id: ticket.id,
        original_name: file.originalname,
        stored_name: objectName,
        mime_type: file.mimetype,
        file_size: file.size,
      })
    }

    if (attachmentRecords.length > 0) {
      await models.TicketAttachment.bulkCreate(attachmentRecords, { transaction: t })
    }

    await models.ActivityLog.create({
      user_id: reporterId,
      action: 'SUBMIT_TICKET',
      entity_type: 'Ticket',
      entity_id: ticket.id,
      metadata: { ticket_number: ticketNumber },
      ip_address: ipAddress,
    }, { transaction: t })

    await t.commit()

    // Notifikasi helpdesk — non-critical, di luar transaction
    await notifyHelpdesk(ticket)

    return ticket
  } catch (err) {
    await t.rollback()
    throw err
  }
}

/**
 * Ambil detail tiket berdasarkan UUID.
 * Guard: reporter hanya bisa akses tiket miliknya sendiri.
 */
export const getTicketByUuid = async (uuid, reporterId) => {
  const ticket = await models.Ticket.findOne({
    where: { uuid },
    include: [
      {
        model: models.User,
        as: 'reporter',
        attributes: ['id', 'name', 'hospital_name', 'email'],
      },
      {
        model: models.User,
        as: 'pic',
        attributes: ['id', 'name'],
      },
      {
        model: models.TicketHistory,
        as: 'histories',
        include: [{ model: models.User, as: 'actor', attributes: ['name'] }],
        order: [['created_at', 'ASC']],
      },
      {
        model: models.TicketAttachment,
        as: 'attachments',
      },
    ],
  })

  if (!ticket) return null

  // reporter_id is BIGINT — pg driver returns it as string, reporterId from session is number
  if (reporterId && Number(ticket.reporter_id) !== Number(reporterId)) return null

  return ticket
}

/**
 * List tiket milik reporter dengan pagination dan filter.
 */
export const listTicketsByReporter = async (reporterId, { page = 1, paginate = 10, status } = {}) => {
  const limit = parseInt(paginate, 10)
  const offset = (parseInt(page, 10) - 1) * limit

  const where = { reporter_id: reporterId }
  if (status) where.status = parseInt(status, 10)

  const { count, rows } = await models.Ticket.findAndCountAll({
    where,
    attributes: models.Ticket.getBasicAttribute(),
    limit,
    offset,
    order: [['created_at', 'DESC']],
    include: [
      { model: models.TicketAttachment, as: 'attachments', attributes: ['id'] },
    ],
  })

  return { count, rows, page: parseInt(page, 10), paginate: limit }
}

// ─────────────────────────────────────────────
// HELPDESK FUNCTIONS
// ─────────────────────────────────────────────

/**
 * List semua tiket (helpdesk view) dengan filter & pagination.
 */
export const listAllTickets = async (filters = {}, pagination = {}) => {
  const { status, priority, severity, issue_type, wms_module, keyword, start_date, end_date } = filters
  const page = parseInt(pagination.page, 10) || 1
  const paginate = parseInt(pagination.paginate, 10) || 20
  const offset = (page - 1) * paginate

  const where = {}
  if (status) where.status = parseInt(status, 10)
  if (priority) where.priority = priority
  if (severity) where.severity = severity
  if (issue_type) where.issue_type = issue_type
  if (wms_module) where.wms_module = wms_module
  if (start_date || end_date) {
    where.created_at = {}
    if (start_date) where.created_at[Op.gte] = new Date(start_date)
    if (end_date) {
      const end = new Date(end_date)
      end.setHours(23, 59, 59, 999)
      where.created_at[Op.lte] = end
    }
  }
  if (keyword) {
    where[Op.or] = [
      { ticket_number: { [Op.iLike]: `%${keyword}%` } },
      { problem_detail: { [Op.iLike]: `%${keyword}%` } },
    ]
  }

  const { count, rows } = await models.Ticket.findAndCountAll({
    where,
    attributes: models.Ticket.getBasicAttribute(),
    limit: paginate,
    offset,
    order: [['created_at', 'DESC']],
    include: [
      { model: models.User, as: 'reporter', attributes: ['id', 'name', 'hospital_name'] },
      { model: models.User, as: 'pic', attributes: ['id', 'name'] },
    ],
  })

  return { count, rows, page, paginate }
}

/**
 * Ambil detail tiket lengkap untuk helpdesk (beserta comments).
 */
export const getTicketDetailHelpdesk = async (uuid) => {
  return models.Ticket.findOne({
    where: { uuid },
    include: [
      { model: models.User, as: 'reporter', attributes: ['id', 'name', 'hospital_name', 'email', 'phone'] },
      { model: models.User, as: 'pic', attributes: ['id', 'name'] },
      {
        model: models.TicketHistory,
        as: 'histories',
        include: [{ model: models.User, as: 'actor', attributes: ['name'] }],
        separate: true,
        order: [['created_at', 'ASC']],
      },
      {
        model: models.TicketComment,
        as: 'comments',
        required: false,
        include: [{ model: models.User, as: 'author', attributes: ['id', 'name', 'role_id'] }],
        separate: true,
        order: [['created_at', 'ASC']],
      },
      { model: models.TicketAttachment, as: 'attachments' },
    ],
  })
}

/**
 * Helpdesk memperbarui status tiket.
 * Validasi ALLOWED_TRANSITIONS, catat history, kirim notifikasi reporter.
 */
export const updateTicketStatus = async ({ uuid, helpdeskId, newStatus, reason, ipAddress = null }) => {
  const ticket = await models.Ticket.findOne({ where: { uuid } })
  if (!ticket) throw new Error('Tiket tidak ditemukan.')

  const allowed = ALLOWED_TRANSITIONS[ticket.status] ?? []
  if (!allowed.includes(newStatus)) {
    throw new Error(`Transisi status tidak diizinkan: ${ticket.status} → ${newStatus}.`)
  }

  if (newStatus === TICKET_STATUS.REJECTED && !reason) {
    throw new Error('Alasan penolakan wajib diisi saat tiket ditolak.')
  }

  const t = await models.sequelize.transaction()
  try {
    const updateData = { status: newStatus, updated_by: helpdeskId }

    // SLA pause saat tiket masuk Pending
    if (newStatus === TICKET_STATUS.PENDING && ticket.sla_started_at) {
      await pauseSla(ticket.id)
    }

    // SLA resume saat tiket kembali In Progress dari Pending
    if (newStatus === TICKET_STATUS.IN_PROGRESS && ticket.status === TICKET_STATUS.PENDING) {
      const resumeData = await resumeSla(ticket)
      Object.assign(updateData, resumeData)
    }

    if (newStatus === TICKET_STATUS.RESOLVED) {
      updateData.resolved_at = new Date()
      if (ticket.sla_started_at) {
        const startMs = new Date(ticket.sla_started_at).getTime()
        const pausedMs = (ticket.sla_paused_minutes || 0) * 60 * 1000
        updateData.resolution_minutes = Math.round((Date.now() - startMs - pausedMs) / 60000)
      }
    }

    const prevStatus = ticket.status
    await ticket.update(updateData, { transaction: t })

    await models.TicketHistory.create({
      ticket_id: ticket.id,
      changed_by: helpdeskId,
      from_status: prevStatus,
      to_status: newStatus,
      reason: reason || null,
    }, { transaction: t })

    await models.ActivityLog.create({
      user_id: helpdeskId,
      action: 'UPDATE_TICKET_STATUS',
      entity_type: 'Ticket',
      entity_id: ticket.id,
      metadata: { from: prevStatus, to: newStatus, reason },
      ip_address: ipAddress,
    }, { transaction: t })

    await t.commit()

    await notifyReporter(ticket, newStatus, reason).catch((e) => logger.warn(`notifyReporter: ${e.message}`))

    return ticket.reload()
  } catch (err) {
    await t.rollback()
    throw err
  }
}

/**
 * Helpdesk assign PIC dan/atau developer ke tiket.
 */
export const assignTicket = async ({ uuid, picId, developer, helpdeskId, ipAddress = null }) => {
  const ticket = await models.Ticket.findOne({ where: { uuid } })
  if (!ticket) throw new Error('Tiket tidak ditemukan.')

  const t = await models.sequelize.transaction()
  try {
    const updateData = { updated_by: helpdeskId }
    if (picId !== undefined) updateData.pic_id = picId || null
    if (developer !== undefined) updateData.developer = developer || null

    await ticket.update(updateData, { transaction: t })

    await models.TicketHistory.create({
      ticket_id: ticket.id,
      changed_by: helpdeskId,
      from_status: ticket.status,
      to_status: ticket.status,
      reason: `Assignment: PIC=${picId || '-'}, Developer=${developer || '-'}`,
    }, { transaction: t })

    await models.ActivityLog.create({
      user_id: helpdeskId,
      action: 'ASSIGN_TICKET',
      entity_type: 'Ticket',
      entity_id: ticket.id,
      metadata: { pic_id: picId, developer },
      ip_address: ipAddress,
    }, { transaction: t })

    await t.commit()
    return ticket.reload()
  } catch (err) {
    await t.rollback()
    throw err
  }
}

/**
 * Helpdesk mengisi/update field: severity, priority, jira_card, notes, resolved_at, resolution_minutes.
 * Jika priority pertama kali diisi → mulai SLA timer.
 */
export const updateHelpdeskFields = async ({ uuid, data, helpdeskId, ipAddress = null }) => {
  const ticket = await models.Ticket.findOne({ where: { uuid } })
  if (!ticket) throw new Error('Tiket tidak ditemukan.')

  const allowed = ['severity', 'priority', 'jira_card', 'notes', 'resolved_at', 'resolution_minutes']
  const updateData = { updated_by: helpdeskId }
  for (const key of allowed) {
    if (data[key] !== undefined) updateData[key] = data[key] || null
  }

  // Mulai SLA timer saat priority pertama kali diisi
  if (data.priority && !ticket.sla_started_at) {
    Object.assign(updateData, startSla(data.priority))
  }

  const t = await models.sequelize.transaction()
  try {
    await ticket.update(updateData, { transaction: t })

    await models.ActivityLog.create({
      user_id: helpdeskId,
      action: 'UPDATE_HELPDESK_FIELDS',
      entity_type: 'Ticket',
      entity_id: ticket.id,
      metadata: { fields: Object.keys(updateData).filter((k) => k !== 'updated_by') },
      ip_address: ipAddress,
    }, { transaction: t })

    await t.commit()
    return ticket.reload()
  } catch (err) {
    await t.rollback()
    throw err
  }
}

/**
 * Tambah komentar pada tiket.
 */
export const addComment = async ({ ticketUuid, userId, content, ipAddress = null }) => {
  const ticket = await models.Ticket.findOne({ where: { uuid: ticketUuid } })
  if (!ticket) throw new Error('Tiket tidak ditemukan.')

  const t = await models.sequelize.transaction()
  try {
    const comment = await models.TicketComment.create({
      ticket_id: ticket.id,
      user_id: userId,
      content,
    }, { transaction: t })

    await models.ActivityLog.create({
      user_id: userId,
      action: 'ADD_COMMENT',
      entity_type: 'Ticket',
      entity_id: ticket.id,
      metadata: { comment_id: comment.id },
      ip_address: ipAddress,
    }, { transaction: t })

    await t.commit()
    return comment
  } catch (err) {
    await t.rollback()
    throw err
  }
}

/**
 * Hapus komentar (soft-delete). Hanya pemilik komentar yang boleh menghapus.
 */
export const deleteComment = async ({ commentUuid, userId, ipAddress = null }) => {
  const comment = await models.TicketComment.findOne({ where: { uuid: commentUuid } })
  if (!comment) throw new Error('Komentar tidak ditemukan.')
  // user_id is BIGINT — pg driver returns it as string, userId from session is number
  if (Number(comment.user_id) !== Number(userId)) throw new Error('Tidak diizinkan menghapus komentar ini.')

  const t = await models.sequelize.transaction()
  try {
    await comment.destroy({ transaction: t })

    await models.ActivityLog.create({
      user_id: userId,
      action: 'DELETE_COMMENT',
      entity_type: 'Ticket',
      entity_id: comment.ticket_id,
      metadata: { comment_id: comment.id },
      ip_address: ipAddress,
    }, { transaction: t })

    await t.commit()
  } catch (err) {
    await t.rollback()
    throw err
  }
}

// ─────────────────────────────────────────────
// REPORTER FUNCTIONS
// ─────────────────────────────────────────────

/**
 * Reporter menutup tiket (Resolved → Closed).
 * Hanya bisa jika status saat ini adalah Resolved.
 */
export const closeTicket = async ({ uuid, reporterId, ipAddress = null }) => {
  const ticket = await models.Ticket.findOne({ where: { uuid, reporter_id: reporterId } })
  if (!ticket) throw new Error('Tiket tidak ditemukan.')

  if (ticket.status !== TICKET_STATUS.RESOLVED) {
    throw new Error('Tiket hanya dapat ditutup setelah berstatus Resolved.')
  }

  const t = await models.sequelize.transaction()
  try {
    await ticket.update({
      status: TICKET_STATUS.CLOSED,
      updated_by: reporterId,
    }, { transaction: t })

    await models.TicketHistory.create({
      ticket_id: ticket.id,
      changed_by: reporterId,
      from_status: TICKET_STATUS.RESOLVED,
      to_status: TICKET_STATUS.CLOSED,
      reason: null,
    }, { transaction: t })

    await models.ActivityLog.create({
      user_id: reporterId,
      action: 'CLOSE_TICKET',
      entity_type: 'Ticket',
      entity_id: ticket.id,
      metadata: { ticket_number: ticket.ticket_number },
      ip_address: ipAddress,
    }, { transaction: t })

    await t.commit()
    return ticket.reload()
  } catch (err) {
    await t.rollback()
    throw err
  }
}
