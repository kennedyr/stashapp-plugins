import { OssmInteractive } from './interactive'
import { hackService } from './hack_service'
import { registerVideoInitializedEvent } from "@stashapp-plugins/shared";

(function () {
  const { React, hooks, patch, utils, GQL } = window.PluginApi;
  registerVideoInitializedEvent();

  let hooksInstalled = false;
  let ossmProviderInstalled = false;

  function HackyHookMount() {
    const toast = hooks.useToast();
    const { data: stashConfig } = GQL.useConfigurationQuery();
    React.useEffect(
      function () {
        hackService.Toast = toast;
        return function () {
          hackService.Toast = null;
        };
      },
      [toast]
    );
    React.useEffect(
      function () {
        hackService.Settings = stashConfig?.configuration ?? null;
        return function () {
          hackService.Settings = null;
        };
      },
      [stashConfig]
    );
    return null;
  }

  function installHackyHookMount() {
    if (hooksInstalled || !patch || !React || !hooks) return;

    hooksInstalled = true;
    patch.after("App", function (_props: React.PropsWithChildren<unknown>, _: any, _result: React.ReactNode) {
      var prevTree = arguments[arguments.length - 1];
      return React.createElement(
        React.Fragment,
        null,
        React.createElement(HackyHookMount, null),
        prevTree
      );
    });
  };
  installHackyHookMount();

  function installInteractiveClientProvider() {
    if (ossmProviderInstalled) return;

    ossmProviderInstalled = true;
    utils.InteractiveUtils.interactiveClientProvider = ({
      handyKey,
      scriptOffset,
    }) => {
      if (window.ossmInteractiveHandle) {
        return window.ossmInteractiveHandle;
      }
      const ossmInteractive = new OssmInteractive({ handyKey, scriptOffset });
      window.ossmInteractiveHandle = ossmInteractive;
      return ossmInteractive;
    };
  }
  installInteractiveClientProvider();
})();
