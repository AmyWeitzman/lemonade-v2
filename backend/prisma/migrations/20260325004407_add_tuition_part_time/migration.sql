/*
  Warnings:

  - Added the required column `tuitionPartTime` to the `education_programs` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "education_programs" ADD COLUMN     "tuitionPartTime" DOUBLE PRECISION NOT NULL;
