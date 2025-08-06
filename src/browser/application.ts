import {
  GameInfo,
  GameLaunchEvent,
} from '@overwolf/ow-electron-packages-types';
import { MainWindowController } from './controllers/main-window.controller';
import { OverlayService } from './services/overlay.service';
import { kGameIds } from '@overwolf/ow-electron-packages-types/game-list';
import { kGepSupportedGameIds } from '@overwolf/ow-electron-packages-types/gep-supported-games';
import { GameEventService } from './services/gep.service';

export class Application {
  constructor(
    private readonly overlayService: OverlayService,
    private readonly gepService: GameEventService,
    private readonly mainWindowController: MainWindowController,
  ) {
    overlayService.on('overlay-ready', this.overlayServiceReady.bind(this));

    overlayService.on(
      'injection-decision-handling',
      (event: GameLaunchEvent, gameInfo: GameInfo) => {
        event.inject();
      },
    );

    gepService.registerGames([kGepSupportedGameIds.TeamfightTactics]);
  }

  public run() {
    this.initialize();
  }

  private initialize() {
    const showDevTools = true;
    this.mainWindowController.createAndShow(showDevTools);
  }

  private overlayServiceReady() {
    this.overlayService.registerToGames([
      kGameIds.LeagueofLegends,
      kGameIds.TeamfightTactics,
      kGameIds.LeagueofLegendsPBE,
    ]);
  }
}
