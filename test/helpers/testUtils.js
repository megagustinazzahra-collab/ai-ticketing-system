import request from 'supertest'
import app from '../../app/app.js'
import db from '../../app/models/index.js'
import { TICKET_STATUS } from '../../app/helpers/constants.js'
import { generateTicketNumber } from '../../app/helpers/ticketNumber.js'

const TEST_PASSWORD = 'TestPass123!'

/**
 * Buat supertest agent yang sudah ter-login sebagai user tertentu.
 * Agent mempertahankan cookie session antar request.
 */
async function loginAgent(email, password = TEST_PASSWORD) {
  const agent = request.agent(app)
  await agent
    .post('/login')
    .type('form')
    .send({ email, password, csrfToken: '', captchaToken: '' })
  return agent
}

/**
 * Buat tiket test langsung via model (tanpa HTTP — lebih cepat untuk setup data).
 * Tidak melalui MinIO, cocok untuk menyiapkan precondition test.
 */
async function createTestTicket(reporterId, overrides = {}) {
  const ticketNumber = await generateTicketNumber()

  const ticket = await db.Ticket.create({
    reporter_id: reporterId,
    issue_type: 'Bug',
    device: 'Web',
    wms_module: 'Login',
    problem_detail: 'Detail masalah untuk keperluan testing.',
    notes: null,
    status: TICKET_STATUS.OPEN,
    created_by: reporterId,
    ...overrides,
    ticket_number: ticketNumber,
    reporter_id: reporterId,
  })

  // Buat history awal null → Open
  await db.TicketHistory.create({
    ticket_id: ticket.id,
    changed_by: reporterId,
    from_status: null,
    to_status: ticket.status,
    reason: null,
  })

  return ticket
}

/**
 * Set status tiket langsung di DB (untuk menyiapkan precondition test).
 */
async function setTicketStatus(ticketId, status, changedBy) {
  const ticket = await db.Ticket.findByPk(ticketId)
  const prevStatus = ticket.status
  await ticket.update({ status })
  await db.TicketHistory.create({
    ticket_id: ticketId,
    changed_by: changedBy,
    from_status: prevStatus,
    to_status: status,
  })
  return ticket.reload()
}

export { app, request, db, loginAgent, createTestTicket, setTicketStatus, TEST_PASSWORD }
