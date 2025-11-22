#!/bin/bash
# Export schema from production database
# Replace YOUR_DATABASE_PUBLIC_URL with your actual Railway connection string

# Option 1: If you have DATABASE_PUBLIC_URL in .env or as environment variable
# pg_dump "$DATABASE_PUBLIC_URL" --schema-only --no-owner --no-acl > production_schema.sql

# Option 2: Direct connection string (replace with your actual Railway URL)
# pg_dump "postgresql://postgres:password@host:port/database" --schema-only --no-owner --no-acl > production_schema.sql

echo "To use this script:"
echo "1. Get your DATABASE_PUBLIC_URL from Railway"
echo "2. Run: pg_dump \"YOUR_URL\" --schema-only --no-owner --no-acl > production_schema.sql"
echo "3. Then run: psql -d ethos_dev -f production_schema.sql"

