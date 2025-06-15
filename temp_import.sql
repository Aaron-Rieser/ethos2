-- Create temporary table without geometry
CREATE TEMPORARY TABLE temp_heritage_sites (
    ogc_fid INTEGER,
    field1 BIGINT,
    folder_row BIGINT,
    cen BIGINT,
    yr BIGINT,
    sequence BIGINT,
    sec VARCHAR(254),
    rev BIGINT,
    type VARCHAR(254),
    type_desc VARCHAR(254),
    status_cod BIGINT,
    status VARCHAR(254),
    in_date DATE,
    listed DATE,
    designated DATE,
    easement_a VARCHAR(254),
    building_t VARCHAR(254),
    descriptio TEXT,
    bylaw_no VARCHAR(254),
    htg_conser VARCHAR(254),
    omb_date VARCHAR(254),
    reason VARCHAR(254),
    list_numbe VARCHAR(254),
    constructi VARCHAR(254),
    architect_ VARCHAR(254),
    year_demol VARCHAR(254),
    property_r BIGINT,
    property_s VARCHAR(254),
    property_y FLOAT,
    property_x FLOAT,
    house VARCHAR(254),
    prefix VARCHAR(254),
    street VARCHAR(254),
    type_1 VARCHAR(254),
    direction VARCHAR(254),
    unit_type VARCHAR(254),
    unit VARCHAR(254),
    city VARCHAR(254),
    province VARCHAR(254),
    postal_cod VARCHAR(254),
    address_ty VARCHAR(254),
    roll FLOAT,
    planning_d VARCHAR(254),
    former_mun VARCHAR(254),
    ward BIGINT,
    pre_dec_1_ BIGINT,
    address VARCHAR(254)
);

-- First, create a temporary file with just the data rows
\copy (SELECT regexp_replace(regexp_replace(line, '^INSERT INTO.*?VALUES\(', ''), '\)$', '') FROM (SELECT unnest(string_to_array(pg_read_file('/Users/aaronries/Documents/GitHub/ethos2/heritage_sites.sql'), E'\n')) AS line WHERE line LIKE 'INSERT INTO%') AS data TO '/tmp/heritage_data.txt' WITH CSV;

-- Now import the cleaned data
\copy temp_heritage_sites FROM '/tmp/heritage_data.txt' WITH (FORMAT csv, DELIMITER ',', NULL 'NULL');

-- Export to CSV
\copy temp_heritage_sites TO '/Users/aaronries/Documents/GitHub/ethos2/heritage_sites.csv' WITH CSV HEADER;

-- Drop temporary table
DROP TABLE temp_heritage_sites; 