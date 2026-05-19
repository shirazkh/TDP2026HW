import { UserRole } from '../../common/enums/user-role.enum';
import { User } from '../user.entity';

export interface UserResponseDto {
  id: number;
  username: string;
  email: string;
  fullName: string;
  role: UserRole;
}

export const toUserResponse = (user: User): UserResponseDto => ({
  id: user.id,
  username: user.username,
  email: user.email,
  fullName: user.fullName,
  role: user.role,
});
