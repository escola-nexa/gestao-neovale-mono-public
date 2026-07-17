import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateLessonMaterialsDto } from '../dto/create-lesson_materials.dto';
import { UpdateLessonMaterialsDto } from '../dto/update-lesson_materials.dto';
import { FindLessonMaterialsService } from '../services/find-lesson_materials.service';
import { CreateLessonMaterialsService } from '../services/create-lesson_materials.service';
import { UpdateLessonMaterialsService } from '../services/update-lesson_materials.service';
import { DeleteLessonMaterialsService } from '../services/delete-lesson_materials.service';

@Controller('lesson-materials')
@UseGuards(JwtAuthGuard)
export class LessonMaterialsController {
  constructor(
    private readonly findService: FindLessonMaterialsService,
    private readonly createService: CreateLessonMaterialsService,
    private readonly updateService: UpdateLessonMaterialsService,
    private readonly deleteService: DeleteLessonMaterialsService,
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
  async create(@Body() dto: CreateLessonMaterialsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateLessonMaterialsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
