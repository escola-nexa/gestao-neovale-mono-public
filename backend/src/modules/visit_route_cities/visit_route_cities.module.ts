import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VisitRouteCities } from './entities/visit_route_cities.entity';
import { VisitRouteCitiesController } from './controllers/visit_route_cities.controller';
import { FindVisitRouteCitiesService } from './services/find-visit_route_cities.service';
import { CreateVisitRouteCitiesService } from './services/create-visit_route_cities.service';
import { UpdateVisitRouteCitiesService } from './services/update-visit_route_cities.service';
import { DeleteVisitRouteCitiesService } from './services/delete-visit_route_cities.service';

@Module({
  imports: [TypeOrmModule.forFeature([VisitRouteCities])],
  controllers: [VisitRouteCitiesController],
  providers: [
    FindVisitRouteCitiesService,
    CreateVisitRouteCitiesService,
    UpdateVisitRouteCitiesService,
    DeleteVisitRouteCitiesService,
  ],
  exports: [FindVisitRouteCitiesService],
})
export class VisitRouteCitiesModule {}
