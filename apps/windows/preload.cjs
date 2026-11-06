const { contextBridge } = require("electron");
contextBridge.exposeInMainWorld("rivalsIntelDesktop", Object.freeze({
  platform: "windows",
  appName: "Rivals Intel"
}));
