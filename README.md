![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)

```
   ______     __  __  ______
  / ____/__  / /_/ / / /  _/
 / / __/ _ \/ __/ / / // /
/ /_/ /  __/ /_/ /_/ // /
\____/\___/\__/\____/___/
```

GetUI is a Node.js CLI tool for querying UI components from a local registry. It searches, filters and retrieves HTML/ERB partials and component code across multiple UI libraries.

> **Zero dependencies** - Uses only Node.js built-in modules.

## Quickstart

```bash
git clone https://github.com/a6b8/get-ui.git
cd get-ui
npm link

getui init --source /path/to/run-directory
getui search --type uikit
getui get catalyst--button --scope app
```

## Features

- **Component search** - Filter by type, category, section, page or free-text query
- **Multiple UI types** - Supports blocks (HTML) and uikit (ERB partials)
- **Scope-aware retrieval** - Light/dark mode selection per scope (public, app, admin)
- **Tree overview** - Hierarchical category/section/page breakdown
- **Local registry** - Components stored in `~/.getui/` for fast access
- **Zero dependencies** - Runs on Node.js built-ins only

## Table of Contents

- [Quickstart](#quickstart)
- [Features](#features)
- [CLI Usage](#cli-usage)
- [Commands](#commands)
- [Configuration](#configuration)
- [License](#license)

## CLI Usage

GetUI provides three commands: `init`, `search`, and `get`.

```bash
getui <command> [options]
```

### Commands Overview

| Command | Description |
|---------|-------------|
| `init` | Initialize local registry from a source directory |
| `search` | Search and filter components |
| `get` | Retrieve component code by id or hash |

## Commands

### `init`

Initializes the local `~/.getui/` registry from a processed source directory.

**Usage**

```bash
getui init --source <path>
```

| Flag | Type | Description | Required |
|------|------|-------------|----------|
| `--source` | string | Path to a run directory containing `overview.json` and `1-data/` | Yes |

**Example**

```bash
getui init --source ./output/2025-01-29T20-00-00
```

**Returns**

```json
{
    "status": true,
    "message": "Initialized ~/.getui with 182 blocks",
    "source": "/absolute/path/to/run-directory",
    "total": 182
}
```

### `search`

Search and filter components across all registered UI types.

**Usage**

```bash
getui search [options]
```

| Flag | Type | Description | Required |
|------|------|-------------|----------|
| `--type` | string | Filter by type (`blocks`, `uikit`) | No |
| `--category` | string | Filter by category | No |
| `--section` | string | Filter by section | No |
| `--page` | string | Filter by page | No |
| `--query` | string | Free-text search across name, slug, id | No |

**Examples**

```bash
# Browse full tree (no filters)
getui search

# Filter by type
getui search --type uikit

# Filter by category and section
getui search --type blocks --category tailwindui --section marketing

# Free-text search
getui search --query button
```

**Returns (with filters)**

```json
{
    "status": true,
    "total": 96,
    "filters": {
        "type": "uikit",
        "category": null,
        "section": null,
        "page": null,
        "query": null
    },
    "components": [
        {
            "type": "uikit",
            "id": "catalyst--alert",
            "name": "Alert",
            "slug": "alert",
            "category": "catalyst",
            "section": "overlays",
            "page": "alerts",
            "library": "catalyst",
            "assets": {
                "partial": "_alert.html.erb",
                "controller": null,
                "helper": "catalyst_helper.rb"
            }
        }
    ]
}
```

**Returns (no filters - tree view)**

```json
{
    "status": true,
    "total": 278,
    "categories": [
        {
            "name": "tailwindui",
            "count": 182,
            "sections": [
                {
                    "name": "marketing",
                    "count": 45,
                    "pages": [
                        { "name": "heroes", "count": 12 }
                    ]
                }
            ]
        }
    ]
}
```

### `get`

Retrieve the full component code by id or hash.

**Usage**

```bash
getui get <id-or-hash> --scope <scope>
```

| Argument | Type | Description | Required |
|----------|------|-------------|----------|
| `id-or-hash` | string | Component id (e.g. `catalyst--button`) or 32-char hash | Yes |
| `--scope` | string | Scope name defining light/dark mode (`public`, `app`, `admin`) | Yes |

**Examples**

```bash
# Get by id
getui get catalyst--button --scope app

# Get by hash
getui get a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4 --scope public
```

**Returns (uikit)**

```json
{
    "status": true,
    "type": "uikit",
    "id": "catalyst--button",
    "name": "Button",
    "scope": "app",
    "mode": "dark",
    "category": "catalyst",
    "section": "elements",
    "page": "buttons",
    "library": "catalyst",
    "assets": {
        "partial": "_button.html.erb",
        "controller": null,
        "helper": "catalyst_helper.rb"
    },
    "code": "<%= catalyst_button(...) %>"
}
```

**Returns (blocks)**

```json
{
    "status": true,
    "type": "blocks",
    "id": "tailwindui--hero-simple",
    "name": "Simple Hero",
    "scope": "public",
    "mode": "light",
    "category": "tailwindui",
    "section": "marketing",
    "page": "heroes",
    "hash": "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4",
    "code": "<div class=\"...\">\n  ...\n</div>"
}
```

## Configuration

GetUI stores component data in `~/.getui/`:

```
~/.getui/
├── config.json              # Active sources and scope settings
├── blocks/                  # Block components by timestamp
│   └── 2025-01-29T20-00-00/
│       ├── overview.json
│       └── *.json           # Individual component files
└── uikit/                   # UIKit components by library
    └── catalyst/
        ├── overview.json
        └── partials/
            └── *.html.erb   # ERB partial files
```

### config.json

```json
{
    "active": {
        "blocks": "2025-01-29T20-00-00",
        "uikit": {
            "catalyst": true
        }
    },
    "scopes": {
        "public": { "mode": "light" },
        "app": { "mode": "dark" },
        "admin": { "mode": "dark" }
    }
}
```

### Scopes

Scopes define the color mode for component retrieval:

| Scope | Mode | Use Case |
|-------|------|----------|
| `public` | light | Marketing pages, landing pages |
| `app` | dark | Application UI, dashboards |
| `admin` | dark | Admin panels, back-office |

### Project-level Configuration

Each project can have a `.getui/config.json`:

```json
{
    "root": "~/.getui",
    "scope": "app"
}
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
