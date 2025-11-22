-- ============================================
-- RUN THIS IN PGADMIN CONNECTED TO PRODUCTION
-- ============================================
-- This generates CREATE TABLE statements for ALL tables
-- Copy the output and run it in your local ethos_dev database

SELECT 
    'CREATE TABLE IF NOT EXISTS ' || table_name || ' (' || E'\n' ||
    string_agg(
        '  ' || column_name || ' ' || 
        CASE 
            WHEN udt_name = 'varchar' THEN 'varchar(' || COALESCE(character_maximum_length::text, '255') || ')'
            WHEN udt_name = 'char' THEN 'char(' || COALESCE(character_maximum_length::text, '1') || ')'
            WHEN udt_name = 'numeric' THEN 
                CASE 
                    WHEN numeric_precision IS NOT NULL THEN 'numeric(' || numeric_precision || ',' || COALESCE(numeric_scale::text, '0') || ')'
                    ELSE 'numeric'
                END
            WHEN udt_name = 'int4' AND column_default LIKE 'nextval%' THEN 'serial'
            WHEN udt_name = 'int8' AND column_default LIKE 'nextval%' THEN 'bigserial'
            WHEN udt_name = 'timestamp' THEN 'timestamp'
            WHEN udt_name = 'timestamptz' THEN 'timestamptz'
            WHEN udt_name = 'text' THEN 'text'
            WHEN udt_name = 'bool' THEN 'boolean'
            ELSE udt_name
        END ||
        CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
        CASE 
            WHEN column_default IS NOT NULL 
                 AND column_default NOT LIKE 'nextval%' 
                 AND column_default NOT LIKE 'CURRENT_TIMESTAMP%'
            THEN ' DEFAULT ' || column_default 
            WHEN column_default LIKE 'CURRENT_TIMESTAMP%'
            THEN ' DEFAULT CURRENT_TIMESTAMP'
            ELSE '' 
        END,
        ',' || E'\n'
        ORDER BY ordinal_position
    ) || 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
            WHERE tc.table_schema = 'public' 
              AND tc.table_name = c.table_name
              AND tc.constraint_type = 'PRIMARY KEY'
        )
        THEN E'\n  PRIMARY KEY (' || (
            SELECT string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position)
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
            WHERE tc.table_schema = 'public' 
              AND tc.table_name = c.table_name
              AND tc.constraint_type = 'PRIMARY KEY'
        ) || ')'
        ELSE ''
    END ||
    E'\n);' as create_statement
FROM information_schema.columns c
WHERE table_schema = 'public'
  AND table_name NOT LIKE 'pg_%'
GROUP BY table_name
ORDER BY table_name;

