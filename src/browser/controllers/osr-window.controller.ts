import path from 'path';
import { OverlayService } from '../services/overlay.service';
import {
  OverlayBrowserWindow,
  OverlayWindowOptions,
  PassthroughType,
  ZOrderType,
} from '@overwolf/ow-electron-packages-types';

export class OSRWindowController {
  private overlayWindow: OverlayBrowserWindow = null;

  public get overlayBrowserWindow(): OverlayBrowserWindow {
    return this.overlayWindow;
  }

  constructor(private readonly overlayService: OverlayService) {}

  public async createAndShow(showDevtools: boolean) {
    const options: OverlayWindowOptions = {
      name: 'osr-window-' + Math.floor(Math.random() * 1000),
      width: 800,
      height: 600,
      transparent: true,
      resizable: true,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        devTools: showDevtools,
      },
    };

    const activeGame = this.overlayService.overlayApi.getActiveGameInfo();
    const gameWindowInfo = activeGame?.gameWindowInfo;

    const screenWidth = gameWindowInfo?.size.width || 800;
    const screenHeight = gameWindowInfo?.size.height || 600;

    options.x = Math.floor(screenWidth / 2 - options.width / 2);
    options.y = Math.floor(screenHeight / 2 - options.height / 2);

    this.overlayWindow = await this.overlayService.createNewOsrWindow(options);

    this.registerToIpc();

    this.registerToWindowEvents();

    await this.overlayWindow.window.loadURL(
      path.join(__dirname, '../renderer/osr.html'),
    );

    this.overlayWindow.window.show();
  }

  private registerToWindowEvents() {
    const browserWindow = this.overlayWindow.window;
    browserWindow.on('closed', () => {
      this.overlayWindow = null;
      console.log('osr closed');
    });
  }

  private registerToIpc() {
    const windowIpc = this.overlayBrowserWindow.window.webContents.ipc;

    windowIpc.on('resize-osr-click', (e, width, height) => {
      this.handleResizeCommand(width, height);
    });

    windowIpc.on('move-osr-click', (e) => {
      this.handleMoveCommand();
    });

    windowIpc.on('minimize-osr-click', (e) => {
      const window = this.overlayWindow.window;
      window?.minimize();
    });

    windowIpc.on('set-passthrough', (e, value) => {
      let pass = parseInt(value);
      this.setWindowPassthrough(pass);
    });

    windowIpc.on('set-zorder', (e, value) => {
      let zOrder = parseInt(value);
      this.setWindowZorder(zOrder);
    });

    windowIpc.on('devtools', () => {
      this.overlayWindow.window.webContents.openDevTools({ mode: 'detach' });
    });
  }

  private setWindowZorder(zOrder: ZOrderType) {
    this.overlayWindow.overlayOptions.zOrder = zOrder;
  }

  private setWindowPassthrough(pass: PassthroughType) {
    this.overlayWindow.overlayOptions.passthrough = pass;
  }

  private handleMoveCommand(x?: number, y?: number) {
    const overlayApi = this.overlayService.overlayApi;
    const gameWindowInfo = overlayApi.getActiveGameInfo()?.gameWindowInfo;
    const size = gameWindowInfo.size;

    if (!gameWindowInfo) {
      return;
    }

    const window = this.overlayWindow.window;
    const overlayWidth = window.getBounds().width;
    const overlayHeight = window.getBounds().height;

    const posX =
      x !== undefined ? x : Math.floor(size.width / 2 - overlayWidth / 2);
    const posY =
      y !== undefined ? y : Math.floor(size.height / 2 - overlayHeight / 2);

    window.setPosition(posX, posY);
  }
  private handleResizeCommand(width?: number, height?: number) {
    const window = this.overlayWindow.window;

    const w = width !== undefined ? width : 800;
    const h = height !== undefined ? height : 600;

    window.setSize(w, h);
  }
}
