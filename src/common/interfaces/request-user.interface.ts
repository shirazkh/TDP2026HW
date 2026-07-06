import { UserRole } from '../enums/user-role.enum';

export interface RequestUser {
  id: number;
  username: string;
  email: string;
  fullName: string;
  role: UserRole;
}
