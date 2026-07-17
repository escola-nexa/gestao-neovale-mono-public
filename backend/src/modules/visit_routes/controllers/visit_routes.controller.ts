import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateVisitRoutesDto } from '../dto/create-visit_routes.dto';
import { UpdateVisitRoutesDto } from '../dto/update-visit_routes.dto';
import { FindVisitRoutesService } from '../services/find-visit_routes.service';
import { CreateVisitRoutesService } from '../services/create-visit_routes.service';
import { UpdateVisitRoutesService } from '../services/update-visit_routes.service';
import { DeleteVisitRoutesService } from '../services/delete-visit_routes.service';

@Controller('visit-routes')
@UseGuards(JwtAuthGuard)
export class VisitRoutesController {
  constructor(
    private readonly findService: FindVisitRoutesService,
    private readonly createService: CreateVisitRoutesService,
    private readonly updateService: UpdateVisitRoutesService,
    private readonly deleteService: DeleteVisitRoutesService,
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
  async create(@Body() dto: CreateVisitRoutesDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateVisitRoutesDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
