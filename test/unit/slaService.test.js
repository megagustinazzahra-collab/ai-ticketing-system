import { assert } from 'chai'
import { startSla, checkSla } from '../../app/services/slaService.js'
import { SLA_CONFIG } from '../../app/helpers/slaConfig.js'

describe('SLA Service — startSla(priority)', () => {
  it('Critical: mengembalikan deadline ~4 jam dari sekarang', () => {
    const result = startSla('Critical')

    assert.instanceOf(result.sla_started_at, Date)
    assert.instanceOf(result.sla_deadline, Date)
    assert.equal(result.sla_paused_minutes, 0)

    const expectedMs = SLA_CONFIG.Critical.hours * 3600 * 1000
    const diff = result.sla_deadline.getTime() - result.sla_started_at.getTime()

    assert.isAtLeast(diff, expectedMs - 5000)
    assert.isAtMost(diff, expectedMs + 5000)
  })

  it('High: deadline ~8 jam dari sekarang', () => {
    const result = startSla('High')
    const expectedMs = SLA_CONFIG.High.hours * 3600 * 1000
    const diff = result.sla_deadline.getTime() - result.sla_started_at.getTime()
    assert.isAtLeast(diff, expectedMs - 5000)
    assert.isAtMost(diff, expectedMs + 5000)
  })

  it('Medium: deadline ~48 jam dari sekarang', () => {
    const result = startSla('Medium')
    const expectedMs = SLA_CONFIG.Medium.hours * 3600 * 1000
    const diff = result.sla_deadline.getTime() - result.sla_started_at.getTime()
    assert.isAtLeast(diff, expectedMs - 5000)
    assert.isAtMost(diff, expectedMs + 5000)
  })

  it('Low: deadline ~120 jam dari sekarang', () => {
    const result = startSla('Low')
    const expectedMs = SLA_CONFIG.Low.hours * 3600 * 1000
    const diff = result.sla_deadline.getTime() - result.sla_started_at.getTime()
    assert.isAtLeast(diff, expectedMs - 5000)
    assert.isAtMost(diff, expectedMs + 5000)
  })

  it('Priority tidak valid: mengembalikan object kosong', () => {
    const result = startSla('InvalidPriority')
    assert.deepEqual(result, {})
  })

  it('Priority undefined: mengembalikan object kosong', () => {
    const result = startSla(undefined)
    assert.deepEqual(result, {})
  })
})

describe('SLA Service — checkSla(ticket)', () => {
  it('Tiket tanpa sla_deadline: mengembalikan status INACTIVE', () => {
    const ticket = { sla_deadline: null, sla_started_at: null, sla_breached: false }
    const result = checkSla(ticket)
    assert.equal(result.colorClass, 'light')
    assert.equal(result.label, '-')
    assert.isFalse(result.isBreached)
    assert.isNull(result.remainingMs)
  })

  it('Tiket On Track (sisa > 20% dari total): colorClass = success', () => {
    const now = Date.now()
    // SLA 4 jam, baru mulai 1 menit lalu → sisa ~239 menit (>20%)
    const ticket = {
      sla_started_at: new Date(now - 1 * 60 * 1000),
      sla_deadline: new Date(now + 239 * 60 * 1000),
      sla_breached: false,
    }
    const result = checkSla(ticket)
    assert.equal(result.colorClass, 'success')
    assert.equal(result.label, 'On Track')
    assert.isFalse(result.isBreached)
    assert.isAbove(result.remainingMs, 0)
  })

  it('Tiket Warning (sisa < 20% dari total): colorClass = warning', () => {
    const now = Date.now()
    // SLA 4 jam total, deadline 40 menit lagi → 40/240 = 16.7% < 20%
    const totalMs = 240 * 60 * 1000
    const ticket = {
      sla_started_at: new Date(now - (totalMs - 40 * 60 * 1000)),
      sla_deadline: new Date(now + 40 * 60 * 1000),
      sla_breached: false,
    }
    const result = checkSla(ticket)
    assert.equal(result.colorClass, 'warning')
    assert.equal(result.label, 'Mendekati')
    assert.isFalse(result.isBreached)
  })

  it('Tiket Breach (deadline sudah lewat): colorClass = danger, isBreached = true', () => {
    const now = Date.now()
    const ticket = {
      sla_started_at: new Date(now - 5 * 3600 * 1000),
      sla_deadline: new Date(now - 1 * 60 * 1000),
      sla_breached: false,
    }
    const result = checkSla(ticket)
    assert.equal(result.colorClass, 'danger')
    assert.equal(result.label, 'Breach')
    assert.isTrue(result.isBreached)
    assert.equal(result.remainingMs, 0)
  })

  it('Tiket dengan sla_breached=true: selalu mengembalikan Breach meski deadline belum lewat', () => {
    const now = Date.now()
    const ticket = {
      sla_started_at: new Date(now - 1 * 60 * 1000),
      sla_deadline: new Date(now + 100 * 60 * 1000),
      sla_breached: true,
    }
    const result = checkSla(ticket)
    assert.equal(result.colorClass, 'danger')
    assert.equal(result.label, 'Breach')
    assert.isTrue(result.isBreached)
  })

  it('remainingLabel mencantumkan jam dan menit jika > 60 menit', () => {
    const now = Date.now()
    const ticket = {
      sla_started_at: new Date(now - 30 * 60 * 1000),
      sla_deadline: new Date(now + 90 * 60 * 1000),
      sla_breached: false,
    }
    const result = checkSla(ticket)
    assert.match(result.remainingLabel, /j/)
    assert.match(result.remainingLabel, /m/)
  })

  it('remainingLabel hanya menit jika < 60 menit sisa (warning zone)', () => {
    const now = Date.now()
    const totalMs = 240 * 60 * 1000
    const ticket = {
      sla_started_at: new Date(now - (totalMs - 30 * 60 * 1000)),
      sla_deadline: new Date(now + 30 * 60 * 1000),
      sla_breached: false,
    }
    const result = checkSla(ticket)
    assert.match(result.remainingLabel, /menit/)
    assert.notMatch(result.remainingLabel, /\dj\s/)
  })
})
