# Mouse Scheduler (Android) — Basit Panel

Bu klasör, desktop uygulamadaki **Scheduler / Basit Panel** mantığını Android tarafına taşımak için başlangıç (iskelet) projedir.

## Ne var?

- **Jetpack Compose UI**
  - Basit Panel: başlangıç saati, aktif saat sayısı, saat kaydırma (offset), gün seçimi
  - 30 günlük basit önizleme (liste)
- **Scheduler iskeleti**
  - Android tarafında gerçek otomatik tetikleme için ileride `WorkManager` + (gerekirse) `AlarmManager` kullanılacak.

> Not: Android’de “ekran kaydı + otomatik dokunma/playback” için **MediaProjection** (screen capture) ve **Accessibility Service** (input automation) gerekir. Bu repo şimdilik UI + scheduler iskeletidir; kayıt/playback servisleri bir sonraki adımda eklenecek.

## Android Studio ile çalıştırma

1) Android Studio → **Open** → `mouse-scheduler-android/` klasörünü seç.
2) Gradle sync tamamlanınca:
   - Run (▶) ile telefona kur.

## APK (kurulum dosyası) üretme

Android Studio’dan:
- **Build → Build APK(s)** (debug)

Komut satırından (Android SDK + Gradle yüklüyse):

```bash
cd mouse-scheduler-android
./gradlew :app:assembleDebug
```

APK yolu (debug):
- `mouse-scheduler-android/app/build/outputs/apk/debug/app-debug.apk`

