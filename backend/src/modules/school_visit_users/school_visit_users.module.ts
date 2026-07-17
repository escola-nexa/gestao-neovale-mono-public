import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchoolVisitUsers } from './entities/school_visit_users.entity';
import { SchoolVisitUsersController } from './controllers/school_visit_users.controller';
import { FindSchoolVisitUsersService } from './services/find-school_visit_users.service';
import { CreateSchoolVisitUsersService } from './services/create-school_visit_users.service';
import { UpdateSchoolVisitUsersService } from './services/update-school_visit_users.service';
import { DeleteSchoolVisitUsersService } from './services/delete-school_visit_users.service';

@Module({
  imports: [TypeOrmModule.forFeature([SchoolVisitUsers])],
  controllers: [SchoolVisitUsersController],
  providers: [
    FindSchoolVisitUsersService,
    CreateSchoolVisitUsersService,
    UpdateSchoolVisitUsersService,
    DeleteSchoolVisitUsersService,
  ],
  exports: [FindSchoolVisitUsersService],
})
export class SchoolVisitUsersModule {}
