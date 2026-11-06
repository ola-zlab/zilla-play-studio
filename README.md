# Zilla Play

A futuristic local music player built with React + Vite, with an Electron wrapper for Windows desktop packaging.

## What it does
- Imports local audio files (MP3, WAV, OGG, M4A, AAC, FLAC, OPUS where supported by the browser/runtime).
- Saves imported audio blobs in IndexedDB on the current device.
- Real-time frequency visualizer powered by the Web Audio API analyser.
- Play/pause, seek, volume, previous/next, shuffle, repeat, search, and liked tracks.
- Runs as a web app and can be packaged as a Windows installer.

## Requirements
- Node.js 20 or newer
- npm

## Run as a website locally
```bash
npm install
npm run dev
```
Open the local URL printed by Vite.

## Test the production web build
```bash
npm run build
npm run preview
```

## Run the Windows desktop app in development
```bash
npm install
npm run electron:dev
```

## Build the Windows installer (.exe)
On Windows:
```bash
npm install
npm run dist:win
```
The installer will be created in `release/`.

## Website integration later
The `src/` folder is the React music-player UI and can be integrated into a React/Vite website. The player uses browser APIs and IndexedDB; it does not upload music to a server. The Electron wrapper is separate in `electron/` and can be retained for the downloadable Windows app.

Important: browser local storage is scoped to the website origin and browser profile. A user's browser library does not automatically transfer into the installed Windows app, or between different browsers/devices. The app intentionally stores music locally and does not include copyrighted music or a streaming catalog.


## Build the Windows EXE without installing Node.js locally
A GitHub Actions workflow is included at `.github/workflows/build-windows.yml`. Upload the project files to a GitHub repository, including the `.github` folder. The workflow builds the Windows installer on a GitHub-hosted Windows machine and uploads it as the `Zilla-Play-Windows-Installer` artifact. Follow `BUILD-WITHOUT-NODE.md` for the browser-only steps.
