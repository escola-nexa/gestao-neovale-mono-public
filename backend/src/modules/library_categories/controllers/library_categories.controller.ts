import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateLibraryCategoriesDto } from '../dto/create-library_categories.dto';
import { UpdateLibraryCategoriesDto } from '../dto/update-library_categories.dto';
import { FindLibraryCategoriesService } from '../services/find-library_categories.service';
import { CreateLibraryCategoriesService } from '../services/create-library_categories.service';
import { UpdateLibraryCategoriesService } from '../services/update-library_categories.service';
import { DeleteLibraryCategoriesService } from '../services/delete-library_categories.service';

@Controller('library-categories')
@UseGuards(JwtAuthGuard)
export class LibraryCategoriesController {
  constructor(
    private readonly findService: FindLibraryCategoriesService,
    private readonly createService: CreateLibraryCategoriesService,
    private readonly updateService: UpdateLibraryCategoriesService,
    private readonly deleteService: DeleteLibraryCategoriesService,
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
  async create(@Body() dto: CreateLibraryCategoriesDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateLibraryCategoriesDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
