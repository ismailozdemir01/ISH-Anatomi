# ISH-Anatomi

**GPT-6 Astra — İnteraktif İnsan Anatomisi Modülü**

ISH-Anatomi; 2.234 gerçek BodyParts3D anatomik yapısını masaüstünde etkileşimli 3D olarak sunan, arama, sistem katmanları, seçim, izolasyon, exploded view, eğitim, yerel AI ve **gerçek zamanlı ultrason görüntüleme entegrasyon çekirdeğini** tek uygulamada birleştiren anatomik platformdur.

## Tam kapsam

- 2.234 gerçek anatomik mesh
- 15 anatomik sistem
- 3.432 named/FMA kavram
- Kas, kemik, organ, damar, sinir ve diğer anatomik yapılar
- 3D orbit / zoom / pan / seçim
- Katman bazlı görünürlük
- Yapı izolasyonu
- Exploded anatomy görünümü
- Anatomik arama ve yapı inceleme
- Türkçe ve Latin/İngilizce sorgu desteği
- Anatomik ilişkiler ve bilgi katmanı
- Eğitim / çalışma / quiz altyapısı
- Klinik anatomi bilgi katmanı
- **Yerel AI anatomi asistanı**
- Doğal dil → anatomik komut → 3D görüntüleme
- **Canlı ultrason frame pipeline**
- **USB / Wi-Fi / Bluetooth LE prob mimarisi**
- Gerçek zamanlı görüntü kalite kapısı
- Anatomik lokalizasyon ve 2D→3D registration arayüzü
- Temporal frame/session tracking
- Klinik değerlendirme güvenlik katmanı
- Windows masaüstü installer
- Linux AppImage / deb

## Canlı ultrason mimarisi

`Ultrason probu → USB/Wi-Fi görüntü akışı → Bluetooth LE kontrol/telemetri → frame validation → kalite → anatomik lokalizasyon → 2D/3D registration → temporal tracking → klinik motor → 3D ISH-Anatomi`

Bluetooth LE varsayılan olarak prob keşfi, eşleştirme, kimlik, batarya, sıcaklık ve kontrol için kullanılır. Ham ultrason görüntüsünün Bluetooth üzerinden taşındığı varsayılmaz; yüksek bant genişlikli görüntü için USB/Wi-Fi veya üreticinin belgelenmiş yüksek hızlı protokolü kullanılır.

Gerçek üretici protokolü verilmeden sahte bir prob veya sahte görüntü akışı oluşturulmaz. `probe/manager.mjs` üretici adaptörleri için gerçek bağlantı sözleşmesini sağlar; cihaz bağlı değilse sistem `NOT_CONNECTED`, sinyal yoksa `NO_SIGNAL`, görüntü yetersizse `INSUFFICIENT` durumlarını kullanır.

## AI mimarisi

Uygulama başka bir AI sistemine API ile bağlanmaz.

AI katmanı masaüstü uygulamasının içindedir. Anatomi intent compiler doğal dili güvenli, doğrulanabilir 3D komutlarına çevirir:

`kullanıcı sorusu → yerel intent engine → anatomik komut → 3D atlas`

Canlı görüntüleme tarafında ise model/algoritma adaptörleri; gerçek frame, gerçek ölçüm ve gerçek anatomik lokalizasyon sonucu ile beslenir. Bir model veya cihaz yapılandırılmadığında sistem sonuç uydurmaz.

## Gerçek anatomi verisi

Anatomi motoru upstream Human Atlas'ın sabitlenmiş gerçek verisini kullanır. Human Atlas; BodyParts3D 4.0 yetişkin erkek referans anatomisini 2.234 seçilebilir mesh, 15 sistem ve 3.432 isimli kavram ile sunar.

BodyParts3D verisinin CC BY 4.0 atfı korunur; Human Atlas uygulama kodunun MIT lisansı korunur.

## Klinik / teşhis sınırı

Canlı görüntüyü işlemek ile klinik olarak doğrulanmış teşhis üretmek aynı şey değildir. Mevcut sürüm gerçek görüntü alımı, kalite, pipeline, kayıt ve klinik güvenlik arayüzlerini kurar; klinik teşhis modeli ise ancak gerçek tıbbi veri, lisanslı/uygun eğitim verisi, bağımsız doğrulama, intended-use, risk yönetimi ve gerekli medikal cihaz/regülasyon süreçleri tamamlandıktan sonra tanısal kullanım için etkinleştirilebilir.

Bu nedenle sistem görüntü veya klinik kanıt yetersiz olduğunda `UNKNOWN`, `NOT_CONFIGURED`, `INSUFFICIENT_DATA` gibi durumları üretir ve tanı uydurmaz.

## Kurulum / geliştirme

Node.js 22.13+ gerekir.

```bash
npm install
npm test
npm run atlas:bootstrap
npm run atlas:install
npm run atlas:check
npm run atlas:build
npm run desktop:dev
```

Paketleme:

```bash
npm run desktop:dist
```

Bu komut gerçek Human Atlas verisini bootstrap eder, doğrular, build eder ve Electron paketini oluşturur.

## Doğrulama kuralı

Release yalnızca testleri geçen ve gerçek anatomi motoru doğrulanan sürümden oluşturulur. Mock anatomi, sahte ultrason frame'i veya uydurma klinik veri release'e dahil edilmez.
