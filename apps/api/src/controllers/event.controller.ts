// event.controller.ts
import { Body, Controller, Post, Get } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient(); 

interface CreateEventDto {
  name: string;
  url: string;
  row: string;       // New
  section: string;   // New, e.g., "left", "center", "right"
  groupSize: number; // New
}

@Controller('events') 
export class EventController {
  @Post('add') 
  async createEvent(@Body() body: CreateEventDto) {
    try {
      const event = await prisma.event.create({
        data: { 
          name: body.name, 
          sourceUrl: body.url,
          row: body.row,         // Save row
          section: body.section, // Save section
          groupSize: body.groupSize // Save group size
        },
      });
      return { message: 'Event created successfully', event };
    } catch (error) {
      console.error('Error creating event:', error);
      return { error: 'Failed to create event' };
    }
  }

  @Get('all') 
  async getEvents() {
    try {
      const events = await prisma.event.findMany();
      return { events };
    } catch (error) {
      console.error('Error fetching events:', error);
      return { error: 'Failed to fetch events' };
    }
  }
}