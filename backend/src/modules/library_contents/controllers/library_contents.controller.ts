import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateLibraryContentsDto } from '../dto/create-library_contents.dto';
import { UpdateLibraryContentsDto } from '../dto/update-library_contents.dto';
import { FindLibraryContentsService } from '../services/find-library_contents.service';
import { CreateLibraryContentsService } from '../services/create-library_contents.service';
import { UpdateLibraryContentsService } from '../services/update-library_contents.service';
import { DeleteLibraryContentsService } from '../services/delete-library_contents.service';

@Controller('library-contents')
@UseGuards(JwtAuthGuard)
export class LibraryContentsController {
  constructor(
    private readonly findService: FindLibraryContentsService,
    private readonly createService: CreateLibraryContentsService,
    private readonly updateService: UpdateLibraryContentsService,
    private readonly deleteService: DeleteLibraryContentsService,
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
  async create(@Body() dto: CreateLibraryContentsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateLibraryContentsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
