import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { XMLParser } from 'fast-xml-parser';
import { PrismaClient } from '@prisma/client';


interface XmlZone {
  zone_color?: string;
  price?: string;
}

interface XmlSeat {
  seat_no?: number;
  seat_status?: number;
  seat_type?: number;
  ZoneLabel?: string;
  CustomFill?: string;
}



@Injectable()
export class XMLFetcherService {
  private readonly logger = new Logger(XMLFetcherService.name);
  private readonly prisma = new PrismaClient();

  private isRowInFrontOrEqual(seatRow: string, targetRow: string): boolean {
    const rowOrder = ['AAA', 'BBB', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N'];
    
    const normalize = (r: string) => r.trim().toUpperCase();
  
    const seatIndex = rowOrder.indexOf(normalize(seatRow));
    const targetIndex = rowOrder.indexOf(normalize(targetRow));
  
    if (seatIndex === -1 || targetIndex === -1) return false; // If row not in list, fail
  
    return seatIndex <= targetIndex;
  }

  private async fetchAndStoreXML(
    eventName: string,
    eventUrl: string,
    eventId: number,
    eventRow?: string,
    eventSection?: string,
    eventGroupSize?: number,
    expectedPrice?: number
  ): Promise<void> {
    /* ───────────────────────── timeout guard ───────────────────────── */
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);

    try {
      this.logger.log(`Fetching XML for ${eventName} (ID: ${eventId})`);
      if (expectedPrice === undefined) {
        this.logger.error(`❌ Missing expectedPrice for event ${eventId} — all seats will fail price validation`);
      }

      const response = await fetch(eventUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
          Accept: '*/*',
        },
      });
      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      const xmlText = await response.text();

      /* ───────────────────────── parse XML ───────────────────────── */
      const parser = new XMLParser({ ignoreAttributes: false, removeNSPrefix: true });
      const parsedData: any = parser.parse(xmlText);
      const root = parsedData.TNSyosSeatDetails || parsedData;

      /* ─────────────── build zone-price lookup ─────────────── */
      const zoneColors: XmlZone[] = root.ZoneColorList?.XmlZone
        ? Array.isArray(root.ZoneColorList.XmlZone)
          ? root.ZoneColorList.XmlZone
          : [root.ZoneColorList.XmlZone]
        : [];

      const zonePriceData = zoneColors.map((z) => ({
        zoneColor: z.zone_color?.toLowerCase().trim() || '',
        price: parseFloat(z.price || '0'),
        eventId,
      }));

      /* ─────────────── extract seats ─────────────── */
      const seats: XmlSeat[] = root.seats?.TNSyosSeat
        ? Array.isArray(root.seats.TNSyosSeat)
          ? root.seats.TNSyosSeat
          : [root.seats.TNSyosSeat]
        : [];
     
      const seatData = seats.map((seat) => {
        const match = zonePriceData.find(
          (z) => z.zoneColor === seat.CustomFill?.toLowerCase().trim()
        );
        return {
          isvalid: false, //the isvalid column starts out as false
          seatNo: seat.seat_no ? Number(seat.seat_no) : 0,
          seatStatus: seat.seat_status?.toString() || '',
          seatType: seat.seat_type?.toString() || '',
          zoneLabel: seat.ZoneLabel?.toString() || '',
          price: match ? match.price : 0,
          eventId,
          groupChecked: false
        };
      });

      // troubleshooting: logging the amount of parsed seats
      this.logger.debug(`Raw seats parsed: ${seatData.length}`);

      
      // Set Valid Groups to 0
      let validGroupCount = 0;

      // done: select the entire array of SeatMapping, once it is in code I can do lookups like .find or .filter
      const SeatMapping = await this.prisma.seatMapping.findMany();
      
      if (eventRow && eventSection) {
        seatData.forEach((seat)=>{
          //early exit in all invalid cases, not changing boolean to false, just exiting if any of these trigger
          // data validation:
                // 1. Validate seatStatus
            const mapping = SeatMapping.find((m) => m.seat_no === seat.seatNo);

          if (!['0'].includes(seat.seatStatus)) {
            this.logger.debug(`Seat ${seat.seatNo} rejected: invalid seatStatus ${seat.seatStatus}`);
            return;
          }
        
          if (seat.seatType !== '1') {
            this.logger.debug(`Seat ${seat.seatNo} rejected: invalid seatType ${seat.seatType}`);
            return;
          }
        
          if (seat.price !== expectedPrice) {
            this.logger.debug(`Seat ${seat.seatNo} rejected: price mismatch (found ${seat.price}, expected ${expectedPrice})`);
            return;
          }
        
          if (
            eventSection &&
            mapping?.section?.toLowerCase().trim() !== eventSection.toLowerCase().trim()
          ) {
            this.logger.debug(`Seat ${seat.seatNo} rejected: section mismatch (found ${mapping?.section}, expected ${eventSection})`);
            return;
          }
        
          if (!mapping || !mapping.row) {
            this.logger.debug(`Seat ${seat.seatNo} rejected: no seat mapping or row`);
            return;
          }
        
          if (!this.isRowInFrontOrEqual(mapping.row, eventRow)) {
            this.logger.debug(`Seat ${seat.seatNo} rejected: row ${mapping.row} is behind target ${eventRow}`);
            return;
          }
        
        

          // if it hasn't exited yet, set to true
              seat.isvalid = true;
          // at this point, this is all seats that fit all parameters except the consecutive seating parameter
          
        });
      }

      // troubleshooting: logging the amount of seats that passed individual validation
      const validBeforeGroup = seatData.filter(s => s.isvalid).length;
      this.logger.debug(`Seats valid before group filtering: ${validBeforeGroup}`);

      // determine how many consecutive seats are in each seat group, if a seat group doesn't have enough seats to fit the criteria, set all isvalid values to false
      // one group at a time, create a group by creating a separate array
      // when you detect the first valid seat in a group, create a new array, use the adjacent seats table to find seats its next to and check if those seats next to it are valid as well, if they are, add them to the group, then keep following that same logic for each adjacent seat until you run into all invalid seats
      // once we have an array of valid consecutive seats, check the number of seats against the specified parameter
      // if the group is big enough, leave them all true
      // if there are too few seats, set all of those seats to false

      if (eventGroupSize && eventGroupSize > 1) {
        // Add helper flag to track processed seats
        seatData.forEach((s) => (s.groupChecked = false));
      
        for (const seat of seatData) {
          if (!seat.isvalid || seat.groupChecked) continue;

          validGroupCount++;

          const group = [seat];
          seat.groupChecked = true;
      
          const queue = [seat];
          while (queue.length > 0) {
            const current = queue.shift();
            if (!current) continue;
      
            const mapping = SeatMapping.find((m) => m.seat_no === current.seatNo);
            if (!mapping || !mapping.adjacent_seats) continue;
      
            const adjacentSeatNos = mapping.adjacent_seats; // assume this is an array of numbers
      
            for (const adjacentNo of adjacentSeatNos) {
              const adjacentSeat = seatData.find(
                (s) =>
                  s.seatNo === adjacentNo &&
                  s.isvalid &&
                  !s.groupChecked
              );
              if (adjacentSeat) {
                adjacentSeat.groupChecked = true;
                group.push(adjacentSeat);
                queue.push(adjacentSeat);
              }
            }
          }
      
          // After group built, check size
          if (group.length < eventGroupSize) {
            group.forEach((s) => (s.isvalid = false));
          }
        }
      }
      // troubleshooting: log amount of seats still valid after grouping
      const validAfterGroup = seatData.filter(s => s.isvalid).length;
      this.logger.debug(`Seats valid after group filtering: ${validAfterGroup}`);

      /* ─────────────── store to DB ─────────────── */
      await this.storeData(eventId, zonePriceData, seatData);

      /* ---------- COUNT VALID GROUPS FOR SUMMARY ---------- */
      if (!eventGroupSize || eventGroupSize <= 1) {
        // No grouping requirement ⇒ every valid seat counts as its own group
        validGroupCount = seatData.filter(s => s.isvalid).length;
      }
      // troubleshooting:
      this.logger.debug(`Counted ${validGroupCount} valid groups (no grouping logic)`);

      // else branch is already handled inside the contiguous-group loop
      // (it bumps validGroupCount++ once per qualifying group)

      // Log how many valid groups there are
      const summaryMessage =
              validGroupCount === 0
              ? 'This ticket grouping is no longer available'
              : `This ticket grouping is still available\n# of groups: ${validGroupCount}`;

      this.logger.log(summaryMessage);

      /* ─────────────── summary log only ─────────────── */
      this.logger.log(`Event ID ${eventId}: ${seatData.length} seats stored`);
    } catch (err: any) {
      clearTimeout(timeout);
      this.logger.error(
        `Fetch failed for ${eventName}: ${err?.cause?.code ?? err.message}`
      );
    }
  }



  private async storeData(
    eventId: number,
    zonePriceData: any[],
    seatData: any[]
  ) {
    await this.prisma.$transaction([
      this.prisma.eventZonePrice.deleteMany({ where: { eventId } }),
      this.prisma.eventSeat.deleteMany({ where: { eventId } }),
    ]);
    if (zonePriceData.length)
      await this.prisma.eventZonePrice.createMany({ data: zonePriceData });
    if (seatData.length)
      await this.prisma.eventSeat.createMany({ data: seatData });
  }



  @Cron('*/12 * * * * *')
  async handleCron() {
    this.logger.log('Executing scheduled XML fetch…');
    const events = await this.prisma.event.findMany();
    for (const e of events) {
      await this.fetchAndStoreXML(
        e.name,
        e.sourceUrl,
        e.id,
        e.row || undefined,
        e.section || undefined,
        e.groupSize || undefined,
        e.expectedPrice || undefined
      );
    }
  }
}