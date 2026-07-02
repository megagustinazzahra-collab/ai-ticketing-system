import models from '../../models/index.js'
import {
  listAllTickets,
  getTicketDetailHelpdesk,
  updateTicketStatus,
  assignTicket,
  updateHelpdeskFields,
  addComment,
  deleteComment,
} from '../../services/ticketService.js'
import { checkSla } from '../../services/slaService.js'
import { getPresignedUrl } from '../../services/storageService.js'
import { TICKET_STATUS, TICKET_STATUS_LABEL, ALLOWED_TRANSITIONS, USER_ROLE } from '../../helpers/constants.js'
import { SLA_CONFIG } from '../../helpers/slaConfig.js'
import { redirectSuccess, redirectError, getClientIp } from '../../helpers/common.js'
import logger from '../../../config/winston.js'

const LINK_LIST = '/helpdesk/tickets'
const linkDetail = (uuid) => `/helpdesk/tickets/${uuid}`

// ─── LIST PAGE ─────────────────────────────────────────────
export const listPage = async (req, res, next) => {
  try {
    const { status, priority, severity, issue_type, wms_module, keyword, start_date, end_date, page = 1, paginate = 20 } = req.query

    const filters = { status, priority, severity, issue_type, wms_module, keyword, start_date, end_date }
    const { count, rows, page: currentPage, paginate: perPage } = await listAllTickets(filters, { page, paginate })

    const totalPages = Math.ceil(count / perPage)
    const rowStart = (currentPage - 1) * perPage + 1

    // Tambahkan SLA status ke setiap tiket
    const tickets = rows.map((t) => ({
      ...t.toJSON(),
      slaStatus: checkSla(t),
    }))

    return res.render('helpdesk/ticket-list', {
      layout: 'layouts/_layout',
      title: 'Manajemen Tiket',
      breadcrumb: [{ label: 'Manajemen Tiket', active: true }],
      activeMenu: 'tickets',
      tickets,
      total: count,
      page: currentPage,
      paginate: perPage,
      totalPages,
      rowStart,
      hasPrev: currentPage > 1,
      hasNext: currentPage < totalPages,
      prevPage: currentPage - 1,
      nextPage: currentPage + 1,
      // Filter state untuk mempertahankan nilai di form
      filters: { status, priority, severity, issue_type, wms_module, keyword, start_date, end_date },
    })
  } catch (err) {
    return next(err)
  }
}

// ─── DETAIL PAGE ───────────────────────────────────────────
export const detailPage = async (req, res, next) => {
  try {
    const { uuid } = req.params
    const ticket = await getTicketDetailHelpdesk(uuid)
    if (!ticket) {
      return res.status(404).render('error', { title: 'Tidak Ditemukan', message: 'Tiket tidak ditemukan.', code: 404 })
    }

    // Presigned URL untuk attachment
    const attachments = await Promise.all(
      (ticket.attachments || []).map(async (a) => {
        let downloadUrl = null
        try { downloadUrl = await getPresignedUrl(a.stored_name) } catch { /* skip */ }
        return { ...a.toJSON(), downloadUrl }
      })
    )

    // Daftar helpdesk untuk dropdown PIC
    const helpdeskUsers = await models.User.findAll({
      where: { role_id: USER_ROLE.HELPDESK, is_active: true },
      attributes: ['id', 'name'],
      order: [['name', 'ASC']],
    })

    const allowedTransitions = ALLOWED_TRANSITIONS[ticket.status] ?? []
    const slaStatus = checkSla(ticket)

    return res.render('helpdesk/ticket-detail', {
      layout: 'layouts/_layout',
      title: `Tiket ${ticket.ticket_number}`,
      breadcrumb: [
        { label: 'Manajemen Tiket', url: LINK_LIST },
        { label: ticket.ticket_number, active: true },
      ],
      activeMenu: 'tickets',
      backUrl: LINK_LIST,
      ticket: ticket.toJSON(),
      attachments,
      helpdeskUsers,
      allowedTransitions,
      statusLabels: TICKET_STATUS_LABEL,
      TICKET_STATUS,
      slaStatus,
      slaConfig: SLA_CONFIG,
      slaDeadlineMs: ticket.sla_deadline ? new Date(ticket.sla_deadline).getTime() : null,
      csrfToken: req.csrfToken?.(),
      currentUserId: req.session.user.id,
    })
  } catch (err) {
    return next(err)
  }
}

// ─── UPDATE STATUS ─────────────────────────────────────────
export const handleUpdateStatus = async (req, res, next) => {
  const { uuid } = req.params
  if (req.validationErrors) {
    const firstErr = Object.values(req.validationErrors)[0]?.[0] || 'Input tidak valid.'
    return res.redirect(redirectError(linkDetail(uuid), firstErr))
  }
  try {
    const { new_status, reason } = req.body
    await updateTicketStatus({
      uuid,
      helpdeskId: req.session.user.id,
      newStatus: parseInt(new_status, 10),
      reason,
      ipAddress: getClientIp(req),
    })
    return res.redirect(redirectSuccess(linkDetail(uuid), 'Status tiket berhasil diperbarui.'))
  } catch (err) {
    if (err.message.includes('tidak diizinkan') || err.message.includes('wajib')) {
      return res.redirect(redirectError(linkDetail(uuid), err.message))
    }
    return next(err)
  }
}

// ─── ASSIGN PIC & DEVELOPER ────────────────────────────────
export const handleAssign = async (req, res, next) => {
  const { uuid } = req.params
  if (req.validationErrors) {
    const firstErr = Object.values(req.validationErrors)[0]?.[0] || 'Input tidak valid.'
    return res.redirect(redirectError(linkDetail(uuid), firstErr))
  }
  try {
    const { pic_id, developer } = req.body
    await assignTicket({
      uuid,
      picId: pic_id ? parseInt(pic_id, 10) : null,
      developer: developer || null,
      helpdeskId: req.session.user.id,
      ipAddress: getClientIp(req),
    })
    return res.redirect(redirectSuccess(linkDetail(uuid), 'Assignment berhasil disimpan.'))
  } catch (err) {
    return next(err)
  }
}

// ─── UPDATE HELPDESK FIELDS ────────────────────────────────
export const handleUpdateFields = async (req, res, next) => {
  const { uuid } = req.params
  if (req.validationErrors) {
    const firstErr = Object.values(req.validationErrors)[0]?.[0] || 'Input tidak valid.'
    return res.redirect(redirectError(linkDetail(uuid), firstErr))
  }
  try {
    const { severity, priority, jira_card, notes } = req.body
    await updateHelpdeskFields({
      uuid,
      data: { severity, priority, jira_card, notes },
      helpdeskId: req.session.user.id,
      ipAddress: getClientIp(req),
    })
    return res.redirect(redirectSuccess(linkDetail(uuid), 'Data tiket berhasil diperbarui.'))
  } catch (err) {
    return next(err)
  }
}

// ─── ADD COMMENT ───────────────────────────────────────────
export const addCommentHandler = async (req, res, next) => {
  const { uuid } = req.params
  if (req.validationErrors) {
    const firstErr = Object.values(req.validationErrors)[0]?.[0] || 'Input tidak valid.'
    return res.redirect(redirectError(linkDetail(uuid), firstErr))
  }
  try {
    const { content } = req.body
    await addComment({
      ticketUuid: uuid,
      userId: req.session.user.id,
      content,
      ipAddress: getClientIp(req),
    })
    return res.redirect(redirectSuccess(linkDetail(uuid), 'Komentar berhasil ditambahkan.'))
  } catch (err) {
    return next(err)
  }
}

// ─── DELETE COMMENT ────────────────────────────────────────
export const deleteCommentHandler = async (req, res, next) => {
  try {
    const { uuid, commentUuid } = req.params

    await deleteComment({ commentUuid, userId: req.session.user.id, ipAddress: getClientIp(req) })

    return res.redirect(redirectSuccess(linkDetail(uuid), 'Komentar berhasil dihapus.'))
  } catch (err) {
    if (err.message.includes('Tidak diizinkan')) {
      return res.redirect(redirectError(linkDetail(req.params.uuid), err.message))
    }
    return next(err)
  }
}
