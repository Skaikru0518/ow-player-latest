import { app as electronApp, ipcMain, BrowserWindow } from 'electron';
import { GameEventService } from '../services/gep.service';
import path from 'path';
import { OSRWindowController } from './osr-window.controller';
import { OverlayService } from '../services/overlay.service';
import { overwolf } from '@overwolf/ow-electron';
import { OverlayHotkeyService } from '../services/overlay-hotkey.service';
import {
  OverlayInputService,
  ExclusiveHotkeyMode,
} from '../services/overlay-input.service';

const owElectronApp = electronApp as overwolf.OverwolfApp;

export class MainWindowController {
  private browserWindow: BrowserWindow = null;

  constructor(
    private readonly gepService: GameEventService,
    private readonly overlayService: OverlayService,
    private readonly createOSRWinController: () => OSRWindowController,
    private readonly overlayHotkeyService: OverlayHotkeyService,
    private readonly overlayInputService: OverlayInputService,
    private osrWindowController: OSRWindowController | null = null,
  ) {
    this.registerToIpc();

    gepService.on('log', this.printLogMessage.bind(this));
    overlayService.on('log', this.printLogMessage.bind(this));
    overlayHotkeyService.on('log', this.printLogMessage.bind(this));

    owElectronApp.overwolf.packages.on('crashed', (e, ...args) => {
      this.printLogMessage('package crashed', ...args);
    });

    owElectronApp.overwolf.packages.on(
      'failed-to-initialize',
      this.logPackageManagerErrors.bind(this),
    );
  }

  private printLogMessage(message: string, ...args: any[]) {
    if (this.browserWindow?.isDestroyed() ?? true) {
      return;
    }

    this.browserWindow?.webContents.send('console-message', message, ...args);
  }

  private logPackageManagerErrors(e, packageName, ...args: any[]) {
    this.printLogMessage(
      'Overwolf Package Manager Error',
      packageName,
      ...args,
    );
  }

  public createAndShow(showDevTools: boolean) {
    this.browserWindow = new BrowserWindow({
      width: 800,
      height: 600,
      show: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: true,
        devTools: showDevTools,
        preload: path.join(__dirname, '../preload/preload.js'),
      },
    });

    this.browserWindow.once('ready-to-show', () => {
      this.browserWindow.show();
    });
    this.browserWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  private registerToIpc() {
    ipcMain.handle('create-osr', async () => {
      await this.gepService.setRequiredFeaturesForAllSupportedGames();
      return true;
    });

    ipcMain.handle('gep-getInfo', async () => {
      return await this.gepService.getInfoForActiveGame();
    });

    ipcMain.handle('toggle-osr-visibility', async () => {
      if (
        this.osrWindowController &&
        this.osrWindowController.overlayBrowserWindow
      ) {
        const win = this.osrWindowController.overlayBrowserWindow.window;
        if (win.isVisible()) {
          win.hide();
        } else {
          win.show();
        }
      } else {
        await this.createOSRWindow();
      }
    });

    ipcMain.handle('update-hotkey', async (e, hotkey) => {
      this.overlayHotkeyService?.updateHotkey(hotkey);
    });

    ipcMain.handle('update-exclusive-options', async (sender, options) => {
      this.overlayInputService?.updateExclusiveModeOptions(options);
    });

    ipcMain.handle('exclusive-type', async (sender, type) => {
      if (!this.overlayInputService) {
        return;
      }

      if (type === 'customWindow') {
        this.overlayInputService.exclusiveModeAsWindow = true;
      } else {
        this.overlayInputService.exclusiveModeAsWindow = false;
      }
    });

    ipcMain.handle('exclusive-behavior', async (sender, behavior) => {
      if (!this.overlayInputService) {
        return;
      }

      if (behavior === 'toggle') {
        this.overlayInputService.mode = ExclusiveHotkeyMode.Toggle;
      } else {
        this.overlayInputService.mode = ExclusiveHotkeyMode.AutoRelease;
      }
    });
  }

  private async createOSRWindow(): Promise<void> {
    if (!this.osrWindowController) {
      this.osrWindowController = this.createOSRWinController();
      await this.osrWindowController.createAndShow(true);

      this.osrWindowController.overlayBrowserWindow.window.on('closed', () => {
        this.printLogMessage('osr window closed');
        this.osrWindowController = null;
      });
    } else {
      this.osrWindowController.overlayBrowserWindow.window.show();
    }
  }
}
