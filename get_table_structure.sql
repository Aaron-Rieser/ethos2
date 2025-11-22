-- Run this for EACH table in PRODUCTION
-- Replace 'table_name' with actual table name
-- This generates the full CREATE TABLE statement

SELECT 
    'CREATE TABLE ' || table_name || ' (' || E'\n' ||
    string_agg(
        '  ' || column_name || ' ' || 
        CASE 
            WHEN data_type = 'character varying' THEN 'varchar(' || COALESCE(character_maximum_length::text, '') || ')'
            WHEN data_type = 'character' THEN 'char(' || COALESCE(character_maximum_length::text, '') || ')'
            WHEN data_type = 'numeric' THEN 
                CASE 
                    WHEN numeric_precision IS NOT NULL THEN 'numeric(' || numeric_precision || ',' || COALESCE(numeric_scale, 0) || ')'
                    ELSE 'numeric'
                END
            WHEN data_type = 'integer' AND column_default LIKE 'nextval%' THEN 'serial'
            WHEN data_type = 'timestamp without time zone' THEN 'timestamp'
            WHEN data_type = 'timestamp with time zone' THEN 'timestamptz'
            ELSE data_type
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
    ) || E'\n);' as create_statement
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'table_name'  -- CHANGE THIS to each table name
GROUP BY table_name;

