/*
  Warnings:

  - You are about to drop the `SyosSeat` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ZoneColor` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "SyosSeat";

-- DropTable
DROP TABLE "ZoneColor";

-- CreateTable
CREATE TABLE "EventSeat" (
    "seatNo" TEXT NOT NULL,
    "seatStatus" TEXT NOT NULL,
    "seatType" TEXT NOT NULL,
    "zoneLabel" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "EventSeat_pkey" PRIMARY KEY ("seatNo")
);
