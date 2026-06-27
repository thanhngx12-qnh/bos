import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserSignaturesController } from './user-signatures.controller';
import { UserSignaturesService } from './user-signatures.service';
import { UserDelegationsController } from './user-delegations.controller';
import { UserDelegationsService } from './user-delegations.service';

@Module({
  controllers: [UsersController, UserSignaturesController, UserDelegationsController],
  providers: [UsersService, UserSignaturesService, UserDelegationsService],
  exports: [UsersService, UserSignaturesService, UserDelegationsService],
})
export class UsersModule {}