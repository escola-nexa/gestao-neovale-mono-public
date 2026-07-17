import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateVisitRouteSchoolsDto } from '../dto/create-visit_route_schools.dto';
import { UpdateVisitRouteSchoolsDto } from '../dto/update-visit_route_schools.dto';
import { FindVisitRouteSchoolsService } from '../services/find-visit_route_schools.service';
import { CreateVisitRouteSchoolsService } from '../services/create-visit_route_schools.service';
import { UpdateVisitRouteSchoolsService } from '../services/update-visit_route_schools.service';
import { DeleteVisitRouteSchoolsService } from '../services/delete-visit_route_schools.service';

@Controller('visit-route-schools')
@UseGuards(JwtAuthGuard)
export class VisitRouteSchoolsController {
  constructor(
    private readonly findService: FindVisitRouteSchoolsService,
    private readonly createService: CreateVisitRouteSchoolsService,
    private readonly updateService: UpdateVisitRouteSchoolsService,
    private readonly deleteService: DeleteVisitRouteSchoolsService,
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
  async create(@Body() dto: CreateVisitRouteSchoolsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateVisitRouteSchoolsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
