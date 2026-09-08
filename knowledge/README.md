# ISH Medical Knowledge & Evidence Engine

Bu katman tıbbi kaynakları doğrudan tanı üretmek için değil, **kaynaklı klinik kanıt retrieval** için indeksler.

## Kaynak politikası

- NCBI Bookshelf: açık erişimli içerik ve programatik olarak yeniden kullanılmasına izin verilen içerikler.
- WHO: kılavuz keşfi için resmi kaynak; her belgenin lisans/yeniden kullanım koşulu ayrı doğrulanır.
- Kullanıcının sağladığı lisanslı kitaplar: `USER_LICENSED` kaynağı olarak içeri alınabilir.
- Lisansı doğrulanmamış ticari kitaplar indekslenmez ve dağıtılmaz.

NCBI Bookshelf, kitapların yanında klinik kılavuzlar ve sistematik derlemeler için programatik keşif imkânı sağlar. WHO da kılavuzlarını kanıta dayalı ve metodolojik kalite kontrolünden geçmiş öneriler olarak yayımlar.

## Klinik çıktı modeli

`query + observations + measurements + imaging findings -> evidence retrieval -> candidate ranking -> provenance`

Sistem kaynak göstermeden tanı adayı üretmemelidir. Yeterli kanıt yoksa `NO_EVIDENCE`, yeterli klinik veri yoksa `INSUFFICIENT_DATA`, yapılandırılmış klinik model bağlı değilse `NOT_CONFIGURED` durumları kullanılır.

Bu modül tek başına klinik olarak valide edilmiş bir tanı cihazı değildir. Gerçek hasta kullanımına geçmeden önce uygun klinik validasyon, risk yönetimi, kalite sistemi ve ilgili tıbbi cihaz mevzuatı ayrıca ele alınmalıdır.
