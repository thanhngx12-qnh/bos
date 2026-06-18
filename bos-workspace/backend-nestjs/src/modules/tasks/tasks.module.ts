// File: src/modules/tasks/tasks.module.ts
import { Module, Global } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { TasksScheduler } from './tasks.scheduler'; // <-- IMPORT MỚI

@Global()
@Module({
  controllers: [TasksController],
  providers: [TasksService, TasksScheduler], // <-- KÍCH HOẠT SCHEDULER VÀO ĐÂY
  exports: [TasksService],
})
export class TasksModule {}
