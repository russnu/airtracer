export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string | null;
  isVerified: boolean;
  isActive: boolean;
  lastLoginAt: Date | null;
  passwordChangedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;

  roles: {
    role: {
      id: string;
      name: string;
      description: string | null;
    };
  }[];
}
