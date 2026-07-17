import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateCitiesDto } from '../dto/create-cities.dto';
import { UpdateCitiesDto } from '../dto/update-cities.dto';
import { FindCitiesService } from '../services/find-cities.service';
import { CreateCitiesService } from '../services/create-cities.service';
import { UpdateCitiesService } from '../services/update-cities.service';
import { DeleteCitiesService } from '../services/delete-cities.service';

@Controller('cities')
@UseGuards(JwtAuthGuard)
export class CitiesController {
  constructor(
    private readonly findService: FindCitiesService,
    private readonly createService: CreateCitiesService,
    private readonly updateService: UpdateCitiesService,
    private readonly deleteService: DeleteCitiesService,
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
  async create(@Body() dto: CreateCitiesDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateCitiesDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
