import { Maybe } from "@stashapp-plugins/shared";
import { IStashConfig } from "StashTypes";

class HackService {
  private toastRef: Maybe<ReturnType<typeof PluginApi.hooks.useToast>> = null;
  private settingsRef: Maybe<IStashConfig> = null;

  public get Toast() {
    return this.toastRef;
  }

  public set Toast(val) {
    this.toastRef = val;
  }

  public get Settings() {
    return this.settingsRef;
  }

  public set Settings(val) {
    this.settingsRef = val;
  }
}
export const hackService = new HackService();
