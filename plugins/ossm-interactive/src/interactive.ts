import type { IDeviceSettings, IInteractiveClient } from "./StashInterfaces";
import type { VideoJsPlayer } from "video.js";
import { WebSocketClient } from "./web_socket_client";

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

// Video Player
//     this.videoPlayer?.play()
//     this.videoPlayer?.currentTime()
//     this.videoPlayer?.currentTime(10)
//     this.videoPlayer?.pause()

export class OssmInteractive implements IInteractiveClient {
  wsUri = "ws://127.0.0.1/";
  videoPlayer?: VideoJsPlayer;
  wsClient?: WebSocketClient;

  _playing: boolean = false;
  _scriptOffset: number = 0;

  constructor(_handyKey: string, scriptOffset: number) {
    this._scriptOffset = scriptOffset;
  }

  // This is expected to exist by Stash
  public get handyKey() {
    console.log('handyKey()')
    return "N/A";
  }

  public get connected() {
    console.log('connected()')
    return this.wsClient?.connected ?? false;
  }

  public get playing() {
    console.log('playing()')
    return this._playing;
  }

  public async connect() {
    console.log('connect()')
    this.videoPlayer = window.PluginApi.utils.InteractiveUtils.getPlayer();
    const client = new WebSocketClient(this.wsUri, {
      onMessage: (message) => {
        switch (message.command) {
          case "play":
            this.videoPlayer?.play();
            break;
          case "pause":
            this.videoPlayer?.pause();
            break;
          case "seek":
            var props = message.properties;
            this.videoPlayer?.currentTime(props["currentTime"]);
            break;
          case "loop":
            var props = message.properties;
            this.videoPlayer?.loop(props["looping"])
            break;
        }
      }
    });

    client.onMessage = (message) => {
      console.log('Received:', message);
    };

    this.videoPlayer?.on('seeked', () => {
      this.seeked(this.videoPlayer?.currentTime() ?? 0);
    })
    this.videoPlayer?.on('ended', () => {
      this.ended();
    })

    //  buffering
    this.videoPlayer?.on('waiting', () => {
      this.pause();
    })
    this.videoPlayer?.on('playing', () => {
      this.play(this.videoPlayer?.currentTime() ?? 0);
    })

  }

  public async uploadScript(funscriptUrl: string, apiKey?: string) {
    console.log('uploadScript()')
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
        funscriptUrl: funscriptUrl
      }
    });
  }

  // Gets the offset, in milliseconds, between the Handy and the HandyFeeling servers.
  public async sync() {
    console.log('sync()')
    return this.wsClient?.estimatedLatency ?? 0;
  }

  public async configure(config: Partial<IDeviceSettings>) {
    console.log('configure(): ', config)
    this._scriptOffset = config.scriptOffset ?? config.offset ?? this._scriptOffset;
  }

  public async play(position: number) {
    console.log('play()')
    this.wsClient?.send({
      event: "play",
      properties: {
        currentTime: position
      }
    });
    this._playing = true;
  }

  seeked(position: number) {
    console.log('seeked()')
    this.wsClient?.send({
      event: "seek",
      properties: {
        currentTime: position
      }
    });
  }

  ended() {
    console.log('ended()')
    this.wsClient?.send({
      event: "end",
      properties: {}
    });
  }

  public async pause() {
    console.log('pause()')
    this.wsClient?.send({
      event: "pause",
      properties: {}
    });
    this._playing = false;
  }

  public async ensurePlaying(position: number) {
    console.log('ensurePlaying()')
    if (this._playing) {
      return;
    }
    await this.play(position);
  }

  public async setLooping(looping: boolean) {
    console.log('setLooping()')
    this.wsClient?.send({
      event: "loop",
      properties: {
        looping: looping
      }
    });
  }
}



// (function () {
//   "use strict";
//   const PluginApi = window.PluginApi;

//   PluginApi.Event.addEventListener("stash:location", async (e) => {
//     //TODO: ensurePaused()

//     // const path = e.detail.data.location.pathname;
//     // const idRegExp = /.*\/scenes\/(\d+)/;
//     // if (idRegExp.test(path)) {

//     // }
//   });
// })();

// window.PluginApi.utils.InteractiveUtils.getPlayer()?.currentTime() 