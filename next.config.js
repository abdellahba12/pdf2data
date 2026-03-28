/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse', '@prisma/client', 'bcryptjs', 'exceljs', '@aws-sdk/client-s3'],
  },
}
module.exports = nextConfig
