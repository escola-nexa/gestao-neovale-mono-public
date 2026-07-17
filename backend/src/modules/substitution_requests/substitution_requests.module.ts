import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubstitutionRequests } from './entities/substitution_requests.entity';
import { SubstitutionRequestsController } from './controllers/substitution_requests.controller';
import { FindSubstitutionRequestsService } from './services/find-substitution_requests.service';
import { CreateSubstitutionRequestsService } from './services/create-substitution_requests.service';
import { UpdateSubstitutionRequestsService } from './services/update-substitution_requests.service';
import { DeleteSubstitutionRequestsService } from './services/delete-substitution_requests.service';

@Module({
  imports: [TypeOrmModule.forFeature([SubstitutionRequests])],
  controllers: [SubstitutionRequestsController],
  providers: [
    FindSubstitutionRequestsService,
    CreateSubstitutionRequestsService,
    UpdateSubstitutionRequestsService,
    DeleteSubstitutionRequestsService,
  ],
  exports: [FindSubstitutionRequestsService],
})
export class SubstitutionRequestsModule {}
