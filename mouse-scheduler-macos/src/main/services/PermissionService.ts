import { shell, systemPreferences } from "electron";

export class PermissionService {
  getAccessibilityTrusted() {
    if (process.platform !== "darwin") return true;
    return systemPreferences.isTrustedAccessibilityClient(false);
  }

  promptAccessibility() {
    if (process.platform !== "darwin") return;
    // On some versions this prompts, on others it just returns false.
    systemPreferences.isTrustedAccessibilityClient(true);
  }

  async openAccessibilitySettings() {
    if (process.platform !== "darwin") return;
    // Apple scheme for Accessibility settings:
    await shell.openExternal(
      "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility"
    );
  }

  getPlatform() {
    return process.platform;
  }
}

