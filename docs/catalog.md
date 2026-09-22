# Product catalog

Products are folders. Each folder with a `product.yaml` (or `product.yml`) is one product; the photos and videos next to it are its media. Folders can be nested to any depth.

```
catalog/
├─ dresses/
│  ├─ red-classic/
│  │  ├─ product.yaml
│  │  ├─ cover.jpg
│  │  ├─ 02.jpg
│  │  ├─ demo.mp4
│  │  └─ demo.jpg        # poster for demo.mp4 (same base name)
│  └─ blue-modern/
│     └─ …
└─ accessories/
   └─ belt-01/
      └─ …
```

Where the catalog lives is set in `config/store.yaml` (`catalog.dir`, default `catalog/`). The repository ships with three fictional products in `examples/catalog/`, which is what the demo configuration points at. If the configured directory does not exist the build falls back to the examples and says so.

## product.yaml

```yaml
id: dress-0001                 # required in practice; stable, lowercase, digits and hyphens
name:                          # string or per-language mapping
  vi: Váy đỏ cổ điển
  en: Classic Red Dress
  ja: クラシックな赤いドレス
  zh: 经典红裙
category: dresses              # default: the top-level folder name
description:
  vi: …
  en: …
price:
  rental: 300000               # number >= 0; omitted = "contact the store"
  original: 350000             # optional; only kept when > rental, shows a discount badge
currency: VND                  # default: currency from config/store.yaml
sizes: [S, M, L]
tags: [classic, red]
featured: true                 # badge, filter and "featured first" sort
available: true                # used only when inventory.managed is not true
inventory:
  managed: true                # live availability from the admin's inventory items
order: 10                      # sort key; unset products come after
cover: 02.jpg                  # optional explicit cover (a file in the same folder)
model:
  height: 165
  wearing_size: M
placeholder: false             # true marks illustration-only media
color: "#a92f35"               # used by the built-in placeholder artwork
bg: "#f5e8e5"
```

Rules:

- **`id`** is what bookings, inventory items and shared links refer to. Pick it once and never reuse it for another product. If it is missing, the folder path is used, which breaks as soon as you rename the folder.
- Unknown fields are ignored with a warning; invalid values fall back to defaults with a warning. A YAML syntax error skips that product only. A **duplicate id stops the build**.
- **Language fallback** is: requested language → the store's default language → the other languages in `SUPPORTED_LANGUAGES` order (vi, en, ja, zh) → anything present.
- Media: images `.jpg .jpeg .png .webp .avif .gif`, videos `.mp4 .webm .mov`, case-insensitive, same folder only. An image with the same base name as a video is that video's poster and leaves the photo list.
- Cover priority: `cover:` in YAML → `cover.jpg/jpeg/webp/png` → first image in natural order.
- Videos should be H.264 + AAC MP4 for the widest device support.

## Inventory-managed products

`inventory: {managed: true}` switches a product from the hand-written `available` flag to live stock: the storefront asks `/api/availability`, the detail dialog offers date/size checks and the booking form, and staff register physical items in the admin (`dress-0001-01`, `-02`, …). Products without the flag show `available` as written and point customers at the store's chat channel instead.

## Build outputs

`npm run generate:catalog` writes `catalog.json` at the project root (source file names). `npm run build` writes `dist/catalog.json` with the published names: images whose long edge exceeds 1400 px are re-encoded as WebP, and every image gets `.card.webp` (640×853) and `.thumb.webp` (200×260) copies listed under `variants`. Files in the catalog folder are never modified.

Publishing limits (Workers Static Assets, free plan): 25 MiB per file, 20,000 files. The build stops when either is exceeded.

## Adding a product

1. Create the folder and `product.yaml`, drop the media next to it.
2. `npm run build` (or `npm run dev`).
3. If `inventory.managed` is true, open `/admin/#/inventory/new`, pick the product and add its items.
4. `npm run deploy`.
