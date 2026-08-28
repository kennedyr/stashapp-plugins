import type { VideoJsPlayer } from "video.js";
(function () {
  function setupVideoScrollWheel() {
    const vjsPlayerElement = document.getElementById("VideoJsPlayer");
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

  // Wait for video player to load on scene page.
  window.csLib.PathElementListener(
    "/scenes/",
    "#VideoJsPlayer",
    setupVideoScrollWheel
  ); // PathElementListener is from cs-ui-lib.js
})();