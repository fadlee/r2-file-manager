(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.R2MultipartUploadClient = factory();
    }
})(typeof self !== 'undefined' ? self : this, function () {
    const DEFAULT_CHUNK_SIZE = 8 * 1024 * 1024;

    async function defaultRequestJson(url, body) {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(result.error || result.message || `Request failed with status ${response.status}`);
        }

        return result;
    }

    function defaultUploadPart({ url, chunk, contentType }, onPartProgress) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('PUT', url);

            if (contentType) {
                xhr.setRequestHeader('Content-Type', contentType);
            }

            xhr.upload.onprogress = (event) => {
                if (!event.lengthComputable || typeof onPartProgress !== 'function') {
                    return;
                }

                const progress = event.total === 0 ? 0 : (event.loaded / event.total) * 100;
                onPartProgress(Math.min(100, Math.max(0, progress)));
            };

            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    const etag = xhr.getResponseHeader('ETag');
                    if (!etag) {
                        reject(new Error('R2 did not expose an ETag header. Check the bucket CORS ExposeHeaders setting.'));
                        return;
                    }
                    resolve(etag);
                    return;
                }

                reject(new Error(`Part upload failed with status ${xhr.status}`));
            };

            xhr.onerror = () => reject(new Error('Network error while uploading part'));
            xhr.onabort = () => reject(new Error('Part upload was cancelled'));
            xhr.ontimeout = () => reject(new Error('Part upload timed out'));
            xhr.send(chunk);
        });
    }

    function createMultipartUploader(options = {}) {
        const chunkSize = options.chunkSize || DEFAULT_CHUNK_SIZE;
        const requestJson = options.requestJson || defaultRequestJson;
        const uploadPart = options.uploadPart || defaultUploadPart;

        return async function uploadMultipartFile({ file, folder, fileName, contentType, onProgress }) {
            const createResult = await requestJson('/multipart-upload/create', {
                folder,
                fileName,
                contentType
            });

            const { key, uploadId } = createResult;
            const totalParts = Math.max(1, Math.ceil(file.size / chunkSize));
            const completedPartBytes = new Map();
            const completedParts = [];
            let lastReportedProgress = -1;

            const reportOverallProgress = (partNumber, partProgress, partSize) => {
                completedPartBytes.set(partNumber, (partProgress / 100) * partSize);
                const uploadedBytes = Array.from(completedPartBytes.values()).reduce((sum, bytes) => sum + bytes, 0);
                const progress = file.size === 0 ? 100 : (uploadedBytes / file.size) * 100;
                const normalizedProgress = Math.min(100, Math.max(0, progress));

                if (typeof onProgress === 'function' && normalizedProgress !== lastReportedProgress) {
                    lastReportedProgress = normalizedProgress;
                    onProgress(normalizedProgress);
                }
            };

            try {
                for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
                    const start = (partNumber - 1) * chunkSize;
                    const end = Math.min(start + chunkSize, file.size);
                    const chunk = file.slice(start, end);

                    const signResult = await requestJson('/multipart-upload/sign-part', {
                        key,
                        uploadId,
                        partNumber,
                        contentLength: chunk.size,
                        contentType
                    });

                    const etag = await uploadPart({
                        url: signResult.url,
                        chunk,
                        partNumber,
                        contentType
                    }, (partProgress) => reportOverallProgress(partNumber, partProgress, chunk.size));

                    completedParts.push({ PartNumber: partNumber, ETag: etag });
                    reportOverallProgress(partNumber, 100, chunk.size);
                }

                await requestJson('/multipart-upload/complete', {
                    key,
                    uploadId,
                    parts: completedParts
                });

                return { key, uploadId };
            } catch (error) {
                await requestJson('/multipart-upload/abort', { key, uploadId }).catch(() => null);
                throw error;
            }
        };
    }

    return {
        DEFAULT_CHUNK_SIZE,
        createMultipartUploader,
        uploadFile: createMultipartUploader()
    };
});
