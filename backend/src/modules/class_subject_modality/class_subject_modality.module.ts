import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClassSubjectModality } from './entities/class_subject_modality.entity';
import { ClassSubjectModalityController } from './controllers/class_subject_modality.controller';
import { FindClassSubjectModalityService } from './services/find-class_subject_modality.service';
import { CreateClassSubjectModalityService } from './services/create-class_subject_modality.service';
import { UpdateClassSubjectModalityService } from './services/update-class_subject_modality.service';
import { DeleteClassSubjectModalityService } from './services/delete-class_subject_modality.service';

@Module({
  imports: [TypeOrmModule.forFeature([ClassSubjectModality])],
  controllers: [ClassSubjectModalityController],
  providers: [
    FindClassSubjectModalityService,
    CreateClassSubjectModalityService,
    UpdateClassSubjectModalityService,
    DeleteClassSubjectModalityService,
  ],
  exports: [FindClassSubjectModalityService],
})
export class ClassSubjectModalityModule {}
