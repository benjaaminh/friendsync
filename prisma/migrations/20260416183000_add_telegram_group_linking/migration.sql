ALTER TABLE "Group" ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'UTC';
ALTER TABLE "Group" ADD COLUMN "telegramChatId" TEXT;
ALTER TABLE "Group" ADD COLUMN "telegramChatTitle" TEXT;
ALTER TABLE "Group" ADD COLUMN "telegramLinkCode" TEXT;
ALTER TABLE "Group" ADD COLUMN "telegramLinkCodeExpiresAt" TIMESTAMP(3);
ALTER TABLE "Group" ADD COLUMN "telegramLinkedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "Group_telegramChatId_key" ON "Group"("telegramChatId");
CREATE UNIQUE INDEX "Group_telegramLinkCode_key" ON "Group"("telegramLinkCode");
