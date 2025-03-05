-- CreateTable
CREATE TABLE "ZoneColor" (
    "id" SERIAL NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "zoneColor" TEXT NOT NULL,

    CONSTRAINT "ZoneColor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyosSeat" (
    "seatNo" TEXT NOT NULL,
    "seatStatus" TEXT NOT NULL,
    "seatType" TEXT NOT NULL,
    "customFill" TEXT NOT NULL,
    "zoneLabel" TEXT NOT NULL,

    CONSTRAINT "SyosSeat_pkey" PRIMARY KEY ("seatNo")
);

-- CreateIndex
CREATE UNIQUE INDEX "ZoneColor_zoneColor_key" ON "ZoneColor"("zoneColor");
