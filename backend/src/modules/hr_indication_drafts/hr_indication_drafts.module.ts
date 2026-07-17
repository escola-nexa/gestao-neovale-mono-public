import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HrIndicationDrafts } from './entities/hr_indication_drafts.entity';
import { HrIndicationDraftsController } from './controllers/hr_indication_drafts.controller';
import { FindHrIndicationDraftsService } from './services/find-hr_indication_drafts.service';
import { CreateHrIndicationDraftsService } from './services/create-hr_indication_drafts.service';
import { UpdateHrIndicationDraftsService } from './services/update-hr_indication_drafts.service';
import { DeleteHrIndicationDraftsService } from './services/delete-hr_indication_drafts.service';

@Module({
  imports: [TypeOrmModule.forFeature([HrIndicationDrafts])],
  controllers: [HrIndicationDraftsController],
  providers: [
    FindHrIndicationDraftsService,
    CreateHrIndicationDraftsService,
    UpdateHrIndicationDraftsService,
    DeleteHrIndicationDraftsService,
  ],
  exports: [FindHrIndicationDraftsService],
})
export class HrIndicationDraftsModule {}
