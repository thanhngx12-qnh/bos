// File: src/modules/search/search.module.ts
import { Module } from '@nestjs/common';
import { SearchService } from './search.service';
import { RecordSearchListener } from './listeners/record-search.listener';
import { SearchController } from './search.controller';

@Module({
  controllers: [SearchController],
  providers: [SearchService, RecordSearchListener],
  exports: [SearchService],
})
export class SearchModule {}
