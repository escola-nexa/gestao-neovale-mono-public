import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GradeConfigurations } from './entities/grade_configurations.entity';
import { GradeConfigurationsController } from './controllers/grade_configurations.controller';
import { FindGradeConfigurationsService } from './services/find-grade_configurations.service';
import { CreateGradeConfigurationsService } from './services/create-grade_configurations.service';
import { UpdateGradeConfigurationsService } from './services/update-grade_configurations.service';
import { DeleteGradeConfigurationsService } from './services/delete-grade_configurations.service';

@Module({
  imports: [TypeOrmModule.forFeature([GradeConfigurations])],
  controllers: [GradeConfigurationsController],
  providers: [
    FindGradeConfigurationsService,
    CreateGradeConfigurationsService,
    UpdateGradeConfigurationsService,
    DeleteGradeConfigurationsService,
  ],
  exports: [FindGradeConfigurationsService],
})
export class GradeConfigurationsModule {}
