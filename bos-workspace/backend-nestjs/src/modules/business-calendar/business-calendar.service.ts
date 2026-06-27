// File: src/modules/business-calendar/business-calendar.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BusinessCalendarService {
  private readonly logger = new Logger(BusinessCalendarService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getOrCreateDefault(tenantId: number) {
    let calendar = await this.prisma.businessCalendar.findFirst({
      where: { tenantId, isDefault: true } as any,
    });

    if (!calendar) {
      const defaultShifts = [
        { dayOfWeek: 1, working: true, hours: [ { start: '08:00', end: '12:00' }, { start: '13:30', end: '17:30' } ] }, // Mon
        { dayOfWeek: 2, working: true, hours: [ { start: '08:00', end: '12:00' }, { start: '13:30', end: '17:30' } ] }, // Tue
        { dayOfWeek: 3, working: true, hours: [ { start: '08:00', end: '12:00' }, { start: '13:30', end: '17:30' } ] }, // Wed
        { dayOfWeek: 4, working: true, hours: [ { start: '08:00', end: '12:00' }, { start: '13:30', end: '17:30' } ] }, // Thu
        { dayOfWeek: 5, working: true, hours: [ { start: '08:00', end: '12:00' }, { start: '13:30', end: '17:30' } ] }, // Fri
        { dayOfWeek: 6, working: false, hours: [] }, // Sat
        { dayOfWeek: 0, working: false, hours: [] }, // Sun
      ];
      
      calendar = await this.prisma.businessCalendar.create({
        data: {
          tenantId,
          name: 'Lịch mặc định',
          isDefault: true,
          shifts: defaultShifts,
          holidays: [],
        } as any,
      });
      this.logger.log(`[Calendar] Da tu dong khoi tao Lich mac dinh cho Tenant ID: ${tenantId}`);
    }

    return calendar;
  }

  async update(tenantId: number, shifts: any[], holidays: string[]) {
    const calendar = await this.getOrCreateDefault(tenantId);
    return this.prisma.businessCalendar.update({
      where: { id: calendar.id } as any,
      data: {
        shifts: shifts || [],
        holidays: holidays || [],
      } as any,
    });
  }

  async calculateDeadline(
    tenantId: number,
    startDate: Date,
    value: number,
    unit: 'HOURS' | 'DAYS',
  ): Promise<Date> {
    const calendar = await this.getOrCreateDefault(tenantId);
    const shifts = (calendar.shifts || []) as any[];
    const holidays = (calendar.holidays || []) as string[];

    const shiftsMap = new Map<number, any>();
    shifts.forEach((s) => {
      shiftsMap.set(s.dayOfWeek, s);
    });

    let remainingMinutes = unit === 'DAYS' ? value * 8 * 60 : value * 60;
    if (remainingMinutes <= 0) remainingMinutes = 24 * 60;

    let current = new Date(startDate);
    let safetyCounter = 0;

    while (remainingMinutes > 0 && safetyCounter < 10000) {
      safetyCounter++;

      const dayOfWeek = current.getDay();
      const dateString = this.toDateString(current);

      const dayConfig = shiftsMap.get(dayOfWeek);
      const isWorkingDay = dayConfig?.working === true;
      const isHoliday = holidays.includes(dateString);

      if (!isWorkingDay || isHoliday) {
        current = new Date(current.getFullYear(), current.getMonth(), current.getDate() + 1, 0, 0, 0, 0);
        continue;
      }

      const dayShifts = (dayConfig.hours || [])
        .map((h: any) => {
          const [startH, startM] = h.start.split(':').map(Number);
          const [endH, endM] = h.end.split(':').map(Number);
          return {
            startMinutes: startH * 60 + startM,
            endMinutes: endH * 60 + endM,
          };
        })
        .sort((a, b) => a.startMinutes - b.startMinutes);

      if (dayShifts.length === 0) {
        current = new Date(current.getFullYear(), current.getMonth(), current.getDate() + 1, 0, 0, 0, 0);
        continue;
      }

      const currentMinutes = current.getHours() * 60 + current.getMinutes();
      let nextAction = false;

      for (const shift of dayShifts) {
        if (currentMinutes < shift.startMinutes) {
          current.setHours(Math.floor(shift.startMinutes / 60), shift.startMinutes % 60, 0, 0);
          nextAction = true;
          break;
        } else if (currentMinutes >= shift.startMinutes && currentMinutes < shift.endMinutes) {
          const minutesLeftInShift = shift.endMinutes - currentMinutes;
          if (remainingMinutes <= minutesLeftInShift) {
            const targetMinutes = currentMinutes + remainingMinutes;
            current.setHours(Math.floor(targetMinutes / 60), targetMinutes % 60, 0, 0);
            remainingMinutes = 0;
            nextAction = true;
            break;
          } else {
            remainingMinutes -= minutesLeftInShift;
            current.setHours(Math.floor(shift.endMinutes / 60), shift.endMinutes % 60, 0, 0);
            nextAction = true;
            break;
          }
        }
      }

      if (nextAction) {
        continue;
      }

      current = new Date(current.getFullYear(), current.getMonth(), current.getDate() + 1, 0, 0, 0, 0);
    }

    return current;
  }

  private toDateString(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
