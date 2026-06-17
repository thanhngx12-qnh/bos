// File: src/modules/tasks/tasks.module.ts
import { Module, Global } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';

@Global() // Để WorkflowsService dễ dàng gọi đến nếu cần
@Module({
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
