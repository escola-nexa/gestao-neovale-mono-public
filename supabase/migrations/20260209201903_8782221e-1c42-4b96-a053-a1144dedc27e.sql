-- Drop the old unique index that doesn't account for weekly records
DROP INDEX IF EXISTS idx_pre_plannings_unique_context;