# Mouse Recorder & Scheduler (macOS + Windows)

Bu workspace iki ayrı Electron uygulaması içerir:

- `mouse-scheduler-macos/`
- `mouse-scheduler-windows/`

İki proje de aynı katmanlı mimariyi takip eder:

- `src/ui` (Renderer): React UI (Dashboard, Macros, Macro Editor, Scheduler, Permissions)
- `src/main` (Electron main + preload): IPC, pencere yönetimi, izin kontrolü
- `src/automation`: recorder/player adapter’ları (opsiyonel native libs)
- `src/scheduler`: gün+saat planlayıcı + conflict policy
- `src/storage`: macro & schedule JSON saklama
- `src/shared`: data model + IPC tipleri

## Hızlı Başlangıç

> Not: Bu repo sadece iskelet + çalışma mantığı içerir. Global mouse hook ve gerçek otomasyon için platforma uygun kütüphaneler gerekir (aşağıda).

Her proje kendi içinde çalıştırılır:

```bash
cd mouse-scheduler-macos
npm install
npm run dev
```

Windows için:

```bash
cd mouse-scheduler-windows
npm install
npm run dev
```

## Automation (Recorder/Player) için öneriler

- **Recorder (global hook)**:
  - macOS/Windows: `iohook` (native) veya alternatif global hook modülleri
- **Player (mouse move/click)**:
  - `robotjs` (native) veya `@nut-tree/nut-js`

Bu iskelette adapter’lar, opsiyonel olarak bu kütüphaneleri `dynamic import` ile yüklemeyi dener; yüklü değilse kullanıcıya net hata mesajı döner.

## Kurulum dosyası üretme (.dmg / .exe)

Bu workspace’te paketleme ayarları hazır:

- **macOS (.dmg)**:

```bash
cd mouse-scheduler-macos
npm install
npm run pack
```

- **Windows (.exe / NSIS installer)**:
  - En sağlam yöntem: Windows makinede/VM’de çalıştırmak veya GitHub Actions ile build almak.

```bash
cd mouse-scheduler-windows
npm install
npm run pack
```

### GitHub Actions ile otomatik build (önerilir)

Root’ta `.github/workflows/build-installers.yml` var. Repo’yu GitHub’a push edince Actions:

- macOS runner’da `.dmg`
- Windows runner’da `.exe` (NSIS)

artefact olarak üretir ve indirilebilir hale getirir.

## macOS Accessibility (Erişilebilirlik) İzni

macOS’ta mouse kontrolü için **System Settings → Privacy & Security → Accessibility** izni gerekir.
Uygulama içindeki **Permissions** ekranı izni kontrol eder ve gerekli sayfayı açar.

