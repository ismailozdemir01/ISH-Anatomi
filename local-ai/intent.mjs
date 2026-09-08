const SYSTEMS = [
  ['iskelet','skeleton'],['kas','muscular'],['sinir','nervous'],['damar','vascular'],['arter','vascular'],['ven','vascular'],
  ['kalp','cardiovascular'],['solunum','respiratory'],['sindirim','digestive'],['üriner','urinary'],['böbrek','urinary'],
  ['üreme','reproductive'],['endokrin','endocrine'],['lenf','lymphatic'],['deri','integumentary']
];
const VIEWS = [['ön','front'],['önden','front'],['arkadan','back'],['arka','back'],['yandan','side'],['yan','side']];
const normalize = (s) => s.toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
export function compileIntent(input) {
  const q = normalize(input);
  if (!q) return {type:'empty', actions:[], answer:'Bir anatomi komutu veya soru girin.'};
  const actions=[];
  for (const [needle,id] of SYSTEMS) if (q.includes(needle)) actions.push({type:'system',id});
  for (const [needle,view] of VIEWS) if (q.includes(needle)) actions.push({type:'view',view});
  if (/patlat|ayir|explod|parcal|dağit|dagit/.test(q)) actions.push({type:'explode',value:1});
  if (/topla|birles|normal gorunum|normal görünüm/.test(q)) actions.push({type:'explode',value:0});
  if (/izole|yalnizca|yalnızca|sadece/.test(q)) actions.push({type:'isolate',value:true});
  if (/izolasyonu kaldir|izolasyonu kaldır|hepsini goster|hepsini göster/.test(q)) actions.push({type:'isolate',value:false});
  if (/dondur|döndür|cevir|çevir|rotate/.test(q)) actions.push({type:'rotate',value:true});
  const anatomyTerms = q.match(/\b(?:kalp|aort|aort[a-z]*|femur|tibia|omurga|omur|kafatasi|kafatası|akciger|akciğer|bobrek|böbrek|karaciger|karaciğer|mide|pankreas|dalak|beyin|omurilik|sinir|damar)\b/g) || [];
  if (anatomyTerms.length) actions.push({type:'search',query:anatomyTerms[0]});
  if (!actions.length || actions.some(a=>a.type==='search')) {
    return {type:'anatomy_query',actions:[...actions],answer:'Yerel anatomi motoru sorguyu 3D atlas komutlarına dönüştürüyor.'};
  }
  return {type:'viewer_command',actions,answer:'Komut yerel anatomi motoruna uygulandı.'};
}
export function normalizeQuery(s){ return normalize(s); }
