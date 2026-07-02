module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('tickets', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.BIGINT,
      },
      uuid: {
        allowNull: false,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        unique: true,
      },
      ticket_number: {
        allowNull: false,
        type: Sequelize.STRING(30),
        unique: true,
      },
      reporter_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      pic_id: {
        type: Sequelize.BIGINT,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      developer: { type: Sequelize.STRING, allowNull: true },
      issue_type: {
        type: Sequelize.ENUM(
          'Bug', 'Change', 'Cleansing', 'Inquiries',
          'New Request', 'Performance', 'UI/UX', 'Lainnya',
        ),
        allowNull: false,
      },
      device: {
        type: Sequelize.ENUM('Web', 'Mobile', 'All', 'Backend', 'Timbangan', 'Printer', 'Lainnya'),
        allowNull: false,
      },
      wms_module: { type: Sequelize.STRING, allowNull: false },
      severity: {
        type: Sequelize.ENUM('Critical', 'High', 'Medium', 'Low'),
        allowNull: true,
      },
      priority: {
        type: Sequelize.ENUM('Critical', 'High', 'Medium', 'Low'),
        allowNull: true,
      },
      problem_detail: { type: Sequelize.TEXT, allowNull: false },
      notes: { type: Sequelize.TEXT, allowNull: true },
      jira_card: { type: Sequelize.STRING, allowNull: true },
      status: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      resolved_at: { type: Sequelize.DATE, allowNull: true },
      resolution_minutes: { type: Sequelize.INTEGER, allowNull: true },
      sla_started_at: { type: Sequelize.DATE, allowNull: true },
      sla_paused_minutes: { type: Sequelize.INTEGER, defaultValue: 0 },
      sla_deadline: { type: Sequelize.DATE, allowNull: true },
      sla_breached: { type: Sequelize.BOOLEAN, defaultValue: false },
      created_by: { type: Sequelize.BIGINT, allowNull: true },
      updated_by: { type: Sequelize.BIGINT, allowNull: true },
      deleted_by: { type: Sequelize.BIGINT, allowNull: true },
      created_at: { allowNull: false, type: Sequelize.DATE },
      updated_at: { allowNull: false, type: Sequelize.DATE },
      deleted_at: { allowNull: true, type: Sequelize.DATE },
    })

    await queryInterface.addIndex('tickets', ['reporter_id'])
    await queryInterface.addIndex('tickets', ['status'])
    await queryInterface.addIndex('tickets', ['priority'])
    await queryInterface.addIndex('tickets', ['sla_breached'])
    await queryInterface.addIndex('tickets', ['created_at'])
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('tickets')
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_tickets_issue_type"')
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_tickets_device"')
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_tickets_severity"')
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_tickets_priority"')
  },
}
