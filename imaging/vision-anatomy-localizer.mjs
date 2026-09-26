const DEFAULT_MODEL = process.env.OPENAI_VISION_MODEL || 'gpt-5.6-luna';
const DEFAULT_INTERVAL_MS = 1400;

function cleanJson(text) {
  const raw = String(text ?? '').trim();
  const fenced = raw.replace(/^\`\`\`(?:json)?\s*/i, '').replace(/\s*\`\`\`$/i, '');
  const start = fenced.indexOf('{');
  const end = fenced.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('VISION_LOCALIZER_INVALID_JSON');
  return JSON.parse(fenced.slice(start, end + 1));
}

function finite(value, fallback = 0) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

export function createVisionAnatomyLocalizer({
  apiKey = process.env.OPENAI_API_KEY,
  model = DEFAULT_MODEL,
  intervalMs = DEFAULT_INTERVAL_MS,
  resolveConcept = query => ({id: query, name: query}),
  fetchImpl = globalThis.fetch
} = {}) {
  let lastAt = 0;
  let lastImageHash = null;
  let lastResult = null;
  let pending = null;

  async function locate(frame) {
    if (!apiKey) return {status:'NOT_CONFIGURED', reason:'OPENAI_API_KEY_REQUIRED'};
    const imageBase64 = frame?.imageBase64;
    if (!imageBase64) return {status:'NOT_CONFIGURED', reason:'IMAGE_PAYLOAD_REQUIRED'};
    const now = Date.now();
    if (lastResult && now - lastAt < intervalMs) return {...lastResult, cached:true};
    if (pending) return pending;

    const imageHash = String(imageBase64.length) + ':' + imageBase64.slice(0, 32);
    if (imageHash === lastImageHash && lastResult && now - lastAt < intervalMs * 2) {
      return {...lastResult, cached:true};
    }

    pending = (async () => {
      const prompt = [
        'You are the visual anatomy localization layer of ISH-Anatomi.',
        'Inspect the supplied photograph and identify the single most likely visible anatomical structure or region.',
        'Do not diagnose disease. Do not invent a structure that is not reasonably visible.',
        'Return JSON only: {"query":"canonical English or Latin anatomical name","confidence":0.0,"region":"short body region"}',
        'If no anatomical structure can be identified with useful confidence, return {"query":"","confidence":0,"region":""}.',
        'Prefer specific structures only when visually justified; otherwise use a broad region such as thorax, abdomen, pelvis, upper limb, lower limb, head or neck.'
      ].join(' ');

      const response = await fetchImpl('https://api.openai.com/v1/responses', {
        method:'POST',
        headers:{
          'authorization':'Bearer ' + apiKey,
          'content-type':'application/json'
        },
        body:JSON.stringify({
          model,
          input:[{
            role:'user',
            content:[
              {type:'input_text',text:prompt},
              {type:'input_image',image_url:'data:image/jpeg;base64,' + imageBase64}
            ]
          }],
          max_output_tokens:120
        })
      });

      if (!response.ok) {
        const detail = await response.text().catch(()=>'');
        throw new Error('VISION_LOCALIZER_API_' + response.status + (detail ? ':' + detail.slice(0,160) : ''));
      }
      const payload = await response.json();
      const text = payload.output_text ?? payload.output?.flatMap(item => item.content ?? []).map(item => item.text ?? '').join('') ?? '';
      const parsed = cleanJson(text);
      const confidence = Math.max(0, Math.min(1, finite(parsed.confidence)));
      const query = String(parsed.query ?? '').trim();
      if (!query || confidence < 0.55) {
        lastResult = {status:'UNKNOWN', reason:'ANATOMY_NOT_IDENTIFIED', confidence, region:String(parsed.region ?? '').trim() || null};
      } else {
        const concept = resolveConcept(query);
        if (!concept) {
          lastResult = {status:'UNKNOWN', reason:'ATLAS_STRUCTURE_NOT_FOUND', query, confidence, region:String(parsed.region ?? '').trim() || null};
        } else {
          const transform = [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
          lastResult = {
            status:'READY',
            structureId:concept.id ?? concept.structureId ?? null,
            groupId:concept.groupId ?? null,
            confidence,
            query,
            region:String(parsed.region ?? '').trim() || null,
            point:[0,0,0],
            transform,
            registration:{status:'VISUAL_AI',source:'PHONE_CAMERA',model}
          };
        }
      }
      lastAt = Date.now();
      lastImageHash = imageHash;
      return lastResult;
    })();

    try { return await pending; }
    catch (error) {
      lastResult = {status:'ERROR',reason:error.message};
      lastAt = Date.now();
      return lastResult;
    }
    finally { pending = null; }
  }

  return {locate, status:()=>({status:apiKey?'READY':'NOT_CONFIGURED',model,intervalMs,lastAt})};
}
