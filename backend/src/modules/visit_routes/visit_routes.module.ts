import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VisitRoutes } from './entities/visit_routes.entity';
import { VisitRoutesController } from './controllers/visit_routes.controller';
import { FindVisitRoutesService } from './services/find-visit_routes.service';
import { CreateVisitRoutesService } from './services/create-visit_routes.service';
import { UpdateVisitRoutesService } from './services/update-visit_routes.service';
import { DeleteVisitRoutesService } from './services/delete-visit_routes.service';

@Module({
  imports: [TypeOrmModule.forFeature([VisitRoutes])],
  controllers: [VisitRoutesController],
  providers: [
    FindVisitRoutesService,
    CreateVisitRoutesService,
    UpdateVisitRoutesService,
    DeleteVisitRoutesService,
  ],
  exports: [FindVisitRoutesService],
})
export class VisitRoutesModule {}
