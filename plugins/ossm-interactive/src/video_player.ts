import type { VideoJsPlayer } from "video.js";

type Options = {
  onSeeked: (currentTime: number) => void;
  onPlay: (currentTime: number) => void;
  onPause: (currentTime: number) => void;
  onEnded: () => void;
}

export class VideoPlayerInterface {
  videoPlayer?: VideoJsPlayer;

  onSeeked: (currentTime: number) => void;
  onPlay: (currentTime: number) => void;
  onPause: (currentTime: number) => void;
  onEnded: () => void;

  constructor(options: Partial<Options> = {}) {
    const noop = function () { };
    this.onSeeked = options.onSeeked ?? noop;
    this.onPlay = options.onPlay ?? noop;
    this.onPause = options.onPause ?? noop;
    this.onEnded = options.onEnded ?? noop;

    this.initializeHooks();
  }
  public get connected() {
    return !!this.videoPlayer;
  }

  public get playing() {
    return !!(this.currentTime > 0 && !this.paused && !this.ended && (this.videoPlayer?.readyState() ?? 0) > 2);
  }

  public get paused() {
    return this.videoPlayer?.paused() ?? true;
  }

  public get ended() {
    return this.videoPlayer?.paused() ?? false;
  }

  public get currentTime() {
    return this.videoPlayer?.currentTime() ?? 0.0;
  }

  public get duration() {
    return this.videoPlayer?.duration() ?? 0.0;
  }

  public get looping() {
    return this.videoPlayer?.loop() ?? false;
  }

  public initializeHooks() {
    console.debug('[videointerface] initializeHooks()')
    if (this.videoPlayer) {
      this.deinitializeHooks();
    }
    var ok = this._initializeHooks();
    if (!ok) {
      setTimeout(this._initializeHooks, 1000);
    }
  }

  public play() {
    this.videoPlayer?.play();
  }

  public pause() {
    this.videoPlayer?.pause();
  }

  public seek(to: number) {
    this.videoPlayer?.currentTime(to);
  }

  public loop(val: boolean) {
    this.videoPlayer?.loop(val)
  }

  _initializeHooks() {
    this.videoPlayer = window.PluginApi.utils.InteractiveUtils.getPlayer();
    if (this.videoPlayer) {
      this.videoPlayer?.on('play', () => {
        this.onPlay(this.currentTime);
      });
      // resumed after buffering
      this.videoPlayer?.on('playing', () => {
        this.onPlay(this.currentTime);
      });
      this.videoPlayer?.on('pause', () => {
        this.onPause(this.currentTime);
      });
      //  buffering
      this.videoPlayer?.on('waiting', () => {
        this.onPause(this.currentTime);
      });
      this.videoPlayer?.on('seeked', () => {
        this.onSeeked(this.currentTime);
      });
      this.videoPlayer?.on('ended', this.onEnded)
      return true;
    }
    console.error("[videointerface] video player not found.")
    return false;
  }

  deinitializeHooks() {
    console.debug('[videointerface] deinitializeVideoPlayerHooks()')
    if (this.videoPlayer) {
      this.videoPlayer.off('seeked');
      this.videoPlayer.off('ended');
      this.videoPlayer.off('waiting');
      this.videoPlayer.off('playing');
      this.videoPlayer = undefined;
    }
  }
}
