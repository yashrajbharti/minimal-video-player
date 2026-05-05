# `<minimal-video-player>`

![Minimal Video Player](/Minimal%20Video%20Player.png)

A brutalist, black-and-white video player built as a zero-dependency **HTML Custom Element**.

No frameworks. No build tools. No external icon fonts. Just one script.

---

## Installation

### via npm
```bash
npm install minimal-video-player
```

### via unpkg (CDN)
```html
<script src="https://unpkg.com/minimal-video-player"></script>
```

---

## Usage

### 1. Include the script
If you are not using npm, you can include it directly:
```html
<script src="script.js"></script>
```

### 2. Use the element
```html
<minimal-video-player
  src="https://example.com/video.mp4"
  width="100%"
></minimal-video-player>
```

---

## Features

- **Web Component** — encapsulated in Shadow DOM, drop into any page
- **Zero dependencies** — all icons are inline SVGs, no external fonts or libraries
- **Brutalist design** — sharp corners, hard borders, monochrome UI
- **Full-color video** — only the player chrome is black & white
- **Keyboard shortcuts** — Space/K (play), ←→ (seek), ↑↓ (volume), F (fullscreen), M (mute)
- **Auto-hiding controls** — controls fade after 2.5s of inactivity during playback
- **Responsive** — scales to any container width, maintains 16:9 aspect ratio even while loading
- **Double-click fullscreen** — double-click the video area to toggle fullscreen

## Attributes

| Attribute  | Type    | Default | Description              |
| ---------- | ------- | ------- | ------------------------ |
| `src`      | string  | —       | Video source URL         |
| `poster`   | string  | —       | Poster image URL         |
| `autoplay` | boolean | false   | Auto-play on load        |
| `muted`    | boolean | false   | Start muted              |
| `loop`     | boolean | false   | Loop playback            |
| `width`    | string  | `100%`  | CSS width of the player  |
| `height`   | string  | `auto`  | CSS height of the player |

## Keyboard Shortcuts

| Key          | Action          |
| ------------ | --------------- |
| `Space` / `K`| Play / Pause    |
| `←` / `→`   | Seek ±5s        |
| `↑` / `↓`   | Volume ±10%     |
| `F`          | Toggle Fullscreen|
| `M`          | Toggle Mute     |

## License

[MIT](LICENSE)
