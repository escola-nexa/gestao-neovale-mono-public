import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateBookletDeliveriesDto } from '../dto/create-booklet_deliveries.dto';
import { UpdateBookletDeliveriesDto } from '../dto/update-booklet_deliveries.dto';
import { FindBookletDeliveriesService } from '../services/find-booklet_deliveries.service';
import { CreateBookletDeliveriesService } from '../services/create-booklet_deliveries.service';
import { UpdateBookletDeliveriesService } from '../services/update-booklet_deliveries.service';
import { DeleteBookletDeliveriesService } from '../services/delete-booklet_deliveries.service';

@Controller('booklet-deliveries')
@UseGuards(JwtAuthGuard)
export class BookletDeliveriesController {
  constructor(
    private readonly findService: FindBookletDeliveriesService,
    private readonly createService: CreateBookletDeliveriesService,
    private readonly updateService: UpdateBookletDeliveriesService,
    private readonly deleteService: DeleteBookletDeliveriesService,
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
  async create(@Body() dto: CreateBookletDeliveriesDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateBookletDeliveriesDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
