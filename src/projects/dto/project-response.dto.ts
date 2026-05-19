import { Project } from '../project.entity';

export interface ProjectResponseDto {
  id: number;
  name: string;
  description: string;
  ownerId: number;
}

export const toProjectResponse = (project: Project): ProjectResponseDto => ({
  id: project.id,
  name: project.name,
  description: project.description,
  ownerId: project.ownerId,
});
