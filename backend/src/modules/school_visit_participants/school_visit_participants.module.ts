import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchoolVisitParticipants } from './entities/school_visit_participants.entity';
import { SchoolVisitParticipantsController } from './controllers/school_visit_participants.controller';
import { FindSchoolVisitParticipantsService } from './services/find-school_visit_participants.service';
import { CreateSchoolVisitParticipantsService } from './services/create-school_visit_participants.service';
import { UpdateSchoolVisitParticipantsService } from './services/update-school_visit_participants.service';
import { DeleteSchoolVisitParticipantsService } from './services/delete-school_visit_participants.service';

@Module({
  imports: [TypeOrmModule.forFeature([SchoolVisitParticipants])],
  controllers: [SchoolVisitParticipantsController],
  providers: [
    FindSchoolVisitParticipantsService,
    CreateSchoolVisitParticipantsService,
    UpdateSchoolVisitParticipantsService,
    DeleteSchoolVisitParticipantsService,
  ],
  exports: [FindSchoolVisitParticipantsService],
})
export class SchoolVisitParticipantsModule {}
