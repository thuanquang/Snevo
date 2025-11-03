-- ===============================================
-- Stale Order Auto-Cancellation Setup
-- ===============================================
-- This script creates a function to auto-cancel pending orders that exceed TTL
-- and schedules it to run every 10 minutes via Supabase cron.
-- Stock is automatically restored via existing trigger: restore_stock_on_cancel()

-- ===============================================
-- 1. Create the function
-- ===============================================
CREATE OR REPLACE FUNCTION cancel_stale_pending_orders(ttl_minutes int DEFAULT 60)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE orders
  SET status = 'cancelled', updated_at = NOW()
  WHERE status = 'pending'
    AND created_at < NOW() - (ttl_minutes || ' minutes')::interval;
    
  -- Log the operation
  RAISE NOTICE 'Cancelled % stale pending orders (TTL: % minutes)', 
    (SELECT COUNT(*) FROM orders WHERE status = 'cancelled' AND updated_at > NOW() - interval '1 minute'),
    ttl_minutes;
END;
$$;

-- ===============================================
-- 2. Schedule the cron job
-- ===============================================
-- Drop existing schedule if it exists
SELECT cron.unschedule('cancel-stale-orders') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'cancel-stale-orders'
);

-- Create new schedule: run every 10 minutes
SELECT cron.schedule(
  'cancel-stale-orders',
  '*/10 * * * *',  -- every 10 minutes
  $$SELECT cancel_stale_pending_orders(60);$$
);

-- ===============================================
-- Notes:
-- - TTL is set to 60 minutes (orders pending > 60 mins are cancelled)
-- - Runs every 10 minutes
-- - When status changes to 'cancelled', trigger restore_stock_on_cancel() fires automatically
-- - To disable: SELECT cron.unschedule('cancel-stale-orders');
-- - To adjust TTL: UPDATE cron.job SET schedule = '*/10 * * * *' WHERE jobname = 'cancel-stale-orders';
-- ===============================================
