import { assert } from 'chai'
import { app, request, db, loginAgent, TEST_PASSWORD } from '../helpers/testUtils.js'

describe('Auth — GET /login', () => {
  it('halaman login mengembalikan 200', async () => {
    const res = await request(app).get('/login')
    assert.equal(res.status, 200)
  })
})

describe('Auth — POST /login', () => {
  it('login valid reporter → redirect ke /tickets', async () => {
    const res = await request(app)
      .post('/login')
      .type('form')
      .send({ email: 'reporter@test.com', password: TEST_PASSWORD, csrfToken: '', captchaToken: '' })
    assert.equal(res.status, 302)
    assert.include(res.headers.location, '/tickets')
  })

  it('login valid helpdesk → redirect ke /helpdesk/dashboard', async () => {
    const res = await request(app)
      .post('/login')
      .type('form')
      .send({ email: 'helpdesk@test.com', password: TEST_PASSWORD, csrfToken: '', captchaToken: '' })
    assert.equal(res.status, 302)
    assert.include(res.headers.location, '/helpdesk/dashboard')
  })

  it('login password salah → 200 (re-render)', async () => {
    const res = await request(app)
      .post('/login')
      .type('form')
      .send({ email: 'reporter@test.com', password: 'SalahPassword99!', csrfToken: '', captchaToken: '' })
    assert.equal(res.status, 200)
  })

  it('login email tidak terdaftar → 200 (re-render)', async () => {
    const res = await request(app)
      .post('/login')
      .type('form')
      .send({ email: 'tidakada@test.com', password: TEST_PASSWORD, csrfToken: '', captchaToken: '' })
    assert.equal(res.status, 200)
  })

  it('login email kosong (validasi) → 200 (re-render)', async () => {
    const res = await request(app)
      .post('/login')
      .type('form')
      .send({ email: '', password: TEST_PASSWORD, csrfToken: '', captchaToken: '' })
    assert.equal(res.status, 200)
  })
})

describe('Auth — POST /register', () => {
  it('register valid → redirect /login dengan pesan sukses', async () => {
    const res = await request(app)
      .post('/register')
      .type('form')
      .send({
        name: 'User Baru Test',
        email: 'userbaru@test.com',
        password: TEST_PASSWORD,
        password_confirmation: TEST_PASSWORD,
        hospital_name: 'RS Test Baru',
        csrfToken: '',
      })
    assert.equal(res.status, 302)
    assert.include(res.headers.location, '/login')
  })

  it('user baru tersimpan di database', async () => {
    const user = await db.User.findOne({ where: { email: 'userbaru@test.com' } })
    assert.isNotNull(user)
    assert.equal(user.name, 'User Baru Test')
  })

  it('register email duplikat → 200 (re-render error)', async () => {
    const res = await request(app)
      .post('/register')
      .type('form')
      .send({
        name: 'Reporter Lagi',
        email: 'reporter@test.com',
        password: TEST_PASSWORD,
        hospital_name: 'RS Duplikat',
        phone: '085000000088',
        csrfToken: '',
      })
    assert.equal(res.status, 200)
  })

  it('register email kosong (validasi) → 200 (re-render error)', async () => {
    const res = await request(app)
      .post('/register')
      .type('form')
      .send({
        name: 'User Kosong',
        email: '',
        password: TEST_PASSWORD,
        hospital_name: 'RS Kosong',
        phone: '085000000077',
        csrfToken: '',
      })
    assert.equal(res.status, 200)
  })
})

describe('Auth — POST /logout', () => {
  it('logout menghancurkan sesi dan redirect ke /login', async () => {
    const agent = await loginAgent('reporter@test.com')

    // Pastikan sesi aktif dulu
    const check = await agent.get('/tickets')
    assert.equal(check.status, 200)

    const res = await agent.post('/logout')
    assert.equal(res.status, 302)
    assert.include(res.headers.location, '/login')

    // Akses setelah logout harus redirect ke /login
    const after = await agent.get('/tickets')
    assert.equal(after.status, 302)
    assert.include(after.headers.location, '/login')
  })
})

describe('Auth — Proteksi route tanpa sesi', () => {
  it('GET /tickets tanpa sesi → redirect /login', async () => {
    const res = await request(app).get('/tickets')
    assert.equal(res.status, 302)
    assert.include(res.headers.location, '/login')
  })

  it('GET /helpdesk/dashboard tanpa sesi → redirect /login', async () => {
    const res = await request(app).get('/helpdesk/dashboard')
    assert.equal(res.status, 302)
    assert.include(res.headers.location, '/login')
  })

  it('GET /helpdesk/tickets tanpa sesi → redirect /login', async () => {
    const res = await request(app).get('/helpdesk/tickets')
    assert.equal(res.status, 302)
    assert.include(res.headers.location, '/login')
  })
})

describe('Auth — RBAC: reporter akses helpdesk', () => {
  it('reporter GET /helpdesk/tickets → 403', async () => {
    const agent = await loginAgent('reporter@test.com')
    const res = await agent.get('/helpdesk/tickets')
    assert.equal(res.status, 403)
  })

  it('reporter GET /helpdesk/dashboard → 403', async () => {
    const agent = await loginAgent('reporter@test.com')
    const res = await agent.get('/helpdesk/dashboard')
    assert.equal(res.status, 403)
  })
})
