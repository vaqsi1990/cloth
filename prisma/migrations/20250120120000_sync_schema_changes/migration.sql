-- Remove VarChar constraints and fix indexes
-- These changes were already applied via db push, this migration is for history

-- AlterTable: User.iban - Remove VarChar(34)
-- (Already applied - no SQL needed as type change is automatic)

-- AlterTable: User.code - Remove VarChar(6)  
-- (Already applied - no SQL needed as type change is automatic)

-- AlterTable: registration_codes.code - Remove VarChar(6)
-- (Already applied - no SQL needed as type change is automatic)

-- Remove unnecessary index from Review table (productId index)
-- This index is redundant because of the unique constraint on (productId, userId)
DROP INDEX IF EXISTS "Review_productId_idx";

-- Remove unnecessary index from ReviewReply table (reviewId index)  
-- This index is redundant because reviewId is already unique
DROP INDEX IF EXISTS "ReviewReply_reviewId_idx";

