/*
  Warnings:

  - Added the required column `groupChecked` to the `EventSeat` table without a default value. This is not possible if the table is not empty.
  - Added the required column `isvalid` to the `EventSeat` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "EventSeat" ADD COLUMN     "groupChecked" BOOLEAN NOT NULL,
ADD COLUMN     "isvalid" BOOLEAN NOT NULL;
