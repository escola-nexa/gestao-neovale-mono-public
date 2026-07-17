import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateBookletDeliveryItemsDto } from '../dto/create-booklet_delivery_items.dto';
import { UpdateBookletDeliveryItemsDto } from '../dto/update-booklet_delivery_items.dto';
import { FindBookletDeliveryItemsService } from '../services/find-booklet_delivery_items.service';
import { CreateBookletDeliveryItemsService } from '../services/create-booklet_delivery_items.service';
import { UpdateBookletDeliveryItemsService } from '../services/update-booklet_delivery_items.service';
import { DeleteBookletDeliveryItemsService } from '../services/delete-booklet_delivery_items.service';

@Controller('booklet-delivery-items')
@UseGuards(JwtAuthGuard)
export class BookletDeliveryItemsController {
  constructor(
    private readonly findService: FindBookletDeliveryItemsService,
    private readonly createService: CreateBookletDeliveryItemsService,
    private readonly updateService: UpdateBookletDeliveryItemsService,
    private readonly deleteService: DeleteBookletDeliveryItemsService,
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
  async create(@Body() dto: CreateBookletDeliveryItemsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateBookletDeliveryItemsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
