# Direct R2 Multipart Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace large-file uploads with direct browser-to-Cloudflare-R2 multipart uploads with accurate byte-level progress.

**Architecture:** Express creates/signs/completes/aborts S3 multipart uploads but never receives file bytes. The browser slices each file into 8 MiB parts, uploads each part directly to a presigned R2 UploadPart URL via XHR, collects ETags, and asks Express to complete the upload.

**Tech Stack:** Node.js, Express, AWS SDK v3 S3 multipart commands, browser XMLHttpRequest, Cloudflare R2 CORS with exposed ETag.

---

## File Structure

- `index.js`: add AWS SDK multipart command imports and JSON API endpoints `/multipart-upload/create`, `/multipart-upload/sign-part`, `/multipart-upload/complete`, `/multipart-upload/abort`.
- `public/multipart-upload-client.js`: standalone UMD browser/CommonJS helper for chunk slicing, direct XHR PUT part upload, progress aggregation, complete/abort behavior.
- `templates/index.html`: load multipart helper and replace batch `/upload-files` calls with direct multipart uploads per file while keeping folder path logic.
- `test-multipart-upload-client.js`: Node tests with fake request signer and fake part uploader for chunking/progress/abort behavior.
- `package.json`: existing `npm test` already runs `test-*.js`.

## Tasks

### Task 1: Browser multipart client

**Files:**
- Create: `public/multipart-upload-client.js`
- Create: `test-multipart-upload-client.js`

- [ ] Write tests for slicing a 13 MiB file into 8 MiB + 5 MiB parts and reporting progress.
- [ ] Verify tests fail because `public/multipart-upload-client.js` does not exist or does not export expected functions.
- [ ] Implement `createMultipartUploader({ requestJson, uploadPart, chunkSize })` and default browser instance.
- [ ] Verify tests pass with `node --test test-multipart-upload-client.js`.

### Task 2: Server multipart API

**Files:**
- Modify: `index.js`

- [ ] Import `CreateMultipartUploadCommand`, `UploadPartCommand`, `CompleteMultipartUploadCommand`, `AbortMultipartUploadCommand`.
- [ ] Add `buildObjectKey(folder, fileName)` helper that avoids double slashes and defaults empty folder to `uploads` only when needed.
- [ ] Add `POST /multipart-upload/create` returning `{ uploadId, key }`.
- [ ] Add `POST /multipart-upload/sign-part` returning `{ url }` for `UploadPartCommand`.
- [ ] Add `POST /multipart-upload/complete` returning success after `CompleteMultipartUploadCommand`.
- [ ] Add `POST /multipart-upload/abort` returning 204/200 after abort.
- [ ] Run `node --check index.js`.

### Task 3: Wire UI

**Files:**
- Modify: `templates/index.html`

- [ ] Load `/multipart-upload-client.js` after existing upload client script.
- [ ] Replace `uploadBatch` use inside `uploadFiles()` with per-file `uploadDirectMultipartFile(file, targetFolder, fileName, onProgress)`.
- [ ] Keep progress aggregation by bytes across all selected files.
- [ ] Update labels to show current file and uploaded count.
- [ ] Run inline script syntax check.

### Task 4: Verification

**Files:**
- All changed files

- [ ] Run `npm test`.
- [ ] Run `node --check index.js public/upload-client.js public/multipart-upload-client.js`.
- [ ] Run inline HTML script syntax check.
- [ ] Review `git diff` and report changed files.
