-- Run this in pgAdmin connected to PRODUCTION database
-- This will generate CREATE TABLE statements for all tables

SELECT 
    'CREATE TABLE ' || schemaname || '.' || tablename || ' (' || E'\n' ||
    string_agg(
        '  ' || column_name || ' ' || 
        CASE 
            WHEN data_type = 'character varying' THEN 'varchar(' || character_maximum_length || ')'
            WHEN data_type = 'character' THEN 'char(' || character_maximum_length || ')'
            WHEN data_type = 'numeric' THEN 'numeric(' || numeric_precision || ',' || numeric_scale || ')'
            WHEN data_type = 'integer' AND column_default LIKE 'nextval%' THEN 'serial'
            ELSE data_type
        END ||
        CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
        CASE WHEN column_default IS NOT NULL AND column_default NOT LIKE 'nextval%' 
             THEN ' DEFAULT ' || column_default 
             ELSE '' 
        END,
        ',' || E'\n'
        ORDER BY ordinal_position
    ) ||
    E'\n);'
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name NOT LIKE 'pg_%'
GROUP BY schemaname, tablename
ORDER BY tablename;

