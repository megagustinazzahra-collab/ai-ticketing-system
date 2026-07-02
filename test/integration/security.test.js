import { assert } from 'chai'
import { app, request, db, loginAgent, createTestTicket } from '../helpers/testUtils.js'
import { TICKET_STATUS } from '../../app/helpers/constants.js'

// ── RBAC: Reporter tidak boleh akses rute helpdesk ─────────────────────────

describe('Security — RBAC: reporter diblokir dari rute helpdesk', () => {
  let reporterAgent
  let ticket

  before(async () => {
    reporterAgent = await loginAgent('reporter@test.com')
    ticket = await createTestTicket(global.testUsers.reporter.id)
  })

  it('reporter POST /helpdesk/tickets/:uuid/status → 403', async () => {
    const res = await reporterAgent
      .post(`/helpdesk/tickets/${ticket.uuid}/status`)
      .type('form')
      .send({ new_status: String(TICKET_STATUS.IN_PROGRESS), reason: '', csrfToken: '' })
    assert.equal(res.status, 403)
  })

  it('reporter POST /helpdesk/tickets/:uuid/fields → 403', async () => {
    const res = await reporterAgent
      .post(`/helpdesk/tickets/${ticket.uuid}/fields`)
      .type('form')
      .send({ severity: 'High', priority: 'Critical', jira_card: '', notes: '', csrfToken: '' })
    assert.equal(res.status, 403)
  })

  it('reporter POST /helpdesk/tickets/:uuid/assign → 403', async () => {
    const res = await reporterAgent
      .post(`/helpdesk/tickets/${ticket.uuid}/assign`)
      .type('form')
      .send({ pic_id: String(global.testUsers.helpdesk.id), developer: '', csrfToken: '' })
    assert.equal(res.status, 403)
  })

  it('reporter POST /helpdesk/tickets/:uuid/comments → 403', async () => {
    const res = await reporterAgent
      .post(`/helpdesk/tickets/${ticket.uuid}/comments`)
      .type('form')
      .send({ content: 'Komentar tidak sah dari reporter.', csrfToken: '' })
    assert.equal(res.status, 403)
  })

  it('reporter GET /helpdesk/export → 403', async () => {
    const res = await reporterAgent.get('/helpdesk/export')
    assert.equal(res.status, 403)
  })

  it('reporter GET /helpdesk/logs → 403', async () => {
    const res = await reporterAgent.get('/helpdesk/logs')
    assert.equal(res.status, 403)
  })
})

// ── Isolasi data antar reporter ────────────────────────────────────────────

describe('Security — Isolasi data reporter', () => {
  let reporter2Agent
  let ticketReporter1

  before(async () => {
    reporter2Agent = await loginAgent('reporter2@test.com')
    ticketReporter1 = await createTestTicket(global.testUsers.reporter.id)
  })

  it('reporter2 tidak bisa melihat tiket milik reporter1 → 404', async () => {
    const res = await reporter2Agent.get(`/tickets/${ticketReporter1.uuid}`)
    assert.equal(res.status, 404)
  })

  it('reporter2 tidak bisa close tiket milik reporter1 → redirect error', async () => {
    // Set dulu ke Resolved supaya test ini spesifik menguji isolasi, bukan aturan status
    await db.Ticket.update(
      { status: TICKET_STATUS.RESOLVED },
      { where: { id: ticketReporter1.id } },
    )
    const res = await reporter2Agent
      .post(`/tickets/${ticketReporter1.uuid}/close`)
      .type('form')
      .send({ csrfToken: '' })
    assert.equal(res.status, 302)
    assert.include(res.headers.location, 'error')
  })
})

// ── Upload: Validasi magic bytes ───────────────────────────────────────────

describe('Security — Upload: validasi magic bytes', () => {
  let reporterAgent

  before(async () => {
    reporterAgent = await loginAgent('reporter@test.com')
  })

  it('upload file .jpg dengan magic bytes bukan gambar → redirect error', async () => {
    // Buat buffer yang tidak memiliki magic bytes valid (plain text disguised as jpg)
    const fakeJpgBuffer = Buffer.from('This is not a real JPEG file content here.')
    const res = await reporterAgent
      .post('/tickets/create')
      .field('issue_type', 'Bug')
      .field('device', 'Web')
      .field('wms_module', 'Login')
      .field('problem_detail', 'Test upload file invalid untuk keperluan testing security.')
      .field('csrfToken', '')
      .attach('attachments', fakeJpgBuffer, { filename: 'fake.jpg', contentType: 'image/jpeg' })
    assert.equal(res.status, 302)
    assert.include(res.headers.location, 'error')
  })

  it('upload file .exe → redirect error (ekstensi tidak diizinkan)', async () => {
    const exeBuffer = Buffer.from('MZ\x90\x00\x03\x00\x00\x00') // PE header magic bytes
    const res = await reporterAgent
      .post('/tickets/create')
      .field('issue_type', 'Bug')
      .field('device', 'Web')
      .field('wms_module', 'Login')
      .field('problem_detail', 'Test upload file exe untuk keperluan testing security.')
      .field('csrfToken', '')
      .attach('attachments', exeBuffer, { filename: 'malware.exe', contentType: 'application/octet-stream' })
    assert.equal(res.status, 302)
    assert.include(res.headers.location, 'error')
  })
})

// ── Unauthenticated API ────────────────────────────────────────────────────

describe('Security — Unauthenticated akses API', () => {
  it('GET /api/v1/notifications/unread-count tanpa sesi → 401 atau 302', async () => {
    const res = await request(app).get('/api/v1/notifications/unread-count')
    assert.include([401, 302], res.status)
  })
})

// ── Sensitive field protection ─────────────────────────────────────────────

describe('Security — Tiket reporter tidak memiliki field sensitif helpdesk', () => {
  let reporterAgent
  let ticket

  before(async () => {
    reporterAgent = await loginAgent('reporter@test.com')
    ticket = await createTestTicket(global.testUsers.reporter.id)
  })

  it('severity dan priority null saat tiket baru dibuat oleh reporter', async () => {
    const fresh = await db.Ticket.findByPk(ticket.id)
    assert.isNull(fresh.severity)
    assert.isNull(fresh.priority)
  })

  it('reporter tidak bisa set severity/priority via PUT fields helpdesk (403)', async () => {
    const resBefore = await db.Ticket.findByPk(ticket.id)
    const severityBefore = resBefore.severity

    const res = await reporterAgent
      .post(`/helpdesk/tickets/${ticket.uuid}/fields`)
      .type('form')
      .send({ severity: 'Critical', priority: 'Critical', jira_card: '', notes: '', csrfToken: '' })
    assert.equal(res.status, 403)

    const resAfter = await db.Ticket.findByPk(ticket.id)
    assert.equal(resAfter.severity, severityBefore)
  })
})

// ── Rate limiting ──────────────────────────────────────────────────────────

describe('Security — Rate limiting tidak memblokir di bawah threshold', () => {
  it('5 kali login gagal tidak rate-limited (threshold = 10)', async () => {
    const attempts = []
    for (let i = 0; i < 5; i++) {
      attempts.push(
        request(app)
          .post('/login')
          .type('form')
          .send({ email: 'tidakada@test.com', password: 'WrongPass999!', csrfToken: '', captchaToken: '' }),
      )
    }
    const results = await Promise.all(attempts)
    results.forEach((res) => {
      assert.notEqual(res.status, 429, 'Seharusnya belum kena rate limit sebelum 10 percobaan')
    })
  })
})
