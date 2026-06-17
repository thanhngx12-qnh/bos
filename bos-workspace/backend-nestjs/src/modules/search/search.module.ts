// File: src/modules/search/search.module.ts
import { Module } from '@nestjs/common';
import { SearchService } from './search.service';
import { RecordSearchListener } from './listeners/record-search.listener';

@Module({
  providers: [SearchService, RecordSearchListener],
  exports: [SearchService],
})
export class SearchModule {}
