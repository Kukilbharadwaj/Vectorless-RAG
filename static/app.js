const leftMenuBtn = document.getElementById("leftMenuBtn");
const rightMenuBtn = document.getElementById("rightMenuBtn");
const closeLeftPanel = document.getElementById("closeLeftPanel");
const closeRightPanel = document.getElementById("closeRightPanel");

const leftPanel = document.getElementById("leftPanel");
const rightPanel = document.getElementById("rightPanel");

const pdfFile = document.getElementById("pdfFile");
const uploadBtn = document.getElementById("uploadBtn");
const statusBtn = document.getElementById("statusBtn");
const askBtn = document.getElementById("askBtn");

const queryInput = document.getElementById("queryInput");
const modelInput = document.getElementById("modelInput");

const docInfo = document.getElementById("docInfo");
const statusInfo = document.getElementById("statusInfo");
const thinkingBox = document.getElementById("thinkingBox");
const nodesBox = document.getElementById("nodesBox");
const chatMessages = document.getElementById("chatMessages");

let currentDocId = "pi-cmnq6ddzt029o01pgwl3a1c2i";
let currentReady = false;

function togglePanel(panel, forceOpen) {
  const shouldOpen = typeof forceOpen === "boolean" ? forceOpen : !panel.classList.contains("open");
  panel.classList.toggle("open", shouldOpen);
}

function appendMessage(role, text) {
  const div = document.createElement("div");
  div.className = `msg ${role}`;
  div.textContent = text;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function setDocDetails() {
  docInfo.textContent = currentDocId || "No document loaded";
}

async function checkStatus(showToast = false) {
  if (!currentDocId) {
    statusInfo.textContent = "No document loaded";
    askBtn.disabled = true;
    currentReady = false;
    return;
  }

  statusInfo.textContent = "Checking...";

  try {
    const res = await fetch(`/api/documents/${currentDocId}/status`);
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.detail || "Status check failed");
    }

    currentReady = Boolean(data.ready);
    askBtn.disabled = !currentReady;

    statusInfo.textContent = currentReady ? "Ready" : "Processing";

    if (showToast && currentReady) {
      appendMessage("ai", "Document is ready. You can ask questions now.");
    }
  } catch (err) {
    currentReady = false;
    askBtn.disabled = true;
    statusInfo.textContent = err.message;
  }
}

async function uploadDocument() {
  if (!pdfFile.files[0]) {
    statusInfo.textContent = "Choose a PDF first";
    return;
  }

  const formData = new FormData();
  formData.append("file", pdfFile.files[0]);

  statusInfo.textContent = "Uploading new document...";
  askBtn.disabled = true;

  try {
    const res = await fetch("/api/documents/upload", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.detail || "Upload failed");
    }

    currentDocId = data.doc_id;
    setDocDetails();
    statusInfo.textContent = "Uploaded. Processing started.";
    appendMessage("ai", `New document loaded. ID: ${currentDocId}`);
    await checkStatus(false);
  } catch (err) {
    statusInfo.textContent = err.message;
  }
}

async function askQuestion() {
  const query = queryInput.value.trim();

  if (!query) {
    return;
  }
  if (!currentDocId) {
    appendMessage("ai", "No document loaded. Use the left menu to upload a PDF.");
    return;
  }

  if (!currentReady) {
    await checkStatus(false);
    if (!currentReady) {
      appendMessage("ai", "Document is still processing. Please wait and retry.");
      return;
    }
  }

  appendMessage("user", query);
  queryInput.value = "";
  appendMessage("ai", "Thinking...");

  try {
    const res = await fetch("/api/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        doc_id: currentDocId,
        query,
        model: modelInput.value.trim() || "llama-3.3-70b-versatile",
        temperature: 0,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || "Query failed");
    }

    const loadingBubble = chatMessages.lastElementChild;
    if (loadingBubble && loadingBubble.textContent === "Thinking...") {
      chatMessages.removeChild(loadingBubble);
    }

    appendMessage("ai", data.answer || "No answer returned.");
    thinkingBox.textContent = data.thinking || "No reasoning returned.";
    nodesBox.textContent = JSON.stringify(data.node_list || [], null, 2);
  } catch (err) {
    const loadingBubble = chatMessages.lastElementChild;
    if (loadingBubble && loadingBubble.textContent === "Thinking...") {
      chatMessages.removeChild(loadingBubble);
    }
    appendMessage("ai", err.message);
  }
}

leftMenuBtn.addEventListener("click", () => togglePanel(leftPanel));
rightMenuBtn.addEventListener("click", () => togglePanel(rightPanel));
closeLeftPanel.addEventListener("click", () => togglePanel(leftPanel, false));
closeRightPanel.addEventListener("click", () => togglePanel(rightPanel, false));

uploadBtn.addEventListener("click", uploadDocument);
statusBtn.addEventListener("click", () => checkStatus(true));
askBtn.addEventListener("click", askQuestion);

queryInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    askQuestion();
  }
});

setDocDetails();
checkStatus(false);
appendMessage("ai", "Document loaded. Ask your first question.");
