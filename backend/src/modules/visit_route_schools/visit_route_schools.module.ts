import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VisitRouteSchools } from './entities/visit_route_schools.entity';
import { VisitRouteSchoolsController } from './controllers/visit_route_schools.controller';
import { FindVisitRouteSchoolsService } from './services/find-visit_route_schools.service';
import { CreateVisitRouteSchoolsService } from './services/create-visit_route_schools.service';
import { UpdateVisitRouteSchoolsService } from './services/update-visit_route_schools.service';
import { DeleteVisitRouteSchoolsService } from './services/delete-visit_route_schools.service';

@Module({
  imports: [TypeOrmModule.forFeature([VisitRouteSchools])],
  controllers: [VisitRouteSchoolsController],
  providers: [
    FindVisitRouteSchoolsService,
    CreateVisitRouteSchoolsService,
    UpdateVisitRouteSchoolsService,
    DeleteVisitRouteSchoolsService,
  ],
  exports: [FindVisitRouteSchoolsService],
})
export class VisitRouteSchoolsModule {}
