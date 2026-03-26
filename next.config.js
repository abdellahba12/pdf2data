/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse', '@prisma/client', 'bcryptjs', 'exceljs'],
  },
}
module.exports = nextConfig
