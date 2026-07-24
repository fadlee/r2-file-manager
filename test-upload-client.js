const assert = require('node:assert/strict');
const test = require('node:test');
const { createXhrUploader } = require('./public/upload-client');

function createFakeXMLHttpRequest() {
  const instances = [];

  class FakeXMLHttpRequest {
    constructor() {
      this.upload = {};
      this.headers = {};
      this.status = 0;
      this.responseText = '';
      instances.push(this);
    }

    open(method, url) {
      this.method = method;
      this.url = url;
    }

    setRequestHeader(name, value) {
      this.headers[name] = value;
    }

    send(body) {
      this.body = body;
    }
  }

  FakeXMLHttpRequest.instances = instances;
  return FakeXMLHttpRequest;
}

test('createXhrUploader reports upload progress percentages from XMLHttpRequest byte events', async () => {
  const FakeXMLHttpRequest = createFakeXMLHttpRequest();
  const upload = createXhrUploader(FakeXMLHttpRequest);
  const progressValues = [];

  const promise = upload('/upload-files', { formData: 'fake-form-data' }, (progress) => {
    progressValues.push(progress);
  });

  const xhr = FakeXMLHttpRequest.instances[0];
  assert.equal(xhr.method, 'POST');
  assert.equal(xhr.url, '/upload-files');
  assert.equal(xhr.body, 'fake-form-data');

  xhr.upload.onprogress({ lengthComputable: true, loaded: 25, total: 100 });
  xhr.upload.onprogress({ lengthComputable: true, loaded: 100, total: 100 });
  xhr.status = 201;
  xhr.responseText = '{"message":"ok"}';
  xhr.onload();

  const result = await promise;

  assert.deepEqual(progressValues, [25, 100]);
  assert.deepEqual(result, { message: 'ok' });
});

test('createXhrUploader rejects with server error message when upload fails', async () => {
  const FakeXMLHttpRequest = createFakeXMLHttpRequest();
  const upload = createXhrUploader(FakeXMLHttpRequest);

  const promise = upload('/upload-files', { formData: 'fake-form-data' });
  const xhr = FakeXMLHttpRequest.instances[0];

  xhr.status = 500;
  xhr.responseText = '{"error":"R2 failed"}';
  xhr.onload();

  await assert.rejects(promise, /R2 failed/);
});
