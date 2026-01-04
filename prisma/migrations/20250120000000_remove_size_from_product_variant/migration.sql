-- AlterTable
-- Check if column exists before dropping (idempotent migration)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'ProductVariant' 
        AND column_name = 'size'
    ) THEN
        ALTER TABLE "ProductVariant" DROP COLUMN "size";
    END IF;
END $$;
