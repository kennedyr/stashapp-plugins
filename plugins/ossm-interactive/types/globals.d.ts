export declare global {
    interface Window {
        PluginApi: typeof PluginApi;
        toastRef: ReturnType<typeof window.PluginApi.hooks.useToast> | null;
        ossmInteractiveHandle: IInteractiveClient;
    }
}
