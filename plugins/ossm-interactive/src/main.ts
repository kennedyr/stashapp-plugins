import type { IInteractiveClient, IInteractiveClientProvider } from './StashInterfaces.js'
import { OssmInteractive } from './interactive.ts'

export const PLUGIN_ID = "ossm-interactive";

export const ossmInteractiveClientProvider: IInteractiveClientProvider = ({
  handyKey,
  scriptOffset,
}): IInteractiveClient => {
  return new OssmInteractive(handyKey, scriptOffset);
};
