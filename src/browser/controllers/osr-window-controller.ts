import path from 'path';
import { OverlayService } from '../services/overlay.service';
import {
  OverlayBrowserWindow,
  OverlayWindowOptions,
  PassthroughType,
  ZOrderType,
} from '@overwolf/ow-electron-packages-types';

export class OSRWindowContoller {
  private overlayWindow: OverlayBrowserWindow = null;

  public get overlayBrowserWindow(): OverlayBrowserWindow {
    return this.overlayWindow;
  }

  private readonly overlayService: OverlayService;

  constructor(overlayService: OverlayService) {
    this.overlayService = overlayService;
  }

  public async createAndShow(showDevTools: boolean) {
    //name should be unique
    const options: OverlayWindowOptions = {
      name: 'osrWindow-player',
      height: 720,
      width: 1280,
      show: true,
      transparent: true,
      resizable: true,
      movable: true,
      autoHideMenuBar: false,
      webPreferences: {
        devTools: showDevTools,
        nodeIntegration: true,
        contextIsolation: false,
      },
    };

    //window position
    const activeGame = this.overlayService.overlayApi.getActiveGameInfo();
    const gameWindowInfo = activeGame?.gameWindowInfo;

    const gameWidth = gameWindowInfo?.size.width || 1920;
    const gameHeight = gameWindowInfo?.size.height || 1080;

    //calculate center
    options.x = Math.floor((gameWidth - options.width) / 2);
    options.y = Math.floor((gameHeight - options.height) / 2);

    this.overlayWindow = await this.overlayService.createNewOsrWindow(options);

    this.registerToIpc();
    this.registerToWindowEvents();

    if (process.env.NODE_ENV === 'development') {
      await this.overlayWindow.window.loadURL('http://localhost:5173');
    } else {
      await this.overlayWindow.window.loadURL(
        path.join(__dirname, '../renderer/osr.html'),
      );
    }

    this.overlayWindow.window.show();
  }

  private registerToIpc() {
    const windowIpc = this.overlayWindow.window.webContents.ipc;

    windowIpc.on('moveOsrClick', (e) => {
      const window = this.overlayWindow.window;
      window?.minimize();
    });

    windowIpc.on('setZorder', (e, value) => {
      let zOrder = parseInt(value);
      this.setWindowZorder(zOrder);
    });

    windowIpc.on('setPassthrough', (e, value) => {
      let pass = parseInt(value);
      this.setWindowPassthrough(pass);
    });

    windowIpc.on('devtools', () => {
      this.overlayWindow.window.webContents.openDevTools({ mode: 'detach' });
    });

    windowIpc.on('toggle-overlay', () => {
      if (this.overlayWindow.window.isVisible()) {
        this.overlayWindow.window.hide();
      } else {
        this.overlayWindow.window.show();
      }
    });
  }

  //handle ipc things
  private setWindowPassthrough(pass: PassthroughType) {
    this.overlayWindow.overlayOptions.passthrough = pass;
  }

  private setWindowZorder(zOrder: ZOrderType) {
    this.overlayWindow.overlayOptions.zOrder = zOrder;
  }

  private registerToWindowEvents() {
    const browserWindow = this.overlayWindow.window;
    browserWindow.on('closed', () => {
      this.overlayWindow = null;
      console.log('osr window closed');
    });
  }
}
