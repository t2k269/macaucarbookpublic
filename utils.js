(async () => {
  if (typeof Tesseract === "undefined") {
    console.log("Load tesseract")
    const s = document.createElement("script")
    s.src = "https://cdn.jsdelivr.net/npm/tesseract.js@4/dist/tesseract.min.js"
    document.head.appendChild(s)
  }
  
  if (typeof CryptoJS === "undefined") {
    console.log("Load CryptoJS")
    const s = document.createElement("script")
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js"
    document.head.appendChild(s)
  }
  
  while (typeof Tesseract === "undefined" || typeof CryptoJS === "undefined") {
    await new Promise(resolve => setTimeout(resolve, 300))
  }

  const {createWorker} = Tesseract;
  const worker = await createWorker();
  await worker.loadLanguage('eng');
  await worker.initialize('eng');
  
  const sleep = (t) => new Promise(resolve => setTimeout(resolve, t))
  const buildJWTForm = async (data) => {       
    async function sha256(message, salt) {
      const hash = CryptoJS.HmacSHA256(message, salt)
      return CryptoJS.enc.Base64.stringify(hash)
    }
  
    const header = "eyJ0eXAiOiJKV1QiLCJhbGciOiJTSEEyNTYifQ=="
    const salt = "kIK0E3eP8GzOGoHrErZQ1BNmMCAwEAAQ==abc"
    const payload = btoa(JSON.stringify(data))
    const sign = await sha256(`${header}.${payload}`, salt)
    const jwt = `${header}.${payload}.${sign}`
    const form = new URLSearchParams();
    form.append("jwt", jwt);
    form.append("_method", "POST");
    return form
  }
  
  const makeRequest = async (url, data) => {
    const r = await fetch(url, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "x-access-token": accessToken
        },
        body: await buildJWTForm({ appointmentType: "passBooking", direction: "S", iss, issType: "web", appType: "web" }),
        method: "POST",
      });
    return await r.json()
  }
  
  window.MacauCarBookUtils = {
    sleep,
    buildJWTForm,
    makeRequest
  }
})();
