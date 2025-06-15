-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create the heritage_sites table
CREATE TABLE IF NOT EXISTS heritage_sites (
    ogc_fid SERIAL PRIMARY KEY,
    geometry GEOMETRY(Point, 4326),
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

-- Create spatial index
CREATE INDEX heritage_sites_geometry_idx ON heritage_sites USING GIST (geometry);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_heritage_sites_updated_at
    BEFORE UPDATE ON heritage_sites
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 