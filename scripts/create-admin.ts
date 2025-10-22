import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🔧 Creating admin user...')

  const email = 'admin@example.com'
  const password = 'admin123'
  const hashedPassword = await bcrypt.hash(password, 10)

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      role: 'ADMIN'
    },
    create: {
      email,
      password: hashedPassword,
      name: 'Admin',
      role: 'ADMIN'
    }
  })

  console.log('✅ Admin user created/updated:')
  console.log('   Email:', email)
  console.log('   Password:', password)
  console.log('   Role:', admin.role)
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

