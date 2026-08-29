let videoInitializedEventInstalled = false;

export const pathListener = (pathRegExp: RegExp, callback: (path: string) => void) => {
  const test_path = (path: string) => {
    if (!pathRegExp || pathRegExp.test(path)) {
      callback(path);
    }
  }
  test_path(window.location.pathname);

  window.PluginApi.Event.addEventListener("stash:location", (e) => {
    const path = e.detail?.data.location.pathname ?? "";
    test_path(path)
  });
};

export const waitForElement = (selectors: string, callback: (element: any) => void, timeout = 100) => {
  if (timeout > 60 * 1000) return;

  var el = document.querySelector(selectors);
  if (el) return callback(el);

  setTimeout(waitForElement.bind(null, selectors, callback, timeout * 2), timeout);
};

export const pathElementListener = (path: RegExp, selectors: string, callback: (element: any) => void) => {
  pathListener(path, () => waitForElement(selectors, callback))
};

export const registerVideoInitializedEvent = () => {
  if (videoInitializedEventInstalled)
    return;

  pathElementListener(/.*\/scenes\/(\d+)/, "#VideoJsPlayer", (element) =>
    window.PluginApi.Event.dispatch("video-js-player", undefined, element));
  videoInitializedEventInstalled = true;
}
