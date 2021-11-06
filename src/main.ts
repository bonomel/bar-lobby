import { defaultMainWindowConfig, MainWindow } from "@/main-window";
import { HardwareInfo } from "@/model/hardware-info";
import { app, App, ipcMain, protocol, screen } from "electron";
import installExtension, { VUEJS3_DEVTOOLS } from "electron-devtools-installer";

export class Application {
    protected app: App;
    protected mainWindow?: MainWindow;

    constructor(app: App) {
        this.app = app;

        protocol.registerSchemesAsPrivileged([{
            scheme: "app",
            privileges: {
                secure: true,
                standard: true,
                stream: true
            }
        }]);

        this.app.commandLine.appendSwitch("disable-features", "HardwareMediaKeyHandling,MediaSessionService");

        if (process.env.NODE_ENV !== "production") {
            if (process.platform === "win32") {
                process.on("message", (data) => {
                    if (data === "graceful-exit") {
                        app.quit();
                    }
                });
            } else {
                process.on("SIGTERM", () => {
                    app.quit();
                });
            }
        }
        
        this.app.on("ready", () => this.onReady());
        this.app.on("activate", () => this.onActivate());
        this.app.on("window-all-closed", () => this.onWindowAllClosed());

        const getHardwareInfo: () => Promise<HardwareInfo> = async function () {
            return {
                screenIds: screen.getAllDisplays().map(screen => screen.id)
            };
        };
        
        ipcMain.handle("get-hardware-info", getHardwareInfo);
        
        const changeDisplay: (displayId: number) => Promise<void> = async function (displayId) {
            console.log(displayId);
        };
    }

    protected async onReady() {
        if (process.env.NODE_ENV !== "production" && !process.env.IS_TEST) {
            try {
                await installExtension(VUEJS3_DEVTOOLS);
            } catch (e: any) {
                console.error("Vue Devtools failed to install:", e.toString());
            }
        }

        if (!this.mainWindow) {
            this.mainWindow = new MainWindow(defaultMainWindowConfig);
        }
    }

    protected async onActivate() {
        if (!this.mainWindow) {
            this.mainWindow = new MainWindow(defaultMainWindowConfig);
        }
    }

    protected async onWindowAllClosed() {
        if (process.platform !== "darwin") {
            this.app.quit();
        }
    }
}

new Application(app);