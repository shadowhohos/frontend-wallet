const sampleTransactions = [
 {id:"NP-1028",name:"Salary payment",detail:"Income · Monthly salary",date:"2026-10-24",type:"income",status:"Completed",amount:2800.00},
 {id:"NP-1027",name:"Green Market",detail:"Shopping · Groceries",date:"2026-10-23",type:"expense",status:"Completed",amount:64.20},
 {id:"NP-1026",name:"Jamie Taylor",detail:"Transfer · Wallet payment",date:"2026-10-22",type:"expense",status:"Completed",amount:120.00},
 {id:"NP-1025",name:"Coffee Corner",detail:"Food & drink",date:"2026-10-21",type:"expense",status:"Completed",amount:8.50},
 {id:"NP-1024",name:"Refund received",detail:"Income · Merchant refund",date:"2026-10-20",type:"income",status:"Completed",amount:40.00},
 {id:"NP-1023",name:"Metro Transit",detail:"Transport",date:"2026-10-19",type:"expense",status:"Pending",amount:12.70},
 {id:"NP-1022",name:"Alex Morgan",detail:"Transfer · Wallet payment",date:"2026-10-17",type:"income",status:"Completed",amount:250.00}
];
let transactions = [...sampleTransactions];
let profile = { name:"Alex Morgan", email:"alex@example.com" };
let currentCurrency = "USD";
const symbols = {USD:"$", EGP:"E£", EUR:"€", GBP:"£"};
const currencyFormat = (amount, currency=currentCurrency) => `${symbols[currency] || currency+" "}${Number(amount).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const dateFormat = value => new Date(value+"T12:00:00").toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"});
function toast(text) { const el=document.querySelector("#appToast"); if(!el)return; el.textContent=text; el.classList.add("show"); clearTimeout(window._toastTimer); window._toastTimer=setTimeout(()=>el.classList.remove("show"),3000); }
function initials(name) { return name.split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join("").toUpperCase() || "N"; }
function setProfileUI() {
  document.querySelector("#welcomeName").textContent = profile.name.split(" ")[0] || "there";
  document.querySelector("#sidebarName").textContent = profile.name;
  document.querySelector("#sidebarEmail").textContent = profile.email;
  document.querySelector("#avatarInitials").textContent = initials(profile.name);
  document.querySelector("#topAvatar").textContent = initials(profile.name);
  document.querySelector("#cardholderName").textContent = profile.name.toUpperCase();
  document.querySelector("#profileName").value = profile.name;
  document.querySelector("#profileEmail").value = profile.email;
}
function transactionMarkup(t, compact=false) {
  const income=t.type==="income";
  const icon=income?"↙":"↗";
  return `<div class="${compact?"recent-row":"table-row-fallback"}"><span class="transaction-icon ${income?"income":"expense"}">${icon}</span><span class="transaction-desc"><b>${escapeHTML(t.name)}</b><small>${escapeHTML(t.detail || (income?"Money received":"Money sent"))}</small></span>${compact?`<span class="transaction-amount ${income?"positive":""}">${income?"+":"−"}${currencyFormat(t.amount)}</span>`:""}</div>`;
}
function escapeHTML(value) { return String(value ?? "").replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function renderRecent() { document.querySelector("#recentTransactions").innerHTML=transactions.slice(0,5).map(t=>transactionMarkup(t,true)).join(""); }
function renderTransactions() {
  const search=(document.querySelector("#transactionSearch").value||"").toLowerCase(), filter=document.querySelector("#transactionFilter").value;
  const rows=transactions.filter(t=>(filter==="all"||t.type===filter)&&[t.name,t.detail,t.id,t.status].join(" ").toLowerCase().includes(search));
  document.querySelector("#transactionRows").innerHTML=rows.map(t=>`<tr><td><div class="table-transaction"><span class="transaction-icon ${t.type}">${t.type==="income"?"↙":"↗"}</span><span><b>${escapeHTML(t.name)}</b><small>${escapeHTML(t.id)}</small></span></div></td><td>${dateFormat(t.date)}</td><td>${t.type==="income"?"Received":"Sent"}</td><td><span class="status-badge ${t.status==="Completed"?"completed":"pending"}">${escapeHTML(t.status)}</span></td><td class="align-right amount-cell ${t.type==="income"?"positive":""}">${t.type==="income"?"+":"−"}${currencyFormat(t.amount)}</td></tr>`).join("");
  document.querySelector("#transactionEmpty").hidden=rows.length>0;
}
function navigate(page) {
  document.querySelectorAll(".page-panel").forEach(p=>p.classList.toggle("active",p.id===`page-${page}`));
  document.querySelectorAll("[data-page]").forEach(b=>b.classList.toggle("active",b.dataset.page===page && b.classList.contains("side-link")));
  const label=({overview:"Overview",transactions:"Transactions",transfer:"Send money",cards:"Cards",settings:"Settings",help:"Help & support"})[page]||"Overview";
  document.querySelector("#breadcrumbPage").textContent=label; document.querySelector("#sidebar").classList.remove("open");
  if(page==="transactions")renderTransactions();
}
document.querySelectorAll("[data-page]").forEach(button=>button.addEventListener("click",()=>navigate(button.dataset.page)));
document.querySelector("#sidebarToggle").addEventListener("click",()=>document.querySelector("#sidebar").classList.toggle("open"));
document.querySelector("#transactionSearch").addEventListener("input",renderTransactions);
document.querySelector("#transactionFilter").addEventListener("change",renderTransactions);
document.querySelector("#exportTransactions").addEventListener("click",()=>{
  const header=["id","name","detail","date","type","status","amount"];
  const csv=[header.join(","),...transactions.map(t=>header.map(k=>`"${String(t[k]??"").replace(/"/g,'""')}"`).join(","))].join("\n");
  const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8;"}));const a=document.createElement("a");a.href=url;a.download="novapay-transactions.csv";a.click();URL.revokeObjectURL(url);
});
function updateTransferSummary() {
  const name=document.querySelector("#recipientName").value.trim(), amount=Number(document.querySelector("#transferAmount").value), currency=document.querySelector("#transferCurrency").value;
  document.querySelector("#summaryRecipient").textContent=name||"Not entered";document.querySelector("#summaryAmount").textContent=amount>0?currencyFormat(amount,currency):"—";document.querySelector("#summaryCurrency").textContent=currency;document.querySelector("#summaryTotal").textContent=amount>0?currencyFormat(amount,currency):"—";
}
["recipientName","transferAmount","transferCurrency"].forEach(id=>document.querySelector("#"+id).addEventListener("input",updateTransferSummary));
document.querySelector("#transferCurrency").addEventListener("change",updateTransferSummary);
document.querySelector("#transferForm").addEventListener("submit",async e=>{
  e.preventDefault();const name=document.querySelector("#recipientName").value.trim(), account=document.querySelector("#recipientAccount").value.trim(), amount=Number(document.querySelector("#transferAmount").value), currency=document.querySelector("#transferCurrency").value;
  if(name.length<2||!account||!Number.isFinite(amount)||amount<=0){showFormMessage("transferMessage","Enter valid recipient details and an amount greater than zero.",true);return;}
  if(window.NovaPayAPI && !NovaPayAPI.isDemo()){
    try { const result=await NovaPayAPI.transfer({recipient_name:name,recipient_account:account,amount,currency,note:document.querySelector("#transferNote").value.trim()});showFormMessage("transferMessage",result.message||"Transfer request submitted. Check your transaction history."); }
    catch(err){showFormMessage("transferMessage",err.message||"Transfer request failed.",true);}
  } else showFormMessage("transferMessage","This is a preview only. No money was moved. Connect the Python transfer endpoint to enable this action.");
});
function showFormMessage(id,text,error=false){const el=document.querySelector("#"+id);el.textContent=text;el.classList.toggle("error",error);el.classList.add("show");}
document.querySelector("#profileForm").addEventListener("submit",async e=>{
  e.preventDefault();const next={name:document.querySelector("#profileName").value.trim(),email:document.querySelector("#profileEmail").value.trim()};
  if(next.name.length<2||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next.email))return showFormMessage("profileMessage","Enter a valid name and email address.",true);
  if(window.NovaPayAPI && !NovaPayAPI.isDemo()){try{await NovaPayAPI.updateProfile(next);}catch(err){return showFormMessage("profileMessage",err.message||"Unable to update profile.",true);}}
  profile=next;setProfileUI();showFormMessage("profileMessage",window.NovaPayAPI?.isDemo()?"Profile updated in this demo session.":"Profile updated.");
});
document.querySelector("#displayCurrency").addEventListener("change",e=>{currentCurrency=e.target.value;renderRecent();renderTransactions();updateTransferSummary();toast("Display currency updated. Values are not converted using exchange rates.");});
document.querySelector("#notificationsToggle").addEventListener("change",e=>toast(e.target.checked?"In-app notification preview enabled.":"In-app notification preview disabled."));
document.querySelector("#notificationButton").addEventListener("click",()=>toast("You're all caught up."));
document.querySelector("#profileButton").addEventListener("click",()=>navigate("settings"));
document.querySelector("#requestCardButton").addEventListener("click",()=>toast("Card requests are not enabled in this frontend demo."));
document.querySelector("#supportForm").addEventListener("submit",async e=>{
  e.preventDefault();const payload={subject:document.querySelector("#supportSubject").value.trim(),details:document.querySelector("#supportDetails").value.trim()};
  if(window.NovaPayAPI && !NovaPayAPI.isDemo()){try{await NovaPayAPI.support(payload);showFormMessage("supportMessage","Support request submitted.");}catch(err){showFormMessage("supportMessage",err.message||"Unable to submit support request.",true);}}
  else showFormMessage("supportMessage","Support form validated. No message was sent; connect the support API endpoint.");
});
document.querySelector("#logoutButton").addEventListener("click",async()=>{
  if(window.NovaPayAPI && !NovaPayAPI.isDemo()){try{await NovaPayAPI.logout();}catch(e){}}
  sessionStorage.removeItem("novapay_access_token");sessionStorage.removeItem("novapay_demo_user");location.href="index.html";
});
async function init() {
  const demoUser=sessionStorage.getItem("novapay_demo_user");
  if(demoUser){try{profile=JSON.parse(demoUser);}catch(e){}}
  setProfileUI();renderRecent();renderTransactions();updateTransferSummary();
  if(window.NovaPayAPI && !NovaPayAPI.isDemo()){
    try {
      const [me,wallet,tx]=await Promise.all([NovaPayAPI.me(),NovaPayAPI.wallet(),NovaPayAPI.transactions()]);
      profile={name:me.name||me.full_name||profile.name,email:me.email||profile.email};
      if(wallet.balance!==undefined)document.querySelector("#totalBalance").textContent=currencyFormat(wallet.balance,wallet.currency||currentCurrency);
      if(Array.isArray(tx))transactions=tx.map(t=>({id:t.id||t.reference||"",name:t.description||t.recipient_name||t.merchant||"Transaction",detail:t.category||t.type||"Wallet activity",date:(t.created_at||t.date||new Date().toISOString()).slice(0,10),type:(String(t.type||"").toLowerCase().includes("in")||t.direction==="credit")?"income":"expense",status:t.status||"Completed",amount:Number(t.amount||0)}));
      setProfileUI();renderRecent();renderTransactions();
    } catch(err){toast("Could not load live account data: "+(err.message||"API request failed"));}
  }
}
init();