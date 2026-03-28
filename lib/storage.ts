import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { Readable } from 'stream'
import fs from 'fs'
import path from 'path'
import os from 'os'

function getClient() {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    },
  })
}

function getBucket() {
  return process.env.R2_BUCKET_NAME || ''
}

export async function uploadFile(buffer: Buffer, key: string, contentType: string): Promise<void> {
  await getClient().send(new PutObjectCommand({
    Bucket: getBucket(),
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }))
}

export async function downloadFile(key: string): Promise<Buffer> {
  const res = await getClient().send(new GetObjectCommand({ Bucket: getBucket(), Key: key }))
  const stream = res.Body as Readable
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
    stream.on('end', () => resolve(Buffer.concat(chunks)))
    stream.on('error', reject)
  })
}

export async function deleteFile(key: string): Promise<void> {
  await getClient().send(new DeleteObjectCommand({ Bucket: getBucket(), Key: key }))
}

/** Downloads a file from R2 to /tmp and returns the temp path. Caller must clean up. */
export async function downloadToTemp(key: string): Promise<string> {
  const buffer = await downloadFile(key)
  const tmpPath = path.join(os.tmpdir(), `pdf2data-${key}`)
  fs.writeFileSync(tmpPath, buffer)
  return tmpPath
}
