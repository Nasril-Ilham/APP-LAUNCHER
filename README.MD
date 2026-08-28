# APP LAUNCHER OR WEBSITE LAUNCHER

> A cross-platform CLI launcher for opening applications and workspaces directly from your terminal.

[![Node.js](https://img.shields.io/badge/Node.js-CommonJS-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)](#platform-support)
[![License](https://img.shields.io/badge/license-MIT-blue)](#license)

Run CLI lets you open applications and websites without switching to the Start menu, Launchpad, or browser. Applications and website links can be added manually, assigned shortcuts, and organized into workspaces that can be launched together.

## Features

- **Automatic application scanning** from the operating system's application locations.
- **Open applications from the terminal** using their name, shortcut, or part of their name.
- **Add and open websites manually**, including WhatsApp, YouTube, GitHub, and other URLs.
- **Workspace groups** for launching multiple applications at once.
- **Interactive management** for editing and deleting applications.
- **Windows, macOS, and Linux support.**
- **Indonesian and English language support**, with Indonesian as the default.
- **Local JSON storage** with no external database required.

## Requirements

- [Node.js](https://nodejs.org/) version 14 or newer.
- A terminal with permission to run Node.js commands.

## Installation

### From source code

```bash
git clone <REPOSITORY_URL>
cd launcher
npm install
npm link
```

After running `npm link`, the `run` command and the `open` alias will be available globally.

> On macOS or Linux, you may need to use `sudo npm link` if npm does not have permission to write to the global directory.

### Run without global installation

```bash
npm install
node bin/index.cjs scan
```

## Quick Start

Scan the applications available on your computer:

```bash
run scan
```

Open an application by its name or part of its name:

```bash
run chrome
run chr
```

Add an application manually:

```bash
run add "Application Name" "/path/to/application"
```

Add a website manually and open it with your default browser:

```bash
run add "WhatsApp" "https://web.whatsapp.com"
run add "YouTube" "https://youtube.com"
run add "GitHub" "https://github.com"
```

Open the saved website by its name:

```bash
run WhatsApp
run YouTube
```

Create and launch a workspace:

```bash
run addgroup work chrome vscode spotify
run work
```

Display the help menu:

```bash
run help
```

## Command Reference

### Applications

| Command | Description |
| --- | --- |
| `run scan` | Scan and register applications from the operating system. |
| `run add <name> <path-or-url>` | Add an application or website link manually. |
| `run list` | Display registered applications and their shortcuts. |
| `run info <name>` | Display an application's name, shortcut, and path. |
| `run edit <name>` | Interactively edit an application's name, path, or shortcut. |
| `run delete` | Interactively select and delete an application. |
| `run clear` | Delete all applications from the database; groups are preserved. |

### Workspace Groups

| Command | Description |
| --- | --- |
| `run addgroup <name> <app...>` | Create a group and add one or more applications. |
| `run addto <name> <app...>` | Add one or more applications to an existing group. |
| `run delfrom <name> <app>` | Remove an application from a group. |
| `run groups` | Display all groups and their contents. |
| `run delgroup <name>` | Delete a group. |
| `run <name>` | Launch an application or group by name. |

### Settings

| Command | Description |
| --- | --- |
| `run lang id` | Use Indonesian as the CLI language. |
| `run lang en` | Use English as the CLI language. |
| `run --version` | Display the Run CLI version. |
| `run --help` | Display the usage help. |

## Platform Support

| Platform | Scanned locations |
| --- | --- |
| Windows | Start Menu locations for all users and the active user (`.lnk`). |
| macOS | `/Applications` and `~/Applications` (`.app`). |
| Linux | `/usr/share/applications` and `~/.local/share/applications` (`.desktop`). |

Scanned applications are stored locally. Run `run scan` again at any time to find new applications; existing entries will not be duplicated.

### Website Links

You can add any website manually by using its full URL with `run add`. Links such as `https://web.whatsapp.com`, `https://youtube.com`, and `https://github.com` open through your operating system's default browser.

## Project Structure

```text
launcher/
├── bin/
│   └── index.cjs       # Main CLI entry point
├── src/
│   └── db.js           # Local data and configuration handler
├── data/               # Runtime data, created automatically
│   ├── apps.json       # Applications, paths, and shortcuts
│   ├── groups.json     # Workspace groups
│   └── config.json     # Language preference
├── package.json
└── README.MD
```

Runtime data is stored locally in the `data/` directory. These files are created automatically if they do not already exist.


## Contributing

1. Fork this repository.
2. Create a feature branch: `git checkout -b feature-name`.
3. Commit your changes.
4. Push the branch and open a Pull Request.

Keep changes compatible with Windows, macOS, and Linux when modifying application scanning or launching behavior.

## License

This project is released under the MIT License.
