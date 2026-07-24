# Cloudflare R2 File Manager

`cloudflare-r2-file-manager` is a full-stack web application for managing files and folders stored in Cloudflare R2. It provides both a modern web interface and REST API for performing CRUD operations on files and folders within your R2 bucket.

## ✨ Features

### 🖥️ Web Interface

- **Modern UI**: Clean, responsive web interface built with HTML5, Tailwind CSS, and Alpine.js
- **File Browser**: Navigate folders with breadcrumb navigation
- **Multi-Select**: Advanced file selection with Shift+Click range selection, Ctrl+A, and Esc to clear
- **Drag & Drop**: Intuitive file and folder upload interface
- **Real-time Feedback**: Toast notifications and progress indicators

### 📁 File Management

- **Create** JSON files and folders
- **Read** and **update** file contents
- **Delete** single files or multiple files in batch
- **Upload** multiple files with byte-level progress tracking
- **Large File Uploads**: Direct browser-to-R2 multipart uploads avoid proxying large files through the server
- **Folder Upload**: Upload entire directory structures while preserving hierarchy
- **Batch Operations**: Delete multiple files in a single request

### 🔧 Advanced Features

- **Natural Sorting**: Proper alphanumeric sorting for files and folders
- **Keyboard Shortcuts**: Full keyboard navigation support
- **Responsive Design**: Mobile-friendly interface
- **Progress Tracking**: Real-time byte-level multipart upload progress with visual indicators
- **Error Handling**: Comprehensive error handling with user-friendly messages

### 🌐 API Endpoints

- RESTful API for all file operations
- Pre-signed URL generation for secure file access and direct multipart uploads
- Batch operations for improved performance
- CORS support for web applications

## Prerequisites

- Node.js (v14 or above)
- Cloudflare R2 account and API credentials

## Setup

1. **Clone the repository:**

    ```bash
    https://github.com/YsrajSingh/cloudflare-r2-file-manager.git
    cd cloudflare-r2-file-manager
    ```

2. **Install dependencies:**

    ```bash
    npm install
    ```

3. **Get your Cloudflare R2 bucket name, endpoint, and API credentials.**

    You need four values for the app:

    | `.env` variable | Where to get it | Example |
    | --- | --- | --- |
    | `R2_BUCKET_NAME` / `R2_BUCKET` | Your R2 bucket name in Cloudflare Dashboard | `my-file-bucket` |
    | `R2_ENDPOINT` | Your account-specific R2 S3 API endpoint | `https://<account-id>.r2.cloudflarestorage.com` |
    | `AWS_ACCESS_KEY_ID` | R2 API token Access Key ID | `abc123...` |
    | `AWS_SECRET_ACCESS_KEY` | R2 API token Secret Access Key | `secret...` |

    To create the R2 API credentials:

    1. Open the **Cloudflare Dashboard**.
    2. Go to **Storage & databases** → **R2**.
    3. Open **Manage R2 API Tokens**.
    4. Create an API token for this bucket.
    5. Grant permissions needed by this file manager:
        - **Object Read** for listing and reading files.
        - **Object Write** for creating, uploading, renaming, and multipart uploads.
        - **Object Delete** for deleting files and aborting failed multipart uploads.
    6. Copy the generated **Access Key ID** and **Secret Access Key** immediately. The secret is only shown once.

    To find your Account ID:

    1. Open the Cloudflare Dashboard.
    2. Select your account.
    3. Copy the **Account ID** from the account overview/sidebar.
    4. Build the S3 API endpoint with this format:

        ```txt
        https://<account-id>.r2.cloudflarestorage.com
        ```

    Important: the S3 API endpoint is different from the public `r2.dev` URL. Use the S3 API endpoint for `R2_ENDPOINT`.

    ```txt
    ✅ R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
    ❌ R2_ENDPOINT=https://pub-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.r2.dev
    ```

    The `pub-...r2.dev` URL is only for public file access when your bucket public development URL is enabled. You can keep it separately for reference, but this app does not require it for R2 API operations.

4. **Create an .env file** in the root directory with the following content:

    ```bash
    PORT=3000
    AWS_ACCESS_KEY_ID=<your-r2-access-key-id>
    AWS_SECRET_ACCESS_KEY=<your-r2-secret-access-key>
    R2_BUCKET_NAME=<your-r2-bucket-name>
    R2_BUCKET=<your-r2-bucket-name>
    R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
    # Optional reference only; not used by the server code
    R2_PUBLIC_URL=https://pub-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.r2.dev
    ```

    Replace `<your-r2-access-key-id>`, `<your-r2-secret-access-key>`, `<your-r2-bucket-name>`, and `<account-id>` with your Cloudflare R2 values.

5. **Configure R2 bucket CORS** for direct browser uploads.

    Direct multipart uploads use presigned R2 URLs from the browser, so your bucket must allow your app origin to send `PUT` requests and read the `ETag` response header.

    For local development:

    ```json
    [
      {
        "AllowedOrigins": ["http://localhost:3000"],
        "AllowedMethods": ["PUT"],
        "AllowedHeaders": ["Content-Type"],
        "ExposeHeaders": ["ETag"],
        "MaxAgeSeconds": 3600
      }
    ]
    ```

    For production, add your deployed app URL as another allowed origin:

    ```json
    [
      {
        "AllowedOrigins": [
          "http://localhost:3000",
          "https://your-app.vercel.app"
        ],
        "AllowedMethods": ["PUT"],
        "AllowedHeaders": ["Content-Type"],
        "ExposeHeaders": ["ETag"],
        "MaxAgeSeconds": 3600
      }
    ]
    ```

    `ExposeHeaders: ["ETag"]` is required because R2 returns one ETag per uploaded part, and the browser must pass those ETags back to the server to complete the multipart upload.

## Running the Server

To start the server, run:

```bash
npm start
```

The server will be available at `http://localhost:3000`

## Web Interface

Once the server is running, visit `http://localhost:3000` in your browser to access the web interface:

### Features:
- **File Browser**: Navigate through your folders with breadcrumb navigation
- **Multi-Select**: Select multiple files with Shift+Click range selection, Ctrl+A, or individual clicks
- **File Operations**: Create, upload, delete, and manage files and folders
- **Folder Upload**: Upload entire directory structures while preserving hierarchy
- **Batch Operations**: Delete multiple files efficiently in single requests
- **Progress Tracking**: Real-time byte-level multipart upload progress with visual indicators
- **Responsive Design**: Works on desktop and mobile devices
- **Keyboard Shortcuts**: Full keyboard navigation support

### Usage:
1. **Navigation**: Click on folders to navigate, use breadcrumbs to go back
2. **File Selection**: Click files to select, Shift+Click for ranges, Ctrl+A for all
3. **Upload**: Use "Upload" button to select files or drag & drop folders
4. **Delete**: Select files and click "Delete" for batch deletion
5. **Create**: Use "New Folder" or "New File" buttons to create content

## API Endpoints

1. **Create a File**

- Endpoint: `POST /create-file`
- Request Body:

    ```json
    {
        "folder": "folder-name",
        "fileName": "file.json",
        "content": { "key": "value" }
    }
    ```

2. **Delete a File**

- Endpoint: `DELETE /delete-file`
- Request Body (single file):

    ```json
    {
        "folder": "folder-name",
        "fileName": "file.json"
    }
    ```

- Request Body (batch delete multiple files):

    ```json
    {
        "folder": "folder-name",
        "fileNames": ["file1.json", "file2.json", "file3.json"]
    }
    ```

- Request Body (delete all files in folder):

    ```json
    {
        "folder": "folder-name",
        "fileName": "*"
    }
    ```

- Response: `{"message": "Deleted X files successfully"}` or `{"message": "Deleted X files successfully, Y files failed", "deleted": X, "failed": Y, "errors": [...]}`

3. **Update a File**

- Endpoint: `PUT /update-file`
- Request Body:

    ```json
    {
        "folder": "folder-name",
        "fileName": "file.json",
        "content": { "key": "updated-value" }
    }
    ```

4. **Read a File**

- Endpoint: `GET /read-file`
- Query Parameters: `folder=folder-name&fileName=file.json`

5. **List Files in a Folder**

- Endpoint: `GET /list-files`
- Query Parameters: `folder=folder-name`

6. **List All Folders**

- Endpoint: `GET /list-folders`

7. **Duplicate a Folder**

- Endpoint: `POST /duplicate-folder`
- Request Body:

    ```json
    {
        "sourceFolder": "source-folder",
        "targetFolder": "target-folder"
    }
    ```

8. **Rename a Folder**

- Endpoint: `PUT /rename-folder`
- Request Body:

    ```json
    {
        "sourceFolder": "old-folder-name",
        "targetFolder": "new-folder-name"
    }
    ```

9. **Upload Files**

The web interface uses direct browser-to-R2 multipart uploads for selected files. The legacy server-proxied upload endpoint remains available for API clients that need it.

- Endpoint: `POST /upload-files`
- Content-Type: `multipart/form-data`
- Form Data:
  - `files`: Multiple files (up to 50 per request)
  - `folder`: Target folder name (optional, defaults to "uploads")
- Response: `{"message": "Files uploaded successfully", "fileNames": ["file1.jpg", "file2.png"]}`

10. **Direct Multipart Upload**

These endpoints support large browser uploads without sending file bytes through the Express server.

- Endpoint: `POST /multipart-upload/create`
- Request Body:

    ```json
    {
        "folder": "folder-name",
        "fileName": "large-video.mp4",
        "contentType": "video/mp4"
    }
    ```

- Response:

    ```json
    {
        "key": "folder-name/large-video.mp4",
        "uploadId": "multipart-upload-id"
    }
    ```

- Endpoint: `POST /multipart-upload/sign-part`
- Request Body:

    ```json
    {
        "key": "folder-name/large-video.mp4",
        "uploadId": "multipart-upload-id",
        "partNumber": 1,
        "contentLength": 8388608
    }
    ```

- Response:

    ```json
    {
        "url": "https://signed-r2-upload-part-url"
    }
    ```

- Endpoint: `POST /multipart-upload/complete`
- Request Body:

    ```json
    {
        "key": "folder-name/large-video.mp4",
        "uploadId": "multipart-upload-id",
        "parts": [
            { "PartNumber": 1, "ETag": "etag-from-r2" }
        ]
    }
    ```

- Endpoint: `POST /multipart-upload/abort`
- Request Body:

    ```json
    {
        "key": "folder-name/large-video.mp4",
        "uploadId": "multipart-upload-id"
    }
    ```

11. **Get File URLs**

- Endpoint: `GET /get-file-urls`
- Query Parameters: `folder=folder-name&expires=3600` (expires is optional)
- Returns pre-signed URLs for all files in the specified folder

## Testing

Run the automated tests:

```bash
npm test
```

Run syntax checks for the server and browser helpers:

```bash
node --check index.js
node --check public/upload-client.js
node --check public/multipart-upload-client.js
```

## Git remotes

To push the current local `main` branch to a remote named `fadlee`, use:

```bash
git push fadlee main
```

The order is `git push <remote> <branch>`. For example, `git push main fadlee` tries to push a local branch named `fadlee` to a remote named `main`, which causes `src refspec fadlee does not match any` if that branch does not exist.

## Contributing

1. Fork the repository.
1. Create a new branch (`git checkout -b feature-name`).
1. Commit your changes (`git commit -am 'Add new feature'`).
1. Push to the branch (`git push origin feature-name`).
1. Create a new pull request.

## License

This project is licensed under the [MIT License](https://github.com/YsrajSingh/cloudflare-r2-file-manager/blob/main/LICENSE).
