export function forkUserDataPathOverride(): string | null {
  return process.env.T3CODE_DESKTOP_USER_DATA_DIR?.trim() || null;
}
