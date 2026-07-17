import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateVisitRouteCitiesDto } from '../dto/create-visit_route_cities.dto';
import { UpdateVisitRouteCitiesDto } from '../dto/update-visit_route_cities.dto';
import { FindVisitRouteCitiesService } from '../services/find-visit_route_cities.service';
import { CreateVisitRouteCitiesService } from '../services/create-visit_route_cities.service';
import { UpdateVisitRouteCitiesService } from '../services/update-visit_route_cities.service';
import { DeleteVisitRouteCitiesService } from '../services/delete-visit_route_cities.service';

@Controller('visit-route-cities')
@UseGuards(JwtAuthGuard)
export class VisitRouteCitiesController {
  constructor(
    private readonly findService: FindVisitRouteCitiesService,
    private readonly createService: CreateVisitRouteCitiesService,
    private readonly updateService: UpdateVisitRouteCitiesService,
    private readonly deleteService: DeleteVisitRouteCitiesService,
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
  async create(@Body() dto: CreateVisitRouteCitiesDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateVisitRouteCitiesDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
