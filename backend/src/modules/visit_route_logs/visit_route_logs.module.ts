import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VisitRouteLogs } from './entities/visit_route_logs.entity';
import { VisitRouteLogsController } from './controllers/visit_route_logs.controller';
import { FindVisitRouteLogsService } from './services/find-visit_route_logs.service';
import { CreateVisitRouteLogsService } from './services/create-visit_route_logs.service';
import { UpdateVisitRouteLogsService } from './services/update-visit_route_logs.service';
import { DeleteVisitRouteLogsService } from './services/delete-visit_route_logs.service';

@Module({
  imports: [TypeOrmModule.forFeature([VisitRouteLogs])],
  controllers: [VisitRouteLogsController],
  providers: [
    FindVisitRouteLogsService,
    CreateVisitRouteLogsService,
    UpdateVisitRouteLogsService,
    DeleteVisitRouteLogsService,
  ],
  exports: [FindVisitRouteLogsService],
})
export class VisitRouteLogsModule {}
