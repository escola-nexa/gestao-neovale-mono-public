import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HrSubjectUcpOverrides } from './entities/hr_subject_ucp_overrides.entity';
import { HrSubjectUcpOverridesController } from './controllers/hr_subject_ucp_overrides.controller';
import { FindHrSubjectUcpOverridesService } from './services/find-hr_subject_ucp_overrides.service';
import { CreateHrSubjectUcpOverridesService } from './services/create-hr_subject_ucp_overrides.service';
import { UpdateHrSubjectUcpOverridesService } from './services/update-hr_subject_ucp_overrides.service';
import { DeleteHrSubjectUcpOverridesService } from './services/delete-hr_subject_ucp_overrides.service';

@Module({
  imports: [TypeOrmModule.forFeature([HrSubjectUcpOverrides])],
  controllers: [HrSubjectUcpOverridesController],
  providers: [
    FindHrSubjectUcpOverridesService,
    CreateHrSubjectUcpOverridesService,
    UpdateHrSubjectUcpOverridesService,
    DeleteHrSubjectUcpOverridesService,
  ],
  exports: [FindHrSubjectUcpOverridesService],
})
export class HrSubjectUcpOverridesModule {}
