interface DeskOptions {
  keyboardLayout: string;
  whiteKeyboard: boolean;
  trackpadEnabled: boolean;
}

export function syncDeskOptions(settings: DeskOptions, mac: boolean, unavailable: boolean): void {
  document.querySelector('[data-mac-finish]')?.classList.toggle('hidden', settings.keyboardLayout !== 'macbook');
  document.querySelector('[data-pad-options]')?.classList.toggle('hidden', !mac);
  document.querySelector('[data-pad-error]')?.classList.toggle('hidden', !settings.trackpadEnabled || !unavailable);
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-finish], [data-pointer]')) {
    const active = button.dataset.finish !== undefined
      ? button.dataset.finish === (settings.whiteKeyboard ? 'white' : 'black')
      : button.dataset.pointer === (settings.trackpadEnabled ? 'trackpad' : 'mouse');
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  }
}
