export declare global {
    interface Window {
        PluginApi: typeof PluginApi;
        ossmInteractiveHandle: import("stashTypes").IInteractiveClient | undefined;
    }
}
