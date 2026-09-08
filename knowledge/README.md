# ISH Medical Knowledge & Evidence Engine

Bu katman tıbbi kaynakları doğrudan tanı üretmek için değil, **kaynaklı klinik kanıt retrieval ve kanıt grafiği** oluşturmak için indeksler.

## Klinik kanıt zinciri

`query + observations + measurements + imaging findings -> evidence retrieval -> provenance -> evidence graph -> candidate ranking`

Evidence Graph; gözlem, ölçüm ve görüntüleme bulgularını doğrulanmış kaynak parçalarına bağlar. Her klinik aday, destekleyen kanıt düğümleriyle birlikte döndürülür. Kanıt yoksa aday uydurulmaz.

## Kaynak politikası

- NCBI Bookshelf: açık erişimli ve yeniden kullanımına izin verilen içerikler.
- WHO: resmi kılavuz keşif kaynağı; her belgenin lisans/yeniden kullanım koşulu ayrı doğrulanır.
- Kullanıcının sağladığı lisanslı kitaplar: `USER_LICENSED` kaynağı olarak içeri alınabilir.
- Lisansı doğrulanmamış ticari kitaplar indekslenmez ve dağıtılmaz.

## Durumlar

- `INSUFFICIENT_DATA`: klinik sorgu/kanıt araması için yeterli girdi yok.
- `NO_EVIDENCE`: indekslenmiş ve kullanılabilir kaynaklarda eşleşen kanıt yok.
- `EVIDENCE_AVAILABLE`: provenance taşıyan kanıt bulundu.
- `NOT_CONFIGURED`: gerçek kaynak indeksi henüz yapılandırılmamış.

Bu modül tek başına klinik olarak valide edilmiş bir tanı cihazı değildir. Gerçek hasta kullanımından önce uygun veri lisansları, bağımsız performans doğrulaması, risk yönetimi, kalite sistemi ve ilgili tıbbi cihaz mevzuatı tamamlanmalıdır.
