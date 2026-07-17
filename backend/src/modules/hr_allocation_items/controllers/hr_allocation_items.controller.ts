import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateHrAllocationItemsDto } from '../dto/create-hr_allocation_items.dto';
import { UpdateHrAllocationItemsDto } from '../dto/update-hr_allocation_items.dto';
import { FindHrAllocationItemsService } from '../services/find-hr_allocation_items.service';
import { CreateHrAllocationItemsService } from '../services/create-hr_allocation_items.service';
import { UpdateHrAllocationItemsService } from '../services/update-hr_allocation_items.service';
import { DeleteHrAllocationItemsService } from '../services/delete-hr_allocation_items.service';

@Controller('hr-allocation-items')
@UseGuards(JwtAuthGuard)
export class HrAllocationItemsController {
  constructor(
    private readonly findService: FindHrAllocationItemsService,
    private readonly createService: CreateHrAllocationItemsService,
    private readonly updateService: UpdateHrAllocationItemsService,
    private readonly deleteService: DeleteHrAllocationItemsService,
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
  async create(@Body() dto: CreateHrAllocationItemsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateHrAllocationItemsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
