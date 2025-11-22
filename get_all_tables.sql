-- Run this in pgAdmin Query Tool connected to PRODUCTION
-- Gets list of all tables

SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

