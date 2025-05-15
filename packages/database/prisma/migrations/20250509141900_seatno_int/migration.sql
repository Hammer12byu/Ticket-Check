/*
  Warnings:

  - Changed the type of `seatNo` on the `EventSeat` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "EventSeat" DROP COLUMN "seatNo",
ADD COLUMN     "seatNo" INTEGER NOT NULL;
