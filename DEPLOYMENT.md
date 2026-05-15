# Deployment Guide: Local Build & Upload

Since the remote server has memory limitations, we will build the application on your computer and upload the result.

## 1. Build Locally
Run the following command in your local terminal (VS Code):

```bash
npm run build
```

This will create a `.next` folder in your project directory.

## 2. Prepare Files for Upload
You need to upload the following files/folders to your server (`/home/weme8602/public_html/pokemon`):

1.  `.next` (The entire folder - delete the old one on the server first if possible)
2.  `public` (The entire folder)
3.  `package.json`
4.  `next.config.mjs`

> **Note:** You do NOT need to upload `node_modules`. The server already has them.

## 3. Upload to cPanel
1.  Open **cPanel File Manager**.
2.  Navigate to `public_html/pokemon`.
3.  **Delete** the existing `.next` folder.
4.  **Upload** the new `.next` folder (you might need to zip it locally, upload the zip, and extract it on the server if cPanel doesn't support folder uploads directly).
5.  **Upload** the other files (`public`, `package.json`, `next.config.mjs`) and overwrite if asked.

## 4. Restart Application
1.  Go to **cPanel -> Setup Node.js App**.
2.  Click the **Restart** button for your application.

## 5. Verify
Visit [pokemon.lucasmoreau.fr](https://pokemon.lucasmoreau.fr) to see your changes!
