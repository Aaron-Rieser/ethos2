exports.up = (pgm) => {
    pgm.createTable('mentions', {
        id: 'id',
        source_type: { type: 'varchar(50)', notNull: true }, // 'post' or 'comment'
        source_id: { type: 'integer', notNull: true },
        mentioned_user_id: { type: 'varchar(255)', notNull: true }, // accounts.auth0_id
        triggered_by_user_id: { type: 'varchar(255)', notNull: true }, // who wrote the post/comment
        content: { type: 'text', notNull: true }, // snapshot/preview of text
        created_at: {
            type: 'timestamp',
            notNull: true,
            default: pgm.func('current_timestamp')
        },
        read_at: { type: 'timestamp' }
    });
};

exports.down = (pgm) => {
    pgm.dropTable('mentions');
};

