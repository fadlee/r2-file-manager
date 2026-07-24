(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.R2UploadClient = factory();
    }
})(typeof self !== 'undefined' ? self : this, function () {
    function parseResponse(xhr) {
        if (!xhr.responseText) {
            return null;
        }

        try {
            return JSON.parse(xhr.responseText);
        } catch (error) {
            return xhr.responseText;
        }
    }

    function getErrorMessage(xhr) {
        const response = parseResponse(xhr);

        if (response && typeof response === 'object') {
            return response.error || response.message || `Upload failed with status ${xhr.status}`;
        }

        return response || `Upload failed with status ${xhr.status}`;
    }

    function createXhrUploader(XMLHttpRequestImpl) {
        return function uploadWithProgress(url, options, onProgress) {
            const xhr = new XMLHttpRequestImpl();
            const method = options.method || 'POST';

            return new Promise((resolve, reject) => {
                xhr.open(method, url);

                if (options.headers) {
                    Object.entries(options.headers).forEach(([name, value]) => {
                        xhr.setRequestHeader(name, value);
                    });
                }

                xhr.upload.onprogress = (event) => {
                    if (!event.lengthComputable || typeof onProgress !== 'function') {
                        return;
                    }

                    const progress = event.total === 0 ? 0 : (event.loaded / event.total) * 100;
                    onProgress(Math.min(100, Math.max(0, progress)), event);
                };

                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        resolve(parseResponse(xhr));
                        return;
                    }

                    reject(new Error(getErrorMessage(xhr)));
                };

                xhr.onerror = () => reject(new Error('Network error while uploading'));
                xhr.onabort = () => reject(new Error('Upload was cancelled'));
                xhr.ontimeout = () => reject(new Error('Upload timed out'));

                xhr.send(options.formData || options.body || null);
            });
        };
    }

    const uploadWithProgress = createXhrUploader(typeof XMLHttpRequest !== 'undefined' ? XMLHttpRequest : undefined);

    return {
        createXhrUploader,
        uploadWithProgress
    };
});
