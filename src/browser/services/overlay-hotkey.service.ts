import { app } from 'electron';
import { overwolf } from '@overwolf/ow-electron';
import {
  ExclusiveInputOptions,
  IOverwolfOverlayApi,
  PassthroughType,
  ZOrderType,
} from '@overwolf/ow-electron-packages-types';
import EventEmitter from 'events';
import { OverlayService } from './overlay.service';

const owElectron = app as overwolf.OverwolfApp;

// Class handling in-game hotkeys
export class OverlayHotkeyService extends EventEmitter {
  constructor(overlayService: OverlayService) {
    super();
    overlayService.on('overlay-ready', this.installHotkeys.bind(this));
  }

  get overlayApi(): IOverwolfOverlayApi {
    return (owElectron.overwolf.packages as any).overlay as IOverwolfOverlayApi;
  }

  // hotkeys
  private installHotkeys() {
    // non blocked hotkey
    this.overlayApi.hotkeys.register(
      {
        name: 'toggleOverlay',
        keyCode: 89, // y
        modifiers: { ctrl: true, shift: true },
        passthrough: false,
      },
      (hotkey, state) => {
        this.log(
          `[OverlayHotkeyService][InstallHotkeys] on hotkey ${hotkey.name}`,
          state,
        );

        if (state === 'pressed') {
          this.emit('toggle-overlay');
        }
      },
    );

    this.overlayApi.hotkeys.register(
      {
        name: 'exclusive-mode',
        keyCode: 9, // tab
        modifiers: { ctrl: true },
        passthrough: false,
      },
      (hotkey, state) => {
        if (state === 'pressed') {
          this.emit('exclusive-mode-toggle');
        }
      },
    );
  }

  public updateHotkey(hotkeyName: string) {
    if (!this.overlayApi) {
      return;
    }

    const hotkey = this.overlayApi.hotkeys
      .all()
      .find((h) => h.name === hotkeyName);

    if (!hotkey) {
      this.log('[OverlayHotkeyService] Hotkey not found:', hotkeyName);
      return;
    }

    hotkey.passthrough = !hotkey.passthrough;
    this.overlayApi.hotkeys.update(hotkey);
  }

  // private resetZOrder() {
  //   this.log(`[OverlayHotkeyService][InstallHotkeys] resetting passthrough`);

  //   this.overlayApi.getAllWindows()?.forEach((window) => {
  //     const overlayOptions = window.overlayOptions;
  //     overlayOptions.zOrder = ZOrderType.Default;
  //   });
  // }

  // private resetOSRPassthrough() {
  //   this.log(`[OverlayHotkeyService][InstallHotkeys] resetting passthrough`);

  //   this.overlayApi?.getAllWindows()?.forEach((window) => {
  //     const overlayOptions = window.overlayOptions;
  //     overlayOptions.passthrough = PassthroughType.NoPassThrough;
  //   });
  // }

  private log(message: string, ...args: any[]) {
    this.emit('log', message, ...args);
  }
}
