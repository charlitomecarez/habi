# Inventory

**Files:** `lib/inventory.ts`, `lib/photos.ts`, `lib/qr.ts`, `app/(app)/inventory/`, `components/inventory/`, `components/ui/PhotoField.tsx`, migrations `...0400` and `...0600`.

## Locations

- `inventory_locations` is a tree: room › shelf › box. `parent_id` points to the parent.
- `withPaths` builds each location's path ("Bedroom › Closet › Box 2") and depth. It stops on a parent loop.
- `descendantIds` returns a location and everything inside it. A filter on a room also shows items in its shelves and boxes.
- Deleting a location does not delete its children or items. The database sets their parent or location to null.
- `/inventory/locations` lists the tree. It adds and deletes locations, and shows the QR label for one location.

## Items

- An item has a name, location, category, quantity, notes and one photo.
- `matchesSearch` matches the query, without case, on name, category, notes and location path. The search runs in the app.
- The item form (`ItemForm`) has a "+ New location…" choice. It opens `AddLocationSheet`, then selects the new location.

## Inventory screen (`/inventory`)

- Room filter chips (top-level locations only), or a scanned location.
- A `location` route param narrows the list to that location and its children. "Show all" clears the param with `router.setParams`.
- The FAB opens the new-item form with the current location filled in.

## Photos (`lib/photos.ts`)

`PhotoChange` on save: `undefined` keeps the photo, `null` removes it, and a `LocalPhoto` replaces it.

`uploadPhoto(folder, baseName, photo)`:

1. It resizes the longest side to 1280 px or less.
2. It saves a WebP at quality 0.7, about 100 KB.
3. It uploads to `<user_id>/<folder>/<baseName>-<time>.webp`. A new name each time stops a cached photo from showing for a new one.
4. For `inventory`, it also saves a list copy at 320 px as `<baseName>-<time>.320.webp`. If that upload fails, it removes the first file and fails the save.

`listPath(path)` gives the list copy of a `.webp` path. A photo saved before v1.5.0 is a `.jpg` with no list copy, so the list shows the full photo. `removePhoto` removes the photo and its list copy.

Each private photo uses `expo-image` with `cachePolicy="disk"` and its storage path as the `cacheKey`. A new signed URL for the same file then reads it from the disk cache instead of downloading it again.

`useSaveItem` saves the row first. Then it uploads the new photo, updates `photo_path` and removes the old file. If the update fails, it removes the new file. File removal is best effort.

`usePhotoUrls(paths)` gets signed URLs (one hour) for many paths in one call. The query goes stale 5 minutes before the URLs expire.

## QR box labels (`lib/qr.ts`)

- The label text is `myapp://inventory?location=<uuid>`. It is fixed text, so a printed label works in every build.
- `qrMatrix` makes the QR modules (error correction M). `components/inventory/QrCode.tsx` draws them with Views and a 4-module quiet zone, in `label-paper` and `label-ink`.
- `/inventory/scan` uses `expo-camera` to read QR codes. It acts only on the first valid scan. Then it calls `router.dismissTo` to `/inventory` with the `location` param.
- The phone's own camera app also opens the link, through the `myapp` scheme.
- `parseLocationLink` returns null for any code that is not a Habi label.
- The `qr_code` column in `inventory_locations` is not used. The label uses the location id.
