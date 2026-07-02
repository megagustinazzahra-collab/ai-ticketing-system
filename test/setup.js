/**
 * Global test setup — dijalankan sekali sebelum semua test file.
 * Membutuhkan: PostgreSQL (wms_ticketing_test) + Redis berjalan.
 */

import redisClient from '../config/redis.js'
import db from '../app/models/index.js'
import { hashPassword } from '../app/helpers/password.js'
import { USER_ROLE } from '../app/helpers/constants.js'

before(async function () {
  this.timeout(30000)

  // Sambungkan Redis (dibutuhkan session store & slaService)
  if (!redisClient.isOpen) {
    await redisClient.connect()
  }

  // Buat semua tabel di test DB secara fresh
  await db.sequelize.sync({ force: true })

  const password = await hashPassword('TestPass123!')

  // Buat user helpdesk untuk dipakai di semua integration test
  const helpdesk = await db.User.create({
    name: 'Test Helpdesk',
    email: 'helpdesk@test.com',
    password,
    hospital_name: 'RS Helpdesk Test',
    phone: '081000000001',
    role_id: USER_ROLE.HELPDESK,
    is_active: true,
  })

  // Buat user reporter #1
  const reporter = await db.User.create({
    name: 'Test Reporter',
    email: 'reporter@test.com',
    password,
    hospital_name: 'RS Reporter Test',
    phone: '082000000001',
    role_id: USER_ROLE.REPORTER,
    is_active: true,
  })

  // Buat user reporter #2 (untuk test akses lintas reporter)
  const reporter2 = await db.User.create({
    name: 'Test Reporter 2',
    email: 'reporter2@test.com',
    password,
    hospital_name: 'RS Reporter 2 Test',
    phone: '083000000001',
    role_id: USER_ROLE.REPORTER,
    is_active: true,
  })

  // Expose ke semua test via global
  global.testUsers = { helpdesk, reporter, reporter2 }
  global.TEST_PASSWORD = 'TestPass123!'
})

after(async function () {
  this.timeout(15000)
  try {
    await db.sequelize.drop()
    await db.sequelize.close()
    if (redisClient.isOpen) await redisClient.quit()
  } catch (err) {
    console.error('[setup] cleanup error:', err.message)
  }
})
