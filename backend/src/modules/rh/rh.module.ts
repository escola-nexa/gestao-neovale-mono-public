import { Module } from '@nestjs/common';
import { RhIndicationsController } from './controllers/rh-indications.controller';
import { RhPlansController } from './controllers/rh-plans.controller';
import { RhCandidatesController } from './controllers/rh-candidates.controller';
import { TeacherSubstitutionsController } from './controllers/teacher-substitutions.controller';
import { RhGeneralController } from './controllers/rh-general.controller';
import { RhService } from './services/rh.service';

@Module({
  controllers: [
    RhIndicationsController,
    RhPlansController,
    RhCandidatesController,
    TeacherSubstitutionsController,
    RhGeneralController
  ],
  providers: [RhService],
  exports: [RhService],
})
export class RhModule {}
