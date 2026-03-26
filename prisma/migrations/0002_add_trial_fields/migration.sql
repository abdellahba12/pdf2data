-- Add new columns that may not exist yet
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "trialEndsAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "totalDocsUsed" INT NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "templateFileUrl" TEXT;

-- Drop Client table and related columns if they exist from old schema
ALTER TABLE "Document" DROP COLUMN IF EXISTS "clientId";
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Client') THEN
    DROP TABLE "Client";
  END IF;
END $$;
