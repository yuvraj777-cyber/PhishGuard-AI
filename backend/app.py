from flask import Flask, request, jsonify
from flask_cors import CORS
import re
import math
from urllib.parse import urlparse

app = Flask(__name__)
CORS(app)

# --- 1. CONFIGURATION & DATA ---
SUSPICIOUS_TLDS = {'.xyz', '.top', '.club', '.win', '.gq', '.tk', '.ml', '.ga', '.cf', '.cn', '.ru'}
SUSPICIOUS_KEYWORDS = [
    "login", "verify", "secure", "account", "update", "signin", "bank", 
    "password", "credential", "paypal", "apple", "google", "microsoft", 
    "support", "service", "confirm", "wallet", "crypto", "unlock"
]

# --- 2. ADVANCED HELPER FUNCTIONS ---

def calculate_entropy(text):
    """Calculates Shannon Entropy to detect random gibberish (e.g., 'a8y7f9.com')."""
    if not text: return 0
    entropy = 0
    for x in range(256):
        p_x = float(text.count(chr(x))) / len(text)
        if p_x > 0:
            entropy += - p_x * math.log(p_x, 2)
    return entropy

def is_ip_address(domain):
    """Checks if the domain is actually an IP address."""
    return re.match(r"^\d{1,3}(\.\d{1,3}){3}$", domain) is not None

# --- 3. MAIN API ROUTE ---

@app.route("/check-url", methods=["POST"])
def check_url():
    data = request.get_json()

    if not data or "url" not in data:
        return jsonify({"error": "No URL provided"}), 400

    url = data["url"].lower()
    parsed = urlparse(url)
    domain = parsed.netloc
    path = parsed.path
    
    # Base Score (0 = Safe, 100 = Dangerous)
    score = 0
    reasons = []

    # --- FACTOR A: URL Length & Structure ---
    if len(url) > 75:
        score += 20
        reasons.append("URL is suspiciously long (>75 chars)")
    
    if "@" in url:
        score += 30
        reasons.append("Contains '@' symbol (often used to obscure domain)")
        
    if "//" in path:
        score += 25
        reasons.append("Contains double slashes in path (redirect trick)")

    # --- FACTOR B: Domain Analysis ---
    if is_ip_address(domain):
        score += 40
        reasons.append("Host is an IP address (not a domain name)")
    
    # Check TLD (Top Level Domain)
    for tld in SUSPICIOUS_TLDS:
        if domain.endswith(tld):
            score += 25
            reasons.append(f"Uses high-risk TLD ({tld})")
            break
            
    # Subdomain Count (e.g., secure.login.bank.com)
    dot_count = domain.count('.')
    if dot_count > 3:
        score += 20
        reasons.append(f"Excessive subdomains detected ({dot_count})")

    # --- FACTOR C: Keyword Matching ---
    keyword_matches = [word for word in SUSPICIOUS_KEYWORDS if word in url]
    if keyword_matches:
        score += 15 * len(keyword_matches) # Stack score for multiple keywords
        reasons.append(f"Suspicious keywords: {', '.join(keyword_matches)}")

    # --- FACTOR D: Entropy Analysis (Mathematical Randomness) ---
    domain_entropy = calculate_entropy(domain)
    if domain_entropy > 4.5: # 4.5 is a standard threshold for "randomness"
        score += 30
        reasons.append("Domain name appears randomly generated (High Entropy)")

    # --- FACTOR E: Protocol Check ---
    if parsed.scheme != 'https':
        score += 10
        reasons.append("Connection is insecure (HTTP only)")

    # --- 4. FINAL CLASSIFICATION ---
    
    # Cap score at 100
    final_score = min(score, 100)

    if final_score >= 75:
        risk = "HIGH"
    elif final_score >= 40:
        risk = "MEDIUM"
    else:
        risk = "LOW"
        if not reasons:
            reasons.append("No significant threats detected")

    # Mock ML Prediction (For Demo Purposes)
    # In a real scenario, you'd load a .pkl model here.
    # We simulate an ML confidence score based on our heuristic score.
    ml_confidence = round((final_score / 100) * 0.95 + 0.04, 2) * 100
    ml_pred = f"{ml_confidence}% Phishing Probability"

    return jsonify({
        "status": "Analyzed",
        "url": url,
        "score": final_score,
        "risk": risk,
        "ml_prediction": ml_pred,
        "reasons": reasons
    })

if __name__ == "__main__":
    app.run(debug=True, port=5000)
