import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequestUser } from '../common/interfaces/request-user.interface';
import { CreateProjectDto } from './dto/create-project.dto';
import {
  ProjectResponseDto,
  toProjectResponse,
} from './dto/project-response.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectsService } from './projects.service';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  async findAll(): Promise<ProjectResponseDto[]> {
    const projects = await this.projectsService.findAll();

    return projects.map(toProjectResponse);
  }

  @Get(':projectId')
  async findOne(
    @Param('projectId', ParseIntPipe) projectId: number,
  ): Promise<ProjectResponseDto> {
    const project = await this.projectsService.findById(projectId);

    return toProjectResponse(project);
  }

  @Post()
  async create(
    @Body() createProjectDto: CreateProjectDto,
    @CurrentUser() currentUser: RequestUser,
  ): Promise<ProjectResponseDto> {
    const project = await this.projectsService.create(
      createProjectDto,
      currentUser,
    );

    return toProjectResponse(project);
  }

  @Patch(':projectId')
  @HttpCode(200)
  update(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Body() updateProjectDto: UpdateProjectDto,
    @CurrentUser() currentUser: RequestUser,
  ): Promise<void> {
    return this.projectsService.update(projectId, updateProjectDto, currentUser);
  }

  @Delete(':projectId')
  @HttpCode(200)
  remove(
    @Param('projectId', ParseIntPipe) projectId: number,
    @CurrentUser() currentUser: RequestUser,
  ): Promise<void> {
    return this.projectsService.softDelete(projectId, currentUser);
  }
}
