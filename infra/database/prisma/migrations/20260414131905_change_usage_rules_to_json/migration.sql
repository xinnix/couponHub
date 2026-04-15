/*
  Warnings:

  - The `usageRules` column on the `coupon_templates` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "coupon_templates" DROP COLUMN "usageRules",
ADD COLUMN     "usageRules" JSONB;
