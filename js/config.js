/* Frontend configuration. Set API_BASE_URL to your deployed Python API origin.
   Example: window.NOVAPAY_CONFIG = { API_BASE_URL: "https://api.example.com/api" };
   Keep secrets out of frontend JavaScript. */
window.NOVAPAY_CONFIG = window.NOVAPAY_CONFIG || {
  API_BASE_URL: "http://127.0.0.1:8000/api",
  DEMO_MODE: true
};