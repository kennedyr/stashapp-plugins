import type { IInteractiveClient, IInteractiveClientProvider } from './StashInterfaces.js'
import { OssmInteractive } from './interactive'

(function () {
  const ossmInteractiveClientProvider: IInteractiveClientProvider = ({
    handyKey,
    scriptOffset,
  }): IInteractiveClient => {
    return new OssmInteractive(handyKey, scriptOffset);
  };

  if (!window.PluginApi.utils.InteractiveUtils) {
    console.error('Not ready');
    return;
  }
  if (window.PluginApi.utils.InteractiveUtils.interactiveClientProvider) {
    console.warn('Already initialized');
    return;
  }
  window.PluginApi.utils.InteractiveUtils.interactiveClientProvider = ossmInteractiveClientProvider;
})();