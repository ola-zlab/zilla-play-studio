# Build Zilla Play into a Windows EXE without installing Node.js on your PC

This project includes a GitHub Actions workflow that builds the Windows installer on a GitHub-hosted Windows machine. Your own Windows 10 computer only needs a web browser.

## 1. Create a GitHub repository
1. Sign in to GitHub and open https://github.com/new
2. Name the repository `zilla-play`.
3. Choose **Private** (recommended) or Public.
4. Create the repository. Do not add a README, licence or `.gitignore` because this project already contains its own files.

## 2. Upload the project files
1. Download and extract `Zilla-Play-Studio-2.0-Cloud-Build.zip` on your computer.
2. Open the extracted `Zilla-Play-Studio-2.0-Cloud-Build` folder.
3. In your new GitHub repository, choose **Add file → Upload files**.
4. Drag the project contents into the upload area. Include the `.github` folder as well as `src`, `electron`, `package.json`, `index.html`, `vite.config.js` and `README.md`. Do not upload the ZIP file itself.
5. Commit the uploaded files to the `main` branch.

GitHub's browser upload supports folders and up to 100 files per upload. This project is below that limit.

## 3. Let GitHub build the installer
1. Open the **Actions** tab in the repository.
2. Select **Build Zilla Play Windows installer**.
3. The run starts automatically after your upload. If it has not started, open the workflow and choose **Run workflow**.
4. Wait until the run shows a green check mark. If it fails, open the run and select the failed step to see its error log.

## 4. Download the EXE
1. Open the completed workflow run.
2. Scroll to the **Artifacts** section.
3. Download **Zilla-Play-Windows-Installer**.
4. Extract the downloaded artifact ZIP.
5. Run `Zilla Play Setup 2.0.0.exe` to install Zilla Play.

The cloud build artifact is retained for 14 days by this workflow. Download and keep a copy of the installer.

## Notes
- No local Node.js installation or local build is required.
- GitHub Actions builds on a GitHub-hosted Windows runner.
- The installer is built from the source code in this repository. Review the source and workflow before running or distributing the installer.
- A Windows SmartScreen warning can appear for unsigned apps. This project does not include a paid code-signing certificate.
- GitHub may require you to sign in and enable Actions for the repository.
