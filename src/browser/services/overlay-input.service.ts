import { app } from 'electron';
import { OverlayService } from './overlay.service';
import { overwolf } from '@overwolf/ow-electron';
import {
  ExclusiveInputOptions,
  GameInfo,
  GameInputInterception,
  GameWindowInfo,
  IOverwolfOverlayApi,
  OverlayBrowserWindow,
  OverlayWindowOptions,
  PassthroughType,
  ZOrderType,
} from '@overwolf/ow-electron-packages-types';

import path from 'path';
import { OverlayHotkeyService } from './overlay-hotkey.service';

const owElectron = app as overwolf.OverwolfApp;

export enum ExclusiveHotkeyMode {
  Toggle,
  AutoRelease,
}

export class OverlayInputService {
  private exclusiveModeBGWindow: OverlayBrowserWindow = null;
  private inputOptions: ExclusiveInputOptions = {
    backgroundColor: 'rgba(12, 12, 12, 0.5)',
  };
  public exclusiveModeAsWindow = false;
  public mode: ExclusiveHotkeyMode = ExclusiveHotkeyMode.Toggle;

  constructor(
    overlayService: OverlayService,
    hotkeyService: OverlayHotkeyService,
  ) {
    overlayService.on('overlay-ready', this.init.bind(this));
    hotkeyService.on('exclusive-mode-toggle', () =>
      this.onExclusiveModeHotkey(true),
    );
  }

  get overlayApi(): IOverwolfOverlayApi {
    return (owElectron.overwolf.packages as any).overlay as IOverwolfOverlayApi;
  }

  private init() {
    this.overlayApi.on('game-injected', (gameInfo) => {
      this.onNewGameInjected(gameInfo);
    });

    this.overlayApi.on('game-exit', (gameInfo, wasInjected) => {
      if (wasInjected) {
        this.onGameExit();
      }
    });

    this.overlayApi.on('game-window-changed', (window, gameInfo, reason) => {
      this.onUpdateGameWindow(window);
    });

    this.overlayApi.on('game-input-interception-changed', (info) => {
      if (info.canInterceptInput === false) {
        this.assureExclusiveModeWindow();
      }
    });

    this.overlayApi.on('game-input-exclusive-mode-changed', (info) => {
      this.onGameExclusiveModeChanged(info);
    });
  }

  async assureExclusiveModeWindow() {
    if (!this.exclusiveModeAsWindow || this.exclusiveModeBGWindow) {
      return;
    }

    const activeGame = this.overlayApi.getActiveGameInfo();
    const width = activeGame?.gameWindowInfo?.size.width || 800;
    const heigth = activeGame?.gameWindowInfo?.size.height || 600;

    const options: OverlayWindowOptions = {
      name: 'game-overlay-window',
      height: heigth,
      width: width,
      show: true,
      passthrough: PassthroughType.PassThrough,
      zOrder: ZOrderType.BottomMost,
      transparent: true,
      resizable: true,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        devTools: true,
      },
    };

    this.exclusiveModeBGWindow = await this.overlayApi.createWindow(options);

    this.registerToIpc();

    await this.exclusiveModeBGWindow.window.loadURL(
      path.join(__dirname, '../exclusive/exclusive.html'),
    );

    this.exclusiveModeBGWindow.window.webContents.openDevTools({
      mode: 'detach',
    });

    this.exclusiveModeBGWindow.window.hide();
  }

  registerToIpc() {
    const windowIpc = this.exclusiveModeBGWindow.window.webContents.ipc;

    windowIpc.on('HIDE_EXCLUSIVE', (e) => {
      this.exclusiveModeBGWindow.window.hide();
    });
  }

  public updateExclusiveModeOptions(options: any) {
    this.inputOptions = {
      fadeAnimateInterval: options?.animationDuration,
      backgroundColor: options?.color,
    };
  }

  private onExclusiveModeHotkey(pressed: boolean) {
    const inputInfo = this.overlayApi?.getActiveGameInfo()?.gameInputInfo;
    if (!Gamepad) {
      throw new Error('Not in game?');
    }

    switch (this.mode) {
      case ExclusiveHotkeyMode.Toggle:
        this.onHotKeyToggle(pressed, inputInfo);
        break;
      case ExclusiveHotkeyMode.AutoRelease:
        this.onHotKeyAutoRelease(pressed, inputInfo);
        break;
    }
  }
  private onHotKeyAutoRelease(
    pressed: boolean,
    inputInfo: GameInputInterception,
  ) {
    if (!pressed) {
      this.overlayApi?.exitExclusiveMode();
      return;
    }
    this.enterExclusiveMode();
  }

  private onHotKeyToggle(pressed: boolean, inputInfo: GameInputInterception) {
    if (!pressed) {
      return;
    }

    if (inputInfo.exclusiveMode === true) {
      this.overlayApi?.exitExclusiveMode();
      return;
    }

    this.enterExclusiveMode();
  }

  private enterExclusiveMode() {
    /*
    if (inputInfo.canInterceptInput == true) {
      return;
    }
    */

    if (this.exclusiveModeAsWindow) {
      this.overlayApi?.enterExclusiveMode({
        backgroundColor: 'rgba(0,0,0,0)',
      });
    } else {
      this.exclusiveModeBGWindow?.window.hide();
      this.overlayApi?.enterExclusiveMode(this.inputOptions);
    }
  }

  private onNewGameInjected(gameInfo: GameInfo) {
    this.assureExclusiveModeWindow();
  }

  private onGameExit() {
    this.exclusiveModeBGWindow?.window?.close();
    this.exclusiveModeBGWindow = null;
  }

  private onUpdateGameWindow(window: GameWindowInfo) {
    if (!this.exclusiveModeBGWindow) {
      return;
    }

    this.exclusiveModeBGWindow.window.setSize(
      window.size.width,
      window.size.height,
    );
  }

  private onGameExclusiveModeChanged(info: GameInputInterception) {
    if (!this.exclusiveModeBGWindow) {
      return;
    }

    if (!this.exclusiveModeAsWindow) {
      this.exclusiveModeBGWindow?.window?.hide();
    }

    if (info.exclusiveMode === true) {
      this.exclusiveModeBGWindow.window.show();
    }

    this.exclusiveModeBGWindow.window.webContents.send(
      'EXCLUSIVE_MODE',
      info.exclusiveMode === true,
    );
  }
}
