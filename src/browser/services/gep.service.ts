import { app as electronApp } from 'electron';
import { overwolf } from '@overwolf/ow-electron';
import EventEmitter from 'events';

const app = electronApp as overwolf.OverwolfApp;

/**
 * Service used to register for Game Events,
 * receive game events, and then send them to a window for visual feedback
 */
export class GameEventService extends EventEmitter {
  private gameEventsApi: overwolf.packages.OverwolfGameEventPackage;
  private activeGameId: number = 0;
  private supportedGameIds: number[] = [];

  constructor() {
    super();
    this.registerOverwolfPackageManager();
  }

  private registerOverwolfPackageManager() {
    app.overwolf.packages.on('ready', (e, packageName, version) => {
      if (packageName !== 'gep') {
        return;
      }

      this.emit(
        'log',
        '[GameEventService][registerOverwolfPackageManager] GEP package is ready. Version:',
        version,
      );

      this.onGameEventsPackageReady();

      this.emit('ready');
    });
  }

  /**
   *  For GEP supported games see:
   *  https://overwolf.github.io/api/electron/game-events/
   */
  public registerGames(gameIds: number[]) {
    this.emit(
      'log',
      '[GameEventService][registerGames] Registering to game events for:',
      gameIds,
    );
    this.supportedGameIds = gameIds;
  }

  public async setRequiredFeaturesForAllSupportedGames() {
    await Promise.all(
      this.supportedGameIds.map(async (gameId) => {
        this.emit(
          'log',
          `[GameEventService][setRequiredFeaturesForAllSupportedGames] Setting required features for gameId: ${gameId}`,
        );
        await this.gameEventsApi.setRequiredFeatures(gameId, null);
      }),
    );
  }

  public async getInfoForActiveGame(): Promise<any> {
    if (!this.activeGameId) {
      return '[GameEventService][getInfoForActiveGame] Error: No active game';
    }

    return await this.gameEventsApi.getInfo(this.activeGameId);
  }

  private async onGameEventsPackageReady() {
    // Save package into a private variable for later access
    this.gameEventsApi = app.overwolf.packages.gep;

    // Remove all listeners to have a clean slate
    this.gameEventsApi.removeAllListeners();

    // Listen for game-detected events
    this.gameEventsApi.on('game-detected', (event, gameId, name, gameInfo) => {
      if (!this.supportedGameIds.includes(gameId)) {
        this.emit(
          'log',
          '[GameEventService][onGameEventsPackageReady] Skipping unsupported game-detected: ' +
            JSON.stringify({ gameId, name, pid: gameInfo.pid }),
        );
        return;
      }

      // check if a game is running in elevated mode
      if (gameInfo.isElevated) {
        this.emit(
          'log',
          '[GameEventService][onGameEventsPackageReady] Game is running in elevated mode.',
        );
      }

      this.emit(
        'log',
        '[GameEventService][onGameEventsPackageReady] Detected supported game. Registering...',
        { gameId, name, gameInfo },
      );
      event.enable();
      this.activeGameId = gameId;
    });

    // Handle exiting a game
    this.gameEventsApi.on(
      'game-exit',
      (event, activeGameId, processName, pid) => {
        this.emit(
          'log',
          '[GameEventService][onGameEventsPackageReady] Game exited:',
          { gameId: activeGameId, processName, pid },
        );

        if (this.activeGameId === activeGameId) {
          this.activeGameId = 0;
          this.emit('game-exit', { gameId: activeGameId, processName, pid });
        }
      },
    );

    // If a game is detected running in elevated mode
    // **Note** - This fires AFTER `game-detected`
    this.gameEventsApi.on(
      'elevated-privileges-required',
      (event, activeGameId, ...args) => {
        this.emit(
          'log',
          '[GameEventService][onGameEventsPackageReady] Elevated privileges required!',
          { gameId: activeGameId, details: args },
        );
      },
    );

    this.gameEventsApi.on('new-info-update', (event, activeGameId, ...args) => {
      this.emit(
        'log',
        '[GameEventService][onGameEventsPackageReady] info update',
        {
          gameId: activeGameId,
          details: args,
        },
      );

      // separate event for ui or other services
      this.emit('info-update', { gameid: activeGameId, data: args });
    });

    this.gameEventsApi.on('new-game-event', (event, activeGameId, ...args) => {
      this.emit(
        'log',
        '[GameEventService][onGameEventsPackageReady] new game event',
        { gameId: activeGameId, details: args },
      );
    });

    this.gameEventsApi.on('error', (event, activeGameId, ...args) => {
      this.emit('log', '[GameEventService][onGameEventsPackageReady] error', {
        gameId: activeGameId,
        details: args,
      });

      this.activeGameId = 0;
    });
  }
}
