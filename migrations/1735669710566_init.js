exports.up = (pgm) => {
    // Create posts table
    pgm.createTable('posts', {
        id: 'id',
        neighbourhood: { type: 'varchar(255)', notNull: true },
        username: { type: 'varchar(255)', notNull: true },
        post: { type: 'text' },
        latitude: { type: 'decimal' },
        longitude: { type: 'decimal' },
        image_url: { type: 'text' },
        user_id: { type: 'varchar(255)' },
        created_at: {
            type: 'timestamp',
            notNull: true,
            default: pgm.func('current_timestamp')
        }
    });
};

exports.down = (pgm) => {
    // Drop tables in case we need to roll back
    pgm.dropTable('posts');
};