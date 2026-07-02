import { Op, fn, col } from 'sequelize'
import models from '../../models/index.js'
import { TICKET_STATUS } from '../../helpers/constants.js'
import { checkSla } from '../../services/slaService.js'

export const dashboardPage = async (req, res, next) => {
  try {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    // Senin minggu ini
    const weekStart = new Date(todayStart)
    const day = weekStart.getDay()
    const diffToMonday = day === 0 ? -6 : 1 - day
    weekStart.setDate(weekStart.getDate() + diffToMonday)

    // ── 1. Hitung per status ─────────────────────────────────────────
    const statusRows = await models.Ticket.findAll({
      attributes: ['status', [fn('COUNT', col('id')), 'count']],
      group: ['status'],
      raw: true,
    })
    const byStatus = {}
    statusRows.forEach((r) => { byStatus[r.status] = parseInt(r.count, 10) })

    // ── 2. Hitung per priority (tiket aktif saja) ────────────────────
    const priorityRows = await models.Ticket.findAll({
      attributes: ['priority', [fn('COUNT', col('id')), 'count']],
      where: {
        status: { [Op.notIn]: [TICKET_STATUS.CLOSED, TICKET_STATUS.REJECTED] },
        priority: { [Op.not]: null },
      },
      group: ['priority'],
      raw: true,
    })
    const byPriority = {}
    priorityRows.forEach((r) => { byPriority[r.priority] = parseInt(r.count, 10) })

    // ── 3. Tiket SLA breach (aktif) ──────────────────────────────────
    const breachedTickets = await models.Ticket.findAll({
      where: {
        sla_breached: true,
        status: { [Op.notIn]: [TICKET_STATUS.CLOSED, TICKET_STATUS.REJECTED] },
      },
      include: [{ model: models.User, as: 'reporter', attributes: ['name', 'hospital_name'] }],
      order: [['sla_deadline', 'ASC']],
      limit: 10,
    })

    // ── 4. Tiket SLA warning (mendekati breach) ──────────────────────
    const slaActiveTickets = await models.Ticket.findAll({
      where: {
        sla_deadline: { [Op.not]: null },
        sla_breached: false,
        status: { [Op.notIn]: [TICKET_STATUS.CLOSED, TICKET_STATUS.REJECTED] },
      },
      include: [{ model: models.User, as: 'reporter', attributes: ['name', 'hospital_name'] }],
      order: [['sla_deadline', 'ASC']],
    })
    const warningTickets = slaActiveTickets
      .filter((t) => checkSla(t).colorClass === 'warning')
      .slice(0, 10)

    // ── 5. Tiket hari ini & minggu ini ───────────────────────────────
    const [todayCount, weekCount, total] = await Promise.all([
      models.Ticket.count({ where: { created_at: { [Op.gte]: todayStart } } }),
      models.Ticket.count({ where: { created_at: { [Op.gte]: weekStart } } }),
      models.Ticket.count(),
    ])

    return res.render('helpdesk/dashboard', {
      layout: 'layouts/_layout',
      title: 'Dashboard Helpdesk',
      breadcrumb: [{ label: 'Dashboard', active: true }],
      activeMenu: 'dashboard',
      stats: {
        total,
        open:       byStatus[TICKET_STATUS.OPEN]        || 0,
        inProgress: byStatus[TICKET_STATUS.IN_PROGRESS] || 0,
        pending:    byStatus[TICKET_STATUS.PENDING]      || 0,
        resolved:   byStatus[TICKET_STATUS.RESOLVED]     || 0,
        closed:     byStatus[TICKET_STATUS.CLOSED]       || 0,
        rejected:   byStatus[TICKET_STATUS.REJECTED]     || 0,
        todayCount,
        weekCount,
        breachedCount: breachedTickets.length,
        warningCount:  warningTickets.length,
      },
      byPriority: {
        critical: byPriority['Critical'] || 0,
        high:     byPriority['High']     || 0,
        medium:   byPriority['Medium']   || 0,
        low:      byPriority['Low']      || 0,
      },
      breachedTickets: breachedTickets.map((t) => ({
        ...t.toJSON(),
        slaStatus: checkSla(t),
      })),
      warningTickets: warningTickets.map((t) => ({
        ...t.toJSON(),
        slaStatus: checkSla(t),
      })),
    })
  } catch (err) {
    return next(err)
  }
}
