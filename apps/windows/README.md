# Rivals Intel for Windows

This desktop shell opens the hosted Rivals Intel web app in a native Windows window.

## Build locally

```bash
npm install
npm start
npm run dist
```

The GitHub Actions workflow creates a Windows NSIS installer. The desktop shell does not inspect the Marvel Rivals process or read game memory. It is a secure browser wrapper around the same web experience.
