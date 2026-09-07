export interface UserEntity {
    id: string;
    email: string;
    password_hash: string;
    full_name: string;
    created_at: string;
    updated_at: string;
}
export declare class UserRepository {
    static findById(id: string): Promise<UserEntity | null>;
    static findByEmail(email: string): Promise<UserEntity | null>;
    static create(data: {
        email: string;
        password_hash: string;
        full_name: string;
    }): Promise<UserEntity>;
}
