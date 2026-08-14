import type { IInteractiveClient, IInteractiveClientProvider } from './StashInterfaces.js'
import { OssmInteractive } from './interactive'

const ossmInteractiveClientProvider: IInteractiveClientProvider = ({
  handyKey,
  scriptOffset,
}): IInteractiveClient => {
  const ossmInteractive = new OssmInteractive(handyKey, scriptOffset);
  // @ts-expect-error
  window.ossmInteractiveHandle = ossmInteractive;
  return ossmInteractive;
};

if (!window.PluginApi.utils.InteractiveUtils) {
  console.error('InteractiveUtils Not Ready');
}
if (window.PluginApi.utils.InteractiveUtils.interactiveClientProvider) {
  console.warn('OssmInteractiveClientProvider Already initialized');
}
window.PluginApi.utils.InteractiveUtils.interactiveClientProvider = ossmInteractiveClientProvider;