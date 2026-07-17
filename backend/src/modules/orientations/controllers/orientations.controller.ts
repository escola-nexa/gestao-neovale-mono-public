import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateOrientationsDto } from '../dto/create-orientations.dto';
import { UpdateOrientationsDto } from '../dto/update-orientations.dto';
import { FindOrientationsService } from '../services/find-orientations.service';
import { CreateOrientationsService } from '../services/create-orientations.service';
import { UpdateOrientationsService } from '../services/update-orientations.service';
import { DeleteOrientationsService } from '../services/delete-orientations.service';

@Controller('orientations')
@UseGuards(JwtAuthGuard)
export class OrientationsController {
  constructor(
    private readonly findService: FindOrientationsService,
    private readonly createService: CreateOrientationsService,
    private readonly updateService: UpdateOrientationsService,
    private readonly deleteService: DeleteOrientationsService,
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
  async create(@Body() dto: CreateOrientationsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateOrientationsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
