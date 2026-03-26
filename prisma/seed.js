const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  const email = process.env.SEED_EMAIL || 'admin@pdf2data.com'
  const password = process.env.SEED_PASSWORD || 'changeme123'

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    console.log(`User ${email} already exists`)
    return
  }

  const hashed = await bcrypt.hash(password, 12)
  const trialEnds = new Date()
  trialEnds.setDate(trialEnds.getDate() + 5)

  const user = await prisma.user.create({
    data: { email, password: hashed, plan: 'trial', trialEndsAt: trialEnds },
  })

  console.log(`Created user: ${user.email} (trial until ${trialEnds.toISOString()})`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
