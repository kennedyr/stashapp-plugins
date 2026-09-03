export declare global {
    interface Window {
        PluginApi: typeof PluginApi;
        ossmInteractiveHandle: Maybe<import("StashTypes").IInteractiveClient>;
        videoInitializedEventInstalled: Maybe<boolean>;
    }
}
