//Adding this controller for Events
import { Body, Controller, Post, Get } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient(); 

@Controller('events') 
export class EventController {
  @Post('add') 
  async createEvent(@Body() body: { name: string; url: string }) {
    try {
      const event = await prisma.event.create({
        data: { name: body.name, url: body.url },
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