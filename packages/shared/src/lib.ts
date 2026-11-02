export type Maybe<T> = T | null | undefined;

const test_path = (pathRegex: RegExp, callback: (path: string) => void, path: string) => {
  if (!pathRegex || pathRegex.test(path)) {
    callback(path);
  }
};

export const testCurrentPath = (pathRegex: RegExp, callback: (path: string) => void) => {
  const test = test_path.bind(undefined, pathRegex, callback);
  test(window.location.pathname);
};

export const pathListener = (pathRegex: RegExp, callback: (path: string) => void) => {
  const test = test_path.bind(undefined, pathRegex, callback);
  test(window.location.pathname);

  window.PluginApi.Event.addEventListener("stash:location", (e) => {
    const path = e.detail?.data.location.pathname ?? "";
    test(path);
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
  if (window.videoInitializedEventInstalled)
    return;

  pathElementListener(/.*\/scenes\/(\d+)/, "#VideoJsPlayer", (element) =>
    window.PluginApi.Event.dispatch("video-js-player", undefined, element));
  window.videoInitializedEventInstalled = true;
}
