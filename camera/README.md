# ISH-Anatomi Local Phone Camera

Bu modül telefonu **yerel ağ üzerinden sanal kamera** olarak ISH-Anatomi'ye bağlar. Bulut, üçüncü taraf görüntü servisi veya harici AI API kullanılmaz.

## Akış

`Telefon kamerası → yerel ISH-Anatomi bağlantısı → JPEG → Electron nativeImage → gri-seviye frame → yerel görüntü katmanı`

Telefonun `DeviceOrientation` verisi de aynı yerel bağlantı üzerinden alınır; böylece telefon yönelimi sanal kamera/3D görüntüleyici katmanına bağlanabilecek ham pose verisi olarak korunur.

## Güvenlik

- Her uygulama açılışında rastgele erişim sırrı oluşturulur.
- Frame ve pose yolları bu sır olmadan erişilemez.
- Payload boyutu sınırlandırılmıştır.
- Veriler dış servise gönderilmez.
- JPEG dışındaki frame kabul edilmez.

## Telefon tarayıcısı notu

Modern iOS/Android tarayıcıları sürekli kamera erişimini güvenli bağlamla sınırlar. Bu nedenle üretim dağıtımında telefon tarayıcı bağlantısı için **yerel TLS** veya imzalı native companion uygulaması kullanılmalıdır. Mevcut taşıma katmanı bu bağlantı katmanından bağımsızdır; harici bulut/API gerektirmez.

## Tıbbi sınır

Telefon kamerası bir **görsel sensördür**. Telefon kamerasından gelen görüntü, ultrason görüntüsü veya tanısal tıbbi veri olarak kabul edilmez. Klinik çıkarım yalnızca uygun tıbbi görüntüleme kaynağı, doğrulanmış model, kalite kapısı ve kaynaklı klinik kanıt mevcut olduğunda etkinleştirilebilir.
