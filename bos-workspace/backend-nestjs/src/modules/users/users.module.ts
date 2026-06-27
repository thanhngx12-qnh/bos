import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserSignaturesController } from './user-signatures.controller';
import { UserSignaturesService } from './user-signatures.service';

@Module({
  controllers: [UsersController, UserSignaturesController],
  providers: [UsersService, UserSignaturesService],
  exports: [UsersService, UserSignaturesService],
})
export class UsersModule {}