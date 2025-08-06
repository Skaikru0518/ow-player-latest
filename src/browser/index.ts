import { app as ElectronApp } from 'electron';
import { Application } from './application';
import { OverlayHotkeyService } from './services/overlay-hotkey.service';
import { OverlayService } from './services/overlay.service';
import { GameEventService } from './services/gep.service';
import { MainWindowController } from './controllers/main-window.controller';
import { OSRWindowController } from './controllers/osr-window.controller';
import { OverlayInputService } from './services/overlay-input.service';

const bootstrap = (): Application => {
  const overlayService = new OverlayService();
  const overlayHotkeysService = new OverlayHotkeyService(overlayService);
  const gepService = new GameEventService();
  const inputService = new OverlayInputService(
    overlayService,
    overlayHotkeysService,
  );

  const createOsrWindowControllerFactory = (): OSRWindowController => {
    const controller = new OSRWindowController(overlayService);
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
  if (process.platform === 'darwin') {
    ElectronApp.quit();
  }
});
