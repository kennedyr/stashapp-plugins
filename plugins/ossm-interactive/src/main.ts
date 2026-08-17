import type { IInteractiveClient, IInteractiveClientProvider } from './StashTypes'
import { OssmInteractive } from './interactive'

(function () {

  /** Same green/red banners Stash uses for “Updated scene” etc. (see hooks/Toast.tsx). */
  let toastRef: ReturnType<typeof window.PluginApi.hooks.useToast> | null = null;
  let toastRefInstalled = false;

  /** Must be a stable function identity — defining inside patch.after() remounts every App render and breaks the UI. */
  function DuplicateResolverStashNotifyMount() {
    const React = window.PluginApi.React;
    const toast = window.PluginApi.hooks.useToast();
    React.useEffect(
      function () {
        toastRef = toast;
        return function () {
          toastRef = null;
        };
      },
      [toast]
    );
    return null;
  }

  function installStashInlineNotifyBridge() {
    if (toastRefInstalled || typeof window.PluginApi === "undefined") return;
    if (!window.PluginApi.patch || !window.PluginApi.patch.after || !window.PluginApi.React || !window.PluginApi.hooks || !window.PluginApi.hooks.useToast) return;
    toastRefInstalled = true;
    window.PluginApi.patch.after("App", function () {
      var React = window.PluginApi.React;
      /** Patch passes afterFn(...originalArgs, renderedTree). Last arg is always App output; arity can be 1 if a before() cleared args. */
      var prevTree = arguments[arguments.length - 1];
      return React.createElement(
        React.Fragment,
        null,
        React.createElement(DuplicateResolverStashNotifyMount, null),
        prevTree
      );
    });
  }

  installStashInlineNotifyBridge();

  const ossmInteractiveClientProvider: IInteractiveClientProvider = ({
    handyKey,
    scriptOffset,
  }): IInteractiveClient => {
    const ossmInteractive = new OssmInteractive(handyKey, scriptOffset, toastRef);
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

})();
