import { assert } from 'chai'
import { app, request, db, loginAgent, createTestTicket, setTicketStatus } from '../helpers/testUtils.js'
import { TICKET_STATUS } from '../../app/helpers/constants.js'
import { SLA_CONFIG } from '../../app/helpers/slaConfig.js'

// ── Reporter: Submit Tiket ─────────────────────────────────────────────────

describe('Ticket — Reporter submit tiket', () => {
  let reporterAgent
  let submitTime

  before(async () => {
    reporterAgent = await loginAgent('reporter@test.com')
  })

  it('submit valid → redirect /tickets?success', async () => {
    submitTime = new Date()
    const res = await reporterAgent
      .post('/tickets/create')
      .type('form')
      .send({
        issue_type: 'Bug',
        device: 'Web',
        wms_module: 'Login',
        problem_detail: 'Tidak bisa login ke aplikasi WMS sama sekali.',
        csrfToken: '',
      })
    assert.equal(res.status, 302)
    assert.include(res.headers.location, '/tickets')
    assert.include(res.headers.location, 'success')
  })

  it('tiket tersimpan di DB dengan format ticket_number TKT-YYYYMMDD-XXX', async () => {
    const reporter = global.testUsers.reporter
    const { Op } = db.Sequelize
    const ticket = await db.Ticket.findOne({
      where: {
        reporter_id: reporter.id,
        created_at: { [Op.gte]: submitTime },
      },
      order: [['created_at', 'DESC']],
    })
    assert.isNotNull(ticket)
    assert.match(ticket.ticket_number, /^TKT-\d{8}-\d{3,}$/)
    assert.equal(Number(ticket.status), TICKET_STATUS.OPEN)
  })

  it('history awal (null → Open) terbuat', async () => {
    const reporter = global.testUsers.reporter
    const ticket = await db.Ticket.findOne({
      where: { reporter_id: reporter.id },
      order: [['created_at', 'DESC']],
    })
    const history = await db.TicketHistory.findOne({
      where: { ticket_id: ticket.id, from_status: null, to_status: TICKET_STATUS.OPEN },
    })
    assert.isNotNull(history)
  })

  it('problem_detail terlalu pendek → 200 (validasi gagal, re-render)', async () => {
    const res = await reporterAgent
      .post('/tickets/create')
      .type('form')
      .send({
        issue_type: 'Bug',
        device: 'Web',
        wms_module: 'Login',
        problem_detail: 'short',
        csrfToken: '',
      })
    assert.equal(res.status, 200)
  })
})

// ── Reporter: List & Detail ────────────────────────────────────────────────

describe('Ticket — Reporter list & detail', () => {
  let reporterAgent
  let reporter2Agent
  let ticket

  before(async () => {
    reporterAgent = await loginAgent('reporter@test.com')
    reporter2Agent = await loginAgent('reporter2@test.com')
    ticket = await createTestTicket(global.testUsers.reporter.id)
  })

  it('reporter GET /tickets → 200', async () => {
    const res = await reporterAgent.get('/tickets')
    assert.equal(res.status, 200)
  })

  it('reporter bisa lihat tiket miliknya', async () => {
    const res = await reporterAgent.get(`/tickets/${ticket.uuid}`)
    assert.equal(res.status, 200)
  })

  it('reporter tidak bisa lihat tiket reporter lain → 404', async () => {
    const res = await reporter2Agent.get(`/tickets/${ticket.uuid}`)
    assert.equal(res.status, 404)
  })
})

// ── Reporter: Close Tiket ──────────────────────────────────────────────────

describe('Ticket — Reporter close tiket', () => {
  let reporterAgent
  let resolvedTicket
  let openTicket

  before(async () => {
    reporterAgent = await loginAgent('reporter@test.com')
    resolvedTicket = await createTestTicket(global.testUsers.reporter.id)
    await setTicketStatus(resolvedTicket.id, TICKET_STATUS.RESOLVED, global.testUsers.helpdesk.id)
    openTicket = await createTestTicket(global.testUsers.reporter.id)
  })

  it('reporter close tiket Resolved → redirect dengan success', async () => {
    const res = await reporterAgent.post(`/tickets/${resolvedTicket.uuid}/close`).type('form').send({ csrfToken: '' })
    assert.equal(res.status, 302)
    assert.include(res.headers.location, 'success')
  })

  it('status tiket menjadi Closed setelah close', async () => {
    const updated = await db.Ticket.findByPk(resolvedTicket.id)
    assert.equal(Number(updated.status), TICKET_STATUS.CLOSED)
  })

  it('reporter close tiket Open (bukan Resolved) → redirect dengan error', async () => {
    const res = await reporterAgent.post(`/tickets/${openTicket.uuid}/close`).type('form').send({ csrfToken: '' })
    assert.equal(res.status, 302)
    assert.include(res.headers.location, 'error')
  })
})

// ── Helpdesk: List ─────────────────────────────────────────────────────────

describe('Ticket — Helpdesk list', () => {
  let helpdeskAgent

  before(async () => {
    helpdeskAgent = await loginAgent('helpdesk@test.com')
  })

  it('helpdesk GET /helpdesk/tickets → 200', async () => {
    const res = await helpdeskAgent.get('/helpdesk/tickets')
    assert.equal(res.status, 200)
  })
})

// ── Helpdesk: Update Status ────────────────────────────────────────────────

describe('Ticket — Helpdesk update status', () => {
  let helpdeskAgent
  let ticket

  before(async () => {
    helpdeskAgent = await loginAgent('helpdesk@test.com')
    ticket = await createTestTicket(global.testUsers.reporter.id)
  })

  it('transisi valid Open → InProgress → 302 redirect success', async () => {
    const res = await helpdeskAgent
      .post(`/helpdesk/tickets/${ticket.uuid}/status`)
      .type('form')
      .send({ new_status: String(TICKET_STATUS.IN_PROGRESS), reason: '', csrfToken: '' })
    assert.equal(res.status, 302)
    assert.include(res.headers.location, 'success')
  })

  it('status tiket berubah menjadi InProgress di DB', async () => {
    const updated = await db.Ticket.findByPk(ticket.id)
    assert.equal(Number(updated.status), TICKET_STATUS.IN_PROGRESS)
  })

  it('history transisi tercatat di DB', async () => {
    const history = await db.TicketHistory.findOne({
      where: {
        ticket_id: ticket.id,
        from_status: TICKET_STATUS.OPEN,
        to_status: TICKET_STATUS.IN_PROGRESS,
      },
    })
    assert.isNotNull(history)
  })

  it('transisi tidak valid Open → Closed → redirect error, status tidak berubah', async () => {
    const freshTicket = await createTestTicket(global.testUsers.reporter.id)
    const res = await helpdeskAgent
      .post(`/helpdesk/tickets/${freshTicket.uuid}/status`)
      .type('form')
      .send({ new_status: String(TICKET_STATUS.CLOSED), reason: '', csrfToken: '' })
    assert.equal(res.status, 302)
    assert.include(res.headers.location, 'error')

    const unchanged = await db.Ticket.findByPk(freshTicket.id)
    assert.equal(Number(unchanged.status), TICKET_STATUS.OPEN)
  })
})

// ── Helpdesk: Reject ───────────────────────────────────────────────────────

describe('Ticket — Helpdesk reject tiket', () => {
  let helpdeskAgent
  let ticket

  before(async () => {
    helpdeskAgent = await loginAgent('helpdesk@test.com')
    ticket = await createTestTicket(global.testUsers.reporter.id)
  })

  it('reject tanpa reason → error redirect, status tidak berubah', async () => {
    const res = await helpdeskAgent
      .post(`/helpdesk/tickets/${ticket.uuid}/status`)
      .type('form')
      .send({ new_status: String(TICKET_STATUS.REJECTED), reason: '', csrfToken: '' })
    assert.equal(res.status, 302)
    const unchanged = await db.Ticket.findByPk(ticket.id)
    assert.equal(Number(unchanged.status), TICKET_STATUS.OPEN)
  })

  it('reject dengan reason → status REJECTED, reason tersimpan', async () => {
    const res = await helpdeskAgent
      .post(`/helpdesk/tickets/${ticket.uuid}/status`)
      .type('form')
      .send({ new_status: String(TICKET_STATUS.REJECTED), reason: 'Tiket duplikat, sudah ada TKT sebelumnya.', csrfToken: '' })
    assert.equal(res.status, 302)

    const updated = await db.Ticket.findByPk(ticket.id)
    assert.equal(Number(updated.status), TICKET_STATUS.REJECTED)

    const history = await db.TicketHistory.findOne({
      where: { ticket_id: ticket.id, to_status: TICKET_STATUS.REJECTED },
    })
    assert.isNotNull(history)
    assert.isNotNull(history.reason)
  })
})

// ── Helpdesk: Fields (Priority & SLA) ─────────────────────────────────────

describe('Ticket — Helpdesk set priority & SLA', () => {
  let helpdeskAgent
  let ticket

  before(async () => {
    helpdeskAgent = await loginAgent('helpdesk@test.com')
    ticket = await createTestTicket(global.testUsers.reporter.id)
  })

  it('set priority Critical → SLA dimulai, deadline ~4 jam', async () => {
    const res = await helpdeskAgent
      .post(`/helpdesk/tickets/${ticket.uuid}/fields`)
      .type('form')
      .send({ severity: 'High', priority: 'Critical', jira_card: '', notes: '', csrfToken: '' })
    assert.equal(res.status, 302)

    const updated = await db.Ticket.findByPk(ticket.id)
    assert.isNotNull(updated.sla_started_at)
    assert.isNotNull(updated.sla_deadline)

    const expectedMs = SLA_CONFIG.Critical.hours * 3600 * 1000
    const diff = new Date(updated.sla_deadline).getTime() - new Date(updated.sla_started_at).getTime()
    assert.isAtLeast(diff, expectedMs - 10000)
    assert.isAtMost(diff, expectedMs + 10000)
  })

  it('update fields kembali tidak mereset SLA yang sudah ada', async () => {
    const before = await db.Ticket.findByPk(ticket.id)
    const originalDeadline = before.sla_deadline

    await helpdeskAgent
      .post(`/helpdesk/tickets/${ticket.uuid}/fields`)
      .type('form')
      .send({ severity: 'Medium', priority: 'Critical', jira_card: 'WMS-999', notes: 'Update notes', csrfToken: '' })

    const after = await db.Ticket.findByPk(ticket.id)
    assert.equal(
      new Date(after.sla_deadline).getTime(),
      new Date(originalDeadline).getTime(),
    )
  })
})

// ── Helpdesk: Assign ───────────────────────────────────────────────────────

describe('Ticket — Helpdesk assign PIC', () => {
  let helpdeskAgent
  let ticket

  before(async () => {
    helpdeskAgent = await loginAgent('helpdesk@test.com')
    ticket = await createTestTicket(global.testUsers.reporter.id)
  })

  it('assign PIC helpdesk → redirect success, pic_id tersimpan di DB', async () => {
    const helpdeskId = global.testUsers.helpdesk.id
    const res = await helpdeskAgent
      .post(`/helpdesk/tickets/${ticket.uuid}/assign`)
      .type('form')
      .send({ pic_id: String(helpdeskId), developer: 'Dev Tester', csrfToken: '' })
    assert.equal(res.status, 302)
    assert.include(res.headers.location, 'success')

    const updated = await db.Ticket.findByPk(ticket.id)
    assert.equal(Number(updated.pic_id), helpdeskId)
    assert.equal(updated.developer, 'Dev Tester')
  })
})

// ── Helpdesk: Comment ──────────────────────────────────────────────────────

describe('Ticket — Helpdesk komentar', () => {
  let helpdeskAgent
  let ticket

  before(async () => {
    helpdeskAgent = await loginAgent('helpdesk@test.com')
    ticket = await createTestTicket(global.testUsers.reporter.id)
  })

  it('tambah komentar valid → redirect success', async () => {
    const res = await helpdeskAgent
      .post(`/helpdesk/tickets/${ticket.uuid}/comments`)
      .type('form')
      .send({ content: 'Ini komentar untuk tiket test yang cukup panjang.', csrfToken: '' })
    assert.equal(res.status, 302)
    assert.include(res.headers.location, 'success')
  })

  it('komentar tersimpan di DB', async () => {
    const comment = await db.TicketComment.findOne({
      where: { ticket_id: ticket.id, deleted_at: null },
      order: [['created_at', 'DESC']],
    })
    assert.isNotNull(comment)
    assert.include(comment.content, 'komentar untuk tiket test')
  })

  it('komentar terlalu pendek (< 3 karakter) → redirect error', async () => {
    const res = await helpdeskAgent
      .post(`/helpdesk/tickets/${ticket.uuid}/comments`)
      .type('form')
      .send({ content: 'X', csrfToken: '' })
    assert.equal(res.status, 302)
    assert.include(res.headers.location, 'error')
  })

  it('hapus komentar → redirect success, komentar soft-deleted', async () => {
    const comment = await db.TicketComment.findOne({
      where: { ticket_id: ticket.id, deleted_at: null },
      order: [['created_at', 'DESC']],
    })

    const res = await helpdeskAgent
      .post(`/helpdesk/tickets/${ticket.uuid}/comments/${comment.uuid}/delete`)
      .type('form')
      .send({ csrfToken: '' })
    assert.equal(res.status, 302)
    assert.include(res.headers.location, 'success')

    const deleted = await db.TicketComment.findOne({ where: { id: comment.id }, paranoid: false })
    assert.isNotNull(deleted.deleted_at)
  })
})

// ── Full Lifecycle Flow ────────────────────────────────────────────────────

describe('Ticket — Full lifecycle: Open → InProgress → Pending → InProgress → Resolved → Closed', () => {
  let helpdeskAgent
  let reporterAgent
  let ticket

  before(async () => {
    helpdeskAgent = await loginAgent('helpdesk@test.com')
    reporterAgent = await loginAgent('reporter@test.com')
    ticket = await createTestTicket(global.testUsers.reporter.id)
  })

  const transition = (agent, uuid, newStatus, reason = '') =>
    agent
      .post(`/helpdesk/tickets/${uuid}/status`)
      .type('form')
      .send({ new_status: String(newStatus), reason, csrfToken: '' })

  it('Open → InProgress', async () => {
    const res = await transition(helpdeskAgent, ticket.uuid, TICKET_STATUS.IN_PROGRESS)
    assert.equal(res.status, 302)
    assert.include(res.headers.location, 'success')
  })

  it('InProgress → Pending', async () => {
    const res = await transition(helpdeskAgent, ticket.uuid, TICKET_STATUS.PENDING, 'Menunggu respons vendor.')
    assert.equal(res.status, 302)
    assert.include(res.headers.location, 'success')
  })

  it('Pending → InProgress (resume)', async () => {
    const res = await transition(helpdeskAgent, ticket.uuid, TICKET_STATUS.IN_PROGRESS)
    assert.equal(res.status, 302)
    assert.include(res.headers.location, 'success')
  })

  it('InProgress → Resolved', async () => {
    const res = await transition(helpdeskAgent, ticket.uuid, TICKET_STATUS.RESOLVED)
    assert.equal(res.status, 302)
    assert.include(res.headers.location, 'success')
  })

  it('Resolved → Closed (oleh reporter)', async () => {
    const res = await reporterAgent.post(`/tickets/${ticket.uuid}/close`).type('form').send({ csrfToken: '' })
    assert.equal(res.status, 302)
    assert.include(res.headers.location, 'success')
  })

  it('status akhir adalah Closed', async () => {
    const final = await db.Ticket.findByPk(ticket.id)
    assert.equal(Number(final.status), TICKET_STATUS.CLOSED)
  })

  it('ada minimal 6 record history untuk lifecycle ini', async () => {
    const histories = await db.TicketHistory.findAll({ where: { ticket_id: ticket.id } })
    assert.isAtLeast(histories.length, 6)
  })
})
