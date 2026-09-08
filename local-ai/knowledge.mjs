const ENTRIES = Object.freeze([
  {id:'heart', names:['kalp','heart','cor'], title:'Kalp', latin:'Cor', system:'cardiovascular', description:'Kalp, kanı dolaşım sistemine pompalayan kas yapılı organdır.', relations:['aorta','lungs']},
  {id:'aorta', names:['aort','aorta'], title:'Aort', latin:'Aorta', system:'vascular', description:'Aort, kalbin sol ventrikülünden çıkan ve sistemik dolaşıma kan taşıyan ana atardamardır.', relations:['heart']},
  {id:'femur', names:['femur','uyluk kemiği','uyluk kemigi'], title:'Femur', latin:'Os femoris', system:'skeleton', description:'Femur, insan vücudundaki en uzun ve güçlü kemiktir.', relations:['tibia']},
  {id:'tibia', names:['tibia','kaval kemiği','kaval kemigi'], title:'Tibia', latin:'Tibia', system:'skeleton', description:'Tibia, bacağın medial tarafındaki ana yük taşıyan kemiktir.', relations:['femur']},
  {id:'brain', names:['beyin','brain','encephalon'], title:'Beyin', latin:'Encephalon', system:'nervous', description:'Beyin, merkezi sinir sisteminin kraniyal bölümüdür ve duyusal, motor ve bilişsel işlevlerin koordinasyonunda rol alır.', relations:['spinal cord']},
  {id:'spinal-cord', names:['omurilik','spinal cord','medulla spinalis'], title:'Omurilik', latin:'Medulla spinalis', system:'nervous', description:'Omurilik, beyin ile periferik sinir sistemi arasında sinyallerin iletiminde ve bazı refleks devrelerinde görev alan merkezi sinir sistemi yapısıdır.', relations:['brain']},
  {id:'kidney', names:['böbrek','bobrek','kidney','ren'], title:'Böbrek', latin:'Ren', system:'urinary', description:'Böbrekler, kanın süzülmesi, sıvı-elektrolit dengesinin düzenlenmesi ve idrar oluşumunda görev alan çift organlardır.', relations:['ureter']},
  {id:'liver', names:['karaciğer','karaciger','liver','hepar'], title:'Karaciğer', latin:'Hepar', system:'digestive', description:'Karaciğer, metabolizma, safra üretimi ve çok sayıda biyokimyasal süreçte görev alan büyük bir organdır.', relations:['gallbladder']},
  {id:'stomach', names:['mide','stomach','gaster'], title:'Mide', latin:'Gaster', system:'digestive', description:'Mide, sindirim kanalının özofagus ile duodenum arasında yer alan bölümüdür.', relations:['esophagus','duodenum']},
  {id:'lung', names:['akciğer','akciger','lung','pulmo'], title:'Akciğer', latin:'Pulmo', system:'respiratory', description:'Akciğerler, gaz değişiminin gerçekleştiği çift solunum organlarıdır.', relations:['heart','trachea']}
]);

const normalize = (s) => String(s ?? '').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').replace(/ı/g,'i').trim();

export function getKnowledgeCatalog(){ return ENTRIES.map(e => ({...e, names:[...e.names], relations:[...e.relations]})); }
export function findKnowledge(query){
  const q = normalize(query);
  if (!q) return null;
  return ENTRIES.find(e => e.names.some(n => q === normalize(n) || q.includes(normalize(n)))) ?? null;
}
export function answerAnatomyQuestion(query){
  const entry = findKnowledge(query);
  if (!entry) return {status:'UNKNOWN', answer:'Bu soru için yerel doğrulanmış anatomi bilgi kaynağında yeterli kayıt bulunamadı.', source:'local-verified-knowledge'};
  return {status:'KNOWN', answer:`${entry.title} (${entry.latin}): ${entry.description}`, structureId:entry.id, system:entry.system, relations:[...entry.relations], source:'local-verified-knowledge'};
}
