# APP LAUNCHER

> Cross-platform CLI launcher for opening applications, websites, and grouped workspaces directly from the terminal.

[![Node.js](https://img.shields.io/badge/Node.js-CommonJS-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)](#platform-support)
[![License](https://img.shields.io/badge/license-MIT-blue)](#license)

This launcher helps you open apps without switching through the Start menu, Spotlight, or browser. You can scan installed apps, add custom URLs, create launch groups, and switch language between Indonesian and English.

## What changed recently

Important updates in this version include:

- multi-language support via `run lang id` and `run lang en`
- separate modules for launcher logic, help text, and database access
- alias commands: `run`, `open`, and `zap`
- better grouped workspace launching
- smarter fuzzy matching when launching by partial app name
- local runtime data stored in `data/` and ignored from Git by default

## Features

- automatic app scanning from OS app locations
- launch apps by name, shortcut, or partial match
- add custom website URLs such as WhatsApp, YouTube, and GitHub
- create and launch workspace groups
- edit, delete, and clear saved app records
- support for Windows, macOS, and Linux
- Indonesian and English language support
- local JSON storage with no external database

## Requirements

- Node.js 14 or newer
- terminal access with permission to run Node.js commands

## Installation

### From source

```bash
git clone <REPOSITORY_URL>
cd launcher
npm install
npm link
```

After `npm link`, the commands below will be available globally:

```bash
run
open
zap
```

> On macOS or Linux, you may need `sudo npm link` if your environment does not allow global writes.

### Run without installing globally

```bash
npm install
node bin/index.cjs scan
```

## Quick Start

Scan installed applications:

```bash
run scan
```

Open an app by full or partial name:

```bash
run chrome
run chr
```

Add an app manually:

```bash
run add "Application Name" "/path/to/application"
```

Add a website and open it in the browser:

```bash
run add "WhatsApp" "https://web.whatsapp.com"
run add "YouTube" "https://youtube.com"
run add "GitHub" "https://github.com"
```

Open a site by saved name:

```bash
run WhatsApp
run YouTube
```

Create a workspace group:

```bash
run addgroup work chrome vscode spotify
run work
```

Display help:

```bash
run help
```

Change language:

```bash
run lang id
run lang en
```

## Command Reference

### Applications

| Command | Description |
| --- | --- |
| `run scan` | Scan installed applications from the OS. |
| `run add <name> <path-or-url>` | Add an app or website manually. |
| `run list` | Show saved applications and shortcuts. |
| `run info <name>` | Show details for one app. |
| `run edit <name>` | Edit app name, path, or shortcut. |
| `run delete` | Remove an app interactively. |
| `run clear` | Clear the app database. |

### Workspace / Groups

| Command | Description |
| --- | --- |
| `run addgroup <name> <app...>` | Create a new group. |
| `run addto <name> <app...>` | Add apps to an existing group. |
| `run delfrom <name> <app>` | Remove an app from a group. |
| `run groups` | List all groups and their contents. |
| `run delgroup <name>` | Delete a group. |
| `run <name>` | Launch an app or group by name. |

### Settings

| Command | Description |
| --- | --- |
| `run lang id` | Switch to Indonesian. |
| `run lang en` | Switch to English. |
| `run --version` | Show the CLI version. |
| `run --help` | Show usage help. |

## Platform Support

| Platform | Scanned locations |
| --- | --- |
| Windows | Start Menu folders for all users and current user (`.lnk`) |
| macOS | `/Applications` and `~/Applications` (`.app`) |
| Linux | `/usr/share/applications` and `~/.local/share/applications` (`.desktop`) |

Local app data is stored in the `data/` folder, and generated files are kept local to the current machine.

## Project Structure

```text
launcher/
├── bin/
│   └── index.cjs            # CLI entry point
├── src/
│   ├── core.cjs             # launch + scan + matching logic
│   ├── db.cjs               # local JSON database handler
│   ├── help.cjs             # banner and help output
│   ├── lang/
│   │   ├── en.cjs           # English text mappings
│   │   ├── id.cjs           # Indonesian text mappings
│   │   └── index.cjs        # translation loader
├── data/
│   ├── apps.json            # app list created locally
│   ├── groups.json          # workspace groups
│   └── config.json          # selected language
├── .gitignore               # ignores local/generated files
├── package.json
├── README.MD
└── package-lock.json
```

## Important security note

This project stores launcher data locally in the `data/` directory. These files are intended for your machine only and are excluded from Git by default to avoid accidental publishing of local paths or sensitive machine-specific settings.

## Contributing

1. Fork this repository.
2. Create a feature branch: `git checkout -b feature-name`
3. Commit your changes.
4. Push the branch and open a pull request.

Keep changes compatible with Windows, macOS, and Linux when modifying scanning or launching behavior.

## License

This project is released under the MIT License.
