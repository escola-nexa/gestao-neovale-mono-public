import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HrHiringCandidates } from './entities/hr_hiring_candidates.entity';
import { HrHiringCandidatesController } from './controllers/hr_hiring_candidates.controller';
import { FindHrHiringCandidatesService } from './services/find-hr_hiring_candidates.service';
import { CreateHrHiringCandidatesService } from './services/create-hr_hiring_candidates.service';
import { UpdateHrHiringCandidatesService } from './services/update-hr_hiring_candidates.service';
import { DeleteHrHiringCandidatesService } from './services/delete-hr_hiring_candidates.service';

@Module({
  imports: [TypeOrmModule.forFeature([HrHiringCandidates])],
  controllers: [HrHiringCandidatesController],
  providers: [
    FindHrHiringCandidatesService,
    CreateHrHiringCandidatesService,
    UpdateHrHiringCandidatesService,
    DeleteHrHiringCandidatesService,
  ],
  exports: [FindHrHiringCandidatesService],
})
export class HrHiringCandidatesModule {}
