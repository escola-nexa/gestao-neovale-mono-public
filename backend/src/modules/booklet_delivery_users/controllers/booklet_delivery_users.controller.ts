import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateBookletDeliveryUsersDto } from '../dto/create-booklet_delivery_users.dto';
import { UpdateBookletDeliveryUsersDto } from '../dto/update-booklet_delivery_users.dto';
import { FindBookletDeliveryUsersService } from '../services/find-booklet_delivery_users.service';
import { CreateBookletDeliveryUsersService } from '../services/create-booklet_delivery_users.service';
import { UpdateBookletDeliveryUsersService } from '../services/update-booklet_delivery_users.service';
import { DeleteBookletDeliveryUsersService } from '../services/delete-booklet_delivery_users.service';

@Controller('booklet-delivery-users')
@UseGuards(JwtAuthGuard)
export class BookletDeliveryUsersController {
  constructor(
    private readonly findService: FindBookletDeliveryUsersService,
    private readonly createService: CreateBookletDeliveryUsersService,
    private readonly updateService: UpdateBookletDeliveryUsersService,
    private readonly deleteService: DeleteBookletDeliveryUsersService,
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
  async create(@Body() dto: CreateBookletDeliveryUsersDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateBookletDeliveryUsersDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
