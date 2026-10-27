(() => {
  const $ = (s) => document.querySelector(s);
  const current = (() => { try { return JSON.parse(localStorage.getItem("novapay_demo_current_user") || "null"); } catch { return null; } })();
  if (!current) { location.replace("auth.html"); return; }
  const fmt = (n) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
  const defaults = [
    {id:"t1", title:"Freelance payment", detail:"Income · Client payment", type:"in", amount:850, status:"Completed", date:new Date(Date.now()-1000*60*45).toISOString()},
    {id:"t2", title:"Everyday coffee", detail:"Food & drink · Card", type:"out", amount:4.8, status:"Completed", date:new Date(Date.now()-1000*60*60*4).toISOString()},
    {id:"t3", title:"Monthly subscription", detail:"Subscriptions · Online", type:"out", amount:12, status:"Completed", date:new Date(Date.now()-1000*60*60*26).toISOString()},
    {id:"t4", title:"Refund received", detail:"Income · Refund", type:"in", amount:45, status:"Completed", date:new Date(Date.now()-1000*60*60*50).toISOString()},
    {id:"t5", title:"Groceries", detail:"Essentials · Card", type:"out", amount:38, status:"Completed", date:new Date(Date.now()-1000*60*60*80).toISOString()}
  ];
  let transactions = (() => { try { return JSON.parse(localStorage.getItem("novapay_demo_transactions") || "null") || defaults; } catch { return defaults; } })();
  let balance = Number(localStorage.getItem("novapay_demo_balance"));
  if (!Number.isFinite(balance)) balance = 4820.50;
  let hideBalance = false;
  const persist = () => { localStorage.setItem("novapay_demo_transactions", JSON.stringify(transactions)); localStorage.setItem("novapay_demo_balance", String(balance)); };
  const initials = current.name.split(/\s+/).map(s => s[0]).slice(0,2).join("").toUpperCase();
  $("#welcome-name").textContent = current.name.split(/\s+/)[0];
  $("#sidebar-name").textContent = current.name; $("#sidebar-email").textContent = current.email;
  $("#sidebar-avatar").textContent = initials; $("#top-avatar").textContent = initials;
  $("#profile-name").textContent = current.name; $("#profile-email").textContent = current.email;
  const render = () => {
    const incoming = transactions.filter(t=>t.type==="in").reduce((sum,t)=>sum+Number(t.amount),0);
    const outgoing = transactions.filter(t=>t.type==="out").reduce((sum,t)=>sum+Number(t.amount),0);
    $("#big-balance").textContent = hideBalance ? "••••••" : fmt(balance);
    $("#available-balance").textContent = hideBalance ? "••••••" : fmt(balance);
    $("#money-in").textContent = fmt(incoming); $("#money-out").textContent = fmt(outgoing);
    const rows = $("#transaction-list");
    rows.innerHTML = transactions.slice().sort((a,b)=>new Date(b.date)-new Date(a.date)).map(t => `<tr><td><div class="transaction-detail"><span class="transaction-avatar ${t.type==="in"?"in":"out"}">${t.type==="in"?"↙":"↗"}</span><span><strong>${esc(t.title)}</strong><small>${esc(t.detail)}</small></span></div></td><td>${new Date(t.date).toLocaleDateString(undefined,{month:"short",day:"numeric"})}</td><td><span class="status-pill">${esc(t.status)}</span></td><td class="align-right ${t.type==="in"?"amount-positive":""}">${t.type==="in"?"+":"−"}${fmt(t.amount)}</td></tr>`).join("");
    $("#empty-transactions").hidden = transactions.length > 0;
  };
  render();
  $("#balance-toggle").addEventListener("click",()=>{hideBalance=!hideBalance;render();});
  $("#logout-btn").addEventListener("click",()=>{localStorage.removeItem("novapay_demo_current_user");location.href="auth.html";});
  $("#mobile-menu").addEventListener("click",()=>$("#sidebar").classList.toggle("sidebar-open"));
  document.querySelectorAll("[data-open-transfer]").forEach(btn=>btn.addEventListener("click",openModal));
  const modal=$("#transfer-modal"), form=$("#transfer-form"), msg=$("#transfer-message");
  function openModal(){modal.hidden=false;document.body.classList.add("modal-open");msg.hidden=true;setTimeout(()=>form.querySelector("input")?.focus(),50);}
  function closeModal(){modal.hidden=true;document.body.classList.remove("modal-open");form.reset();}
  $("#close-transfer").addEventListener("click",closeModal);
  modal.addEventListener("click",e=>{if(e.target===modal)closeModal();});
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!modal.hidden)closeModal();});
  form.addEventListener("submit",e=>{
    e.preventDefault(); const data=new FormData(form), recipient=String(data.get("recipient")||"").trim(), email=String(data.get("email")||"").trim(), amount=Number(data.get("amount")), note=String(data.get("note")||"").trim();
    if(!recipient||!email||!Number.isFinite(amount)||amount<=0){msg.textContent="Enter a recipient and a valid amount.";msg.className="form-message error";msg.hidden=false;return;}
    if(amount>balance){msg.textContent="That amount is higher than your available demo balance.";msg.className="form-message error";msg.hidden=false;return;}
    balance=Math.round((balance-amount)*100)/100;
    transactions.push({id:"demo-"+Date.now(),title:"Transfer to "+recipient,detail:note||email,type:"out",amount,status:"Completed · Demo",date:new Date().toISOString()});
    persist();render();closeModal();showToast("Demo transfer recorded. No real money moved.");
  });
  function showToast(text){const toast=$("#toast");toast.textContent=text;toast.classList.add("show");setTimeout(()=>toast.classList.remove("show"),3500);}
  $("#download-csv").addEventListener("click",()=>{
    const csv=[["Transaction","Details","Type","Amount USD","Status","Date"],...transactions.map(t=>[t.title,t.detail,t.type,t.amount,t.status,t.date])].map(row=>row.map(v=>`"${String(v??"").replace(/"/g,'""')}"`).join(",")).join("\r\n");
    const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8;"}));const a=document.createElement("a");a.href=url;a.download="novapay-demo-transactions.csv";a.click();URL.revokeObjectURL(url);showToast("Demo activity exported.");
  });
  $("#view-all").addEventListener("click",()=>{const all=$("#transaction-list");all.classList.toggle("show-all");all.querySelectorAll("tr").forEach((tr,i)=>{tr.style.display=all.classList.contains("show-all")||i<5?"":"none";});$("#view-all").textContent=all.classList.contains("show-all")?"Show recent ↑":"View all ↗";});
})();