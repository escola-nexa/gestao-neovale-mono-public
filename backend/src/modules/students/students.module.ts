import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Students } from './entities/students.entity';
import { StudentsController } from './controllers/students.controller';
import { FindStudentsService } from './services/find-students.service';
import { CreateStudentsService } from './services/create-students.service';
import { UpdateStudentsService } from './services/update-students.service';
import { DeleteStudentsService } from './services/delete-students.service';
import { StudentsExtendedService } from './services/extended-students.service';

@Module({
  imports: [TypeOrmModule.forFeature([Students])],
  controllers: [StudentsController],
  providers: [
    FindStudentsService,
    CreateStudentsService,
    UpdateStudentsService,
    DeleteStudentsService,
    StudentsExtendedService,
  ],
  exports: [FindStudentsService, StudentsExtendedService],
})
export class StudentsModule {}
