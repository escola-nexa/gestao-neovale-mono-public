import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Enrollments } from './entities/enrollments.entity';
import { EnrollmentsController } from './controllers/enrollments.controller';
import { FindEnrollmentsService } from './services/find-enrollments.service';
import { CreateEnrollmentsService } from './services/create-enrollments.service';
import { UpdateEnrollmentsService } from './services/update-enrollments.service';
import { DeleteEnrollmentsService } from './services/delete-enrollments.service';

@Module({
  imports: [TypeOrmModule.forFeature([Enrollments])],
  controllers: [EnrollmentsController],
  providers: [
    FindEnrollmentsService,
    CreateEnrollmentsService,
    UpdateEnrollmentsService,
    DeleteEnrollmentsService,
  ],
  exports: [FindEnrollmentsService],
})
export class EnrollmentsModule {}
