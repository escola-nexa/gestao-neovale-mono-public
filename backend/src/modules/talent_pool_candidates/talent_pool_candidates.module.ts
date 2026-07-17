import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TalentPoolCandidates } from './entities/talent_pool_candidates.entity';
import { TalentPoolCandidatesController } from './controllers/talent_pool_candidates.controller';
import { FindTalentPoolCandidatesService } from './services/find-talent_pool_candidates.service';
import { CreateTalentPoolCandidatesService } from './services/create-talent_pool_candidates.service';
import { UpdateTalentPoolCandidatesService } from './services/update-talent_pool_candidates.service';
import { DeleteTalentPoolCandidatesService } from './services/delete-talent_pool_candidates.service';

@Module({
  imports: [TypeOrmModule.forFeature([TalentPoolCandidates])],
  controllers: [TalentPoolCandidatesController],
  providers: [
    FindTalentPoolCandidatesService,
    CreateTalentPoolCandidatesService,
    UpdateTalentPoolCandidatesService,
    DeleteTalentPoolCandidatesService,
  ],
  exports: [FindTalentPoolCandidatesService],
})
export class TalentPoolCandidatesModule {}
