import { app as ElectronApp } from 'electron';
import { Application } from './application';
import { OverlayHotkeysService } from './services/overlay-hotkeys.service';
import { OverlayService } from './services/overlay.service';
import { GameEventsService } from './services/gep.service';
import { MainWindowController } from './controllers/main-window.controller';
import { OverlayInputService } from './services/overlay-input.service';
import { OSRWindowContoller } from './controllers/osr-window-controller';

/**
 * TODO: Integrate your own dependency-injection library
 */
const bootstrap = (): Application => {
  const overlayService = new OverlayService();
  const overlayHotkeysService = new OverlayHotkeysService(overlayService);
  const gepService = new GameEventsService();
  const inputService = new OverlayInputService(overlayService);

  const createOsrWindowControllerFactory = (): OSRWindowContoller => {
    const controller = new OSRWindowContoller(overlayService);
    return controller;
  };

  const mainWindowController = new MainWindowController(
    gepService,
    overlayService,
    createOsrWindowControllerFactory,
    overlayHotkeysService,
    inputService,
  );

  return new Application(overlayService, gepService, mainWindowController);
};

const app = bootstrap();

ElectronApp.whenReady().then(() => {
  app.run();
});

ElectronApp.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    ElectronApp.quit();
  }
});
