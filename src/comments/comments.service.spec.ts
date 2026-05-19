import { ConflictException } from '@nestjs/common';
import { UserRole } from '../common/enums/user-role.enum';
import { RequestUser } from '../common/interfaces/request-user.interface';
import { Comment } from './comment.entity';
import { CommentsService } from './comments.service';

describe('CommentsService', () => {
  const actor: RequestUser = {
    id: 99,
    username: 'admin',
    email: 'admin@example.com',
    fullName: 'Admin User',
    role: UserRole.ADMIN,
  };

  const createComment = (overrides: Partial<Comment> = {}): Comment =>
    ({
      id: 1,
      ticketId: 10,
      authorId: 2,
      content: 'Initial comment',
      version: 5,
      ...overrides,
    }) as Comment;

  const createService = (comment: Comment) => {
    const commentsRepository = {
      findOne: jest.fn().mockResolvedValue(comment),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    const service = new CommentsService(
      commentsRepository as any,
      { findById: jest.fn().mockResolvedValue({ id: 10 }) } as any,
      { findById: jest.fn().mockResolvedValue({ id: 2 }) } as any,
      { record: jest.fn().mockResolvedValue({}) } as any,
    );

    return { service, commentsRepository };
  };

  it('rejects stale comment update versions with a conflict', async () => {
    const { service } = createService(createComment({ version: 6 }));

    await expect(
      service.update(
        10,
        1,
        { version: 5, content: 'Updated comment' },
        actor,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('updates by id, ticket id, and version for optimistic locking', async () => {
    const { service, commentsRepository } = createService(createComment());

    await service.update(
      10,
      1,
      { version: 5, content: 'Updated comment' },
      actor,
    );

    expect(commentsRepository.update).toHaveBeenCalledWith(
      { id: 1, ticketId: 10, version: 5 },
      { content: 'Updated comment' },
    );
  });
});
