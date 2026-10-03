const { app, BrowserWindow, Menu, session } = require("electron");
const path = require("path");
const crypto = require("crypto");

const SERVER = "http://localhost:11011";
const LOGIN_PAGE = "/index.html";
const PROTOCOL = "myquizapp";
const DEV = !app.isPackaged && process.argv.includes("--dev");
const PARTITION = "quiz-app";
const APP_KEY =
  "61389343649e6ccb55dbd17ae578ae32fe57e10d8a964d62f3e935ecb2cd1737";

let mainWin = null;
let quizWin = null;

if (process.defaultApp && process.argv.length >= 2) {
  app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [
    path.resolve(process.argv[1]),
  ]);
} else {
  app.setAsDefaultProtocolClient(PROTOCOL);
}

const isOurs = (url) => {
  try {
    return new URL(url).origin === new URL(SERVER).origin;
  } catch {
    return false;
  }
};

const isQuizUrl = (url) => {
  try {
    return isOurs(url) && new URL(url).searchParams.has("attempt");
  } catch {
    return false;
  }
};

const prefs = () => ({
  partition: PARTITION,
  devTools: DEV,
  contextIsolation: true,
  nodeIntegration: false,
  sandbox: true,
});

function lockNavigation(win) {
  win.webContents.on("will-navigate", (e, url) => {
    if (DEV) console.log("will-navigate:", url);
    if (win === mainWin && isQuizUrl(url)) {
      e.preventDefault();
      openQuizWindow(url);
    } else if (!isOurs(url)) {
      e.preventDefault();
    }
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (DEV) console.log("window.open:", url);
    if (win === mainWin && isQuizUrl(url)) openQuizWindow(url);
    return { action: "deny" };
  });
}

function createMainWindow() {
  mainWin = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    webPreferences: prefs(),
  });
  mainWin.maximize();
  lockNavigation(mainWin);

  mainWin.webContents.on(
    "did-fail-load",
    (_e, code, desc, url, isMainFrame) => {
      if (!isMainFrame || code === -3 || url.startsWith("file:")) return;
      mainWin.loadFile(path.join(__dirname, "offline.html"), {
        query: { retry: SERVER + LOGIN_PAGE, error: desc },
      });
    },
  );

  mainWin.once("ready-to-show", () => mainWin.show());
  mainWin.on("closed", () => {
    mainWin = null;
    app.quit();
  });
  mainWin.loadURL(SERVER + LOGIN_PAGE);
}

function openQuizWindow(url) {
  if (quizWin) {
    quizWin.focus();
    return;
  }

  quizWin = new BrowserWindow({
    show: false,
    fullscreen: true,
    kiosk: !DEV,
    backgroundColor: "#ffffff",
    webPreferences: prefs(),
  });

  if (!DEV) {
    quizWin.setAlwaysOnTop(true, "screen-saver");
    quizWin.setContentProtection(true);
  }

  lockNavigation(quizWin);

  quizWin.webContents.on("will-prevent-unload", (e) => e.preventDefault());

  quizWin.webContents.on("did-fail-load", (_e, code, _d, _u, isMainFrame) => {
    if (isMainFrame && code !== -3) quizWin.close();
  });

  if (!DEV) {
    quizWin.webContents.on("before-input-event", (e, input) => {
      const k = input.key.toLowerCase();
      const blocked =
        ["f5", "f11", "f12"].includes(k) ||
        (input.control && ["r", "w", "p", "s", "u"].includes(k)) ||
        (input.control && input.shift && ["i", "j", "c"].includes(k));
      if (blocked) e.preventDefault();
    });
  }

  quizWin.once("ready-to-show", () => quizWin.show());
  quizWin.on("closed", () => {
    quizWin = null;
    if (mainWin) {
      mainWin.show();
      mainWin.focus();
    }
  });

  mainWin.hide();
  quizWin.loadURL(url);
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    const w = quizWin || mainWin;
    if (!w) return;
    if (w.isMinimized()) w.restore();
    w.focus();
  });

  app.whenReady().then(() => {
    Menu.setApplicationMenu(null);

    const ses = session.fromPartition(PARTITION);

    ses.setPermissionRequestHandler((wc, permission, cb) =>
      cb(permission === "media" && isOurs(wc.getURL())),
    );
    ses.setPermissionCheckHandler(
      (wc, permission, origin) =>
        permission === "media" && isOurs(String(origin)),
    );

    ses.webRequest.onBeforeSendHeaders(
      { urls: [SERVER + "/*"] },
      (details, cb) => {
        const ts = Date.now().toString();
        const pathname = new URL(details.url).pathname;
        const sig = crypto
          .createHmac("sha256", APP_KEY)
          .update(`${ts}.${details.method}.${pathname}`)
          .digest("hex");
        details.requestHeaders["X-Quiz-Ts"] = ts;
        details.requestHeaders["X-Quiz-Sig"] = sig;
        cb({ requestHeaders: details.requestHeaders });
      },
    );

    createMainWindow();
  });
}

app.on("window-all-closed", () => app.quit());
