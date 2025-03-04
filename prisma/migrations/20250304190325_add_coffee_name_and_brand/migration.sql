/*
  Warnings:

  - Added the required column `brand` to the `Coffee` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `Coffee` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Coffee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "preparation" TEXT NOT NULL,
    "shots" INTEGER NOT NULL,
    "flavor" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "Coffee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Coffee" ("createdAt", "description", "flavor", "id", "preparation", "rating", "shots", "updatedAt", "userId", "name", "brand") 
SELECT "createdAt", "description", "flavor", "id", "preparation", "rating", "shots", "updatedAt", "userId", 'Unknown Coffee', 'Unknown Brand' FROM "Coffee";
DROP TABLE "Coffee";
ALTER TABLE "new_Coffee" RENAME TO "Coffee";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
