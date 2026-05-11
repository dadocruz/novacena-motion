import * as Minio from 'minio';

export type MinioBucketKey = 'covers' | 'assets' | 'renders' | 'sourceVideos';

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`Variável de ambiente ausente: ${name}`);
  }
  return value.trim();
}

function parseEndpoint(raw: string) {
  const normalized = raw.startsWith('http://') || raw.startsWith('https://') ? raw : `https://${raw}`;
  const url = new URL(normalized);

  return {
    endPoint: url.hostname,
    port: url.port ? Number(url.port) : undefined,
    useSSL: url.protocol === 'https:',
    publicBaseUrl: normalized.replace(/\/$/, ''),
  };
}

export function getMinioConfig() {
  const endpoint = requiredEnv('MINIO_ENDPOINT');
  const parsed = parseEndpoint(endpoint);

  return {
    ...parsed,
    region: process.env.MINIO_REGION?.trim() || 'eu-south',
    accessKey: requiredEnv('MINIO_ACCESS_KEY'),
    secretKey: requiredEnv('MINIO_SECRET_KEY'),
    buckets: {
      covers: requiredEnv('MINIO_BUCKET_COVERS'),
      assets: requiredEnv('MINIO_BUCKET_ASSETS'),
      renders: requiredEnv('MINIO_BUCKET_RENDERS'),
      sourceVideos: requiredEnv('MINIO_BUCKET_SOURCE_VIDEOS'),
    },
  };
}

export function getMinioClient() {
  const config = getMinioConfig();

  return new Minio.Client({
    endPoint: config.endPoint,
    port: config.port,
    useSSL: config.useSSL,
    accessKey: config.accessKey,
    secretKey: config.secretKey,
    region: config.region,
  });
}

export function getBucketName(bucket: MinioBucketKey): string {
  return getMinioConfig().buckets[bucket];
}

export function buildPublicObjectUrl(bucket: string, objectName: string): string {
  const { publicBaseUrl } = getMinioConfig();
  return `${publicBaseUrl}/${bucket}/${objectName}`;
}

export async function uploadBufferToMinio(options: {
  bucket: MinioBucketKey;
  objectName: string;
  buffer: Buffer;
  contentType?: string;
}) {
  const client = getMinioClient();
  const bucketName = getBucketName(options.bucket);

  const exists = await client.bucketExists(bucketName);
  if (!exists) {
    throw new Error(`Bucket não encontrado no MinIO: ${bucketName}`);
  }

  await client.putObject(
    bucketName,
    options.objectName,
    options.buffer,
    options.buffer.length,
    {
      'Content-Type': options.contentType || 'application/octet-stream',
    }
  );

  return {
    bucket: bucketName,
    objectName: options.objectName,
    url: buildPublicObjectUrl(bucketName, options.objectName),
  };
}
