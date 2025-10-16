// รายชื่อภาษาที่รองรับใน NLLB
const languages = {
  en: "English",
  th: "Thai",
  fr: "French",
  de: "German",
  es: "Spanish",
  it: "Italian",
  ja: "Japanese",
  ko: "Korean",
  zh: "Chinese",
};

/** ======= Devices scan ======= */
const el = (id) => document.getElementById(id);
async function scanDevices() {
  const inSel = el("inDev"),
    outSel = el("outDev");
  inSel.innerHTML = "";
  outSel.innerHTML = "";
  try {
    await navigator.mediaDevices.getUserMedia({ audio: true });
    const devs = await navigator.mediaDevices.enumerateDevices();
    const ins = devs.filter((d) => d.kind === "audioinput");
    const outs = devs.filter((d) => d.kind === "audiooutput");
    (ins.length
      ? ins
      : [{ deviceId: "default", label: "Default microphone" }]
    ).forEach((d) => {
      const o = document.createElement("option");
      o.value = d.deviceId;
      o.textContent = d.label || "Microphone";
      inSel.appendChild(o);
    });
    (outs.length
      ? outs
      : [{ deviceId: "default", label: "Default speaker" }]
    ).forEach((d) => {
      const o = document.createElement("option");
      o.value = d.deviceId;
      o.textContent = d.label || "Speaker";
      outSel.appendChild(o);
    });
  } catch (e) {
    ["Default microphone"].forEach((n) => {
      const o = document.createElement("option");
      o.textContent = n;
      inSel.appendChild(o);
    });
    ["Default speaker"].forEach((n) => {
      const o = document.createElement("option");
      o.textContent = n;
      outSel.appendChild(o);
    });
  }
}
el("btnScan").addEventListener("click", scanDevices);
el("aState").classList.add("hidden");
el("bState").classList.add("hidden");
scanDevices();

// ฟังก์ชันเติมตัวเลือกภาษาลงใน dropdown
function populateLanguageSelect() {
  const srcLangSelect = document.getElementById("srcLang");
  const tgtLangSelect = document.getElementById("tgtLang");

  // เติมตัวเลือกให้กับ srcLang และ tgtLang
  for (const [code, language] of Object.entries(languages)) {
    const optionSrc = document.createElement("option");
    optionSrc.value = code;
    optionSrc.text = language;
    srcLangSelect.appendChild(optionSrc);

    const optionTgt = document.createElement("option");
    optionTgt.value = code;
    optionTgt.text = language;
    tgtLangSelect.appendChild(optionTgt);

    // ตั้งค่า data-prev-value ของ select ให้เป็นค่าของตัวเลือกแรก
    if (srcLangSelect.options.length > 0) {
      srcLangSelect.setAttribute(
        "data-prev-value",
        srcLangSelect.options[0].value
      );
    }
  }
}

// เรียกฟังก์ชันเพื่อเติมภาษาเมื่อหน้าโหลด
populateLanguageSelect();

// ฟังก์ชันสำหรับการอ่านออกเสียงข้อความจาก input field ที่เลือก
function speakText(elementId, languageSelect) {
  const text = document.getElementById(elementId).value;

  if (text !== "") {
    // สร้าง speechSynthesisUtterance ใหม่
    const utterance = new SpeechSynthesisUtterance(text);

    // รับค่าภาษาเสียงจาก select
    const language = document.getElementById(languageSelect).value;

    // ตั้งค่าเสียงตามภาษาที่เลือก
    utterance.lang = language;
    // ปรับแต่งเสียง: ลดความเร็ว, ปรับความสูง และระดับเสียง
    utterance.rate = 0.8; // ความเร็ว (0.1 - 10, ค่าเริ่มต้นคือ 1)
    utterance.pitch = 1.2; // ความสูง (0 - 2, ค่าเริ่มต้นคือ 1)
    utterance.volume = 1; // ระดับเสียง (0 - 1, ค่าเริ่มต้นคือ 1)

    // เริ่มต้นการพูด
    window.speechSynthesis.speak(utterance);
  } else {
    alert("Please enter text to speak!");
  }
}

let recognition;
let isRecording = false;
let interimTranscript = "";
let finalTranscript = "";
let socket = new WebSocket("ws://localhost:8000/ws"); // WebSocket ที่เชื่อมต่อกับ Backend

// เมื่อเชื่อมต่อ WebSocket สำเร็จ
socket.onopen = function () {
  console.log("Connected to WebSocket server.");
};

// เมื่อได้รับข้อความจาก WebSocket (ข้อความแปล)
socket.onmessage = function (event) {
  const [original, translated, action] = event.data.split("\n");
  el("bState").classList.remove("hidden");
  el("bState").textContent = "Waitting";
  // ดึง action จากข้อความ
  const trimmedAction = action.split(": ")[1];

  if (trimmedAction == "change_srcLang") {
    // หาก action เป็น "change_srcLang", แสดงข้อความต้นทางใน input
    const translatedText = translated.split(": ")[1];
    document.getElementById("aInput").value = translatedText; // ข้อความต้นทาง (STT)
    el("aState").textContent = "Finish";
  } else if (trimmedAction == "audio") {
    // หาก action เป็น "audio" (เสียงที่แปลงเป็นข้อความ), แสดงข้อความต้นทางใน input
    const sttText = original.split(": ")[1];
    document.getElementById("aInput").value = sttText; // ข้อความต้นทาง (STT)

    // แสดงข้อความแปลใน bOutput
    const translatedText = translated.split(": ")[1];
    document.getElementById("bOutput").value = translatedText; // ข้อความแปลจากเสียง (STT)
  } else {
    // สำหรับการแปลข้อความจากการส่งข้อความปกติ
    const translatedText = translated.split(": ")[1];
    document.getElementById("bOutput").value = translatedText; // ข้อความแปล
  }
  el("bState").textContent = "Finish";
};

// ส่งข้อความที่จับจากเสียงและภาษาไป WebSocket
function sendTextForTranslation(text) {
  let srcLang = document.getElementById("srcLang").value; // รับค่าภาษาต้นทางจาก dropdown
  let tgtLang = document.getElementById("tgtLang").value; // รับค่าภาษาปลายทางจาก dropdown

  if (!text || !srcLang || !tgtLang) {
    console.log(
      "[ERROR] Please ensure text, source language, and target language are selected."
    );
    return;
  }

  // ส่งข้อมูลในรูปแบบ text|src_lang|tgt_lang
  socket.send(`${text}|${srcLang}|${tgtLang}|normal`);
}

// เมื่อคลิกปุ่ม Translate เพื่อแปลข้อความที่ผู้ใช้แก้ไขและเลือกภาษาต้นทางใหม่
document.getElementById("btnTranslate").addEventListener("click", function () {
  el("bState").classList.remove("hidden");
  el("bState").textContent = "Waitting";
  let text = document.getElementById("aInput").value; // ข้อความที่ผู้ใช้แก้ไข
  let srcLang = document.getElementById("srcLang").value; // ภาษาเริ่มต้นที่เลือกใหม่
  let tgtLang = document.getElementById("tgtLang").value; // ภาษาเป้าหมาย

  if (!text || !srcLang || !tgtLang) {
    console.log(
      "[ERROR] Please ensure text, source language, and target language are selected."
    );
    return;
  }

  // ส่งข้อความที่แก้ไขไปแปลตามภาษาต้นทางใหม่
  socket.send(`${text}|${srcLang}|${tgtLang}|normal`);
});

// เมื่อผู้ใช้เปลี่ยนภาษาเริ่มต้น
document.getElementById("srcLang").addEventListener("change", function () {
  el("aState").classList.remove("hidden");
  el("aState").textContent = "Waitting";
  // เก็บค่าภาษาปลายทางก่อนการเปลี่ยนแปลง
  let prevTgtLang = this.getAttribute("data-prev-value");

  // อัปเดต data-prev-value ด้วยค่าภาษาปลายทางปัจจุบัน
  this.setAttribute("data-prev-value", this.value);

  let text = document.getElementById("aInput").value;
  let srcLang = prevTgtLang || this.value;
  let tgtLang = this.value;
  let action = "change_srcLang";

  // ตรวจสอบว่ามีข้อความและภาษาปลายทางใหม่ที่เลือก
  if (text && srcLang && tgtLang) {
    // ส่งข้อมูลที่ต้องการไปยัง WebSocket
    socket.send(`${text}|${srcLang}|${tgtLang}|${action}`);
  }
});

// เมื่อผู้ใช้เปลี่ยนภาษาเป้าหมาย
document.getElementById("tgtLang").addEventListener("change", function () {
  el("bState").classList.remove("hidden");
  el("bState").textContent = "Waitting";
  let text = document.getElementById("aInput").value;
  let srcLang = document.getElementById("srcLang").value;
  let tgtLang = this.value;
  let action = "change_tgtLang";

  // ตรวจสอบว่ามีข้อความและภาษาปลายทางใหม่ที่เลือก
  if (text && srcLang && tgtLang) {
    socket.send(`${text}|${srcLang}|${tgtLang}|${action}`);
  }
});

// เมื่อคลิกปุ่ม Record
document.getElementById("btnRec").addEventListener("click", function () {
  startRecording();
  document.getElementById("btnStop").style.display = "inline-block";
  document.getElementById("btnRec").style.display = "none";
  document.getElementById("btnPause").style.display = "inline-block";
});

// เมื่อคลิกปุ่ม Pause
document.getElementById("btnPause").addEventListener("click", function () {
  recognition.stop(); // หยุดการบันทึกเสียง
  document.getElementById("btnPause").style.display = "none";
  document.getElementById("btnResume").style.display = "inline-block";
});

// เมื่อคลิกปุ่ม Resume
document.getElementById("btnResume").addEventListener("click", function () {
  startRecording(); // เริ่มการบันทึกเสียงใหม่
  document.getElementById("btnResume").style.display = "none";
  document.getElementById("btnPause").style.display = "inline-block";
});

// เมื่อคลิกปุ่ม Stop
document.getElementById("btnStop").addEventListener("click", function () {
  recognition.stop();
  document.getElementById("btnStop").style.display = "none";
  document.getElementById("btnRec").style.display = "inline-block";
  document.getElementById("btnPause").style.display = "none";
  document.getElementById("btnResume").style.display = "none";
});

// ฟังก์ชันเริ่มการบันทึกเสียง
function startRecording() {
  // finalTranscript = "";  // รีเซ็ต final transcript
  recognition = new (window.SpeechRecognition ||
    window.webkitSpeechRecognition)();
  recognition.lang = document.getElementById("srcLang").value; // กำหนดภาษาตามที่ผู้ใช้เลือก
  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.onresult = function (event) {
    interimTranscript = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      if (event.results[i].isFinal) {
        finalTranscript += event.results[i][0].transcript;
      } else {
        interimTranscript += event.results[i][0].transcript;
      }
    }

    // ส่งข้อความที่จับจากเสียงไปแปล
    if (finalTranscript.length > 0) {
      document.getElementById("aInput").value = finalTranscript;
      sendTextForTranslation(finalTranscript);
    } else {
      document.getElementById("aInput").value = interimTranscript;
    }
  };

  recognition.start(); // เริ่มบันทึกเสียง
}

// ฟังก์ชันเริ่มบันทึกเสียงและแปลงเป็นข้อความ (STT)
// function startSpeechRecognition() {
//   let finalTranscript = "";
//   recognition = new (window.SpeechRecognition ||
//     window.webkitSpeechRecognition)();
//   recognition.lang = document.getElementById("srcLang").value; // เลือกภาษาต้นทางจาก dropdown
//   recognition.continuous = true;
//   recognition.interimResults = true;

//   recognition.onresult = function (event) {
//     let interimTranscript = "";
//     for (let i = event.resultIndex; i < event.results.length; i++) {
//       if (event.results[i].isFinal) {
//         finalTranscript += event.results[i][0].transcript;
//       } else {
//         interimTranscript += event.results[i][0].transcript;
//       }
//     }

//     // ส่งข้อความที่จับจากเสียงไปแปล
//     if (finalTranscript.length > 0) {
//       sendTextForTranslation(finalTranscript);
//     }

//     // แสดงข้อความที่จับได้จากเสียง
//     el("aInput").value = interimTranscript || finalTranscript;
//   };

//   recognition.start();
// }

document
  .getElementById("btnUploadAudio")
  .addEventListener("click", function () {
    const audioFile = document.getElementById("audioFile").files[0];
    if (!audioFile) {
      alert("Please select an audio file first!");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = function () {
      // ตรวจสอบว่าเป็น base64 string ที่ถูกต้อง
      const audioBase64 = reader.result.split(",")[1]; // ตัด 'data:audio/wav;base64,' ออก

      const srcLang = document.getElementById("srcLang").value;
      const tgtLang = document.getElementById("tgtLang").value;

      if (!srcLang || !tgtLang) {
        console.log(
          "[ERROR] Please ensure source and target languages are selected."
        );
        return;
      }

      // ส่งข้อมูลเสียงในรูปแบบ base64 ผ่าน WebSocket
      socket.send(`${audioBase64}|${srcLang}|${tgtLang}|audio`);
    };

    // อ่านไฟล์เสียงเป็น base64
    reader.readAsDataURL(audioFile);
  });
