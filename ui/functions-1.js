/** ======= Languages (10) ======= */
const LANGS = [
  { id: "th", label: "ไทย (Thai)", tts: "th-TH" },
  { id: "en", label: "อังกฤษ (English)", tts: "en-US" },
  { id: "es", label: "สเปน (Spanish)", tts: "es-ES" },
  { id: "fr", label: "ฝรั่งเศส (French)", tts: "fr-FR" },
  { id: "it", label: "อิตาลี (Italian)", tts: "it-IT" },
  { id: "ru", label: "รัสเซีย (Russian)", tts: "ru-RU" },
  { id: "de", label: "เยอรมัน (German)", tts: "de-DE" },
  { id: "zh", label: "จีน (Chinese)", tts: "zh-CN" },
  { id: "ko", label: "เกาหลี (Korean)", tts: "ko-KR" },
  { id: "ja", label: "ญี่ปุ่น (Japanese)", tts: "ja-JP" },
];

const el = id => document.getElementById(id);

/** ======= Elements ======= */
const srcSel = el("srcLang"), tgtSel = el("tgtLang");
// const baseUrl = el("baseUrl");
const baseUrl = 'http://localhost:8000';
const aInput = el("aInput"), bOutput = el("bOutput");
const aState = el("aState"), bState = el("bState");
const sttLat = el("sttLat"), mtLat = el("mtLat"), ttsLat = el("ttsLat");
const sttKpi = el("sttKpi"), mtKpi = el("mtKpi"), ttsKpi = el("ttsKpi");
const totalLatency = el("totalLatency");
const autoTranslate = el("autoTranslate");
const tbl = el("tbl").querySelector("tbody");
const pairsBar = el("pairsBar"), pairsProg = el("pairsProg");

let debounceId = 0, pairsShown = 0, pairsGoal = 10;

/** ======= Populate language selects ======= */
LANGS.forEach(l=>{
  const o1=document.createElement("option"); o1.value=l.id; o1.textContent=l.label; srcSel.appendChild(o1);
  const o2=document.createElement("option"); o2.value=l.id; o2.textContent=l.label; tgtSel.appendChild(o2);
});
srcSel.value="th"; tgtSel.value="en";

/** ======= KPI updates ======= */
function updateKPIs(){
  const s=Number(sttLat.value)||0, m=Number(mtLat.value)||0, t=Number(ttsLat.value)||0;
  sttKpi.textContent=s.toFixed(2)+'s';
  mtKpi.textContent=m.toFixed(2)+'s';
  ttsKpi.textContent=t.toFixed(2)+'s';
  totalLatency.textContent=`Total latency ≤ 5s · Now: ${(s+m+t).toFixed(2)}s`;
}
["input","change"].forEach(ev=>[sttLat,mtLat,ttsLat].forEach(x=>x.addEventListener(ev,updateKPIs)));
updateKPIs();

/** ======= Health check ======= */
el("btnHealth").addEventListener("click", async ()=>{
  const msg=el("healthMsg"); msg.textContent="checking..."; msg.className="hint";
  try{
    const r = await fetch(`${baseUrl}/health`, {cache:"no-store"});
    const j = await r.json();
    if(r.ok && j.ok){ msg.textContent="OK"; msg.className="hint ok"; }
    else { msg.textContent="Unhealthy"; msg.className="hint error"; }
  }catch(e){ msg.textContent="Cannot reach backend"; msg.className="hint error"; }
});

/** ======= Devices scan ======= */
async function scanDevices(){
  const inSel=el("inDev"), outSel=el("outDev");
  inSel.innerHTML=""; outSel.innerHTML="";
  try{
    await navigator.mediaDevices.getUserMedia({audio:true});
    const devs = await navigator.mediaDevices.enumerateDevices();
    const ins=devs.filter(d=>d.kind==="audioinput");
    const outs=devs.filter(d=>d.kind==="audiooutput");
    (ins.length?ins:[{deviceId:"default",label:"Default microphone"}]).forEach(d=>{
      const o=document.createElement("option"); o.value=d.deviceId; o.textContent=d.label||"Microphone"; inSel.appendChild(o);
    });
    (outs.length?outs:[{deviceId:"default",label:"Default speaker"}]).forEach(d=>{
      const o=document.createElement("option"); o.value=d.deviceId; o.textContent=d.label||"Speaker"; outSel.appendChild(o);
    });
  }catch(e){
    ["Default microphone"].forEach(n=>{const o=document.createElement("option"); o.textContent=n; inSel.appendChild(o);});
    ["Default speaker"].forEach(n=>{const o=document.createElement("option"); o.textContent=n; outSel.appendChild(o);});
  }
}
el("btnScan").addEventListener("click", scanDevices); scanDevices();

/** ======= SpeakerA module ======= */
const SpeakerA={
  updatePartial:text=>el('aPartial').value=text,
  getInput:()=>aInput.value.trim()||el('aPartial').value.trim()
};

/** ======= Logger ======= */
const Logger={
  addLog:function(src,tgt,srcText,tgtText,s,m,t){
    const now=new Date().toLocaleTimeString();
    const tr=document.createElement("tr");
    tr.innerHTML=`<td>${now}</td><td>${src}→${tgt}</td><td>${tgtText.replaceAll("<","&lt;")}</td>
      <td>${s.toFixed(2)}</td><td>${m.toFixed(2)}</td><td>${t.toFixed(2)}</td><td>${(s+m+t).toFixed(2)}</td>`;
    if(tbl.children.length===1 && tbl.children[0].children.length===1){ tbl.innerHTML=""; }
    tbl.prepend(tr);
  }
};

/** ======= STTManager ======= */
const STTManager={
  recognize: async function(blob){
    // ถ้าไม่มี backend จะใช้ mock
    // return "สวัสดีครับ"; 
    const formData=new FormData();
    formData.append('file', blob, 'audio.webm');
    const r=await fetch(`${baseUrl}/stt`, {method:"POST", body:formData});
    const j=await r.json();
    return j.text||'';
  }
};

/** ======= Translator ======= */
const Translator={
  translate: async function(text,src,tgt){
    // ถ้าไม่มี backend ใช้ mock
    // return `[${tgt}] ${text}`;
    const r=await fetch(`${baseUrl}/translate`, {
      method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({text,src,tgt})
    });
    const j=await r.json();
    return j.translation||'';
  },
  translateAndSpeak: async function(text){
    const src=srcSel.value, tgt=tgtSel.value;
    try{
      aState.textContent='sending…';
      const startMT=performance.now();
      const translated=await Translator.translate(text,src,tgt);
      const endMT=performance.now();
      mtLat.value=((endMT-startMT)/1000).toFixed(2);
      bOutput.value=translated;
      Logger.addLog(src,tgt,text,translated,Number(sttLat.value),Number(mtLat.value),Number(ttsLat.value));
      await TTSManager.speak(translated,tgt);
      aState.textContent='idle'; bState.textContent='done';
    }catch(err){
      console.error(err);
      bOutput.value='[Error] '+err.message;
      aState.textContent='error'; bState.textContent='error';
    }
  }
};

/** ======= TTSManager ======= */
const TTSManager = {
  speak: async function(text, lang) {
    const startTTS = performance.now();
    try {
      const r = await fetch(`${baseUrl}/tts?text=${encodeURIComponent(text)}&lang=${lang}`);
      const blob = await r.blob();

      // ตั้ง type ให้ตรงกับ backend (MP3)
      const audio = new Audio();
      audio.src = URL.createObjectURL(new Blob([blob], { type: 'audio/mpeg' }));
      audio.play();

      return new Promise(res => {
        audio.onended = () => {
          const endTTS = performance.now();
          ttsLat.value = ((endTTS - startTTS) / 1000).toFixed(2);
          updateKPIs();
          res();
        };
      });
    } catch (err) {
      console.error("TTS error:", err);
    }
  }
};


/** ======= Translate button ======= */
el("btnTranslate").addEventListener("click", ()=>Translator.translateAndSpeak(SpeakerA.getInput()));

/** ======= Auto-translate debounce ======= */
aInput.addEventListener("input", ()=>{
  if(!autoTranslate.checked) return;
  clearTimeout(debounceId);
  debounceId=setTimeout(()=>Translator.translateAndSpeak(SpeakerA.getInput()),500);
});

/** ======= Hotkey Ctrl+Enter ======= */
aInput.addEventListener("keydown", ev=>{
  if(ev.ctrlKey && ev.key==="Enter"){ ev.preventDefault(); Translator.translateAndSpeak(SpeakerA.getInput()); }
});

/** ======= Recorder ======= */
const Recorder={
  mediaRecorder:null, chunks:[], isRecording:false, isPaused:false,
  start: async function(){
    const stream=await navigator.mediaDevices.getUserMedia({audio:true});
    this.mediaRecorder=new MediaRecorder(stream,{mimeType:"audio/webm"});
    this.chunks=[]; this.isRecording=true; this.isPaused=false;

    this.mediaRecorder.ondataavailable=async (e)=>{
      if(e.data.size>0){
        this.chunks.push(e.data);
        if(!this.isPaused){
          const blob=new Blob([e.data],{type:"audio/webm"});
          const startSTT=performance.now();
          const text=await STTManager.recognize(blob);
          const endSTT=performance.now();
          sttLat.value=((endSTT-startSTT)/1000).toFixed(2);
          SpeakerA.updatePartial(text);
          if(autoTranslate.checked) await Translator.translateAndSpeak(text);
        }
      }
    };
    this.mediaRecorder.start(500);
  },
  stop:function(){ if(this.mediaRecorder){ this.mediaRecorder.stop(); this.isRecording=false; this.isPaused=false; } },
  pause:function(){ this.isPaused=true; },
  resume:function(){ this.isPaused=false; }
};

/** ======= Record / Pause buttons ======= */
el('btnRec').addEventListener('click', async ()=>{
  if(!Recorder.isRecording){
    await Recorder.start();
    el('btnRec').textContent='■ Stop'; el('btnRec').className='btn-red';
    aState.textContent='recording…';
  }else{
    Recorder.stop();
    el('btnRec').textContent='● Record'; el('btnRec').className='btn-green';
    aState.textContent='idle';
  }
});
el('btnPause').addEventListener('click', ()=>{
  if(!Recorder.isRecording) return;
  if(!Recorder.isPaused){ Recorder.pause(); el('btnPause').textContent='▶ Resume'; aState.textContent='paused'; }
  else { Recorder.resume(); el('btnPause').textContent='⏸ Pause'; aState.textContent='recording…'; }
});

/** ======= TTS read buttons ======= */
el("btnReadSrc").addEventListener("click", ()=>TTSManager.speak(aInput.value.trim(), srcSel.value));
el("btnReadTgt").addEventListener("click", ()=>TTSManager.speak(bOutput.value.trim(), tgtSel.value));
