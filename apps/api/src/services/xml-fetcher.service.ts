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

  /**
   * Fetches XML data for a given event, applies filtering based on row, section, and group size,
   * then stores the filtered seat and zone data.
   *
   * @param eventName - Name of the event.
   * @param eventUrl - URL from which to fetch the XML.
   * @param eventId - The database ID for the event record. (Required)
   * @param eventRow - (Optional) Row filter (e.g., "N" or "A").
   * @param eventSection - (Optional) Section filter ("left", "center", or "right").
   * @param eventGroupSize - (Optional) Minimum group size required.
   */
  private async fetchAndStoreXML(
    eventName: string,
    eventUrl: string,
    eventId: number,
    eventRow?: string,
    eventSection?: string,
    eventGroupSize?: number
  ): Promise<void> {
    try {
      this.logger.log(`Fetching XML for event1: ${eventName} (ID: ${eventId}) from ${eventUrl}`);

      // 15-second timeout guard
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15_000);

      const response = await fetch(eventUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
          Accept: '*/*',
        },
      });
      clearTimeout(timeout);
      this.logger.log(`Reached after fetch`);     // <— should print every cycle
      if (!response.ok) {
        throw new Error(`Failed to fetch XML: ${response.status} ${response.statusText}`);
      }
      this.logger.log(`Fetched data successfully`);

      const xmlText = await response.text();

      // ✅ Parse XML
      const parser = new XMLParser({ ignoreAttributes: false, removeNSPrefix: true });
      const parsedData: any = parser.parse(xmlText);
      const root = parsedData.TNSyosSeatDetails || parsedData;

      this.logger.log(`Parsed Data`);

      // ✅ Extract Zone Prices for This Event
      const zoneColors: XmlZone[] = root.ZoneColorList?.XmlZone
        ? (Array.isArray(root.ZoneColorList.XmlZone)
            ? root.ZoneColorList.XmlZone
            : [root.ZoneColorList.XmlZone])
        : [];

      const zonePriceData = zoneColors.map((zone: XmlZone) => ({
        zoneColor: zone.zone_color?.toLowerCase().trim() || '',
        price: parseFloat(zone.price || '0'),
        eventId: eventId,
      }));

      // ✅ Extract Seats & Assign Correct Prices (this is filtering the data inside each seat)
      const seats: XmlSeat[] = root.seats?.TNSyosSeat
        ? (Array.isArray(root.seats.TNSyosSeat)
            ? root.seats.TNSyosSeat
            : [root.seats.TNSyosSeat])
        : [];
      this.logger.log({seats})

      const seatData = seats.map((seat: XmlSeat) => {
        const matchingZone = zonePriceData.find(zone =>
          zone.zoneColor === seat.CustomFill?.toLowerCase().trim()
        );
        const assignedPrice = matchingZone ? matchingZone.price : 0;
        return {
          seatNo: seat?.seat_no?.toString() || '',
          seatStatus: seat?.seat_status?.toString() || '',
          seatType: seat?.seat_type?.toString() || '',
          zoneLabel: seat?.ZoneLabel?.toString() || '',
          price: assignedPrice,
          eventId: eventId,
        };
      });
      this.logger.log({seatData})

      // ✅ Filtering (filtering the amount of seats): if row and section are provided, only include seats that:
      // - Are in the specified row or in front of it (assuming rows are alphabetically ordered)
      // - Have a matching section (using the zoneLabel property)
      let filteredSeatData = seatData;
      if (eventRow && eventSection) {
        filteredSeatData = seatData.filter((seat) => {
          // to-do: determine if this individual seat is in the row based on the seat mapping array
          // the seat from seat data has a seat_no, and the seatmapping data also has a seat_no
          //write a statement that returns a boolean based on if the seat matches the specified row or not. Boolean says do we return this seat or filter this seat

        });
      }
      this.logger.log({filteredSeatData})

      // ✅ Logging seat price breakdown after filtering
      const seatPriceMap: Record<number, number> = {};
      filteredSeatData.forEach(seat => {
        seatPriceMap[seat.price] = (seatPriceMap[seat.price] || 0) + 1;
      });
      this.logger.log(`After filtering, storing ${filteredSeatData.length} seats for event "${eventName}" (ID: ${eventId}).`);
      Object.entries(seatPriceMap).forEach(([price, count]) => {
        this.logger.log(` - ${count} seats at $${price}`);
      });

      // ✅ Store the filtered data in the database.
      await this.storeData(eventId, zonePriceData, filteredSeatData);
      
    } catch (err: any) {
      this.logger.error(
        `Fetch failed for ${eventName}: ${err?.cause?.code ?? err.message}`
      );
    }
  }

  /**
   * Deletes previous seat and zone data for the event and stores the new filtered data.
   */
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
      this.logger.error(`Error storing data for event ID ${eventId}:`, error);
    }
  }

  /**
   * Cron job that runs every 12 seconds. It retrieves all event records from the database
   * and processes each one—allowing for multiple events (or event groups) even if they share the same URL.
   */
  @Cron('*/12 * * * * *')
  async handleCron() {
    this.logger.log('Executing scheduled XML fetch...');
    // Fetch all events from the database.
    const events = await this.prisma.event.findMany();
    for (const event of events) {
      try{await this.fetchAndStoreXML(
        event.name,
        event.sourceUrl,
        event.id,
        event.row || undefined,
        event.section || undefined,
        event.groupSize || undefined
      );}
      catch(e){console.error(e)}
    }
  }

  //second cron job that evaluates the seats to check if there is a grouping that fits the specifications
}