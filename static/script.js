const N8N_CHAT_URL = "https://nextgen-ai-teacher.app.n8n.cloud/webhook/81d977a3-e575-4706-b000-d2228846d40f/chat";

// Session ID
let sessionId = localStorage.getItem("nextgen_session");

if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem("nextgen_session", sessionId);
}

// Message screen par dikhana
function addMessage(text, sender) {
    const messages = document.getElementById("messages");
    const message = document.createElement("div");

    message.className = "message " + sender;
    message.textContent = text;

    messages.appendChild(message);
    messages.scrollTop = messages.scrollHeight;

    return message;
}

// Learning buttons
function ask(question) {
    document.getElementById("question").value = question;
    sendMessage();
}

// AI se question poochhna
async function sendMessage() {
    const input = document.getElementById("question");
    const question = input.value.trim();

    if (!question) return;

    document.getElementById("welcome").style.display = "none";

    addMessage(question, "user");
    input.value = "";

    const thinking = addMessage("AI is thinking...", "ai");

    try {
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
            const errorText = await response.text();
            throw new Error("Server error " + response.status + ": " + errorText);
        }

        const data = await response.json();

        let answer =
            data.output ||
            data.text ||
            data.response ||
            data.message;

        if (!answer && Array.isArray(data) && data.length > 0) {
            answer =
                data[0].output ||
                data[0].text ||
                data[0].response;
        }

        if (typeof answer === "object" && answer !== null) {
            answer = JSON.stringify(answer, null, 2);
        }

        thinking.textContent = answer || "AI response nahi mila.";

    } catch (error) {
        console.error("AI Error:", error);
        thinking.textContent = "AI connection error: " + error.message;
    }

    document.getElementById("messages").scrollTop =
        document.getElementById("messages").scrollHeight;
}

// New Chat
function newChat() {
    document.getElementById("messages").innerHTML = "";
    document.getElementById("welcome").style.display = "block";
    document.getElementById("question").value = "";

    sessionId = crypto.randomUUID();
    localStorage.setItem("nextgen_session", sessionId);
}

// Enter press karne par message send
document.getElementById("question").addEventListener("keydown", function(event) {
    if (event.key === "Enter") {
        event.preventDefault();
        sendMessage();
    }
});
