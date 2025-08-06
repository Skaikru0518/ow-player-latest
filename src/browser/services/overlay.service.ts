import { app as electronApp } from 'electron';
import { overwolf } from '@overwolf/ow-electron';
import {
  IOverwolfOverlayApi,
  OverlayBrowserWindow,
  OverlayWindowOptions,
  GamesFilter,
} from '@overwolf/ow-electron-packages-types';
import EventEmitter from 'events';

const app = electronApp as overwolf.OverwolfApp;

export class OverlayService extends EventEmitter {
  constructor() {
    super();
    this.startOverlayWhenPackageReady();
  }

  private isOverlayReady: boolean = false;

  // Do not let the application access the overlay before it is ready
  public get overlayApi(): IOverwolfOverlayApi {
    if (!this.isOverlayReady) {
      return null;
    }
    return (app.overwolf.packages as any).overlay as IOverwolfOverlayApi;
  }

  startOverlayWhenPackageReady() {
    app.overwolf.packages.on('ready', (event, packageName, version) => {
      if (packageName !== 'overlay') {
        return;
      }

      this.isOverlayReady = true;
      this.startOverlay(version);
    });
  }

  public async createNewOsrWindow(
    options: OverlayWindowOptions,
  ): Promise<OverlayBrowserWindow> {
    const overlay = await this.overlayApi.createWindow(options);
    return overlay;
  }

  public async registerToGames(gameIds: number[]): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    this.log('[OverlayService] registering to game ids:', gameIds);

    const filters: GamesFilter = {
      gamesIds: gameIds,
    };

    await this.overlayApi.registerGames(filters);
    this.log('[OverlayService] overlay is registered!');
  }

  // must be called after package is 'ready' (i.e loaded)
  private startOverlay(version: string) {
    if (!this.overlayApi) {
      throw new Error('Attempting to access overlay before its ready');
    }

    this.log(`Overlay package is ready: ${version}`);

    this.registerOverlayEvents();

    this.emit('overlay-ready', version);
  }

  private registerOverlayEvents() {
    // prevent double events in case the package relaunch due crash or update.
    this.overlayApi.removeAllListeners();

    this.log('[OverlayService] registering to overlay package events');

    this.overlayApi.on('game-launched', (event, gameInfo) => {
      this.log(
        '[OverlayService][registerOverlayEvents] game launched',
        gameInfo,
      );

      if (gameInfo.processInfo.isElevated) {
        this.log(
          '[OverlayService][registerOverlayEvents] Game is running in elevated mode. Overlay injection is not possible unless the app is also elevated',
        );
        this.emit('elevated-game-detected', gameInfo);

        // cannot be injected so return
        return;
      }

      this.emit('injection-decision-handling', event, gameInfo);
    });

    this.overlayApi.on('game-injection-error', (gameInfo, error) => {
      this.log(
        '[OverlayService][registerOverlayEvents] error',
        error,
        gameInfo,
      );
      this.emit('injection-error', gameInfo, error);
    });

    this.overlayApi.on('game-injected', (gameInfo) => {
      this.log(
        '[OverlayService][registerOverlayEvents] game injected',
        gameInfo,
      );
      this.emit('game-injected', gameInfo);
    });

    this.overlayApi.on('game-focus-changed', (window, game, focus) => {
      this.log(
        '[OverlayService][registerOverlayEvents] game window focus changes',
        game.name,
        focus,
      );
    });

    this.overlayApi.on('game-window-changed', (window, game, reason) => {
      this.log(
        '[OverlayService][registerOverlayEvents] game window info changed',
        reason,
        window,
      );
    });

    this.overlayApi.on('game-input-interception-changed', (info) => {
      this.log(
        '[OverlayService][registerOverlayEvents] overlay input interception changed',
        info,
      );
      this.emit('input-interception-changed', info);
    });

    this.overlayApi.on('game-input-exclusive-mode-changed', (info) => {
      this.log(
        '[OverlayService][registerOverlayEvents] overlay input exclusive mode changed',
        info,
      );
    });
  }

  private log(message: string, ...args: any[]) {
    try {
      this.emit('log', message, ...args);
    } catch (error: any) {
      this.emit('error in [OverlayService]');
    }
  }
}
