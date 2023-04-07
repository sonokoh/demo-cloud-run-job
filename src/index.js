const { Storage } = require("@google-cloud/storage");
/**
 * entry function.
 * @param {unknown[]} items
 */
async function main(args) {
  const taskIndex = process.env.CLOUD_RUN_TASK_INDEX || 0;

  const arg = args[taskIndex];
  if (!arg) {
    throw new Error(`No arg found for task ${taskIndex}. Ensure at least ${parseInt(taskIndex, 10) + 1} arg(s) have been specified as command args.`);
  }

  const bucketName = process.env.BUCKET_NAME;
  if (!bucketName) {
    throw new Error('No bucket name specified. Set the BUCKET_NAME env var to specify which Cloud Storage bucket the screenshot will be uploaded to.');
  }

  const storage = new Storage();
  const bucket = await createStorageBucketIfMissing(storage, bucketName);
  await uploadFile(bucket, taskIndex, Buffer.from(`Passed arg: ${arg}`, 'utf8'));
}

async function createStorageBucketIfMissing(storage, bucketName) {
  console.log(`Checking for Cloud Storage bucket '${bucketName}' and creating if not found`);
  const bucket = storage.bucket(bucketName);
  const [exists] = await bucket.exists();
  if (exists) {
    // Bucket exists, nothing to do here
    return bucket;
  }

  // Create bucket
  const [createdBucket] = await storage.createBucket(bucketName);
  console.log(`Created Cloud Storage bucket '${createdBucket.name}'`);
  return createdBucket;
}

async function uploadFile(bucket, taskIndex, buffer) {
  // Create filename using the current time and task index
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  const filename = `${date.toISOString()}-task${taskIndex}.json`;

  console.log(`Uploading file as '${filename}'`)
  await bucket.file(filename).save(buffer);
}

const args = process.argv.slice(2)

console.log('Starting job...')
// Start script
main(args).catch(err => {
  console.error(err);
  process.exit(1); // Retry Job Task by exiting the process
});