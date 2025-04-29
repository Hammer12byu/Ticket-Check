-- CreateTable
CREATE TABLE "SeatMapping" (
    "seat_no" INTEGER NOT NULL,
    "row" TEXT NOT NULL,
    "adjacent_seats" INTEGER[],

    CONSTRAINT "SeatMapping_pkey" PRIMARY KEY ("seat_no")
);

-- CreateIndex
CREATE UNIQUE INDEX "SeatMapping_seat_no_key" ON "SeatMapping"("seat_no");
