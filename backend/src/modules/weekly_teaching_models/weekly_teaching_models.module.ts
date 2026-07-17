import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WeeklyTeachingModels } from './entities/weekly_teaching_models.entity';
import { WeeklyTeachingModelsController } from './controllers/weekly_teaching_models.controller';
import { FindWeeklyTeachingModelsService } from './services/find-weekly_teaching_models.service';
import { CreateWeeklyTeachingModelsService } from './services/create-weekly_teaching_models.service';
import { UpdateWeeklyTeachingModelsService } from './services/update-weekly_teaching_models.service';
import { DeleteWeeklyTeachingModelsService } from './services/delete-weekly_teaching_models.service';

@Module({
  imports: [TypeOrmModule.forFeature([WeeklyTeachingModels])],
  controllers: [WeeklyTeachingModelsController],
  providers: [
    FindWeeklyTeachingModelsService,
    CreateWeeklyTeachingModelsService,
    UpdateWeeklyTeachingModelsService,
    DeleteWeeklyTeachingModelsService,
  ],
  exports: [FindWeeklyTeachingModelsService],
})
export class WeeklyTeachingModelsModule {}
