(() => {
  const $ = s => document.querySelector(s);
  const lf = $("#login-form"), sf = $("#signup-form"), msg = $("#auth-message");
  function tell(text, type="error") { msg.textContent=text; msg.className="message "+type; msg.hidden=false; }
  function mode(m) {
    const signup=m==="signup"; lf.hidden=signup; sf.hidden=!signup;
    $("#login-tab").classList.toggle("active",!signup); $("#signup-tab").classList.toggle("active",signup);
    $("#auth-title").textContent=signup?"Create your account":"Welcome back";
    $("#auth-subtitle").textContent=signup?"A few details and you're ready to explore.":"Log in to continue to your wallet.";
    msg.hidden=true; history.replaceState(null,"",signup?"?mode=signup":"?mode=login");
  }
  $("#login-tab").addEventListener("click",()=>mode("login"));
  $("#signup-tab").addEventListener("click",()=>mode("signup"));
  async function submit(form, signup) {
    const data=new FormData(form), btn=form.querySelector('[type="submit"]'); btn.disabled=true;
    try {
      let result, extra={};
      if(signup) {
        const fullName=String(data.get("full_name")||"").trim(), username=String(data.get("username")||"").trim(), email=String(data.get("email")||"").trim().toLowerCase(), password=String(data.get("password")||"");
        if(!fullName||username.length<3||!email.includes("@")||password.length<12||!data.get("terms")) throw new Error("Complete all fields, use a 12-character password, and accept the terms.");
        result=await window.NovaPayAPI.signup(username,email,password); extra={name:fullName,email};
      } else {
        const username=String(data.get("identifier")||"").trim(), password=String(data.get("password")||"");
        if(!username||!password) throw new Error("Enter your username/email and password.");
        result=await window.NovaPayAPI.login(username,password);
        try { extra=JSON.parse(sessionStorage.getItem("novapay_user")||"{}"); } catch {}
        extra={...extra, name:extra.name||result.username, username:result.username};
      }
      if(!result.token) throw new Error("The API did not return an authentication token.");
      sessionStorage.setItem("novapay_access_token",result.token);
      sessionStorage.setItem("novapay_user",JSON.stringify({username:result.username,...extra}));
      location.href="app.html";
    } catch(e) { tell(e.message||"Something went wrong."); }
    finally { btn.disabled=false; }
  }
  lf.addEventListener("submit",e=>{e.preventDefault();submit(lf,false)});
  sf.addEventListener("submit",e=>{e.preventDefault();submit(sf,true)});
  mode(new URLSearchParams(location.search).get("mode")==="signup"?"signup":"login");
})();