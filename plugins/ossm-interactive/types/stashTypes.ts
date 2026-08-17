export interface IDeviceSettings {
    connectionKey: string;
    scriptOffset: number;
    offset: number; // alias of scriptOffset
    estimatedServerTimeOffset?: number;
    useStashHostedFunscript?: boolean;
    [key: string]: unknown;
}

export interface ISettings {
    [key: string]: unknown
}

export interface IStashConfig {
    general: ISettings;
    interface: ISettings;
    defaults: ISettings;
    scraping: ISettings;
    dlna: ISettings;
    ui: ISettings;
    plugins: { [key: string]: ISettings };
}

export interface IInteractiveClientProviderOptions {
    handyKey: string;
    scriptOffset: number;
    defaultClientProvider?: IInteractiveClientProvider;
    stashConfig?: IStashConfig;
}

// convert this to interface if more methods are added
export type IInteractiveClientProvider = (
    options: IInteractiveClientProviderOptions
) => IInteractiveClient;

/**
 * Interface that is used for InteractiveProvider
 */
export interface IInteractiveClient {
    // new(handyKey: string, scriptOffset: number) : IInteractiveClient
    readonly connected: boolean;
    readonly playing: boolean;
    handyKey: string;

    // sync setServerTimeOffset
    sync(): Promise<number>;
    connect(): Promise<void>;
    uploadScript: (funscriptPath: string, apiKey?: string) => Promise<void>;
    configure(config: Partial<IDeviceSettings>): Promise<void>;
    play(position: number): Promise<void>;
    pause(): Promise<void>;
    ensurePlaying(position: number): Promise<void>;
    setLooping(looping: boolean): Promise<void>;
}
