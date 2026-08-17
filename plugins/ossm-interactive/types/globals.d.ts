export declare global {
    interface Window {
        PluginApi: typeof PluginApi;
        ossmInteractiveHandle: IInteractiveClient;
    }
}
