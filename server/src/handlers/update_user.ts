import { db } from '../db';
import { usersTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type UpdateUserInput, type User } from '../schema';

export const updateUser = async (input: UpdateUserInput): Promise<User | null> => {
  try {
    // First check if user exists
    const existingUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.id))
      .execute();

    if (existingUser.length === 0) {
      return null;
    }

    // Build update object with only provided fields
    const updateData: any = {};
    
    if (input.name !== undefined) {
      updateData.name = input.name;
    }
    
    if (input.email !== undefined) {
      updateData.email = input.email;
    }
    
    if (input.role !== undefined) {
      updateData.role = input.role;
    }
    
    if (input.password !== undefined) {
      // Hash the password before storing (using Bun's built-in bcrypt-like function)
      updateData.password = await Bun.password.hash(input.password);
    }

    // If no fields to update, return the existing user
    if (Object.keys(updateData).length === 0) {
      return existingUser[0];
    }

    // Update the user
    const result = await db.update(usersTable)
      .set(updateData)
      .where(eq(usersTable.id, input.id))
      .returning()
      .execute();

    return result[0] || null;
  } catch (error) {
    console.error('User update failed:', error);
    throw error;
  }
};