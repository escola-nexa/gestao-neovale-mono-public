import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateLibraryFoldersDto } from '../dto/create-library_folders.dto';
import { UpdateLibraryFoldersDto } from '../dto/update-library_folders.dto';
import { FindLibraryFoldersService } from '../services/find-library_folders.service';
import { CreateLibraryFoldersService } from '../services/create-library_folders.service';
import { UpdateLibraryFoldersService } from '../services/update-library_folders.service';
import { DeleteLibraryFoldersService } from '../services/delete-library_folders.service';

@Controller('library-folders')
@UseGuards(JwtAuthGuard)
export class LibraryFoldersController {
  constructor(
    private readonly findService: FindLibraryFoldersService,
    private readonly createService: CreateLibraryFoldersService,
    private readonly updateService: UpdateLibraryFoldersService,
    private readonly deleteService: DeleteLibraryFoldersService,
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
  async create(@Body() dto: CreateLibraryFoldersDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateLibraryFoldersDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
