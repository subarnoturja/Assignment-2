export type UserRole = 'contributor' | 'maintainer';

export interface IUser {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    created_at?: Date;
    updated_at?: Date;
}