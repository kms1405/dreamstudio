# MS Photo Select — static front-end demo

A browser-only prototype for a photography proofing gallery.

## Run locally

From this directory:

```bash
python3 -m http.server 8000
```

Open http://localhost:8000

Demo customer PIN: `825491`

Use **Admin demo** to upload JPG/PNG/WebP images. The browser creates a 1000px-wide maximum JPEG preview at approximately 28% encoder quality and applies an MS PHOTOGRAPHY watermark. The preview is stored in this browser's IndexedDB. Switch to **Customer gallery**, enter the demo PIN, select photos, and return to Admin demo to see the selected photo numbers. Export the selection as CSV.

## Important limitations

This is a static prototype, not the production multi-customer system:

- Uploaded previews and selections live only in the browser's IndexedDB. They are not uploaded to Cloudflare R2.
- Another computer or customer's phone cannot see these local uploads or selections.
- The demo PIN is hard-coded and is not secure.
- The browser cannot guarantee that images cannot be saved, screenshotted, or captured.
- The browser-generated preview is not a replacement for your original files. Keep originals private and backed up.

## Production architecture to add next

- Cloudflare Pages: host this static frontend.
- Cloudflare R2: private object storage for watermarked preview images and private originals.
- Cloudflare Worker: verify customer gallery PIN/session and proxy authorized preview requests. Never put R2 credentials in frontend JavaScript.
- Cloudflare D1: store events, customer access, photo metadata, and selections.
- Keep a mapping of event ID + gallery photo number + original filename + R2 object key. This allows the admin to identify the exact original file later.

The current demo intentionally does not pretend to provide remote access or secure authentication until those server-side components are connected.
