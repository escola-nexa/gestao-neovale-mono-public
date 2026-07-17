import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateStatesDto } from '../dto/create-states.dto';
import { UpdateStatesDto } from '../dto/update-states.dto';
import { FindStatesService } from '../services/find-states.service';
import { CreateStatesService } from '../services/create-states.service';
import { UpdateStatesService } from '../services/update-states.service';
import { DeleteStatesService } from '../services/delete-states.service';

@Controller('states')
@UseGuards(JwtAuthGuard)
export class StatesController {
  constructor(
    private readonly findService: FindStatesService,
    private readonly createService: CreateStatesService,
    private readonly updateService: UpdateStatesService,
    private readonly deleteService: DeleteStatesService,
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
  async create(@Body() dto: CreateStatesDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateStatesDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
