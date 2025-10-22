// รายชื่อภาษาที่รองรับใน NLLB
const languages = {
  th: "Thai",
  en: "English",
  es: "Spanish",
  fr: "French",
  it: "Italian",
  ru: "Russian",
  de: "German",
  zh: "Chinese",
  ja: "Japanese",
  ko: "Korean",
  ar: "Arabic",
  // zh_cantonese: "Chinese (Cantonese)", // จีนกวางตุ้ง (Cantonese)
  // zh_hakka: "Chinese (Hakka)", // จีนฮากกา (Hakka)
  // hi: "Hindi", // ภาษาอินเดีย (ฮินดี)
  // bn: "Bengali", // ภาษาเบงกาลี
  // ta: "Tamil", // ภาษาอินเดีย (ทมิฬ)
  // ml: "Malayalam", // ภาษาอินเดีย (มาลายาลัม)
  // my: "Burmese", // ภาษาเมียนมาร์
  // ms: "Malay", // ภาษามลายู (สิงคโปร์)
  // ta_sg: "Tamil (Singapore)", // ภาษาทมิฬ (สิงคโปร์)
};

const languageMap = {
  th: "tha",
  en: "eng",
  es: "spa",
  fr: "fra",
  it: "ita",
  ru: "rus",
  de: "deu",
  zh: "zho",
  ja: "jpn",
  ko: "kor",
  ar: "ara",
  // Additional languages can be added here
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

// Check browser compatibility on page load
function checkBrowserCompatibility() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  if (!SpeechRecognition) {
    console.warn('Speech Recognition API not supported');
    const btnRec = document.getElementById("btnRec");
    if (btnRec) {
      btnRec.disabled = true;
      btnRec.title = "Speech Recognition not supported in this browser. Please use Chrome, Edge, or Safari.";
      btnRec.style.opacity = "0.5";
    }
  }
  
  // Check if HTTPS (except localhost)
  if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
    console.warn('HTTPS required for microphone access on mobile');
  }
  
  // Log browser info for debugging
  console.log('Browser info:', {
    userAgent: navigator.userAgent,
    speechRecognition: !!SpeechRecognition,
    https: location.protocol === 'https:',
    hostname: location.hostname
  });
}

checkBrowserCompatibility();

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
function speakText(text, languageSelect) {
  if (text !== "") {
    // สร้าง speechSynthesisUtterance ใหม่
    const utterance = new SpeechSynthesisUtterance(text);

    // ตั้งค่าเสียงตามภาษาที่เลือก
    utterance.lang = languageSelect;
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
let stt = 0;
let txt_speech = 0;
// Use relative URL for WebSocket - automatically uses ws:// or wss:// based on page protocol
const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const wsHost = window.location.host;
let socket = new WebSocket(`${wsProtocol}//${wsHost}/ws`);

// แสดง spinner และปิดปุ่ม (disabled)
const btnUploadAudio = el("btnUploadAudio");
const btnTranslate = el("btnTranslate");
const spinner = el("spinner");
const btnText = el("btnText");

const spinnerT = el("spinnerT");
const btnTextT = el("btnTextT");

socket.onerror = function (event) {
  console.error("WebSocket Error:", event);
};

socket.onclose = function (event) {
  console.log("WebSocket connection closed:", event);
};

// เมื่อได้รับข้อความจาก WebSocket (ข้อความแปล)
socket.onmessage = function (event) {
  console.log(event.data);
  const [original, translated, translationTime, action] =
    event.data.split("\n");

  el("bState").classList.remove("hidden");
  el("bState").textContent = "Waiting";

  // ดึง action จากข้อความ
  const trimmedAction = action.split(": ")[1];

  // แยกข้อมูล STT และ MT เวลาจากข้อความ
  const mtTime = parseFloat(translationTime.split(": ")[1]); // MT processing time
  // const total = parseFloat(totalTime.split(": ")[1]); // Total time

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

    // แสดงเวลา STT และ MT ในตาราง
    updateLogTable(sttText, translatedText, mtTime);

    btnUploadAudio.disabled = false;
    spinner.style.display = "none";
    btnText.style.display = "inline-block"; // กลับข้อความเดิม
  } else {
    btnTranslate.disabled = false;
    spinnerT.style.display = "none";
    btnTextT.style.display = "inline-block"; // กลับข้อความเดิม
    // console.log("NNN");
    // สำหรับการแปลข้อความจากการส่งข้อความปกติ
    const translatedText = translated.split(": ")[1];
    document.getElementById("bOutput").value = translatedText; // ข้อความแปล

    const sttText = original.split(": ")[1];
    document.getElementById("aInput").value = sttText;

    // แสดงเวลา MT ในตาราง
    updateLogTable(original.split(": ")[1], translatedText, mtTime); // No STT time here
  }

  el("bState").textContent = "Finish";
};

// ส่งข้อความที่จับจากเสียงและภาษาไป WebSocผket
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
  btnTranslate.disabled = true; // Disable the button to prevent multiple clicks
  spinnerT.style.display = "inline-block"; // Show spinner
  btnTextT.style.display = "none"; // Hide "Upload Audio" text during loading
  el("bState").classList.remove("hidden");
  el("bState").textContent = "Waitting";
  let text = document.getElementById("aInput").value; // ข้อความที่ผู้ใช้แก้ไข
  let srcLang = document.getElementById("srcLang").value; // ภาษาเริ่มต้นที่เลือกใหม่
  let tgtLang = document.getElementById("tgtLang").value; // ภาษาเป้าหมาย

  if (!text || !srcLang || !tgtLang) {
    alert(
      "[ERROR] Please ensure text, source language, and target language are selected."
    );
    return;
  }
  // ส่งข้อความที่แก้ไขไปแปลตามภาษาต้นทางใหม่
  socket.send(`${text}|${srcLang}|${tgtLang}|normal`);
});

// เมื่อผู้ใช้เปลี่ยนภาษาเริ่มต้น
document.getElementById("ttsA").addEventListener("click", function () {
  let text = document.getElementById("aInput").value;
  let srcLang = document.getElementById("srcLang").value;

  if (!text || !srcLang) {
    alert(
      "[ERROR] Please ensure text, source language, and target language are selected."
    );
    return;
  }
  speakText(text, srcLang);
});

document.getElementById("ttsB").addEventListener("click", function () {
  let text = document.getElementById("bOutput").value;
  let tgtLang = document.getElementById("tgtLang").value;

  if (!text || !tgtLang) {
    alert(
      "[ERROR] Please ensure text, source language, and target language are selected."
    );
    return;
  }
  speakText(text, tgtLang);
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

  clearTimeout(translationTimeout); // ยกเลิกการตั้งเวลาที่ค้างอยู่
});

// เมื่อคลิกปุ่ม Clear
document.getElementById("btnClear").addEventListener("click", function () {
  finalTranscript = ""; // รีเซ็ต finalTranscript
  interimTranscript = ""; // รีเซ็ต interimTranscript
  lastTranscript = ""; // รีเซ็ต lastTranscript
  clearTimeout(translationTimeout); // ยกเลิกการตั้งเวลาที่ค้างอยู่
  document.getElementById("audioFile").value = "";
  document.getElementById("aInput").value = ""; // เคลียร์ค่าใน aInput
  document.getElementById("aState").value = "";
  document.getElementById("bOutput").value = ""; // เคลียร์ค่าใน aInput
  document.getElementById("bState").value = "";
});

// ฟังก์ชันเริ่มการบันทึกเสียง
let translationTimeout; // ตัวแปรเพื่อเก็บ timeout ID
let lastTranscript = ""; // ตัวแปรเก็บข้อความล่าสุด
let finalTranscript = "";
let interimTranscript = "";

// ฟังก์ชันเริ่มการบันทึกเสียง
function startRecording() {
  // Check if Speech Recognition is supported
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  if (!SpeechRecognition) {
    alert('Speech Recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
    return;
  }

  // Check if running on HTTPS (required for mobile)
  if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
    alert('Microphone access requires HTTPS connection on mobile devices.');
    return;
  }

  try {
    recognition = new SpeechRecognition();
    recognition.lang = document.getElementById("srcLang").value;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = function() {
      console.log('Speech recognition started');
      el("aState").classList.remove("hidden");
      el("aState").textContent = "Listening...";
    };

    recognition.onerror = function(event) {
      console.error('Speech recognition error:', event.error);
      el("aState").textContent = "Error";
      
      let errorMessage = 'Microphone error: ';
      switch(event.error) {
        case 'no-speech':
          errorMessage += 'No speech detected. Please try again.';
          break;
        case 'audio-capture':
          errorMessage += 'Microphone not found or not accessible.';
          break;
        case 'not-allowed':
          errorMessage += 'Microphone permission denied. Please allow microphone access in your browser settings.';
          break;
        case 'network':
          errorMessage += 'Network error occurred.';
          break;
        case 'aborted':
          errorMessage += 'Recognition aborted.';
          break;
        default:
          errorMessage += event.error;
      }
      alert(errorMessage);
      
      // Reset buttons
      document.getElementById("btnStop").style.display = "none";
      document.getElementById("btnRec").style.display = "inline-block";
      document.getElementById("btnPause").style.display = "none";
      document.getElementById("btnResume").style.display = "none";
    };

    recognition.onend = function() {
      console.log('Speech recognition ended');
      el("aState").textContent = "Stopped";
    };

    recognition.onresult = function (event) {
      const startTime = Date.now(); // Time when the recording starts
      interimTranscript = ""; // Reset interim transcript

      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript; // Final transcript
        } else {
          interimTranscript += event.results[i][0].transcript; // Interim result
        }
      }

      // เพิ่มข้อความใหม่ไปยัง aInput โดยไม่รีเซ็ตข้อความเก่า
      document.getElementById("aInput").value =
        finalTranscript + interimTranscript;

      // ตรวจสอบว่า finalTranscript มีข้อความใหม่และแตกต่างจาก lastTranscript
      if (finalTranscript.length > 0 && finalTranscript !== lastTranscript) {
        lastTranscript = finalTranscript;

        // กำหนดเวลาในการแปล (เช่น รอ 1 วินาทีหลังจากมีการพูดเสร็จ)
        clearTimeout(translationTimeout); // ยกเลิกการแปลก่อนหน้านี้หากยังมีการพูดอยู่
        translationTimeout = setTimeout(function () {
          // ส่งข้อความไปแปลเมื่อไม่ได้รับข้อความใหม่จากการพูด
          sendTextForTranslation(finalTranscript);

          // คำนวณเวลาในการแปลงเสียงเป็นข้อความ
          const endTime = Date.now();
          const elapsedTime = (endTime - startTime) / 1000; // Time in seconds
          stt = elapsedTime;
        }, 1000); // รอ 1 วินาทีหลังจากการพูดเสร็จ
      }
    };

    recognition.start(); // เริ่มการบันทึกเสียง
    
  } catch (error) {
    console.error('Failed to start recognition:', error);
    alert('Failed to start microphone: ' + error.message);
  }
}

document
  .getElementById("btnUploadAudio")
  .addEventListener("click", function () {
    console.log("a");

    // Capture the start time
    const startTime = Date.now();

    btnUploadAudio.disabled = true; // Disable the button to prevent multiple clicks
    spinner.style.display = "inline-block"; // Show spinner
    btnText.style.display = "none"; // Hide "Upload Audio" text during loading

    const srcLang = document.getElementById("srcLang").value;
    const tgtLang = document.getElementById("tgtLang").value;
    const apiLangCode = languageMap[srcLang];

    // Create FormData for the audio file and parameters
    const formData = new FormData();
    formData.append(
      "audio_file",
      document.getElementById("audioFile").files[0]
    ); // Assuming the file input ID is "audioFile"
    formData.append("max_duration", "10");
    formData.append("max_silence", "0.3");
    formData.append("language", apiLangCode);
    formData.append("srt", "no");

    // Send the POST request using Fetch API
    fetch("https://api-voice.botnoi.ai/api/genai/gensub_upload", {
      method: "POST",
      headers: {
        accept: "application/json",
        "botnoi-token": "K0dSfJoeOXRNNKyTt0uvzRh5ePm8BlZm",
      },
      body: formData,
    })
      .then((response) => response.json())
      .then((data) => {
        // Capture the end time
        const endTime = Date.now();
        const elapsedTime = (endTime - startTime) / 1000; // Time in seconds
        stt = elapsedTime;

        if (data.message === "Transcribe successfully") {
          // Extract transcription text and display it in the input field
          document.getElementById("aInput").value = data.data.text;
          socket.send(`${data.data.text}|${srcLang}|${tgtLang}|normal`);

          // // Output the duration to the console or a specific element
          // console.log(`Time taken: ${elapsedTime} seconds`);

          // // Optionally display the time taken on the page
          // document.getElementById("timeTaken").textContent = `Time taken: ${elapsedTime.toFixed(2)} seconds`;

          // Reset the button state
          btnUploadAudio.disabled = false;
          spinner.style.display = "none";
          btnText.style.display = "inline-block"; // Show "Upload Audio" text again
        } else {
          console.error("Error: ", data.message);
        }
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  });

// document
//   .getElementById("btnUploadAudio")
//   .addEventListener("click", function () {
//     const audioFile = document.getElementById("audioFile").files[0];
//     if (!audioFile) {
//       alert("Please select an audio file first!");
//       return;
//     }

//     btnUploadAudio.disabled = true; // ปิดปุ่มเพื่อไม่ให้คลิกซ้ำ
//     spinner.style.display = "inline-block"; // แสดง spinner
//     btnText.style.display = "none"; // ซ่อนข้อความ "Upload Audio" ขณะโหลด

//     const reader = new FileReader();
//     reader.onloadend = function () {
//       // ตรวจสอบว่าเป็น base64 string ที่ถูกต้อง
//       const audioBase64 = reader.result.split(",")[1]; // ตัด 'data:audio/wav;base64,' ออก

//       const srcLang = document.getElementById("srcLang").value;
//       const tgtLang = document.getElementById("tgtLang").value;

//       if (!srcLang || !tgtLang) {
//         console.log(
//           "[ERROR] Please ensure source and target languages are selected."
//         );
//         // รีเซ็ตสถานะปุ่ม
//         btnUploadAudio.disabled = false;
//         spinner.style.display = "none";
//         btnText.style.display = "inline-block"; // กลับข้อความเดิม
//         return;
//       }

//       // ส่งข้อมูลเสียงในรูปแบบ base64 ผ่าน WebSocket
//       socket.send(`${audioBase64}|${srcLang}|${tgtLang}|audio`);
//     };

//     // อ่านไฟล์เสียงเป็น base64
//     reader.readAsDataURL(audioFile);
//   });

// Function to update the log table with the processing times
function updateLogTable(originalText, translatedText, mtTime) {
  // console.log(originalText, translatedText, mtTime);
  // Get the current time
  const currentTime = new Date().toLocaleTimeString();

  // Get the log table body
  const logBody = document.getElementById("logBody");

  // Calculate total time
  const totalTime = Number(stt) + Number(mtTime);

  // Create a new row and format it with the data
  const newRow = document.createElement("tr");
  newRow.innerHTML = `
    <td class="px-3 py-2">${currentTime}</td>
    <td class="px-3 py-2">${originalText}</td>
    <td class="px-3 py-2">${translatedText}</td>
    <td class="text-right px-3 py-2">${stt.toFixed(2)}</td>
    <td class="text-right px-3 py-2">${mtTime.toFixed(2)}</td>
    <td class="text-right px-3 py-2">${txt_speech.toFixed(2)}</td>
    <td class="text-right px-3 py-2">${totalTime.toFixed(2)}</td>
  `;

  // Insert the new row at the top of the table body (before the first child)
  logBody.insertBefore(newRow, logBody.firstChild);

  // Check if there are rows in the table, if yes, hide the "No logs yet" message
  const noLogsMessage = document.getElementById("noLogsMessage"); // Get the "No logs yet" message by its ID
  if (logBody.rows.length > 1) {
    // Make sure there are rows besides the "No logs yet" message
    noLogsMessage.style.display = "none"; // Hide the "No logs yet" message
  }
}

document.getElementById("applySettings").addEventListener("click", function () {
  const chunkSize = document.getElementById("chunk").value;
  const vadSensitivity = document.getElementById("vad").value;

  // Display the settings in the console (for testing)
  // console.log(
  //   `Chunk Size: ${chunkSize}, VAD Sensitivity: ${vadSensitivity}`
  // );

  // Send settings to backend using AJAX (POST request) - use relative URL for proxy
  fetch("/set_audio_settings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chunkSize: chunkSize,
      vadSensitivity: vadSensitivity,
    }),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      // Show success status in console
      console.log("Settings applied:", data);
      if (data.status === "success") {
        alert("Settings applied successfully!");
      } else {
        alert(`Settings update: ${data.message}`);
      }
    })
    .catch((error) => {
      // Handle errors
      console.error("Error:", error);
      alert(`Error applying settings: ${error.message}`);
    });
});

function exportToJson() {
  // ดึงข้อมูลจากตาราง
  const tableData = [];
  const rows = document.querySelectorAll("#logBody tr");

  rows.forEach((row) => {
    const rowData = {};
    row.querySelectorAll("td").forEach((cell, index) => {
      const header = document.querySelectorAll("thead th")[index].id;
      rowData[header] = cell.textContent;
    });
    tableData.push(rowData);
  });

  // สร้าง JSON จากข้อมูล
  const json = JSON.stringify(tableData, null, 2);

  // สร้างไฟล์และดาวน์โหลด
  const blob = new Blob([json], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "evidence_data.json";
  link.click();
}
