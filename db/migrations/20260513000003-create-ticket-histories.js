module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('ticket_histories', {
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
      ticket_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: 'tickets', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      changed_by: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      from_status: { type: Sequelize.INTEGER, allowNull: true },
      to_status: { type: Sequelize.INTEGER, allowNull: false },
      reason: { type: Sequelize.TEXT, allowNull: true },
      created_at: { allowNull: false, type: Sequelize.DATE },
    })

    await queryInterface.addIndex('ticket_histories', ['ticket_id'])
    await queryInterface.addIndex('ticket_histories', ['changed_by'])
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('ticket_histories')
  },
}
