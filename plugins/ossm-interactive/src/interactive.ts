import { WebSocketClient } from "./web_socket_client";
import { VideoPlayerInterface } from "./video_player";
import { type Maybe, hackService } from './hack_service'
import { type IDeviceSettings, type IInteractiveClient } from "stashTypes";

export const PLUGIN_ID = "ossm-interactive";

export interface IPluginSettings {
  serverUrl: string;
  debug: boolean
}

export class OssmInteractive implements IInteractiveClient {
  options = {
    serverUrl: "ws://127.0.0.1:9009",
    debug: false,
  }
  videoPlayer?: VideoPlayerInterface;
  wsClient?: WebSocketClient;

  devicePlaying: boolean = false;
  funscriptUrl?: string;
  _scriptOffset: number = 0;

  constructor({
    scriptOffset,
  }: {
    handyKey: string,
    scriptOffset: number
  }) {
    this._scriptOffset = scriptOffset;

    PluginApi.Event.addEventListener("stash:location", (e) => {
      this.debug("[interactive] stash:location", e);
      const path = e.detail?.data.location.pathname ?? "";
      const idRegExp = /.*\/scenes\/(\d+)/;
      if (idRegExp.test(path)) {
        // this is a scene page
        this.ensureConnected();
        this.devicePlaying = false; // pause?
      }
    });

    window.addEventListener("pagehide", () => {
      this.debug("[interactive] pagehide");
      this.wsClient?.close()
      this.videoPlayer?.deinitializeHooks()
    });

    window.addEventListener("pageshow", (event) => {
      this.debug("[interactive] pageshow");
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
    this.debug("[interactive] configure", config);
    this._scriptOffset = config.scriptOffset ?? config.offset ?? this._scriptOffset;
    const pluginConfig = hackService.Settings?.plugins?.[PLUGIN_ID] as Maybe<IPluginSettings> | undefined;
    if (pluginConfig) {
      this.options = {
        ...this.options,
        ...pluginConfig
      }
    }
  }

  public async connect() {
    this.debug("[interactive] connect");
    this.ensureConnected();
  }

  public async uploadScript(funscriptUrl: string, apiKey?: string) {
    this.debug("[interactive] uploadScript", funscriptUrl, apiKey);
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
    this.debug("[interactive] sync");
    return this.wsClient?.estimatedLatency ?? 1;
  }

  public async play(position: number) {
    this.debug("[interactive] play", position);
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
    this.debug("[interactive] pause");
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
    this.debug("[interactive] ensurePlaying", position);
    if (this.devicePlaying) {
      return;
    }
    await this.play(position);
  }

  public async setLooping(looping: boolean) {
    this.debug("[interactive] setLooping", looping);
    this.wsClient?.send({
      event: "loop",
      properties: {
        looping: looping,
        currentTime: this.videoPlayer?.currentTime,
        duration: this.videoPlayer?.duration
      }
    });
  }

  handleCommand(message: { command: string; properties: { [key: string]: unknown; } }) {
    switch (message.command) {
      case "play":
        this.videoPlayer?.play(tryParseFloat(message.properties["currentTime"]));
        this.devicePlaying = true;
        break;
      case "pause":
        this.videoPlayer?.pause(tryParseFloat(message.properties["currentTime"]));
        this.devicePlaying = false;
        break;
      case "seek":
        const currentTime = tryParseFloat(message.properties["currentTime"]);
        if (currentTime)
          this.videoPlayer?.seek(currentTime);
        break;
      case "loop":
        this.videoPlayer?.loop(Boolean(message.properties["looping"]))
        break;
    }
  }

  handleEvent(message: { event: string; properties: { [key: string]: unknown; } }) {
    switch (message.event) {
      case "open":
        this.toastSuccess(`OSSM Opened ${message.properties["title"]}`)
        break;
      case "play":
        this.videoPlayer?.play(tryParseFloat(message.properties["currentTime"]));
        this.devicePlaying = true;
        break;
      case "pause":
        this.videoPlayer?.pause(tryParseFloat(message.properties["currentTime"]));
        this.devicePlaying = false;
        break;
    }
  }

  ensureConnected() {
    if (!this.videoPlayer) {
      this.videoPlayer = new VideoPlayerInterface({
        debug: this.options.debug,
        // onPlay: this.play,
        // onPause: this.pause,
        onSeeked: (currentTime) => this.seeked(currentTime),
        onEnded: () => this.ended(),
      });
    } else {
      this.videoPlayer.initializeHooks();
    }

    if (!this.wsClient) {
      this.wsClient = new WebSocketClient(this.options.serverUrl, {
        debug: this.options.debug,
        onMessage: (message) => {
          this.debug(JSON.stringify(message, undefined, 2));
          if ('command' in message) {
            this.handleCommand(message);
          } else if ('event' in message) {
            this.handleEvent(message);
          }
        },
        onConnect: () => {
          this.toastSuccess('OSSM Connected');
        }
      });
    } else {
      this.wsClient.attemptReconnect(true);
    }
  }

  toastSuccess(message: string) {
    if (hackService.Toast)
      hackService.Toast.success(message);
    else
      console.info(message);
  }

  debug(...data: any[]) {
    if (this.options.debug)
      console.debug(data);
  }
}

function tryParseFloat(num: unknown) {
  const val = parseFloat(num as string);
  if (isNaN(val))
    return undefined;

  return val;
}