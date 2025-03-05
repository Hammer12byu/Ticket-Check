/*
  Warnings:

  - The primary key for the `Event` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `url` on the `Event` table. All the data in the column will be lost.
  - The `id` column on the `Event` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `EventSeat` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[sourceUrl]` on the table `Event` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `eventId` to the `EventSeat` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Event" DROP CONSTRAINT "Event_pkey",
DROP COLUMN "url",
ADD COLUMN     "sourceUrl" TEXT NOT NULL DEFAULT 'UNKNOWN',
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "Event_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "EventSeat" DROP CONSTRAINT "EventSeat_pkey",
ADD COLUMN     "eventId" INTEGER NOT NULL,
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "EventSeat_pkey" PRIMARY KEY ("id");

-- CreateTable
CREATE TABLE "EventZonePrice" (
    "id" SERIAL NOT NULL,
    "zoneColor" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "eventId" INTEGER NOT NULL,

    CONSTRAINT "EventZonePrice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Event_sourceUrl_key" ON "Event"("sourceUrl");

-- AddForeignKey
ALTER TABLE "EventSeat" ADD CONSTRAINT "EventSeat_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventZonePrice" ADD CONSTRAINT "EventZonePrice_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
