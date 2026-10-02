const { ipcRenderer } = require("electron");

const token = ipcRenderer.sendSync("get-token");
if (token) localStorage.setItem("token", token);
