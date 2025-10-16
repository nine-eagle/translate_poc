let recognition;
let finalTranscript = "";

// การเริ่มบันทึกเสียง
function startSpeechRecognition() {
    finalTranscript = "";
    recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = document.getElementById("srcLang").value;  // ใช้ภาษาที่เลือกใน dropdown
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = function(event) {
        let interimTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
            } else {
                interimTranscript += event.results[i][0].transcript;
            }
        }
        document.getElementById("aPartial").value = interimTranscript;
        document.getElementById("aInput").value = finalTranscript;
    };

    recognition.start();
}

// การแปลข้อความ
function translateText() {
    let text = document.getElementById("aInput").value;
    let targetLang = document.getElementById("tgtLang").value;

    fetch("http://localhost:8000/translate/", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            text: text,
            target_lang: targetLang
        })
    })
    .then(response => response.json())
    .then(data => {
        document.getElementById("bOutput").value = data.translated_text;
        if (document.getElementById("autoTranslate").checked) {
            textToSpeech(data.translated_text, targetLang);
        }
    });
}

// การอ่านข้อความที่แปลออกเสียง (TTS)
function textToSpeech(text, language) {
    let speechSynthesis = window.speechSynthesis;
    let utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language;
    speechSynthesis.speak(utterance);
}

// อ่านข้อความต้นฉบับ
document.getElementById("btnReadSrc").addEventListener("click", function() {
    let text = document.getElementById("aInput").value;
    let language = document.getElementById("srcLang").value;
    textToSpeech(text, language);
});

// อ่านข้อความที่แปล
document.getElementById("btnReadTgt").addEventListener("click", function() {
    let text = document.getElementById("bOutput").value;
    let language = document.getElementById("tgtLang").value;
    textToSpeech(text, language);
});

// เริ่มการบันทึกเสียง
document.getElementById("btnRec").addEventListener("click", function() {
    startSpeechRecognition();
    document.getElementById("btnStop").style.display = "inline-block";
    document.getElementById("btnRec").style.display = "none";
});

// หยุดการบันทึกเสียง
document.getElementById("btnStop").addEventListener("click", function() {
    recognition.stop();
    document.getElementById("btnStop").style.display = "none";
    document.getElementById("btnRec").style.display = "inline-block";
});
