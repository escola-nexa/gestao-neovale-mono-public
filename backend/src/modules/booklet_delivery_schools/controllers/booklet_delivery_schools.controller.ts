import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateBookletDeliverySchoolsDto } from '../dto/create-booklet_delivery_schools.dto';
import { UpdateBookletDeliverySchoolsDto } from '../dto/update-booklet_delivery_schools.dto';
import { FindBookletDeliverySchoolsService } from '../services/find-booklet_delivery_schools.service';
import { CreateBookletDeliverySchoolsService } from '../services/create-booklet_delivery_schools.service';
import { UpdateBookletDeliverySchoolsService } from '../services/update-booklet_delivery_schools.service';
import { DeleteBookletDeliverySchoolsService } from '../services/delete-booklet_delivery_schools.service';

@Controller('booklet-delivery-schools')
@UseGuards(JwtAuthGuard)
export class BookletDeliverySchoolsController {
  constructor(
    private readonly findService: FindBookletDeliverySchoolsService,
    private readonly createService: CreateBookletDeliverySchoolsService,
    private readonly updateService: UpdateBookletDeliverySchoolsService,
    private readonly deleteService: DeleteBookletDeliverySchoolsService,
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
  async create(@Body() dto: CreateBookletDeliverySchoolsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateBookletDeliverySchoolsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
