# Windows Global Hook & Task Scheduler (Notlar)

## Global Mouse Hook

Windows’ta global hook için tipik seçenekler:

- Native C++/Rust modül (Low-level mouse hook: `WH_MOUSE_LL`)
- Hazır kütüphane (örn. `iohook` gibi native wrapper’lar)

Bu iskelette recorder/player adapter’ları opsiyoneldir. Kütüphaneler yoksa UI çalışır, record/play “adapter missing” hatası verir.

## Windows Task Scheduler (Opsiyonel)

Uygulama kapalıyken tetiklemek için Task Scheduler üzerinden:

- Program/script: `Mouse Scheduler.exe`
- Arguments: `--run-macro=m1`

Main process başlangıçta `--run-macro=` argümanını yakalayıp ilgili macro’yu otomatik çalıştırabilir.

