import type { VideoJsPlayer } from "video.js";

type Options = {
  debug: boolean;
  onSeeked: (currentTime: number) => void;
  onPlay: (currentTime: number) => void;
  onPause: (currentTime: number) => void;
  onEnded: () => void;
  reconnectInterval: number;
}

export class VideoPlayerInterface {
  videoPlayer?: VideoJsPlayer;
  hooksInstalled = false;
  debug: boolean;
  onSeeked: (currentTime: number) => void;
  onPlay: (currentTime: number) => void;
  onPause: (currentTime: number) => void;
  onEnded: () => void;

  reconnectInterval: number;

  constructor(options: Partial<Options> = {}) {
    this.debug = options.debug ?? false;
    this.onSeeked = options.onSeeked ?? (() => { });
    this.onPlay = options.onPlay ?? (() => { });
    this.onPause = options.onPause ?? (() => { });
    this.onEnded = options.onEnded ?? (() => { });

    this.reconnectInterval = options.reconnectInterval || 3000;

    this.initializeHooks();

    window.PluginApi.Event.addEventListener("stash:video-js-player", (e) => {
      const player = e.detail?.data?.player;
      if (player)
        this.initializeHooks(player);
    });
  }

  public get connected() {
    return !!this.videoPlayer;
  }

  public get playing() {
    try {
      return !!(this.currentTime > 0 && !this.paused && !this.ended && (this.videoPlayer?.readyState() ?? 0) > 2);
    } catch {
      return false;
    }
  }

  public get paused() {
    try {
      return this.videoPlayer?.paused() ?? true;
    } catch {
      return true;
    }
  }

  public get ended() {
    try {
      return this.videoPlayer?.paused() ?? false;
    } catch {
      return false;
    }
  }

  public get currentTime() {
    try {
      return this.videoPlayer?.currentTime() ?? 0.0;
    } catch {
      return 0.0;
    }
  }

  public get duration() {
    try {
      return this.videoPlayer?.duration() ?? 0.0;
    } catch {
      return 0.0;
    }
  }

  public get looping() {
    try {
      return this.videoPlayer?.loop() ?? false;
    } catch {
      return false;
    }
  }

  public play(currentTime?: number) {
    if (currentTime) {
      this.videoPlayer?.currentTime(currentTime);
    }
    this.videoPlayer?.play();
  }

  public pause(currentTime?: number) {
    if (currentTime) {
      this.videoPlayer?.currentTime(currentTime);
    }
    this.videoPlayer?.pause();
  }

  public seek(to: number) {
    const old_time = this.currentTime;
    if (Math.abs(to - old_time) > 1.5) {
      this.videoPlayer?.currentTime(to);
    }
  }

  public loop(val: boolean) {
    this.videoPlayer?.loop(val)
  }

  initializeHooks(videoPlayer: VideoJsPlayer | undefined = undefined) {
    if (videoPlayer) {
      this.deinitializeHooks();
      this.videoPlayer = videoPlayer;
    }

    if (!this.videoPlayer) {
      this.videoPlayer = window.PluginApi.utils.InteractiveUtils.getPlayer();
    }

    if (this.videoPlayer && !this.hooksInstalled) {
      this.hooksInstalled = true;
      this.videoPlayer.on('play', () => {
        this.onPlay(this.currentTime);
      });
      // resumed after buffering
      this.videoPlayer.on('playing', () => {
        this.onPlay(this.currentTime);
      });
      this.videoPlayer.on('pause', () => {
        this.onPause(this.currentTime);
      });
      //  buffering
      this.videoPlayer.on('waiting', () => {
        this.onPause(this.currentTime);
      });
      this.videoPlayer.on('seeked', () => {
        this.onSeeked(this.currentTime);
      });
      this.videoPlayer.on('ended', () => this.onEnded())
    }
  }

  deinitializeHooks() {
    if (this.videoPlayer && this.hooksInstalled) {
      this.hooksInstalled = false;
      this.videoPlayer.off('play');
      this.videoPlayer.off('playing');
      this.videoPlayer.off('pause');
      this.videoPlayer.off('waiting');
      this.videoPlayer.off('seeked');
      this.videoPlayer.off('ended');
    }
  }
}
