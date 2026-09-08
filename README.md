# ISH-Anatomi

**GPT-6 Astra inspired Interactive Human Anatomy Platform**

ISH-Anatomi, 2.234 parçalık gerçek BodyParts3D tabanlı 3D insan anatomisi deneyimini eğitim odaklı bir platforma dönüştürmek için geliştirilmektedir.

## GPT-6 Astra araştırması

Global araştırmada hedeflediğimiz 2.234 parçalık sistemin karşılığı doğrulandı: [ashemag/human-atlas](https://github.com/ashemag/human-atlas).

Human Atlas; React + Three.js ile BodyParts3D 4.0 yetişkin erkek referans anatomisini 2.234 ayrı seçilebilir mesh, 15 anatomik sistem ve 3.432 adlandırılmış kavram olarak sunuyor. Arama, sistem katmanları, seçili yapıyı izole etme ve exploded anatomy görünümü bulunuyor.

ISH-Anatomi bu motoru sahte/mock anatomik veri üretmeden, kaynak/provenance korunarak entegre etmektedir.

## Entegrasyon

İlgili çalışma branch'i:

`astra-human-atlas-integration`

Kurulum:

```bash
npm run atlas:bootstrap
npm run atlas:install
npm run atlas:check
npm run atlas:build
npm run atlas:dev
```

`atlas:bootstrap` Human Atlas upstream'ini sabit commit `1c38bf35c254a891200d3cedecfd57abebe83d8d` üzerine pinler.

## Planlanan ISH katmanı

- 2.234 gerçek anatomik mesh
- 15 anatomik sistem
- 3.432 named/FMA concept
- Türkçe + Latince arama
- 3D seçim / zoom / orbit
- katman görünürlüğü
- isolate / exploded view
- FastAPI anatomy API
- gerçek anatomy metadata repository
- AI anatomy assistant
- OpenAI Responses API + `gpt-6-astra`
- eğitim/quiz katmanı
- kaynak ve lisans provenance

## Veri ve lisans

Anatomik veri BodyParts3D 4.0 kaynaklıdır. Resmi BodyParts3D lisansı CC BY 4.0'dır. Dağıtımda aşağıdaki atıf korunmalıdır:

> BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International.

Human Atlas uygulama kodu MIT lisanslıdır; upstream lisans ve attribution koşulları korunacaktır.

Detaylı araştırma ve provenance: `docs/GPT6_ASTRA_HUMAN_ATLAS_RESEARCH.md`.

## Kapsam

Bu proje eğitimsel anatomi görselleştirme içindir; teşhis veya cerrahi karar destek sistemi değildir.
