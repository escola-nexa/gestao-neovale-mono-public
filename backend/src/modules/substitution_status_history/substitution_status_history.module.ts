import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubstitutionStatusHistory } from './entities/substitution_status_history.entity';
import { SubstitutionStatusHistoryController } from './controllers/substitution_status_history.controller';
import { FindSubstitutionStatusHistoryService } from './services/find-substitution_status_history.service';
import { CreateSubstitutionStatusHistoryService } from './services/create-substitution_status_history.service';
import { UpdateSubstitutionStatusHistoryService } from './services/update-substitution_status_history.service';
import { DeleteSubstitutionStatusHistoryService } from './services/delete-substitution_status_history.service';

@Module({
  imports: [TypeOrmModule.forFeature([SubstitutionStatusHistory])],
  controllers: [SubstitutionStatusHistoryController],
  providers: [
    FindSubstitutionStatusHistoryService,
    CreateSubstitutionStatusHistoryService,
    UpdateSubstitutionStatusHistoryService,
    DeleteSubstitutionStatusHistoryService,
  ],
  exports: [FindSubstitutionStatusHistoryService],
})
export class SubstitutionStatusHistoryModule {}
