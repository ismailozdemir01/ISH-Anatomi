const SYSTEMS = [
  ['iskelet','skeleton'],['kas','muscular'],['sinir','nervous'],['damar','vascular'],['arter','vascular'],['ven','vascular'],
  ['kalp','cardiovascular'],['solunum','respiratory'],['sindirim','digestive'],['üriner','urinary'],['böbrek','urinary'],
  ['üreme','reproductive'],['endokrin','endocrine'],['lenf','lymphatic'],['deri','integumentary']
];
const VIEWS = [['ön','front'],['önden','front'],['arkadan','back'],['arka','back'],['yandan','side'],['yan','side']];
const STRUCTURES = [
  ['kalp','kalp'],['kalbi','kalp'],['aort','aort'],['femur','femur'],['femuru','femur'],['tibia','tibia'],
  ['omurga','omurga'],['omurgayı','omurga'],['omur','omur'],['kafatasi','kafatası'],['kafatası','kafatası'],
  ['akciger','akciğer'],['akciğer','akciğer'],['akcigeri','akciğer'],['akciğeri','akciğer'],
  ['bobrek','böbrek'],['böbrek','böbrek'],['bobreği','böbrek'],['böbreği','böbrek'],
  ['karaciger','karaciğer'],['karaciğer','karaciğer'],['karacigeri','karaciğer'],['karaciğeri','karaciğer'],
  ['mide','mide'],['mideyi','mide'],['pankreas','pankreas'],['dalak','dalak'],['beyin','beyin'],
  ['beyni','beyin'],['omurilik','omurilik'],['sinir','sinir'],['siniri','sinir'],['damar','damar'],['damarı','damar']
];

const normalize = (s) => String(s ?? '')
  .toLocaleLowerCase('tr-TR')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g,'')
  .replace(/ı/g,'i')
  .trim();

export function compileIntent(input) {
  const q = normalize(input);
  if (!q) return {type:'empty', actions:[], answer:'Bir anatomi komutu veya soru girin.'};
  const actions=[];
  for (const [needle,id] of SYSTEMS) if (q.includes(normalize(needle))) actions.push({type:'system',id});
  for (const [needle,view] of VIEWS) if (q.includes(normalize(needle))) actions.push({type:'view',view});
  if (/patlat|ayir|explod|parcal|dagit/.test(q)) actions.push({type:'explode',value:1});
  if (/topla|birles|normal gorunum/.test(q)) actions.push({type:'explode',value:0});
  if (/izolasyonu kaldir|hepsini goster/.test(q)) actions.push({type:'isolate',value:false});
  else if (/izole|yalnizca|sadece/.test(q)) actions.push({type:'isolate',value:true});
  if (/dondur|cevir|rotate/.test(q)) actions.push({type:'rotate',value:true});
  for (const [needle,canonical] of STRUCTURES) {
    if (q.includes(normalize(needle))) { actions.push({type:'search',query:canonical}); break; }
  }
  if (!actions.length || actions.some(a=>a.type==='search')) {
    return {type:'anatomy_query',actions:[...actions],answer:'Yerel anatomi motoru sorguyu 3D atlas komutlarına dönüştürüyor.'};
  }
  return {type:'viewer_command',actions,answer:'Komut yerel anatomi motoruna uygulandı.'};
}
export function normalizeQuery(s){ return normalize(s); }
