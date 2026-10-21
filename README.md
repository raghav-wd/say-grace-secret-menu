# Say Gracé · Secret Menu

A single-page, mobile-first secret menu for Say Gracé Confectionery. It's a static site with no backend or build step, ready for GitHub Pages.

Live site: **[raghav-wd.github.io/say-grace-secret-menu](https://raghav-wd.github.io/say-grace-secret-menu/)**

## Updating the menu

Everything on the page is rendered from **[`menu.yaml`](menu.yaml)**: items, prices, images, colours and copy. Edit that file, commit, and you're done.

| Item field    | What it does |
| ------------- | ------------ |
| `name`        | Dessert name (also used for the deep link, e.g. `#secret-forbidden-berry`). |
| `tagline`     | Short handwritten line under the name (optional). |
| `description` | The main description. |
| `price`       | Number shown after the currency (optional; leave empty to hide). |
| `badge`       | Round sticker on the photo, e.g. `Served warm` or `New` (optional). |
| `image`       | Path (e.g. `assets/menu/my-dessert.webp`) or a full `https://` URL. |
| `image_alt`   | Describes the photo for screen readers. |
| `image_style` | `cutout` for a transparent PNG/WebP that floats over the arch; `photo` for a normal photo that fills the arch. |
| `garnish`     | Small floating ingredient image (optional). |
| `tint` / `accent` | Soft background colour behind the dessert, plus a darker detail colour. |

* Items appear in the order they are listed, and numbers are added automatically.
* `{Count}` / `{count}` in any copy becomes the number of items ("Five" / "five").
* Wrap words in `*asterisks*` to italicise them.
* The welcome screen, hero text, ribbon, "How to order" note and footer are editable in the same file.

### Swapping in real photos

1. Drop the photo into `assets/menu/`. Aim for about 800 px on the longest side, as WebP or JPEG under ~150 KB.
2. Point the item's `image` at it.
3. Set `image_style: photo`. Keep `cutout` only for images with a transparent background.

## Running locally

Browsers block reading `menu.yaml` from a `file://` page, so serve the folder:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

If the YAML has a mistake, the page shows a friendly message to guests. On `localhost` it also shows the exact line and column of the error.

## Deploying

GitHub Pages publishes this repository from **`main` → `/ (root)`** using **Settings → Pages → Deploy from a branch**. Push changes to `main` to update the live site automatically. All paths are relative, so it works on both `username.github.io` and `username.github.io/repo-name`. The `.nojekyll` file tells Pages to serve the files as-is.

## Structure

```
index.html            page shell (welcome, hero, sections)
menu.yaml             ← all menu content
css/styles.css        styles & animations
js/app.js             renders menu.yaml, animations, scroll effects
vendor/js-yaml.min.js YAML parser (MIT)
assets/brand/         logo (SVG), favicon, touch icon
assets/menu/          dessert photos + garnishes
assets/decor/         wax seal, brass key
```
