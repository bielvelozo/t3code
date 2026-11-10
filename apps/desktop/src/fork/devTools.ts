export function shouldOpenDevToolsOnLaunch(isDevelopment: boolean): boolean {
  return isDevelopment && process.env.T3CODE_DESKTOP_DEVTOOLS !== "0";
}
