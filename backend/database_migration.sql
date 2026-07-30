-- Database Schema Migration for ZenPost
-- Run this in your ZendBX SQL editor to add missing columns

-- ============================================================================
-- FIX: scheduled_posts table - Add user_id column
-- ============================================================================

-- Check if column exists, if not add it
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='scheduled_posts' AND column_name='user_id'
    ) THEN
        ALTER TABLE scheduled_posts ADD COLUMN user_id UUID NOT NULL;
        -- Add index for faster queries
        CREATE INDEX idx_scheduled_posts_user_id ON scheduled_posts(user_id);
    END IF;
END $$;

-- ============================================================================
-- FIX: marketing_intelligence table - Ensure all columns exist
-- ============================================================================

DO $$ 
BEGIN
    -- Add user_id if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='marketing_intelligence' AND column_name='user_id'
    ) THEN
        ALTER TABLE marketing_intelligence ADD COLUMN user_id UUID;
        CREATE INDEX idx_marketing_intelligence_user_id ON marketing_intelligence(user_id);
    END IF;
    
    -- Add website_id if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='marketing_intelligence' AND column_name='website_id'
    ) THEN
        ALTER TABLE marketing_intelligence ADD COLUMN website_id UUID;
    END IF;
    
    -- Add analysis_id if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='marketing_intelligence' AND column_name='analysis_id'
    ) THEN
        ALTER TABLE marketing_intelligence ADD COLUMN analysis_id UUID;
    END IF;
END $$;

-- ============================================================================
-- FIX: generated_campaigns table - Ensure all columns exist
-- ============================================================================

DO $$ 
BEGIN
    -- Add user_id if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='generated_campaigns' AND column_name='user_id'
    ) THEN
        ALTER TABLE generated_campaigns ADD COLUMN user_id UUID NOT NULL;
        CREATE INDEX idx_generated_campaigns_user_id ON generated_campaigns(user_id);
    END IF;
    
    -- Add marketing_intelligence_id if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='generated_campaigns' AND column_name='marketing_intelligence_id'
    ) THEN
        ALTER TABLE generated_campaigns ADD COLUMN marketing_intelligence_id UUID;
    END IF;
END $$;

-- ============================================================================
-- FIX: calendar_posts table - Ensure all columns exist
-- ============================================================================

DO $$ 
BEGIN
    -- Add user_id if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='calendar_posts' AND column_name='user_id'
    ) THEN
        ALTER TABLE calendar_posts ADD COLUMN user_id UUID NOT NULL;
        CREATE INDEX idx_calendar_posts_user_id ON calendar_posts(user_id);
    END IF;
    
    -- Add campaign_id if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='calendar_posts' AND column_name='campaign_id'
    ) THEN
        ALTER TABLE calendar_posts ADD COLUMN campaign_id UUID;
    END IF;
END $$;

-- ============================================================================
-- Verify the changes
-- ============================================================================

SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name IN (
    'scheduled_posts',
    'marketing_intelligence', 
    'generated_campaigns',
    'calendar_posts'
)
ORDER BY table_name, ordinal_position;
