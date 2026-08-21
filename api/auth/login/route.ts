// Example backend logic using Prisma / Mongoose / SQL
import { db } from '@/lib/db'; // Adjust to your database client
import bcrypt from 'bcrypt';

export async function authenticateUser(identifier: string, passwordPlain: string) {
  // Determine if the input contains '@' to optimize query or use a combined OR clause
  const user = await db.user.findFirst({
    where: {
      OR: [
        { username: identifier },
        { email: identifier },
      ],
    },
  });

  if (!user) {
    throw new Error('Invalid username/email or password.');
  }

  const isPasswordValid = await bcrypt.compare(passwordPlain, user.passwordHash);
  if (!isPasswordValid) {
    throw new Error('Invalid username/email or password.');
  }

  return user;
}
