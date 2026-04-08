# OICAT — Open Image Comparison & Analysis Tool

A desktop app for comparing images side by side, with synchronized pan/zoom, diff overlays, and flexible export options. Built with [Tauri v2](https://tauri.app), React, and TypeScript.

---

## Screenshots

<!-- Add screenshots here -->

---

## Features

- **Side-by-side view** — compare multiple images simultaneously with synchronized pan and zoom across all panels
- **Comparison slider** — drag a divider to reveal differences between two images, with full pan/zoom support
- **Diff overlay** — highlight pixel differences between panels using either a red overlay (Diff) or a color ramp (Heatmap), with adjustable threshold
- **Flexible layout** — configure the number of columns (1–4 or auto) for the side-by-side view
- **Image management** — drag to reorder images in the list, assign any image to any panel
- **Per-panel controls** — rename panels (double-click the label), change the assigned image, or close panels
- **Zoom controls** — fit to window, actual size (1:1), and preset zoom levels (25%–200%) with a live zoom badge
- **Export** — save as PNG, JPEG, SVG, PDF, or self-contained interactive HTML (with pan/zoom and slider), with optional panel labels
- **Multi-language ready** — i18n via react-i18next (English included)
- **Cross-platform** — macOS, Windows, and Linux

---

## Screenshots (detail)

<!-- Add detail screenshots or GIFs here (diff overlay, slider, export modal, etc.) -->

---

## Installation

Download the latest release for your platform from the [Releases](../../releases) page:

| Platform | Format |
|----------|--------|
| macOS | `.dmg` |
| Windows | `.msi` / `.exe` |
| Linux | `.deb` / `.AppImage` |

---

## Building from source

### Prerequisites

- [Node.js](https://nodejs.org) ≥ 18
- [Rust](https://www.rust-lang.org/tools/install) (stable)
- Tauri CLI: `cargo install tauri-cli --version "^2"`

**Linux only** — install WebKit and GTK dependencies:

```bash
sudo apt install libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev
```

### Dev server

```bash
npm install
cargo tauri dev
```

### Production build

```bash
cargo tauri build
```

Output is placed in `src-tauri/target/release/bundle/`.

---

## Usage

1. Click **Add Images** (or drag files onto the window) to load images.
2. Assign images to panels using the selector in each panel header.
3. Pan with click-and-drag, zoom with the scroll wheel — all panels stay in sync.
4. Switch to **Slider** mode via the toolbar to compare two images with a draggable divider.
5. Open **View Options** to enable a Diff or Heatmap overlay and adjust the threshold.
6. Click **Export** to save the current view as an image, PDF, or interactive HTML file.

---

## Tech stack

- [Tauri v2](https://tauri.app) — Rust backend, native windowing
- [React 18](https://react.dev) + [TypeScript](https://www.typescriptlang.org)
- [Vite](https://vitejs.dev)
- [Zustand](https://github.com/pmndrs/zustand) — state management
- [@dnd-kit](https://dndkit.com) — drag-to-reorder
- [react-i18next](https://react.i18next.com) — i18n
- [jsPDF](https://github.com/parallax/jsPDF) — PDF export

---

## License

MIT
