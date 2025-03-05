import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule'; // Import ScheduleModule
import { HealthController } from './controllers/health.controller';
import { AuthController } from './controllers/auth.controller';
import { EventController } from './controllers/event.controller';
import { AuthService } from './services/auth.service';
import { XMLFetcherService } from './services/xml-fetcher.service';
import { LoggerMiddleware } from './logger.middleware';

@Module({
  imports: [ScheduleModule.forRoot()], // Enable NestJS scheduling
  controllers: [HealthController, AuthController, EventController],
  providers: [AuthService, XMLFetcherService], // Register the cron job service
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}