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

  const sleep = (t) => new Promise(resolve => setTimeout(resolve, t))
  
  while (typeof Tesseract === "undefined" || typeof CryptoJS === "undefined") {
    await sleep(300)
  }

  const {createWorker} = Tesseract;
  const worker = await createWorker();
  await worker.loadLanguage('eng');
  await worker.initialize('eng');
  
  const askfor = (options) => {
    return new Promise(resolve => {
      const p = document.createElement("div")
      p.style = "position: absolute; background-color: #888; opacity: 0.3; z-index: 99999; left: 0; top: 0; width: 100%; height: 100vh;"
      document.body.appendChild(p)
      const div = document.createElement("div")
      div.style = "position: absolute; z-index: 199999; left: 0; top: 0; width: 100%; text-align: center;"
      options.data.forEach(e => {
        const ele = document.createElement("button")
        ele.style = "font-size: 8em; margin: 5px;"
        ele.onclick = (evt) => {
          document.body.removeChild(p)
          document.body.removeChild(div)
          resolve(e)
        }
        ele.innerText = e
        div.appendChild(ele);
      })
      document.body.appendChild(div)
    });
  }
	
  const visitReactImpl = (c, name, propName) => {
    const s = c.stateNode
    if (s && s.hasOwnProperty(name) && s[name] && s[name].hasOwnProperty(propName)) {
      return c.stateNode[name]
    }
    let p = c.child
    while (p) {
      const r = visitReactImpl(p, name, propName)
      if (r)
        return r
      p = p.sibling
    }
    return null
  }

  const visitReact = (c, name, propName) => {
    const a = typeof c === "string" ? document.getElementById(c)._reactRootContainer._internalRoot.current : c;
    return visitReactImpl(a, name, propName);
  }

  const buildJWT = async (data) => {       
    async function sha256(message, salt) {
      const hash = CryptoJS.HmacSHA256(message, salt)
      return CryptoJS.enc.Base64.stringify(hash)
    }
  
    const header = "eyJ0eXAiOiJKV1QiLCJhbGciOiJTSEEyNTYifQ=="
    const salt = "kIK0E3eP8GzOGoHrErZQ1BNmMCAwEAAQ==abc"
    const payload = btoa(JSON.stringify(data))
    const sign = await sha256(`${header}.${payload}`, salt)
    const jwt = `${header}.${payload}.${sign}`
    return jwt;
  }

  const buildJWTForm = async (data) => {       
    const jwt = await buildJWT(data);
    const form = new URLSearchParams();
    form.append("jwt", jwt);
    form.append("_method", "POST");
    return form
  }

  const makePostRequest = async (ctx, url, data) => {
    const r = await fetch(url, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "x-access-token": ctx.accessToken
        },
        body: await buildJWTForm(data),
        method: "POST",
      });
    return await r.json()
  }

  const makeGetRequest = async (ctx, url, data) => {
    const jwt = encodeURIComponent(await buildJWT(data));
    const r = await fetch(`${url}?jwt=${jwt}`, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "x-access-token": ctx.accessToken
        },
        method: "GET",
      });
    return await r.json()
  }
  
  const createContext = (payload) => {
    return {
      ...payload,
      accessToken: JSON.parse(localStorage.getItem("com.macao.token")).token,
      iss: localStorage.getItem("com.macao.iss")
    };
  }

  const getPassQualification = async (ctx) => {
    const d = await makePostRequest(ctx, "/before/sys/appointment/getPassQualification", {
      iss: ctx.iss,
      issType: "web",
      appType: "web"
    });
    const formInstance = d.responseResult.formInstanceList[0].formInstance;
	const formInstanceId = formInstance.formInstanceId
    const plateNumber = formInstance.plateNumber;
    console.log(formInstanceId);
    console.log(plateNumber)
    ctx.formInstanceId = formInstanceId;
    ctx.plateNumber = plateNumber;
    return d;
  }
  
  // const verify = async (ctx) => {
  //   console.log('verify')
  //   const { iss, formInstanceId, plateNumber, verifyCode, appointmentDate } = ctx
  //   const data = {appointmentType:"passBooking",formInstanceId,direction:"S",plateNumber,appointmentDate,verifyCode,iss,issType:"web",appType:"web"}
  //   return await makePostRequest(ctx, "/before/sys/appointment/validationPassBooking", data)
  // }
  
  // const book = async () => {
  //   console.log('book')
  //   const { iss, formInstanceId, plateNumber, verifyCode, appointmentDate } = ctx
  //   const data = {appointmentType:"passBooking",formInstanceId,direction:"S",plateNumber,appointmentDate,verifyCode,iss,issType:"web",appType:"web"}
  //   return await makePostRequest(ctx, "/before/sys/appointment/createPassAppointment", data)
  // }

  const enableCalendar = () => {
    const date = new Date()
    date.setDate(date.getDate()+31)
    const appointmentDateRef = date.toISOString().slice(0, 10)
    const appointmentDate = Math.floor(Date.parse(appointmentDateRef + " 00:00:00 +0800") / 1000)
    const sdl = visitReact("root", "state", "appointmentDateList");
    console.log(sdl.appointmentDateList);
    sdl.appointmentDateList = [
      ...sdl.appointmentDateList.map(e => { return {...e, applyNum:"1999",isFull:false}}),
      { quota: "2000", applyNum: "0", isFull: false, appointmentDate: `${appointmentDate}`, appointmentDateRef }
    ];
    const a = visitReact("root", "props", "dateCellRender");
    a.disabledDate = (t) => false
    a.getListData = (t) => [{ currentDateAllNum: 0, currentDateUseNum: 0, currentDateSurplus: 0, isFull: false }];
  }
  
  window.MacauCarBookUtils = {
    worker,
    sleep,
    askfor,
    visitReact,
    buildJWT,
    buildJWTForm,
    makeGetRequest,
    makePostRequest,
    createContext,
    getPassQualification,
    // verify,
    // book,
    enableCalendar,
  }
})();
