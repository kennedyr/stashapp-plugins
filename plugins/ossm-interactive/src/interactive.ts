import type { IDeviceSettings, IInteractiveClient } from "./StashInterfaces";
import { WebSocketClient } from "./web_socket_client";
import { VideoPlayerInterface } from "./video_player";

export const PLUGIN_ID = "ossm-interactive";

// Bi Directional communication
//
// Stash -> OSSM
// MPV EVENTS
// match msg.get("event", ""):
// 	"property-change":
// 		var prop_name: String = msg.get("name", "")
// 		var value = msg.get("data")
// 		match prop_name:
// 			"pause":
// 				if value is bool:
// 					_mpv_pause = value
// 			"time-pos":
// 				_mpv_time_pos = value
// 			"duration":
// 				_mpv_duration = value
// 			"filename":
// 				_mpv_filename = value
// 				_mpv_received_filename = true
// 		_mpv_update_state()
// 	"end-file":
// 		_mpv_filename = null
// 		_mpv_received_filename = true
// 		_mpv_update_state()


// OSSM -> Stash
// {"command": ["set_property", "pause", false]}
// {"command": ["seek", time_seconds, "absolute"]}
// {"command": ["set_property", "pause", true]}
//  
// ACK Command
// _on_command_completed

//   player_state = {
//   videoUrl: undefined,
//   funscriptUrl: undefined,
//   playing: false,
//   time: 0,
//   duration: 0,
//   looping: false
// }

export class OssmInteractive implements IInteractiveClient {
  wsUri = "ws://127.0.0.1:9009";
  videoPlayer?: VideoPlayerInterface;
  wsClient?: WebSocketClient;

  devicePlaying: boolean = false;
  funscriptUrl?: string;
  _scriptOffset: number = 0;

  constructor(_handyKey: string, scriptOffset: number) {
    this._scriptOffset = scriptOffset;

    PluginApi.Event.addEventListener("stash:location", (e) => {
      console.debug("[interactive] stash:location changed", e)
      const path = e.detail?.data.location.pathname ?? "";
      const idRegExp = /.*\/scenes\/(\d+)/;
      if (idRegExp.test(path)) {
        // this is a scene page
        this.ensureConnected();
      }
      console.debug("[interactive] stash:location changed", e.detail?.data.location.pathname)
    });

    window.addEventListener("pagehide", () => {
      console.debug(`[interactive] onPagehide`);
      this.wsClient?.close()
      this.videoPlayer?.deinitializeHooks()
    });

    window.addEventListener("pageshow", (event) => {
      if (event.persisted) {
        console.debug(`[interactive] onPageshow`);
        this.wsClient?.connect()
        this.videoPlayer?.initializeHooks()
      }
    });
  }

  // This is expected to exist by Stash
  public get handyKey() {
    return String(Date.now());
  }

  public get connected() {
    return this.wsClient?.connected ?? false;
  }

  public get playing() {
    return this.devicePlaying;
  }

  public async configure(config: Partial<IDeviceSettings>) {
    this._scriptOffset = config.scriptOffset ?? config.offset ?? this._scriptOffset;
  }

  public async connect() {
    this.ensureConnected();
  }

  public async uploadScript(funscriptUrl: string, apiKey?: string) {
    if (!(this.connected && funscriptUrl)) {
      return;
    }

    if (typeof apiKey !== "undefined" && apiKey !== "") {
      const url = new URL(funscriptUrl);
      url.searchParams.append("apikey", apiKey);
      funscriptUrl = url.toString();
    }

    this.wsClient?.send({
      event: "open",
      properties: {
        funscriptUrl: funscriptUrl,
        currentTime: this.videoPlayer?.currentTime,
        duration: this.videoPlayer?.duration
      }
    });
  }

  // Gets the offset, in milliseconds, between the Handy and the HandyFeeling servers.
  public async sync() {
    return this.wsClient?.estimatedLatency ?? 1;
  }

  public async play(position: number) {
    if (this.wsClient) {
      this.wsClient.send({
        event: "play",
        properties: {
          currentTime: position,
          duration: this.videoPlayer?.duration
        }
      });
      this.devicePlaying = true;
    }
  }

  seeked(position: number) {
    this.wsClient?.send({
      event: "seek",
      properties: {
        currentTime: position,
        duration: this.videoPlayer?.duration
      }
    });
  }

  ended() {
    this.wsClient?.send({
      event: "end",
      properties: {
        currentTime: this.videoPlayer?.currentTime,
        duration: this.videoPlayer?.duration
      }
    });
  }

  public async pause() {
    if (this.wsClient) {
      this.wsClient.send({
        event: "pause",
        properties: {
          currentTime: this.videoPlayer?.currentTime,
          duration: this.videoPlayer?.duration
        }
      });
      this.devicePlaying = false;
    }
  }

  public async ensurePlaying(position: number) {
    if (this.devicePlaying) {
      return;
    }
    await this.play(position);
  }

  public async setLooping(looping: boolean) {
    this.wsClient?.send({
      event: "loop",
      properties: {
        looping: looping,
        currentTime: this.videoPlayer?.currentTime,
        duration: this.videoPlayer?.duration
      }
    });
  }

  ensureConnected() {
    if (!this.videoPlayer) {
      this.videoPlayer = new VideoPlayerInterface({
        // onPlay: this.play,
        // onPause: this.pause,
        // onSeeked: this.seeked,
        onEnded: this.ended,
      });
    } else {
      this.videoPlayer.initializeHooks();
    }

    if (!this.wsClient) {
      this.wsClient = new WebSocketClient(this.wsUri, {
        onMessage: (message) => {
          if ('command' in message) {
            switch (message.command) {
              case "play":
                this.videoPlayer?.play();
                break;
              case "pause":
                this.videoPlayer?.pause();
                break;
              case "seek":
                var props = message.properties;
                this.videoPlayer?.seek(props["currentTime"]);
                break;
              case "loop":
                var props = message.properties;
                this.videoPlayer?.loop(Boolean(props["looping"]))
                break;
            }
          }
        }
      });
    } else {
      this.wsClient.attemptReconnect();
    }
  }
}

