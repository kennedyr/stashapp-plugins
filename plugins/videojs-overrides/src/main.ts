import type { VideoJsPlayer } from "video.js";
import { registerVideoInitializedEvent } from "@stashapp-plugins/shared";

(function () {
  registerVideoInitializedEvent();

  function overrideVjsPlayerOptions(vjsPlayerElement: any) {
    if (!vjsPlayerElement || !('player' in vjsPlayerElement)) return;

    const vjsPlayer = vjsPlayerElement.player as VideoJsPlayer;
    if (vjsPlayer && 'options' in vjsPlayer) {
      vjsPlayer.options({
        "userActions": {
          "click": function () { }
        }
      });
    }
  }
  window.PluginApi.Event.addEventListener("stash:video-js-player", (e: any) => {
    overrideVjsPlayerOptions(e)
  });
})();
