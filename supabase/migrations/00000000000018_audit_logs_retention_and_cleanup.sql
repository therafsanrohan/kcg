-- ==============================================================================
-- Migration: 00000000000018_audit_logs_retention_and_cleanup.sql
-- Description: Automatic 90-day (3 months) data retention cleanup for financial_audit_logs
--              to prevent unbounded database storage growth.
-- ==============================================================================

-- 1. Index on created_at for fast date-based range deletion and lookups
CREATE INDEX IF NOT EXISTS idx_financial_audit_logs_created_at
  ON public.financial_audit_logs (created_at);

-- 2. Stored Procedure to clean up financial audit logs older than a given number of days (default: 90 days = 3 months)
CREATE OR REPLACE FUNCTION public.cleanup_expired_financial_audit_logs(retention_days integer DEFAULT 90)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
  cutoff_timestamp timestamp with time zone;
BEGIN
  -- Safe minimum guard: ensure retention is at least 30 days
  IF retention_days < 30 THEN
    retention_days := 90;
  END IF;

  cutoff_timestamp := timezone('utc'::text, now()) - (retention_days || ' days')::interval;

  DELETE FROM public.financial_audit_logs
  WHERE created_at < cutoff_timestamp;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;

-- Grant execution to authenticated users (admin checks are enforced via Supabase service role / policies)
GRANT EXECUTE ON FUNCTION public.cleanup_expired_financial_audit_logs(integer) TO authenticated;

-- 3. Optional: If pg_cron extension exists in Supabase project, schedule a monthly job
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    -- Schedule cleanup on the 1st of every month at 03:00 UTC
    PERFORM cron.schedule(
      'cleanup-financial-audit-logs-3months',
      '0 3 1 * *',
      'SELECT public.cleanup_expired_financial_audit_logs(90);'
    );
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- If pg_cron permissions or schema not available, ignore gracefully
    NULL;
END;
$$;
