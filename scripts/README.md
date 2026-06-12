# Organize Apple Photos into Dropbox by location & year

`organize-apple-photos-to-dropbox.sh` copies photos from your **macOS Apple
Photos library** that were taken in **2022 or earlier** into your Dropbox,
organized like this:

```
Dropbox/
└── Apple Photos/
    ├── San Francisco 2021/
    │   ├── IMG_4032.HEIC
    │   └── IMG_4033.HEIC
    ├── Chicago 2020/
    └── No Location 2019/
```

- **Top folder:** `Apple Photos`
- **Subfolder:** one per *location + year*, e.g. `San Francisco 2021`
- **Location** is the place name Apple already stores for each photo (reverse
  geocoded from its GPS). Photos with no location go into `No Location <Year>`
  so nothing is skipped.

It exports into your **local Dropbox folder**, and the Dropbox desktop app
syncs it to the cloud — so **no Dropbox API token is required**.

## Why this runs on your Mac (not in this app)

Your Apple Photos library and your Dropbox both live on your own devices and
accounts. This tool can't reach them from a server, so it's a script you run
locally on the Mac that has your Photos library.

## Requirements (macOS only)

- The **Apple Photos** library on this Mac, or signed in to **iCloud Photos**
- The **Dropbox desktop app** installed and signed in
- **Python 3** (for the one-time install of `osxphotos`). Get it from
  <https://www.python.org/> if you don't have it. The script installs
  [`osxphotos`](https://github.com/RhetTbull/osxphotos) automatically.

## Usage

```bash
cd scripts

# Preview first — shows what WOULD be copied, copies nothing:
./organize-apple-photos-to-dropbox.sh --dry-run

# Do it for real (2022 and older):
./organize-apple-photos-to-dropbox.sh
```

### Options

| Flag | Default | What it does |
|------|---------|--------------|
| `--year YYYY` | `2022` | Keep photos taken in this year **or earlier** |
| `--dropbox PATH` | `~/Dropbox` | Your Dropbox folder, if it's somewhere else |
| `--top NAME` | `Apple Photos` | Name of the top-level folder in Dropbox |
| `--nested` | off | Use `Location/Year/` nested folders instead of `Location Year/` |
| `--dry-run` | off | Preview only — copy nothing |
| `--help` | | Show built-in help |

Examples:

```bash
# Everything from 2020 and older:
./organize-apple-photos-to-dropbox.sh --year 2020

# Dropbox installed under a business path:
./organize-apple-photos-to-dropbox.sh --dropbox "$HOME/Dropbox (Company)"

# Nested folders: Apple Photos/San Francisco/2021/
./organize-apple-photos-to-dropbox.sh --nested
```

## Notes

- **Originals are copied, not moved.** Your Photos library is left untouched.
- Re-running is safe and fast — it skips files already exported
  (`--skip-original-if-exists`).
- iCloud-only originals are downloaded on demand (`--download-missing`), so
  the first run may take a while on large libraries.
- A CSV log of everything exported is written to
  `Dropbox/Apple Photos/_export-report.csv`.
- First run may prompt macOS to grant Terminal access to your Photos library —
  allow it.

## I meant a different set of photos

- **The equipment photos in this Asset Survey app instead?** Those are a
  separate store (uploads on the server / IndexedDB in the PWA). Say so and I'll
  write an exporter for them rather than the Apple Photos library.
- **A folder you already exported?** Tell me and I'll adapt the script to read
  a plain folder (using each photo's embedded GPS) instead of the Photos library.
