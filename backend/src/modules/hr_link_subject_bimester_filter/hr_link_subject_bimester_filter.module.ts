import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HrLinkSubjectBimesterFilter } from './entities/hr_link_subject_bimester_filter.entity';
import { HrLinkSubjectBimesterFilterController } from './controllers/hr_link_subject_bimester_filter.controller';
import { FindHrLinkSubjectBimesterFilterService } from './services/find-hr_link_subject_bimester_filter.service';
import { CreateHrLinkSubjectBimesterFilterService } from './services/create-hr_link_subject_bimester_filter.service';
import { UpdateHrLinkSubjectBimesterFilterService } from './services/update-hr_link_subject_bimester_filter.service';
import { DeleteHrLinkSubjectBimesterFilterService } from './services/delete-hr_link_subject_bimester_filter.service';

@Module({
  imports: [TypeOrmModule.forFeature([HrLinkSubjectBimesterFilter])],
  controllers: [HrLinkSubjectBimesterFilterController],
  providers: [
    FindHrLinkSubjectBimesterFilterService,
    CreateHrLinkSubjectBimesterFilterService,
    UpdateHrLinkSubjectBimesterFilterService,
    DeleteHrLinkSubjectBimesterFilterService,
  ],
  exports: [FindHrLinkSubjectBimesterFilterService],
})
export class HrLinkSubjectBimesterFilterModule {}
