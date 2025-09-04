import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type User } from '../schema';

export const createUser = async (input: CreateUserInput): Promise<User> => {
  try {
    // Hash the password before storing
    const hashedPassword = await Bun.password.hash(input.password);

    // Insert user record
    const result = await db.insert(usersTable)
      .values({
        name: input.name,
        email: input.email,
        role: input.role,
        password: hashedPassword
      })
      .returning()
      .execute();

    const user = result[0];
    return {
      ...user
    };
  } catch (error) {
    console.error('User creation failed:', error);
    throw error;
  }
};