import type { Password, User } from "@prisma/client";
import bcrypt from "bcryptjs";

import { prisma } from "~/db.server";

export type { User } from "@prisma/client";

export async function getUserById(id: User["id"]) {
  return prisma.user.findUnique({ where: { id } });
}

export async function getUserByEmail(email: User["email"]) {
  return prisma.user.findUnique({ where: { email } });
}

export async function createUser(email: User["email"], password: string) {
  const hashedPassword = await bcrypt.hash(password, 10);

  return prisma.user.create({
    data: {
      email,
      password: {
        create: {
          hash: hashedPassword,
        },
      },
    },
  });
}

export async function deleteUserByEmail(email: User["email"]) {
  return prisma.user.delete({ where: { email } });
}

export async function verifyLogin(
  email: User["email"],
  password: Password["hash"],
) {
  const userWithPassword = await prisma.user.findUnique({
    where: { email },
    include: {
      password: true,
    },
  });

  if (!userWithPassword || !userWithPassword.password) {
    return null;
  }

  const isValid = await bcrypt.compare(
    password,
    userWithPassword.password.hash,
  );

  if (!isValid) {
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password: _password, ...userWithoutPassword } = userWithPassword;

  return userWithoutPassword;
}

/**
 * Creates a password reset token for a user that expires in 5 minutes
 */
export async function createPasswordResetToken(email: User["email"]) {
  const user = await getUserByEmail(email);
  if (!user) return null;

  // Delete any existing reset tokens for this user
  await prisma.passwordReset.deleteMany({
    where: { userId: user.id },
  });

  // Create a new reset token that expires in 5 minutes
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 5);

  const passwordReset = await prisma.passwordReset.create({
    data: {
      expiresAt,
      userId: user.id,
    },
  });

  return { user, passwordReset };
}

/**
 * Verifies a password reset token is valid and not expired
 */
export async function verifyPasswordResetToken(token: string) {
  const passwordReset = await prisma.passwordReset.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!passwordReset) return null;
  
  // Check if token has expired
  const now = new Date();
  if (now > passwordReset.expiresAt) {
    // Delete expired token
    await prisma.passwordReset.delete({
      where: { token },
    });
    return null;
  }

  return passwordReset;
}

/**
 * Resets a user's password using a valid token
 */
export async function resetPassword(token: string, newPassword: string) {
  const passwordReset = await verifyPasswordResetToken(token);
  if (!passwordReset) return null;

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // Update the user's password
  await prisma.password.update({
    where: { userId: passwordReset.userId },
    data: { hash: hashedPassword },
  });

  // Delete the reset token
  await prisma.passwordReset.delete({
    where: { token },
  });

  return passwordReset.user;
}
