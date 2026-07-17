import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HrIndicationClasses } from './entities/hr_indication_classes.entity';
import { HrIndicationClassesController } from './controllers/hr_indication_classes.controller';
import { FindHrIndicationClassesService } from './services/find-hr_indication_classes.service';
import { CreateHrIndicationClassesService } from './services/create-hr_indication_classes.service';
import { UpdateHrIndicationClassesService } from './services/update-hr_indication_classes.service';
import { DeleteHrIndicationClassesService } from './services/delete-hr_indication_classes.service';

@Module({
  imports: [TypeOrmModule.forFeature([HrIndicationClasses])],
  controllers: [HrIndicationClassesController],
  providers: [
    FindHrIndicationClassesService,
    CreateHrIndicationClassesService,
    UpdateHrIndicationClassesService,
    DeleteHrIndicationClassesService,
  ],
  exports: [FindHrIndicationClassesService],
})
export class HrIndicationClassesModule {}
