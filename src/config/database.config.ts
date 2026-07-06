import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { AuditLog } from '../audit-logs/audit-log.entity';
import { RevokedToken } from '../auth/entities/revoked-token.entity';
import { Comment } from '../comments/comment.entity';
import { Project } from '../projects/project.entity';
import { TicketDependency } from '../tickets/ticket-dependency.entity';
import { Ticket } from '../tickets/ticket.entity';
import { User } from '../users/user.entity';

const parseBoolean = (value: string | undefined, defaultValue: boolean) => {
  if (value === undefined) {
    return defaultValue;
  }

  return value.toLowerCase() === 'true';
};

const parseNumber = (value: string | undefined, defaultValue: number) => {
  if (value === undefined) {
    return defaultValue;
  }

  const parsed = Number(value);

  return Number.isNaN(parsed) ? defaultValue : parsed;
};

export const getDatabaseConfig = (): TypeOrmModuleOptions => {
  const commonOptions = {
    entities: [
      AuditLog,
      Comment,
      Project,
      RevokedToken,
      Ticket,
      TicketDependency,
      User,
    ],
    synchronize: parseBoolean(process.env.TYPEORM_SYNCHRONIZE, true),
    logging: parseBoolean(process.env.TYPEORM_LOGGING, false),
  };

  if (process.env.DATABASE_URL) {
    return {
      type: 'postgres',
      url: process.env.DATABASE_URL,
      ...commonOptions,
    };
  }

  return {
    type: 'postgres',
    host: process.env.DB_HOST ?? 'localhost',
    port: parseNumber(process.env.DB_PORT, 5432),
    username: process.env.DB_USERNAME ?? 'issueflow',
    password: process.env.DB_PASSWORD ?? 'issueflow',
    database: process.env.DB_NAME ?? 'issueflow',
    ...commonOptions,
  };
};
