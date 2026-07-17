import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateVisitRouteLogsDto } from '../dto/create-visit_route_logs.dto';
import { UpdateVisitRouteLogsDto } from '../dto/update-visit_route_logs.dto';
import { FindVisitRouteLogsService } from '../services/find-visit_route_logs.service';
import { CreateVisitRouteLogsService } from '../services/create-visit_route_logs.service';
import { UpdateVisitRouteLogsService } from '../services/update-visit_route_logs.service';
import { DeleteVisitRouteLogsService } from '../services/delete-visit_route_logs.service';

@Controller('visit-route-logs')
@UseGuards(JwtAuthGuard)
export class VisitRouteLogsController {
  constructor(
    private readonly findService: FindVisitRouteLogsService,
    private readonly createService: CreateVisitRouteLogsService,
    private readonly updateService: UpdateVisitRouteLogsService,
    private readonly deleteService: DeleteVisitRouteLogsService,
  ) {}

  @Get()
  async findAll(@CurrentUser() user: any) {
    return this.findService.findAll(user.organizationId || user.id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.findService.findOne(id, user.organizationId || user.id);
  }

  @Post()
  async create(@Body() dto: CreateVisitRouteLogsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateVisitRouteLogsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
