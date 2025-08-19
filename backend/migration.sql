-- Enhanced monitor_results table migration
-- Run this in your PostgreSQL database

-- All columns already exist in monitor_results - no changes needed
-- Columns already present: ssl_expiry_days, ssl_valid, ssl_grade, performance_score, 
-- first_byte_time, dom_load_time, full_load_time, resource_count, page_size_bytes

-- Columns already exist in websites table - no changes needed  
-- Columns already present: status, last_checked

-- Indexes already exist - no changes needed
-- Already present: idx_monitor_results_website_time, idx_monitor_results_status

-- Add monitoring_enabled column to websites if it doesn't exist
ALTER TABLE websites 
ADD COLUMN IF NOT EXISTS monitoring_enabled BOOLEAN DEFAULT true;

-- Update existing websites to enable monitoring
UPDATE websites 
SET monitoring_enabled = true 
WHERE monitoring_enabled IS NULL;

-- Add triggered_at and resolved_at columns to alert_history to match our MonitoringService expectations
ALTER TABLE alert_history 
ADD COLUMN IF NOT EXISTS triggered_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP;

-- Copy existing sent_at values to triggered_at for existing records
UPDATE alert_history 
SET triggered_at = sent_at 
WHERE triggered_at IS NULL;
