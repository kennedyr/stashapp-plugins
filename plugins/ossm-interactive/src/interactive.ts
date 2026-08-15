import type { IDeviceSettings, IInteractiveClient } from "./StashTypes";
import { WebSocketClient } from "./web_socket_client";
import { VideoPlayerInterface } from "./video_player";

export const PLUGIN_ID = "ossm-interactive";

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
      const path = e.detail?.data.location.pathname ?? "";
      const idRegExp = /.*\/scenes\/(\d+)/;
      if (idRegExp.test(path)) {
        // this is a scene page
        this.ensureConnected();
      }
    });

    window.addEventListener("pagehide", () => {
      this.wsClient?.close()
      this.videoPlayer?.deinitializeHooks()
    });

    window.addEventListener("pageshow", (event) => {
      if (event.persisted) {
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
        onSeeked: (currentTime) => this.seeked(currentTime),
        onEnded: () => this.ended(),
      });
    } else {
      this.videoPlayer.initializeHooks();
    }

    if (!this.wsClient) {
      this.wsClient = new WebSocketClient(this.wsUri, {
        onMessage: (message) => {
          var props = 'properties' in message ? message["properties"] : {};
          if ('command' in message) {
            switch (message.command) {
              case "play":
                this.videoPlayer?.play(props["currentTime"]);
                break;
              case "pause":
                this.videoPlayer?.pause(props["currentTime"]);
                break;
              case "seek":
                this.videoPlayer?.seek(props["currentTime"]);
                break;
              case "loop":
                this.videoPlayer?.loop(Boolean(props["looping"]))
                break;
            }
          }
        }
      });
    } else {
      this.wsClient.attemptReconnect(true);
    }
  }
}

