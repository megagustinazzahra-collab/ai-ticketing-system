import { Op } from 'sequelize'
import models from '../../models/index.js'

const ACTION_LABELS = {
  LOGIN:                  'Login',
  LOGIN_FAILED:           'Login Gagal',
  LOGOUT:                 'Logout',
  REGISTER:               'Registrasi',
  SUBMIT_TICKET:          'Submit Tiket',
  UPDATE_TICKET_STATUS:   'Update Status Tiket',
  ASSIGN_TICKET:          'Assign Tiket',
  UPDATE_HELPDESK_FIELDS: 'Update Field Helpdesk',
  ADD_COMMENT:            'Tambah Komentar',
  DELETE_COMMENT:         'Hapus Komentar',
  CLOSE_TICKET:           'Tutup Tiket',
  EXPORT_TICKETS:         'Ekspor Data',
}

const getMetaSummary = (action, metadata) => {
  if (!metadata) return '—'
  const m = metadata
  switch (action) {
    case 'UPDATE_TICKET_STATUS':
      return `Status: ${m.from} → ${m.to}${m.reason ? ` — ${m.reason}` : ''}`
    case 'ASSIGN_TICKET':
      return `PIC: ${m.pic_id || '—'}, Dev: ${m.developer || '—'}`
    case 'SUBMIT_TICKET':
    case 'CLOSE_TICKET':
      return m.ticket_number || '—'
    case 'LOGIN_FAILED':
    case 'LOGIN':
    case 'REGISTER':
      return m.email || '—'
    case 'EXPORT_TICKETS':
      return `${m.count ?? 0} record`
    case 'UPDATE_HELPDESK_FIELDS':
      return Array.isArray(m.fields) ? `Field: ${m.fields.join(', ')}` : '—'
    default:
      return '—'
  }
}

export const listPage = async (req, res, next) => {
  try {
    const { user_id, action, start_date, end_date, page = 1, paginate = 30 } = req.query

    const currentPage = parseInt(page, 10) || 1
    const perPage     = parseInt(paginate, 10) || 30
    const offset      = (currentPage - 1) * perPage

    const where = {}
    if (user_id)   where.user_id = parseInt(user_id, 10)
    if (action)    where.action  = action
    if (start_date || end_date) {
      where.created_at = {}
      if (start_date) where.created_at[Op.gte] = new Date(start_date)
      if (end_date) {
        const end = new Date(end_date)
        end.setHours(23, 59, 59, 999)
        where.created_at[Op.lte] = end
      }
    }

    const { count, rows } = await models.ActivityLog.findAndCountAll({
      where,
      limit:   perPage,
      offset,
      order:   [['created_at', 'DESC']],
      include: [
        { model: models.User, as: 'user', attributes: ['id', 'name', 'role_id'], required: false },
      ],
    })

    const totalPages = Math.ceil(count / perPage)
    const rowStart   = (currentPage - 1) * perPage + 1

    // Semua user untuk dropdown filter
    const users = await models.User.findAll({
      attributes: ['id', 'name', 'role_id'],
      order: [['name', 'ASC']],
    })

    const logs = rows.map((log) => ({
      ...log.toJSON(),
      actionLabel:  ACTION_LABELS[log.action] || log.action,
      metaSummary:  getMetaSummary(log.action, log.metadata),
    }))

    return res.render('helpdesk/activity-log', {
      layout:     'layouts/_layout',
      title:      'Log Aktivitas',
      breadcrumb: [{ label: 'Log Aktivitas', active: true }],
      activeMenu: 'logs',
      logs,
      users,
      actionOptions: Object.entries(ACTION_LABELS).map(([value, label]) => ({ value, label })),
      total:      count,
      page:       currentPage,
      paginate:   perPage,
      totalPages,
      rowStart,
      hasPrev:    currentPage > 1,
      hasNext:    currentPage < totalPages,
      prevPage:   currentPage - 1,
      nextPage:   currentPage + 1,
      filters: { user_id: user_id || '', action: action || '', start_date: start_date || '', end_date: end_date || '' },
    })
  } catch (err) {
    return next(err)
  }
}
