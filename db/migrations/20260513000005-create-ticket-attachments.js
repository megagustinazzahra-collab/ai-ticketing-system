module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('ticket_attachments', {
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
      original_name: { type: Sequelize.STRING, allowNull: false },
      stored_name: { type: Sequelize.STRING, allowNull: false },
      mime_type: { type: Sequelize.STRING(100), allowNull: false },
      file_size: { type: Sequelize.INTEGER, allowNull: false },
      created_at: { allowNull: false, type: Sequelize.DATE },
    })

    await queryInterface.addIndex('ticket_attachments', ['ticket_id'])
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('ticket_attachments')
  },
}
