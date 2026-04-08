const pdfFile = document.getElementById("pdfFile");
const uploadBtn = document.getElementById("uploadBtn");
const statusBtn = document.getElementById("statusBtn");
const askBtn = document.getElementById("askBtn");
const queryInput = document.getElementById("queryInput");
const modelInput = document.getElementById("modelInput");

const docInfo = document.getElementById("docInfo");
const statusInfo = document.getElementById("statusInfo");
const answerBox = document.getElementById("answerBox");
const thinkingBox = document.getElementById("thinkingBox");
const nodesBox = document.getElementById("nodesBox");

let currentDocId = null;

uploadBtn.addEventListener("click", async () => {
  if (!pdfFile.files[0]) {
    docInfo.textContent = "Choose a PDF first.";
    return;
  }

  const formData = new FormData();
  formData.append("file", pdfFile.files[0]);

  docInfo.textContent = "Uploading...";
  statusInfo.textContent = "";

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
    docInfo.textContent = `Doc ID: ${currentDocId}`;
    statusBtn.disabled = false;
    askBtn.disabled = true;
  } catch (err) {
    docInfo.textContent = err.message;
  }
});

statusBtn.addEventListener("click", async () => {
  if (!currentDocId) return;

  statusInfo.textContent = "Checking status...";
  try {
    const res = await fetch(`/api/documents/${currentDocId}/status`);
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || "Status check failed");
    }

    if (data.ready) {
      statusInfo.textContent = "Ready for questions.";
      askBtn.disabled = false;
    } else {
      statusInfo.textContent = "Still processing. Try again in a few seconds.";
      askBtn.disabled = true;
    }
  } catch (err) {
    statusInfo.textContent = err.message;
  }
});

askBtn.addEventListener("click", async () => {
  const query = queryInput.value.trim();
  if (!currentDocId) {
    answerBox.textContent = "Upload a document first.";
    return;
  }
  if (!query) {
    answerBox.textContent = "Type a query first.";
    return;
  }

  answerBox.textContent = "Thinking...";
  thinkingBox.textContent = "";
  nodesBox.textContent = "";

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

    answerBox.textContent = data.answer || "";
    thinkingBox.textContent = data.thinking || "";
    nodesBox.textContent = JSON.stringify(data.node_list || [], null, 2);
  } catch (err) {
    answerBox.textContent = err.message;
  }
});
