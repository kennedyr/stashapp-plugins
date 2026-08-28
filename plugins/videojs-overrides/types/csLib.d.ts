declare namespace CsLib {
  const baseURL: string;

  function callGQL(reqData: any): any;
  function getConfiguration(pluginId: string, fallback: any): any;
  function setConfiguration(pluginId: string, values: any): any;
  function waitForElement(selector: string, callback: () => void): void;
  function PathElementListener(path: string, element: string, callback: () => void): any;
}