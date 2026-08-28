export declare global {
    interface Window {
        PluginApi: typeof PluginApi;
        ossmInteractiveHandle: import("StashTypes").IInteractiveClient | undefined;
    }
}
