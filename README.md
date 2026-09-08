# ISH-Anatomi

**GPT-6 Astra — İnteraktif İnsan Anatomisi Modülü**

ISH-Anatomi; 2.234 gerçek BodyParts3D anatomik yapısını masaüstünde etkileşimli 3D olarak sunan, arama, sistem katmanları, seçim, izolasyon, exploded view, eğitim ve **yerel AI → 3D** etkileşimini tek uygulamada birleştiren anatomik platformdur.

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
- Yerel klinik güvenlik sınırı
- Windows masaüstü installer
- Linux AppImage / deb

## AI mimarisi

Uygulama başka bir AI sistemine API ile bağlanmaz.

AI katmanı masaüstü uygulamasının içindedir. İlk katman, harici model/API gerektirmeyen yerel anatomi intent compiler'dır. Bu katman doğal dili güvenli, doğrulanabilir 3D komutlarına çevirir:

`kullanıcı sorusu → yerel intent engine → anatomik komut → 3D atlas`

Örnekler:

- `Kalbi göster` → kalp araması/seçimi
- `İskelet sistemini arkadan göster` → iskelet + arka görünüm
- `Damarları patlat` → damar sistemi + exploded view
- `Böbreği izole et` → böbrek araması + izolasyon

İleride daha güçlü yerel model inference eklenebilir; dış AI API zorunluluğu oluşturulmaz. Model/veri bulunamadığında sistem tahmin veya sahte sonuç üretmez.

## Gerçek anatomi verisi

Anatomi motoru upstream Human Atlas'ın sabitlenmiş gerçek verisini kullanır. Human Atlas; BodyParts3D 4.0 yetişkin erkek referans anatomisini 2.234 seçilebilir mesh, 15 sistem ve 3.432 isimli kavram ile sunar. citeturn0search0

BodyParts3D verisinin CC BY 4.0 atfı korunur; Human Atlas uygulama kodunun MIT lisansı korunur.

## Klinik katman

Klinik özellikler anatomi konseptinin içinde kalır. Sistem klinik veri/model yapılandırılmadığında `NOT_CONFIGURED` veya `INSUFFICIENT_DATA` döndürür; tanı uydurmaz. Tanısal model ancak ayrıca doğrulanmış bir model, intended-use, validasyon ve gerekli kalite/regülasyon kontrolleri ile eklenebilir.

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

Bu komut gerçek Human Atlas verisini yeniden bootstrap eder, doğrular, build eder ve Electron paketini oluşturur.

## Doğrulama kuralı

Release yalnızca testleri geçen ve gerçek anatomi motoru doğrulanan sürümden oluşturulur. Mock anatomi veya uydurma klinik veri release'e dahil edilmez.
