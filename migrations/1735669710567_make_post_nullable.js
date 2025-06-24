exports.up = (pgm) => {
    // Make post column nullable in posts table
    pgm.alterColumn('posts', 'post', { type: 'text' });
    
    // Make post column nullable in deals table (if it exists)
    try {
        pgm.alterColumn('deals', 'post', { type: 'text' });
    } catch (error) {
        console.log('deals table or post column may not exist, skipping');
    }
    
    // Make post column nullable in missed_connections table (if it exists)
    try {
        pgm.alterColumn('missed_connections', 'post', { type: 'text' });
    } catch (error) {
        console.log('missed_connections table or post column may not exist, skipping');
    }
    
    // Make post column nullable in blind table (if it exists)
    try {
        pgm.alterColumn('blind', 'post', { type: 'text' });
    } catch (error) {
        console.log('blind table or post column may not exist, skipping');
    }
    
    // Make post column nullable in free table (if it exists)
    try {
        pgm.alterColumn('free', 'post', { type: 'text' });
    } catch (error) {
        console.log('free table or post column may not exist, skipping');
    }
};

exports.down = (pgm) => {
    // Revert post column to not null in posts table
    pgm.alterColumn('posts', 'post', { type: 'text', notNull: true });
    
    // Revert post column to not null in other tables if they exist
    try {
        pgm.alterColumn('deals', 'post', { type: 'text', notNull: true });
    } catch (error) {
        console.log('deals table or post column may not exist, skipping');
    }
    
    try {
        pgm.alterColumn('missed_connections', 'post', { type: 'text', notNull: true });
    } catch (error) {
        console.log('missed_connections table or post column may not exist, skipping');
    }
    
    try {
        pgm.alterColumn('blind', 'post', { type: 'text', notNull: true });
    } catch (error) {
        console.log('blind table or post column may not exist, skipping');
    }
    
    try {
        pgm.alterColumn('free', 'post', { type: 'text', notNull: true });
    } catch (error) {
        console.log('free table or post column may not exist, skipping');
    }
}; 