const assert = require('node:assert/strict');
const test = require('node:test');
const { createMultipartUploader } = require('./public/multipart-upload-client');

function createFakeFile(size, name = 'large.bin', type = 'application/octet-stream') {
  return {
    name,
    size,
    type,
    slice(start, end) {
      return {
        start,
        end,
        size: end - start,
        type,
      };
    },
  };
}

test('multipart uploader slices file into parts, uploads direct URLs, and reports byte progress', async () => {
  const chunkSize = 8 * 1024 * 1024;
  const file = createFakeFile(13 * 1024 * 1024);
  const requests = [];
  const uploadedParts = [];
  const progressValues = [];

  const uploadFile = createMultipartUploader({
    chunkSize,
    requestJson: async (url, body) => {
      requests.push({ url, body });

      if (url === '/multipart-upload/create') {
        return { key: 'uploads/large.bin', uploadId: 'upload-1' };
      }

      if (url === '/multipart-upload/sign-part') {
        return { url: `https://r2.example/part-${body.partNumber}` };
      }

      if (url === '/multipart-upload/complete') {
        return { message: 'complete' };
      }

      throw new Error(`Unexpected request: ${url}`);
    },
    uploadPart: async ({ url, chunk, partNumber }, onPartProgress) => {
      uploadedParts.push({ url, chunk, partNumber });
      onPartProgress(50);
      onPartProgress(100);
      return `etag-${partNumber}`;
    },
  });

  const result = await uploadFile({
    file,
    folder: 'uploads',
    fileName: 'large.bin',
    contentType: file.type,
    onProgress: (progress) => progressValues.push(Math.round(progress)),
  });

  assert.deepEqual(result, { key: 'uploads/large.bin', uploadId: 'upload-1' });
  assert.equal(uploadedParts.length, 2);
  assert.equal(uploadedParts[0].chunk.size, 8 * 1024 * 1024);
  assert.equal(uploadedParts[1].chunk.size, 5 * 1024 * 1024);
  assert.deepEqual(
    uploadedParts.map((part) => part.url),
    ['https://r2.example/part-1', 'https://r2.example/part-2']
  );
  assert.deepEqual(
    requests.find((request) => request.url === '/multipart-upload/complete').body.parts,
    [
      { PartNumber: 1, ETag: 'etag-1' },
      { PartNumber: 2, ETag: 'etag-2' },
    ]
  );
  assert.deepEqual(progressValues, [31, 62, 81, 100]);
});

test('multipart uploader aborts the multipart upload when a part upload fails', async () => {
  const file = createFakeFile(9 * 1024 * 1024);
  const abortRequests = [];

  const uploadFile = createMultipartUploader({
    chunkSize: 8 * 1024 * 1024,
    requestJson: async (url, body) => {
      if (url === '/multipart-upload/create') {
        return { key: 'uploads/large.bin', uploadId: 'upload-1' };
      }
      if (url === '/multipart-upload/sign-part') {
        return { url: `https://r2.example/part-${body.partNumber}` };
      }
      if (url === '/multipart-upload/abort') {
        abortRequests.push(body);
        return { message: 'aborted' };
      }
      throw new Error(`Unexpected request: ${url}`);
    },
    uploadPart: async () => {
      throw new Error('network failed');
    },
  });

  await assert.rejects(
    uploadFile({ file, folder: 'uploads', fileName: 'large.bin', contentType: file.type }),
    /network failed/
  );

  assert.deepEqual(abortRequests, [{ key: 'uploads/large.bin', uploadId: 'upload-1' }]);
});
