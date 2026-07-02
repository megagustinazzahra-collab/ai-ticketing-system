import { assert } from 'chai'
import {
  TICKET_STATUS,
  TICKET_STATUS_LABEL,
  ALLOWED_TRANSITIONS,
  USER_ROLE,
  TICKET_PRIORITY,
  TICKET_SEVERITY,
  ISSUE_TYPE_OPTIONS,
  DEVICE_OPTIONS,
  WMS_MODULE_OPTIONS,
} from '../../app/helpers/constants.js'

describe('Constants — TICKET_STATUS', () => {
  it('harus memiliki 6 status dengan nilai integer yang benar', () => {
    assert.equal(TICKET_STATUS.OPEN, 1)
    assert.equal(TICKET_STATUS.IN_PROGRESS, 2)
    assert.equal(TICKET_STATUS.PENDING, 3)
    assert.equal(TICKET_STATUS.RESOLVED, 4)
    assert.equal(TICKET_STATUS.CLOSED, 5)
    assert.equal(TICKET_STATUS.REJECTED, 6)
  })

  it('TICKET_STATUS_LABEL harus punya label untuk setiap status', () => {
    assert.equal(TICKET_STATUS_LABEL[1], 'Open')
    assert.equal(TICKET_STATUS_LABEL[2], 'In Progress')
    assert.equal(TICKET_STATUS_LABEL[3], 'Pending')
    assert.equal(TICKET_STATUS_LABEL[4], 'Resolved')
    assert.equal(TICKET_STATUS_LABEL[5], 'Closed')
    assert.equal(TICKET_STATUS_LABEL[6], 'Rejected')
  })
})

describe('Constants — ALLOWED_TRANSITIONS (transisi status)', () => {
  // ── Transisi VALID ──
  it('Open dapat pindah ke In Progress', () => {
    assert.include(ALLOWED_TRANSITIONS[TICKET_STATUS.OPEN], TICKET_STATUS.IN_PROGRESS)
  })

  it('Open dapat pindah ke Rejected', () => {
    assert.include(ALLOWED_TRANSITIONS[TICKET_STATUS.OPEN], TICKET_STATUS.REJECTED)
  })

  it('In Progress dapat pindah ke Pending', () => {
    assert.include(ALLOWED_TRANSITIONS[TICKET_STATUS.IN_PROGRESS], TICKET_STATUS.PENDING)
  })

  it('In Progress dapat pindah ke Resolved', () => {
    assert.include(ALLOWED_TRANSITIONS[TICKET_STATUS.IN_PROGRESS], TICKET_STATUS.RESOLVED)
  })

  it('In Progress dapat pindah ke Rejected', () => {
    assert.include(ALLOWED_TRANSITIONS[TICKET_STATUS.IN_PROGRESS], TICKET_STATUS.REJECTED)
  })

  it('Pending dapat pindah ke In Progress (resume)', () => {
    assert.include(ALLOWED_TRANSITIONS[TICKET_STATUS.PENDING], TICKET_STATUS.IN_PROGRESS)
  })

  it('Pending dapat pindah ke Rejected', () => {
    assert.include(ALLOWED_TRANSITIONS[TICKET_STATUS.PENDING], TICKET_STATUS.REJECTED)
  })

  it('Resolved dapat pindah ke Closed (konfirmasi reporter)', () => {
    assert.include(ALLOWED_TRANSITIONS[TICKET_STATUS.RESOLVED], TICKET_STATUS.CLOSED)
  })

  it('Resolved dapat kembali ke In Progress (issue muncul lagi)', () => {
    assert.include(ALLOWED_TRANSITIONS[TICKET_STATUS.RESOLVED], TICKET_STATUS.IN_PROGRESS)
  })

  // ── Transisi TIDAK VALID ──
  it('Open tidak dapat langsung ke Pending', () => {
    assert.notInclude(ALLOWED_TRANSITIONS[TICKET_STATUS.OPEN], TICKET_STATUS.PENDING)
  })

  it('Open tidak dapat langsung ke Resolved', () => {
    assert.notInclude(ALLOWED_TRANSITIONS[TICKET_STATUS.OPEN], TICKET_STATUS.RESOLVED)
  })

  it('Open tidak dapat langsung ke Closed', () => {
    assert.notInclude(ALLOWED_TRANSITIONS[TICKET_STATUS.OPEN], TICKET_STATUS.CLOSED)
  })

  it('Pending tidak dapat langsung ke Resolved', () => {
    assert.notInclude(ALLOWED_TRANSITIONS[TICKET_STATUS.PENDING], TICKET_STATUS.RESOLVED)
  })

  it('Pending tidak dapat langsung ke Closed', () => {
    assert.notInclude(ALLOWED_TRANSITIONS[TICKET_STATUS.PENDING], TICKET_STATUS.CLOSED)
  })

  // ── Status FINAL (tidak bisa kemana-mana) ──
  it('Closed adalah status final — tidak ada transisi yang diizinkan', () => {
    assert.deepEqual(ALLOWED_TRANSITIONS[TICKET_STATUS.CLOSED], [])
  })

  it('Rejected adalah status final — tidak ada transisi yang diizinkan', () => {
    assert.deepEqual(ALLOWED_TRANSITIONS[TICKET_STATUS.REJECTED], [])
  })

  // ── Kelengkapan peta transisi ──
  it('ALLOWED_TRANSITIONS harus mendefinisikan semua 6 status', () => {
    const defined = Object.keys(ALLOWED_TRANSITIONS).map(Number)
    assert.include(defined, TICKET_STATUS.OPEN)
    assert.include(defined, TICKET_STATUS.IN_PROGRESS)
    assert.include(defined, TICKET_STATUS.PENDING)
    assert.include(defined, TICKET_STATUS.RESOLVED)
    assert.include(defined, TICKET_STATUS.CLOSED)
    assert.include(defined, TICKET_STATUS.REJECTED)
  })
})

describe('Constants — USER_ROLE', () => {
  it('REPORTER adalah role_id 1', () => {
    assert.equal(USER_ROLE.REPORTER, 1)
  })

  it('HELPDESK adalah role_id 2', () => {
    assert.equal(USER_ROLE.HELPDESK, 2)
  })
})

describe('Constants — TICKET_PRIORITY & TICKET_SEVERITY', () => {
  it('Priority dan Severity memiliki 4 level yang sama', () => {
    const levels = ['Critical', 'High', 'Medium', 'Low']
    levels.forEach((lvl) => {
      assert.propertyVal(TICKET_PRIORITY, lvl.toUpperCase(), lvl)
      assert.propertyVal(TICKET_SEVERITY, lvl.toUpperCase(), lvl)
    })
  })
})

describe('Constants — Opsi Dropdown', () => {
  it('ISSUE_TYPE_OPTIONS mengandung "Bug" dan "Lainnya"', () => {
    assert.include(ISSUE_TYPE_OPTIONS, 'Bug')
    assert.include(ISSUE_TYPE_OPTIONS, 'Lainnya')
  })

  it('DEVICE_OPTIONS mengandung "Web" dan "Mobile"', () => {
    assert.include(DEVICE_OPTIONS, 'Web')
    assert.include(DEVICE_OPTIONS, 'Mobile')
  })

  it('WMS_MODULE_OPTIONS bukan array kosong dan mengandung "Login"', () => {
    assert.isAbove(WMS_MODULE_OPTIONS.length, 0)
    assert.include(WMS_MODULE_OPTIONS, 'Login')
    assert.include(WMS_MODULE_OPTIONS, 'Lainnya')
  })
})
