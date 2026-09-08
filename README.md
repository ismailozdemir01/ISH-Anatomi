# ISH-Anatomi

**Interactive Human Anatomy + Clinical Intelligence — Desktop Application**

ISH-Anatomi, 2.234 parçalık gerçek BodyParts3D tabanlı 3D insan anatomisini eğitim, klinik anatomi ve ileride doğrulanmış tanısal yapay zekâ katmanlarına taşıyan **masaüstü uygulamasıdır**. Web sitesi ürünü değildir.

## Konsept değişmedi

Temel fikir aynıdır: insan vücudunu 2.234 ayrı anatomik yapı üzerinden görmek, seçmek, katmanlamak, izole etmek ve yapılar arasındaki ilişkileri AI yardımıyla anlamak. Bunun üzerine klinik fayda sağlayan katmanlar eklenir.

## Uygulama katmanları

- **3D Anatomy Engine:** 2.234 gerçek mesh, 15 anatomik sistem, 3.432 named/FMA concept
- **Anatomy Knowledge Graph:** parent/child, komşuluk, damar-sinir-kas-kemik ilişkileri
- **AI Anatomy Tutor:** doğal dil ile anatomi öğretimi
- **AI → 3D:** kullanıcı isteğini anatomik yapı seçimi, görünürlük, izolasyon, kamera ve exploded-view işlemlerine dönüştürme
- **Evidence Layer:** klinik/anatomik iddialar için kaynak, provenance, tarih ve güven bilgisi
- **Clinical Anatomy:** patoloji eğitimi, prosedür anatomisi ve hasta eğitim modu
- **Imaging Boundary:** yetkili ortamlarda DICOM/DICOMweb → anatomi görselleştirme altyapısı
- **Diagnostic Boundary:** doğrulanmış klinik modeller için güvenli entegrasyon sözleşmesi; model yoksa sistem teşhis uydurmaz
- **Desktop Security:** Electron context isolation, sandbox ve Node integration kapalı

## Tanı sistemine dönüşüm stratejisi

Tanı özelliğini genel amaçlı sohbet modeline doğrudan vermiyoruz. Teşhis motoru ayrı ve doğrulanabilir bir klinik bileşen olacaktır:

`semptom + vital + laboratuvar + klinisyen gözlemi + DICOM/PACS`

→ veri/provenance normalizasyonu

→ 2.234 yapılık anatomi bilgi grafiğinde lokalizasyon

→ modaliteye özel doğrulanmış ML modelleri

→ kanıt birleştirme + belirsizlik kalibrasyonu

→ ayırıcı bulgular

→ klinisyen incelemesi / audit

→ yalnızca tanımlanmış intended-use ve doğrulama koşullarında tanısal çıktı.

Bu nedenle mevcut `clinical/core.py` kasıtlı olarak `NOT_CONFIGURED` / `INSUFFICIENT_DATA` durumlarını döndürür; sahte tanı üretmez. Tanısal ürün seviyesine geçiş; klinik validasyon, kalite yönetimi, siber güvenlik, veri gizliliği ve uygulanabilir tıbbi cihaz mevzuatı gerektirir.

## Masaüstü çalıştırma

Önce gerçek Human Atlas verisini getir:

```bash
npm run atlas:bootstrap
npm run atlas:install
npm run atlas:check
npm run atlas:build
```

Geliştirme:

```bash
npm run desktop:dev
```

Windows installer / Linux paketleri:

```bash
npm run desktop:dist
```

`desktop:dist` öncesinde `atlas:build` çalıştırılmalıdır.

## Gerçek veri / provenance

Anatomik veri BodyParts3D 4.0 kaynaklıdır ve resmi lisans koşulları korunmalıdır:

> BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International.

Human Atlas uygulama kodu MIT lisanslıdır. Upstream commit'i sabitlenmiştir; mock anatomik veri kullanılmaz. Gerçek klinik veri kaynağı/modeli yapılandırılmadığında sistem bunu açıkça bildirir.

## Regülasyon sınırı

Mevcut ürün eğitimsel anatomi + klinik referans platformudur; tanı veya tedavi kararı veren tıbbi cihaz olarak sunulmaz. Tanısal kullanım için ayrı intended-use, risk yönetimi, klinik performans/validasyon, kalite sistemi ve uygun regülasyon yolu tasarlanmalıdır.
