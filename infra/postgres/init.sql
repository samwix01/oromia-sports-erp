-- Extensions used across modules (03-domain-model). Schemas are created by migrations from M1-T01.
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS btree_gist;  -- exclusion constraints (affiliations, bookings)
