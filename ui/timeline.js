let logs = [];

function addLog(pair, text, sttTime, mtTime, ttsTime) {
  const totalTime = sttTime + mtTime + ttsTime;
  const currentTime = new Date().toLocaleTimeString();

  const logEntry = {
    time: currentTime,
    pair: pair,
    text: text,
    stt: sttTime,
    mt: mtTime,
    tts: ttsTime,
    total: totalTime
  };

  logs.push(logEntry);
  updateLogTable();
}

function updateLogTable() {
  const logBody = document.getElementById("logBody");
  logBody.innerHTML = "";  // ลบข้อมูลเก่า

  if (logs.length === 0) {
    logBody.innerHTML = `<tr><td colspan="7" class="px-3 py-6 text-center text-slate-500">No logs yet. Translate some text to populate.</td></tr>`;
  } else {
    logs.forEach((log, index) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td class="px-3 py-2">${log.time}</td>
        <td class="px-3 py-2">${log.pair}</td>
        <td class="px-3 py-2">${log.text}</td>
        <td class="px-3 py-2 text-right">${log.stt}s</td>
        <td class="px-3 py-2 text-right">${log.mt}s</td>
        <td class="px-3 py-2 text-right">${log.tts}s</td>
        <td class="px-3 py-2 text-right">${log.total}s</td>
      `;
      logBody.appendChild(row);
    });
  }
}

let recognition;
let sttStartTime, sttEndTime, sttDuration;
let mtStartTime, mtEndTime, mtDuration;
let ttsStartTime, ttsEndTime, ttsDuration;

function startRecording() {
  sttStartTime = performance.now(); // เริ่มจับเวลา STT
  recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  recognition.lang = document.getElementById("srcLang").value;
  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.onresult = function (event) {
    let finalTranscript = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      if (event.results[i].isFinal) {
        finalTranscript += event.results[i][0].transcript;
      }
    }

    // เมื่อแปลงเสียงเป็นข้อความเสร็จ
    if (finalTranscript.length > 0) {
      document.getElementById("aInput").value = finalTranscript;
      sttEndTime = performance.now(); // จับเวลาเมื่อแปลงเสร็จ
      sttDuration = (sttEndTime - sttStartTime) / 1000; // คำนวณเวลาเป็นวินาที
    }
  };

  recognition.start(); // เริ่มบันทึกเสียง
}

// สมมุติการแปลข้อความ
function translateText(text, srcLang, tgtLang) {
  mtStartTime = performance.now(); // เริ่มจับเวลา MT

  // สมมุติการแปลข้อความ
  const translatedText = "Translated Text"; // การแปลเสร็จ
  mtEndTime = performance.now(); // จับเวลาหลังการแปล
  mtDuration = (mtEndTime - mtStartTime) / 1000; // คำนวณเวลาเป็นวินาที

  return translatedText;
}

function startTTS(text, lang) {
  ttsStartTime = performance.now(); // เริ่มจับเวลา TTS
  
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;

  utterance.onend = function() {
    ttsEndTime = performance.now(); // จับเวลาหลังจากการแปลง
    ttsDuration = (ttsEndTime - ttsStartTime) / 1000; // คำนวณเวลาเป็นวินาที
    
    // เพิ่มข้อมูลลงใน log
    addLog("Pair 1", text, sttDuration, mtDuration, ttsDuration);
  };

  window.speechSynthesis.speak(utterance);
}
