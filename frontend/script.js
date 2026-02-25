let historyData = [];

async function analyzeURL() {
    const urlInput = document.getElementById("urlInput");
    const url = urlInput.value.trim();

    if (!url) {
        alert("⚠️ Please enter a valid URL to scan.");
        return;
    }

    // UI Elements
    const loading = document.getElementById("loading");
    const resultBox = document.getElementById("resultBox");
    const analyzeBtn = document.getElementById("analyzeBtn");

    // 1. Reset & Show Loading State
    resultBox.classList.add("hidden");
    loading.classList.remove("hidden");
    analyzeBtn.disabled = true; // Prevent double-clicking
    analyzeBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Scanning...';

    try {
        // 2. Call the Backend API
        const response = await fetch("http://127.0.0.1:5000/check-url", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: url })
        });

        if (!response.ok) {
            throw new Error("Server Error");
        }

        const data = await response.json();

        // 3. Update UI with Real Data
        updateDashboard(data);

    } catch (error) {
        console.error("Analysis Failed:", error);
        alert("❌ Connection Error: Is the Python backend running?");
    } finally {
        // 4. Restore Button State
        loading.classList.add("hidden");
        analyzeBtn.disabled = false;
        analyzeBtn.innerHTML = '<i class="fa-solid fa-magnifying-glass"></i> Analyze Risk';
    }
}

function updateDashboard(data) {
    const resultBox = document.getElementById("resultBox");
    const riskMeter = document.getElementById("riskMeter");
    const riskText = document.getElementById("riskText");
    const scoreText = document.getElementById("score");
    const mlText = document.getElementById("mlResult");
    const reasonsList = document.getElementById("reasons");
    const gaugeFill = document.querySelector(".gauge-fill");

    // Reveal Dashboard
    resultBox.classList.remove("hidden");

    // A. Update Text Data
    riskText.innerText = data.risk;     // e.g., "HIGH"
    scoreText.innerText = data.score;   // e.g., 85
    mlText.innerText = data.ml_prediction || "Pending Model"; 

    // B. Gauge Animation Logic 🚀
    // We map the score (0-100) to degrees (0-180)
    const rotationDegrees = (data.score / 100) * 180;
    gaugeFill.style.transform = `rotate(${rotationDegrees}deg)`;

    // C. Color Coding (Neon Effects)
    // Remove old classes first
    riskMeter.classList.remove("risk-low", "risk-medium", "risk-high");

    if (data.risk === "LOW") {
        riskMeter.classList.add("risk-low");
        riskText.style.color = "var(--safe)";
    } else if (data.risk === "MEDIUM") {
        riskMeter.classList.add("risk-medium");
        riskText.style.color = "var(--warning)";
    } else {
        riskMeter.classList.add("risk-high");
        riskText.style.color = "var(--danger)";
    }

    // D. Populate Reasons List
    reasonsList.innerHTML = "";
    if (data.reasons && data.reasons.length > 0) {
        data.reasons.forEach(reason => {
            const li = document.createElement("li");
            // Add a warning icon to each reason
            li.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> ${reason}`;
            reasonsList.appendChild(li);
        });
    } else {
        reasonsList.innerHTML = '<li style="border-left-color: var(--safe); background: rgba(0,255,136,0.1); color: var(--safe);"><i class="fa-solid fa-check-circle"></i> No significant threats detected.</li>';
    }

    // E. Update History
    addToHistory(data.url, data.risk, data.score);
}

function addToHistory(url, risk, score) {
    const historyContainer = document.getElementById("history");
    
    // Add new scan to the top of the array
    historyData.unshift({ url, risk, score });

    // Keep only last 5 entries
    if (historyData.length > 5) historyData.pop();

    // Re-render the list
    historyContainer.innerHTML = "";
    historyData.forEach(item => {
        const li = document.createElement("li");
        
        // distinct color class for history items
        let riskClass = "text-safe";
        if(item.risk === "MEDIUM") riskClass = "text-warning";
        if(item.risk === "HIGH") riskClass = "text-danger";

        li.innerHTML = `
            <span>${item.url}</span>
            <span style="font-weight:bold" class="${riskClass}">${item.risk} (${item.score})</span>
        `;
        historyContainer.appendChild(li);
    });
}
