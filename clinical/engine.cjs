const STATUS = Object.freeze({
  INSUFFICIENT_DATA: 'INSUFFICIENT_DATA',
  NOT_CONFIGURED: 'NOT_CONFIGURED'
});
function assess(payload = {}) {
  const symptoms = Array.isArray(payload.symptoms) ? payload.symptoms.filter(Boolean) : [];
  const observations = Array.isArray(payload.observations) ? payload.observations.filter(Boolean) : [];
  if (!symptoms.length && !observations.length) return {status: STATUS.INSUFFICIENT_DATA, findings: [], differential: [], evidence: [], explanation: 'Klinik değerlendirme için veri sağlanmadı.'};
  return {
    status: STATUS.NOT_CONFIGURED,
    findings: ['Doğrulanmış klinik tanı modeli yapılandırılmadı.'],
    differential: [], evidence: observations,
    explanation: 'ISH-Anatomi tanı uydurmaz. Tanısal çıktı yalnızca ayrıca doğrulanmış ve kullanım amacı belgelenmiş bir klinik model bağlandığında üretilebilir.'
  };
}
module.exports = { STATUS, assess };
