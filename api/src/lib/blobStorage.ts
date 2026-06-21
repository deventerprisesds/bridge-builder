import {
  BlobServiceClient,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
  BlobSASPermissions
} from '@azure/storage-blob'

const conn = process.env.AZURE_STORAGE_CONNECTION_STRING!
const CONTAINER = 'bridge-apks'

export function getBlobClient() {
  return BlobServiceClient.fromConnectionString(conn)
}

export async function ensureContainer() {
  const client = getBlobClient().getContainerClient(CONTAINER)
  await client.createIfNotExists({ access: 'blob' })
}

export async function uploadApk(blobPath: string, data: Buffer): Promise<void> {
  const client = getBlobClient()
    .getContainerClient(CONTAINER)
    .getBlockBlobClient(blobPath)
  await client.upload(data, data.length, {
    blobHTTPHeaders: {
      blobContentType: 'application/vnd.android.package-archive'
    }
  })
}

export function generateSasUrl(blobPath: string): string {
  try {
    const accountName = conn.match(/AccountName=([^;]+)/)?.[1] ?? ''
    const accountKey  = conn.match(/AccountKey=([^;]+)/)?.[1] ?? ''
    const sharedKey   = new StorageSharedKeyCredential(accountName, accountKey)

    const expiry = new Date()
    expiry.setDate(expiry.getDate() + 30)

    const sas = generateBlobSASQueryParameters(
      {
        containerName: CONTAINER,
        blobName: blobPath,
        permissions: BlobSASPermissions.parse('r'),
        expiresOn: expiry
      },
      sharedKey
    ).toString()

    return `https://${accountName}.blob.core.windows.net/${CONTAINER}/${blobPath}?${sas}`
  } catch (e) {
    console.error('[generateSasUrl] Failed to generate SAS URL for', blobPath, e)
    return ''
  }
}
