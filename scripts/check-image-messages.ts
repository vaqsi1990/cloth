import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const msgs = await prisma.$queryRaw<
    Array<{
      id: number
      chatRoomId: number
      content: string
      imageUrl: string | null
      isFromAdmin: boolean
    }>
  >`
    SELECT id, "chatRoomId", content, "imageUrl", "isFromAdmin"
    FROM "ChatMessage"
    WHERE "imageUrl" IS NOT NULL
    ORDER BY "createdAt" DESC
    LIMIT 20
  `
  console.log(JSON.stringify(msgs, null, 2))
  await prisma.$disconnect()
}

void main()
