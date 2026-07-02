import * as ticketService from '../../services/ticketService.js'
import { getPresignedUrl } from '../../services/storageService.js'
import { ISSUE_TYPE_OPTIONS, DEVICE_OPTIONS, WMS_MODULE_OPTIONS, TICKET_STATUS_LABEL } from '../../helpers/constants.js'
import { redirectSuccess, redirectError, getClientIp } from '../../helpers/common.js'

const { APP_URL } = process.env
const LINK_LIST = `${APP_URL}/tickets`
const LINK_CREATE = `${APP_URL}/tickets/create`

// ── GET /tickets ──
export async function listPage(req, res, next) {
  try {
    const { page = 1, paginate = 10, status } = req.query
    const reporterId = req.session.user.id

    const { count, rows, paginate: perPage } = await ticketService.listTicketsByReporter(reporterId, {
      page,
      paginate,
      status,
    })

    const totalPages = Math.ceil(count / perPage)

    const currentPage = parseInt(page, 10)

    return res.render('reporter/ticket-list', {
      layout: 'layouts/_layout',
      title: 'Tiket Saya',
      activeMenu: 'tickets',
      breadcrumb: [{ label: 'Tiket Saya', active: true }],
      tickets: rows,
      total: count,
      page: currentPage,
      totalPages,
      paginate: perPage,
      hasPrev: currentPage > 1,
      hasNext: currentPage < totalPages,
      prevPage: currentPage - 1,
      nextPage: currentPage + 1,
      statusFilter: status || '',
      statusLabels: TICKET_STATUS_LABEL,
      rowStart: (currentPage - 1) * perPage + 1,
    })
  } catch (err) {
    return next(err)
  }
}

// ── GET /tickets/create ──
export function createPage(req, res) {
  const user = req.session.user
  return res.render('reporter/ticket-create', {
    layout: 'layouts/_layout',
    title: 'Laporkan Issue',
    activeMenu: 'create',
    breadcrumb: [
      { label: 'Tiket Saya', url: `${APP_URL}/tickets` },
      { label: 'Laporkan Issue', active: true },
    ],
    backUrl: `${APP_URL}/tickets`,
    hospitalName: user.hospital_name || '',
    issueTypeOptions: ISSUE_TYPE_OPTIONS,
    deviceOptions: DEVICE_OPTIONS,
    wmsModuleOptions: WMS_MODULE_OPTIONS,
    csrfToken: req.csrfToken?.(),
    old: {},
    errors: {},
  })
}

// ── POST /tickets/create ──
export async function handleCreate(req, res, next) {
  const user = req.session.user

  if (req.validationErrors) {
    return res.render('reporter/ticket-create', {
      layout: 'layouts/_layout',
      title: 'Laporkan Issue',
      activeMenu: 'create',
      breadcrumb: [
        { label: 'Tiket Saya', url: `${APP_URL}/tickets` },
        { label: 'Laporkan Issue', active: true },
      ],
      backUrl: `${APP_URL}/tickets`,
      hospitalName: user.hospital_name || '',
      issueTypeOptions: ISSUE_TYPE_OPTIONS,
      deviceOptions: DEVICE_OPTIONS,
      wmsModuleOptions: WMS_MODULE_OPTIONS,
      csrfToken: req.csrfToken?.(),
      old: req.body,
      errors: req.validationErrors,
    })
  }

  try {
    const ticket = await ticketService.createTicket({
      reporterId: user.id,
      body: req.body,
      files: req.files || [],
      ipAddress: getClientIp(req),
    })

    return res.redirect(redirectSuccess(LINK_LIST, `Tiket ${ticket.ticket_number} berhasil dilaporkan.`))
  } catch (err) {
    return next(err)
  }
}

// ── GET /tickets/:uuid ──
export async function detailPage(req, res, next) {
  try {
    const { uuid } = req.params
    const reporterId = req.session.user.id

    const ticket = await ticketService.getTicketByUuid(uuid, reporterId)
    if (!ticket) {
      return res.status(404).render('error', {
        title: 'Tiket Tidak Ditemukan',
        message: 'Tiket tidak ditemukan atau Anda tidak memiliki akses.',
        code: 404,
      })
    }

    // Buat presigned URL untuk setiap attachment
    const attachmentsWithUrl = await Promise.all(
      (ticket.attachments || []).map(async (att) => {
        const downloadUrl = await getPresignedUrl(att.stored_name).catch(() => null)
        return { ...att.toJSON(), downloadUrl }
      }),
    )

    return res.render('reporter/ticket-detail', {
      layout: 'layouts/_layout',
      title: `Tiket ${ticket.ticket_number}`,
      activeMenu: 'tickets',
      breadcrumb: [
        { label: 'Tiket Saya', url: `${APP_URL}/tickets` },
        { label: ticket.ticket_number, active: true },
      ],
      backUrl: `${APP_URL}/tickets`,
      ticket: ticket.toJSON(),
      attachments: attachmentsWithUrl,
      histories: ticket.histories || [],
      statusLabels: TICKET_STATUS_LABEL,
      canClose: ticket.status === 4, // RESOLVED
      csrfToken: req.csrfToken?.(),
    })
  } catch (err) {
    return next(err)
  }
}

// ── POST /tickets/:uuid/close ──
export async function closeHandler(req, res, next) {
  try {
    const { uuid } = req.params
    const reporterId = req.session.user.id

    await ticketService.closeTicket({
      uuid,
      reporterId,
      ipAddress: getClientIp(req),
    })

    return res.redirect(redirectSuccess(`${APP_URL}/tickets/${uuid}`, 'Tiket berhasil ditutup. Terima kasih telah mengonfirmasi.'))
  } catch (err) {
    if (err.message.includes('Tiket hanya dapat') || err.message.includes('tidak ditemukan')) {
      return res.redirect(redirectError(`${APP_URL}/tickets/${req.params.uuid}`, err.message))
    }
    return next(err)
  }
}
