-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar_blob_path" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar_generated_at" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar_image_url" TEXT;
