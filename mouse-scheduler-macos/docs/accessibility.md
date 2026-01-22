# macOS Accessibility Permission

Mouse hareketi/tıklama kontrolü ve global hook için macOS’ta **Accessibility** izni gerekir.

## Kullanıcı Akışı

1. Uygulama açılır.
2. `Permissions` ekranında durum kontrol edilir.
3. İzin yoksa:
   - `Open System Settings` butonu ile şu sayfa açılır:
     - `System Settings → Privacy & Security → Accessibility`
   - Kullanıcı uygulamayı listeden **Enabled** yapar.
4. Uygulama tekrar `Refresh` ile kontrol eder; izin gelmeden **Record/Play** başlatılmaz.

## Teknik

Electron üzerinden kontrol:

- `systemPreferences.isTrustedAccessibilityClient(false)` → mevcut durum
- `systemPreferences.isTrustedAccessibilityClient(true)` → bazı sürümlerde prompt gösterebilir

