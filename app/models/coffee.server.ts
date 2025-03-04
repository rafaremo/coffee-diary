import type { User, Coffee } from "@prisma/client";

import { prisma } from "~/db.server";

export type { Coffee } from "@prisma/client";

export function getCoffee({
  id,
  userId,
}: Pick<Coffee, "id"> & {
  userId: User["id"];
}) {
  return prisma.coffee.findFirst({
    where: { id, userId },
  });
}

export function getCoffeeListItems({ userId }: { userId: User["id"] }) {
  return prisma.coffee.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

export function createCoffee({
  name,
  brand,
  preparation,
  shots,
  flavor,
  rating,
  description,
  userId,
}: Pick<Coffee, "name" | "brand" | "preparation" | "shots" | "flavor" | "rating" | "description"> & {
  userId: User["id"];
}) {
  return prisma.coffee.create({
    data: {
      name,
      brand,
      preparation,
      shots,
      flavor,
      rating,
      description,
      user: {
        connect: {
          id: userId,
        },
      },
    },
  });
}

export function deleteCoffee({
  id,
  userId,
}: Pick<Coffee, "id"> & { userId: User["id"] }) {
  return prisma.coffee.deleteMany({
    where: { id, userId },
  });
}

export function updateCoffee({
  id,
  name,
  brand,
  preparation,
  shots,
  flavor,
  rating,
  description,
  userId,
}: Pick<Coffee, "id" | "name" | "brand" | "preparation" | "shots" | "flavor" | "rating" | "description"> & {
  userId: User["id"];
}) {
  return prisma.coffee.update({
    where: { id, userId },
    data: {
      name,
      brand,
      preparation,
      shots,
      flavor,
      rating,
      description,
    },
  });
}

export function getUniqueCoffees({ userId }: { userId: User["id"] }) {
  return prisma.coffee.findMany({
    where: { userId },
    distinct: ['name', 'brand'],
    select: {
      name: true,
      brand: true,
    },
    orderBy: [
      { name: 'asc' },
      { brand: 'asc' },
    ],
  });
} 