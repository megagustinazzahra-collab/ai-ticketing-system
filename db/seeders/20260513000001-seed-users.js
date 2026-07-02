const bcryptjs = require('bcryptjs')

const SALT_ROUNDS = 12

module.exports = {
  up: async (queryInterface) => {
    const now = new Date()
    const password = await bcryptjs.hash('Helpdesk@123', SALT_ROUNDS)

    await queryInterface.bulkInsert('users', [
      {
        uuid: '00000000-0000-0000-0000-000000000001',
        name: 'Admin Helpdesk',
        email: 'helpdesk@wms-ticketing.local',
        password,
        hospital_name: null,
        phone: null,
        role_id: 2,
        is_active: true,
        created_by: null,
        updated_by: null,
        deleted_by: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    ], {})
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('users', { email: 'helpdesk@wms-ticketing.local' }, {})
  },
}
