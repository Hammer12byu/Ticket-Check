import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { XMLParser } from 'fast-xml-parser';
import { PrismaClient } from '@prisma/client';

// ✅ Define TypeScript Interfaces for XML Data
interface XmlZone {
  zone_color?: string;
  price?: string;
}

interface XmlSeat {
  seat_no?: string;
  seat_status?: string;
  seat_type?: string;
  ZoneLabel?: string;
  CustomFill?: string;
}

@Injectable()
export class XMLFetcherService {
  private readonly logger = new Logger(XMLFetcherService.name);
  private readonly prisma = new PrismaClient();

  // ✅ Currently fetching only one URL, but future-proofed for multiple events
  private eventSource = {
    name: "Main Event",
    url: "https://my.arttix.org/api/syos/GetSeatList?performanceId=35910&facilityId=487&screenId=1"
  };

  private async fetchAndStoreXML(eventName: string, eventUrl: string): Promise<void> {
    try {
      this.logger.log(`Fetching XML for event: ${eventName}`);

      const response = await fetch(eventUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch XML: ${response.status} ${response.statusText}`);
      }
      const xmlText = await response.text();

      // ✅ Parse XML
      const parser = new XMLParser({ ignoreAttributes: false, removeNSPrefix: true });
      const parsedData: any = parser.parse(xmlText);
      const root = parsedData.TNSyosSeatDetails || parsedData;

      // ✅ Create/Find Event
      const event = await this.prisma.event.upsert({
        where: { sourceUrl: eventUrl },
        update: {},
        create: { name: eventName, sourceUrl: eventUrl },
      });

      // ✅ Extract Zone Prices for This Event
      const zoneColors: XmlZone[] = root.ZoneColorList?.XmlZone
        ? (Array.isArray(root.ZoneColorList.XmlZone) ? root.ZoneColorList.XmlZone : [root.ZoneColorList.XmlZone])
        : [];

      const zonePriceData = zoneColors.map((zone: XmlZone) => ({
        zoneColor: zone.zone_color?.toLowerCase().trim() || '',
        price: parseFloat(zone.price || '0'),
        eventId: event.id,
      }));

      // ✅ Extract Seats & Assign Correct Prices
      const seats: XmlSeat[] = root.seats?.TNSyosSeat
        ? (Array.isArray(root.seats.TNSyosSeat) ? root.seats.TNSyosSeat : [root.seats.TNSyosSeat])
        : [];

      const seatPriceMap: Record<number, number> = {};

      const seatData = seats.map((seat: XmlSeat) => {
        const matchingZone = zonePriceData.find(zone => 
          zone.zoneColor === seat.CustomFill?.toLowerCase().trim()
        );

        const assignedPrice = matchingZone ? matchingZone.price : 0;
        seatPriceMap[assignedPrice] = (seatPriceMap[assignedPrice] || 0) + 1;

        return {
          seatNo: seat?.seat_no?.toString() || '',
          seatStatus: seat?.seat_status?.toString() || '',
          seatType: seat?.seat_type?.toString() || '',
          zoneLabel: seat?.ZoneLabel?.toString() || '',
          price: assignedPrice,
          eventId: event.id,
        };
      });

      // ✅ Store Data in Prisma
      await this.storeData(event.id, zonePriceData, seatData);

      // ✅ Logging Important Stats
      this.logger.log(`Stored ${seatData.length} seats for ${eventName}.`);
      this.logger.log(`Stored ${zonePriceData.length} unique zone colors.`);
      this.logger.log(`Seat Price Breakdown:`);

      Object.entries(seatPriceMap).forEach(([price, count]) => {
        this.logger.log(` - ${count} seats at $${price}`);
      });

    } catch (error) {
      this.logger.error(`Error fetching, parsing, or storing XML for ${eventName}:`, error);
    }
  }

  private async storeData(eventId: number, zonePriceData: any[], seatData: any[]): Promise<void> {
    try {
      await this.prisma.$transaction([
        this.prisma.eventZonePrice.deleteMany({ where: { eventId } }),
        this.prisma.eventSeat.deleteMany({ where: { eventId } }),
      ]);

      if (zonePriceData.length > 0) {
        await this.prisma.eventZonePrice.createMany({ data: zonePriceData });
      }

      if (seatData.length > 0) {
        await this.prisma.eventSeat.createMany({ data: seatData });
      }
    } catch (error) {
      this.logger.error(`Error storing data for event ${eventId}:`, error);
    }
  }

  // ✅ Cron job runs every 12 seconds (expandable to multiple URLs later)
  @Cron('*/12 * * * * *')
  async handleCron() {
    this.logger.log('Executing scheduled XML fetch...');
    await this.fetchAndStoreXML(this.eventSource.name, this.eventSource.url);
  }
}