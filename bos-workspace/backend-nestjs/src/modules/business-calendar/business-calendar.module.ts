// File: src/modules/business-calendar/business-calendar.module.ts
import { Module } from '@nestjs/common';
import { BusinessCalendarService } from './business-calendar.service';
import { BusinessCalendarController } from './business-calendar.controller';

@Module({
  controllers: [BusinessCalendarController],
  providers: [BusinessCalendarService],
  exports: [BusinessCalendarService],
})
export class BusinessCalendarModule {}
