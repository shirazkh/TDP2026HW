import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { Project } from './project.entity';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectsRepository: Repository<Project>,
    private readonly usersService: UsersService,
  ) {}

  findAll(): Promise<Project[]> {
    return this.projectsRepository.find({
      order: { id: 'ASC' },
    });
  }

  async findById(id: number): Promise<Project> {
    const project = await this.projectsRepository.findOne({ where: { id } });

    if (!project) {
      throw new NotFoundException(`Project ${id} was not found`);
    }

    return project;
  }

  async create(input: CreateProjectDto): Promise<Project> {
    await this.usersService.findById(input.ownerId);

    const project = this.projectsRepository.create(input);

    return this.projectsRepository.save(project);
  }

  async update(id: number, input: UpdateProjectDto): Promise<void> {
    const project = await this.findById(id);

    if (input.name !== undefined) {
      project.name = input.name;
    }

    if (input.description !== undefined) {
      project.description = input.description;
    }

    await this.projectsRepository.save(project);
  }

  async softDelete(id: number): Promise<void> {
    const result = await this.projectsRepository.softDelete(id);

    if (!result.affected) {
      throw new NotFoundException(`Project ${id} was not found`);
    }
  }
}
