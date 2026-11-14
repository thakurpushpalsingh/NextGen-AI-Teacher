
"use strict";

// ==================================================
// NEXTGEN AI TEACHER - IMPROVED JAVASCRIPT
// ==================================================

// Existing n8n webhook
const N8N_CHAT_URL =
    "https://nextgen-ai-teacher.app.n8n.cloud/webhook/81d977a3-e575-4706-b000-d2228846d40f/chat";

// ==================================================
// SESSION MANAGEMENT
// ==================================================

function createSessionId() {
    if (crypto.randomUUID) {
        return crypto.randomUUID();
    }

    return "session-" + Date.now() + "-" +
        Math.random().toString(36).slice(2);
}

function getSessionId() {
    try {
        let id = localStorage.getItem("nextgen_session");

        if (!id) {
            id = createSessionId();
            localStorage.setItem("nextgen_session", id);
        }

        return id;

    } catch (error) {
        console.error("Session storage error:", error);
        return createSessionId();
    }
}

let sessionId = getSessionId();

let isSending = false;
let currentUtterance = null;
let recognition = null;


// ==================================================
// LOAD EXTERNAL LIBRARIES
// ==================================================

function loadExternalScript(src) {
    return new Promise((resolve, reject) => {

        const existing = [...document.scripts].find(
            script => script.src === src
        );

        if (existing) {

            if (existing.dataset.loaded === "true") {
                resolve();
                return;
            }

            existing.addEventListener("load", resolve, { once: true });
            existing.addEventListener("error", reject, { once: true });

            return;
        }

        const script = document.createElement("script");

        script.src = src;
        script.async = true;

        script.onload = () => {
            script.dataset.loaded = "true";
            resolve();
        };

        script.onerror = reject;

        document.head.appendChild(script);
    });
}

async function loadMarkdownLibraries() {
    try {

        if (typeof marked === "undefined") {
            await loadExternalScript(
                "https://cdn.jsdelivr.net/npm/marked/marked.min.js"
            );
        }

        if (typeof DOMPurify === "undefined") {
            await loadExternalScript(
                "https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.2.6/purify.min.js"
            );
        }

        return (
            typeof marked !== "undefined" &&
            typeof DOMPurify !== "undefined"
        );

    } catch (error) {

        console.error("Markdown library error:", error);
        return false;

    }
}


// ==================================================
// EXTRA DESIGN STYLES
// ==================================================

function addTeacherStyles() {

    if (document.getElementById("nextgen-extra-styles")) return;

    const style = document.createElement("style");

    style.id = "nextgen-extra-styles";

    style.textContent = `
        .message.ai {
            line-height: 1.75;
            overflow-wrap: anywhere;
            text-align: left;
            min-width: 0;
        }

        .message.ai h1,
        .message.ai h2,
        .message.ai h3 {
            margin: 18px 0 10px;
            color: #ffffff;
        }

        .message.ai p {
            margin: 10px 0;
        }

        .message.ai ul,
        .message.ai ol {
            padding-left: 24px;
            margin: 10px 0;
        }

        .message.ai li {
            margin: 6px 0;
        }

        .message.ai strong {
            color: #60a5fa;
        }

        .message.ai pre {
            position: relative;
            max-width: 100%;
            box-sizing: border-box;
            background: #080d18;
            border: 1px solid #29364b;
            border-radius: 10px;
            padding: 45px 16px 16px;
            overflow-x: auto;
            margin: 14px 0;
            white-space: pre;
        }

        .message.ai pre code {
            background: transparent;
            padding: 0;
            color: #e2e8f0;
            font-family: Consolas, monospace;
            font-size: 14px;
            overflow-wrap: normal;
        }

        .message.ai :not(pre) > code {
            background: #172033;
            padding: 3px 6px;
            border-radius: 5px;
            font-family: Consolas, monospace;
            color: #93c5fd;
        }

        .message.ai blockquote {
            border-left: 3px solid #3b82f6;
            padding-left: 12px;
            color: #cbd5e1;
            margin: 12px 0;
        }

        .nextgen-copy-btn {
            position: absolute;
            top: 8px;
            right: 8px;
            background: #263449;
            color: white;
            border: 1px solid #40516b;
            padding: 6px 10px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
        }

        .nextgen-copy-btn:hover {
            background: #2563eb;
        }

        .nextgen-copy-btn:disabled {
            opacity: 0.7;
            cursor: default;
        }

        .nextgen-status {
            font-size: 12px;
            color: #94a3b8;
            margin: 5px 0;
        }

        @media (max-width: 600px) {
            .message.ai pre code {
                font-size: 12px;
            }

            .message.ai pre {
                padding-left: 10px;
                padding-right: 10px;
            }

            .nextgen-copy-btn {
                font-size: 11px;
                padding: 5px 8px;
            }
        }
    `;

    document.head.appendChild(style);
}


// ==================================================
// CLEAN AI RESPONSE
// ==================================================

function cleanAnswer(answer) {

    return String(answer ?? "")
        .replace(/\\\*/g, "*")
        .replace(/\\_/g, "_")
        .replace(/\\#/g, "#")
        .replace(/\\`/g, "`")
        .replace(/&#x20;/gi, " ")
        .replace(/&nbsp;/gi, " ");

}


// ==================================================
// MARKDOWN RENDERING
// ==================================================

function renderMarkdown(text) {

    const cleaned = cleanAnswer(text);

    if (
        typeof marked === "undefined" ||
        typeof DOMPurify === "undefined"
    ) {
        return null;
    }

    try {

        const html = marked.parse(cleaned, {
            breaks: true,
            gfm: true
        });

        return DOMPurify.sanitize(html);

    } catch (error) {

        console.error("Markdown rendering error:", error);
        return null;

    }
}


// ==================================================
// ADD MESSAGE TO CHAT
// ==================================================

function addMessage(text, sender) {

    const messages = document.getElementById("messages");

    if (!messages) return null;

    const message = document.createElement("div");

    message.className = "message " + sender;

    if (sender === "ai") {

        const formatted = renderMarkdown(text);

        if (formatted !== null) {
            message.innerHTML = formatted;
            addCodeCopyButtons(message);
        } else {
            message.textContent = cleanAnswer(text);
        }

    } else {

        message.textContent = text;

    }

    messages.appendChild(message);

    messages.scrollTop = messages.scrollHeight;

    return message;
}


// ==================================================
// CODE COPY BUTTONS
// ==================================================

function addCodeCopyButtons(container) {

    container.querySelectorAll("pre").forEach(pre => {

        if (pre.querySelector(".nextgen-copy-btn")) return;

        const button = document.createElement("button");

        button.className = "nextgen-copy-btn";
        button.type = "button";
        button.textContent = "Copy Code";

        button.addEventListener("click", async () => {

            const code = pre.querySelector("code");

            if (!code) return;

            try {

                await navigator.clipboard.writeText(code.innerText);

                button.textContent = "Copied!";
                button.disabled = true;

                setTimeout(() => {
                    button.textContent = "Copy Code";
                    button.disabled = false;
                }, 1500);

            } catch (error) {

                console.error("Copy error:", error);
                button.textContent = "Copy failed";

            }

        });

        pre.appendChild(button);

    });

}


// ==================================================
// LEARNING BUTTONS
// ==================================================

function ask(question) {

    const input = document.getElementById("question");

    if (!input) return;

    input.value = question;

    sendMessage();

}


// ==================================================
// VOICE TO TEXT
// ==================================================

function startVoice() {

    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;

    if (!SpeechRecognition) {

        alert("Voice input ke liye updated Google Chrome use karo.");

        return;
    }

    if (recognition) {
        recognition.abort();
    }

    recognition = new SpeechRecognition();

    // Hindi voice input
    recognition.lang = "hi-IN";

    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
        console.log("Voice listening started");
    };

    recognition.onresult = event => {

        const spokenText = event.results[0][0].transcript;

        const input = document.getElementById("question");

        if (input) {
            input.value = spokenText;
            sendMessage();
        }

    };

    recognition.onerror = event => {

        console.error("Voice error:", event.error);

        if (
            event.error !== "no-speech" &&
            event.error !== "aborted"
        ) {
            alert("Voice input error: " + event.error);
        }

    };

    recognition.onend = () => {
        recognition = null;
    };

    try {
        recognition.start();
    } catch (error) {
        console.error("Voice start error:", error);
        recognition = null;
    }

}


// ==================================================
// AI TEXT TO SPEECH
// ==================================================

function speakAnswer(text) {

    if (!("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();

    const plainText = cleanAnswer(text)
        .replace(/```[\s\S]*?```/g, " Code example omitted. ")
        .replace(/`([^`]+)`/g, "$1")
        .replace(/#{1,6}\s/g, "")
        .replace(/[*_~]/g, "")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

    currentUtterance = new SpeechSynthesisUtterance(plainText);

    // Select language based on the response
    currentUtterance.lang =
        /[\u0900-\u097F]/.test(plainText)
            ? "hi-IN"
            : "en-IN";

    currentUtterance.rate = 0.95;
    currentUtterance.pitch = 1;
    currentUtterance.volume = 1;

    window.speechSynthesis.speak(currentUtterance);

}


// ==================================================
// PAUSE VOICE
// ==================================================

function pauseVoice() {

    if (
        "speechSynthesis" in window &&
        window.speechSynthesis.speaking
    ) {
        window.speechSynthesis.pause();
    }

}


// ==================================================
// RESUME VOICE
// ==================================================

function resumeVoice() {

    if (
        "speechSynthesis" in window &&
        window.speechSynthesis.paused
    ) {
        window.speechSynthesis.resume();
    }

}


// ==================================================
// STOP VOICE
// ==================================================

function stopVoice() {

    if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
    }

    if (recognition) {

        recognition.abort();
        recognition = null;

    }

    currentUtterance = null;

}


// ==================================================
// EXTRACT AI RESPONSE
// ==================================================

function extractAnswer(data) {

    if (Array.isArray(data) && data.length > 0) {
        data = data[0];
    }

    if (typeof data === "string") {
        return data;
    }

    if (data && typeof data === "object") {

        let answer =
            data.output ??
            data.text ??
            data.response ??
            data.message ??
            data.answer;

        if (typeof answer === "object" && answer !== null) {
            answer = JSON.stringify(answer, null, 2);
        }

        if (answer !== undefined && answer !== null) {
            return String(answer);
        }

    }

    return "AI response nahi mila.";

}


// ==================================================
// READ SERVER RESPONSE
// ==================================================

async function readServerResponse(response) {

    const responseText = await response.text();

    if (!responseText) {
        throw new Error("Server ne empty response bheja.");
    }

    try {

        return JSON.parse(responseText);

    } catch (error) {

        // Also support plain text responses
        return responseText;

    }

}


// ==================================================
// MAIN AI CHAT FUNCTION
// ==================================================

async function sendMessage() {

    const input = document.getElementById("question");
    const messages = document.getElementById("messages");
    const welcome = document.getElementById("welcome");

    if (!input || !messages) return;

    const question = input.value.trim();

    if (!question || isSending) return;

    isSending = true;

    const sendButton = document.querySelector(
        '.input-area button[onclick="sendMessage()"]'
    );

    if (sendButton) {
        sendButton.disabled = true;
    }

    stopVoice();

    if (welcome) {
        welcome.style.display = "none";
    }

    addMessage(question, "user");

    input.value = "";

    const thinking = addMessage("AI is thinking...", "ai");

    try {

        // Preserve the existing n8n request structure
        const response = await fetch(N8N_CHAT_URL, {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                chatInput: question,
                sessionId: sessionId
            })

        });

        if (!response.ok) {

            throw new Error(
                "Server error: " + response.status
            );

        }

        const data = await readServerResponse(response);

        const answer = extractAnswer(data);

        // Ensure formatting libraries are available
        await loadMarkdownLibraries();

        const formatted = renderMarkdown(answer);

        if (thinking) {

            if (formatted !== null) {

                thinking.innerHTML = formatted;
                addCodeCopyButtons(thinking);

            } else {

                thinking.textContent = cleanAnswer(answer);

            }

        }

        messages.scrollTop = messages.scrollHeight;

        // Speak response
        speakAnswer(answer);

    } catch (error) {

        console.error("AI Error:", error);

        if (thinking) {

            thinking.textContent =
                "AI connection error: " + error.message +
                "\nPlease check your internet connection and n8n workflow.";

        }

    } finally {

        isSending = false;

        if (sendButton) {
            sendButton.disabled = false;
        }

        messages.scrollTop = messages.scrollHeight;

    }

}


// ==================================================
// NEW CHAT
// ==================================================

function newChat() {

    stopVoice();

    const messages = document.getElementById("messages");
    const welcome = document.getElementById("welcome");
    const input = document.getElementById("question");

    if (messages) {
        messages.innerHTML = "";
    }

    if (welcome) {
        welcome.style.display = "block";
    }

    if (input) {
        input.value = "";
        input.focus();
    }

    sessionId = createSessionId();

    try {
        localStorage.setItem("nextgen_session", sessionId);
    } catch (error) {
        console.error("Session storage error:", error);
    }

}


// ==================================================
// SCREENSHOT DOWNLOAD
// ==================================================

async function takeScreenshot() {

    const target = document.querySelector(".main");

    if (!target) {
        alert("Screenshot area not found!");
        return;
    }

    try {

        if (typeof html2canvas === "undefined") {

            await loadExternalScript(
                "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"
            );

        }

        const canvas = await html2canvas(target, {

            backgroundColor: "#0b0d14",
            scale: 2,
            useCORS: true

        });

        const link = document.createElement("a");

        link.download = "NextGen-AI-Teacher-Screenshot.png";

        link.href = canvas.toDataURL("image/png");

        link.click();

    } catch (error) {

        console.error("Screenshot error:", error);

        alert("Screenshot nahi ban paya. Internet check karo.");

    }

}


// ==================================================
// ENTER TO SEND
// ==================================================

const questionInput = document.getElementById("question");

if (questionInput) {

    questionInput.addEventListener("keydown", event => {

        if (event.key === "Enter" && !event.shiftKey) {

            event.preventDefault();

            sendMessage();

        }

    });

}


// ==================================================
// INITIALIZE WEBSITE
// ==================================================

addTeacherStyles();

loadMarkdownLibraries().then(loaded => {

    console.log(
        loaded
            ? "NextGen Markdown Ready!"
            : "Markdown unavailable. Using plain text."
    );

});

console.log("NextGen AI Teacher JavaScript Loaded!");
