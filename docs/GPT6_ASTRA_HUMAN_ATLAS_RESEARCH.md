# GPT-6 Astra / Human Atlas araştırması

## Sonuç

Global araştırmada tarif edilen 2.234 parçalık interaktif anatomi sistemi gerçek bir proje olarak doğrulandı: `ashemag/human-atlas`.

Proje; React + Three.js tabanlı, BodyParts3D 4.0 yetişkin erkek referans anatomisini 2.234 ayrı seçilebilir mesh halinde gösteriyor. 15 anatomik sistem, 3.432 adlandırılmış kavram, arama, katman görünürlüğü, seçili yapıyı izole etme ve exploded/inventory görünümü bulunuyor.

Kaynak proje 6 Eylül 2026 tarihli `1c38bf35c254a891200d3cedecfd57abebe83d8d` commit'ine sabitlendi.

## GPT-6 Astra bağlantısı

GPT-6 Astra'nın resmi OpenAI dokümantasyonu modeli `gpt-6-astra` olarak tanımlıyor ve modelin karmaşık yazılım mühendisliği, bilim, bilgisayar kullanımı ve çok adımlı iş akışlarında kullanılabildiğini belirtiyor. Ancak 2.234 anatomik mesh'in kendisi GPT-6 model ağırlıklarından üretilmiş bir tıbbi veri seti değildir.

İncelenen Human Atlas projesi gerçek BodyParts3D verisini kullanıyor; GPT-6 Astra ise bu tip çok dosyalı 3D uygulamanın geliştirilmesinde kullanılan üretken/agentic geliştirme aracıdır.

## Teknik olarak doğrulanan özellikler

- 2.234 ayrı BodyParts3D mesh'i
- 3.432 named/FMA concept
- 15 anatomik sistem
- Orbit / zoom / select
- Sistem katmanlarını açıp kapatma
- Skeleton / organ preset'leri
- Seçili yapıyı izole etme
- Assembled → exploded anatomy geçişi
- Anatomik arama
- Mobil etkileşim ve tap-vs-drag ayrımı
- WebGL/Three.js GPU-batched rendering
- Per-structure GPU state/selection texture yaklaşımı
- Yaklaşık 33 MB sıkıştırılmış geometri
- 2.288.268 üçgenlik paketlenmiş model

## Veri kaynağı ve lisans

Human Atlas'ın README ve attribution dosyası BodyParts3D 4.0 kullandığını belirtiyor. BodyParts3D resmi arşivi mevcut lisansı CC BY 4.0 olarak yayımlıyor ve yeniden dağıtım/türev çalışma için atıf şartı koyuyor.

Gerekli atıf:

> BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International.

ISH-Anatomi bu nedenle kaynak anatomik veriyi sahte/mock veri ile değiştirmeyecek. Kaynak veri bulunamadığında uygulama veri yok/asset unavailable durumunu açıkça gösterecek.

## ISH-Anatomi entegrasyonu

`astra-human-atlas-integration` branch'i içine:

- Human Atlas upstream commit pin'i
- gerçek upstream repository bootstrap script'i
- root npm komutları
- lisans/veri provenance dokümantasyonu

eklendi.

Bootstrap:

```bash
npm run atlas:bootstrap
npm run atlas:install
npm run atlas:check
npm run atlas:build
npm run atlas:dev
```

Bu yöntem 2.234 parçalık asset'leri sahte kayıtlarla üretmez; gerçek upstream kodu ve gerçek BodyParts3D tabanlı browser-ready atlas verisini sabit bir commit üzerinden getirir.

## Bir sonraki entegrasyon katmanı

ISH-Anatomi'nin kendi ürün kimliği korunarak Human Atlas motorunun üzerine şu katmanlar bağlanmalıdır:

1. ISH-Anatomi marka/UI katmanı
2. FastAPI anatomy API
3. PostgreSQL/SQLite metadata repository
4. Türkçe + Latince anatomi arama
5. gerçek AI anatomy assistant
6. OpenAI Responses API üzerinden `gpt-6-astra` entegrasyonu
7. eğitim senaryoları ve quiz engine
8. kaynak/provenance ve klinik olmayan kullanım uyarıları

AI katmanı anatomi veri kaynağının yerine geçmez; kaynak veriyi açıklayan ve kullanıcı sorularını yanıtlayan bir üst katmandır.
