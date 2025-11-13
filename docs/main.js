// ================== CONFIG ==================
const firebaseConfig = { /* your firebase config */ };
const ALLOWED_DOMAIN = "agu.edu.vn";
const ADMIN_EMAILS = ["nthanhphuong@agu.edu.vn","admin2@agu.edu.vn"];
const TEST_EMAILS = ["test1@local.test","test2@local.test"];
function isAllowedEmail(email){ return email.endsWith("@"+ALLOWED_DOMAIN) || TEST_EMAILS.includes(email); }

// ================== IMPORTS ==================
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut,
  onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
  getFirestore, collection, addDoc, doc, getDoc, getDocs,
  updateDoc, serverTimestamp, query, where, orderBy
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// ================== INIT ==================
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ================== DOM ==================
const loginArea = document.getElementById("loginArea");
const loginMessage = document.getElementById("loginMessage");
const btnGoogleLogin = document.getElementById("btnGoogleLogin");
const btnLogout = document.getElementById("btnLogout");
const userInfo = document.getElementById("userInfo");
const userEmailEl = document.getElementById("userEmail");
const userRoleTag = document.getElementById("userRoleTag");

// DOM thiết bị, loan
const eqName = document.getElementById("eqName");
const eqCode = document.getElementById("eqCode");
const eqQty = document.getElementById("eqQty");
const eqDesc = document.getElementById("eqDesc");
const btnAddEq = document.getElementById("btnAddEq");
const equipmentListAdmin = document.getElementById("equipmentListAdmin");

const equipmentList = document.getElementById("equipmentList");
const loanEqSelect = document.getElementById("loanEqSelect");
const loanQty = document.getElementById("loanQty");
const loanStart = document.getElementById("loanStart");
const loanDue = document.getElementById("loanDue");
const loanNote = document.getElementById("loanNote");
const btnCreateLoan = document.getElementById("btnCreateLoan");
const loanCreateMsg = document.getElementById("loanCreateMsg");
const myLoans = document.getElementById("myLoans");
const allLoans = document.getElementById("allLoans");
const statsSummary = document.getElementById("statsSummary");
const statsChartCanvas = document.getElementById("statsChart");

const mainNav = document.getElementById("mainNav");
const allPages = () => Array.from(document.querySelectorAll(".page"));
const tabButtons = () => Array.from(document.querySelectorAll(".tab-btn"));

// ================== STATE ==================
let currentUser=null, isAdmin=false, statsChart=null;

// ================== NAV ==================
function showPage(pageId){
  allPages().forEach(p => p.classList.add("hidden"));
  tabButtons().forEach(b => b.classList.remove("active"));
  const el = document.getElementById(pageId);
  if (el) el.classList.remove("hidden");
  const btn = tabButtons().find(b => b.dataset.page === pageId);
  if (btn) btn.classList.add("active");

  if(pageId==="page-stats") refreshStats();
  else if(pageId==="page-my-loans") refreshMyLoans();
  else if(pageId==="page-admin-loans") refreshAllLoans();
  else if(["page-devices","page-create-loan","page-admin-eq"].includes(pageId)) refreshEquipmentLists();
}

tabButtons().forEach(btn=>btn.addEventListener("click",()=>showPage(btn.dataset.page)));

// ================== AUTH ==================
btnGoogleLogin.onclick = async ()=>{
  loginMessage.textContent="";
  const provider = new GoogleAuthProvider();
  try{
    const result = await signInWithPopup(auth, provider);
    const email = result.user.email;
    if(!isAllowedEmail(email)){
      await signOut(auth);
      loginMessage.textContent = `Chỉ chấp nhận tài khoản @${ALLOWED_DOMAIN}`;
      return;
    }
  }catch(e){ console.error(e); loginMessage.textContent="Đăng nhập thất bại."; }
};

btnLogout.onclick=async()=>await signOut(auth);

// Local login test
const localEmail=document.getElementById("localEmail");
const localPass=document.getElementById("localPass");
const btnLocalSignup=document.getElementById("btnLocalSignup");
const btnLocalLogin=document.getElementById("btnLocalLogin");
const localMsg=document.getElementById("localMsg");

btnLocalSignup.onclick=async()=>{
  localMsg.textContent="";
  const email = (localEmail.value||"").trim(), pass = localPass.value||"";
  if(!email||!pass){ localMsg.textContent="Nhập email và mật khẩu."; return; }
  if(!isAllowedEmail(email)){ localMsg.textContent="Email không được phép."; return; }
  try{ await createUserWithEmailAndPassword(auth,email,pass); localMsg.textContent="Tạo tài khoản test thành công."; }
  catch(e){ console.error(e); localMsg.textContent="Đăng ký thất bại."; }
};

btnLocalLogin.onclick=async()=>{
  localMsg.textContent="";
  const email = (localEmail.value||"").trim(), pass = localPass.value||"";
  if(!email||!pass){ localMsg.textContent="Nhập email và mật khẩu."; return; }
  try{ await signInWithEmailAndPassword(auth,email,pass); localMsg.textContent="Đăng nhập test thành công."; }
  catch(e){ console.error(e); localMsg.textContent="Đăng nhập thất bại."; }
};

onAuthStateChanged(auth, async(user)=>{
  if(!user){ currentUser=null; isAdmin=false; loginArea.classList.remove("hidden"); userInfo.classList.add("hidden"); mainNav.classList.add("hidden"); allPages().forEach(p=>p.classList.add("hidden")); return; }
  if(!isAllowedEmail(user.email)){
    await signOut(auth);
    loginMessage.textContent=`Chỉ chấp nhận @${ALLOWED_DOMAIN} hoặc email test.`;
    return;
  }
  currentUser=user; isAdmin=ADMIN_EMAILS.includes(user.email);
  userEmailEl.textContent=user.email;
  userRoleTag.textContent=isAdmin?"ADMIN":"USER";
  userRoleTag.classList.remove("admin","user");
  userRoleTag.classList.add(isAdmin?"admin":"user");

  loginArea.classList.add("hidden"); userInfo.classList.remove("hidden"); mainNav.classList.remove("hidden");
  document.querySelectorAll(".admin-only").forEach(b=>{ b.style.display=isAdmin?"inline-block":"none"; });

  showPage(isAdmin?"page-admin-eq":"page-devices");
  refreshEquipmentLists(); refreshMyLoans(); if(isAdmin) refreshAllLoans();
});

// ================== THIẾT BỊ ==================
btnAddEq.onclick=async()=>{
  if(!isAdmin||!currentUser) return;
  const name=eqName.value.trim(), code=eqCode.value.trim(), qty=parseInt(eqQty.value,10)||0, desc=eqDesc.value.trim();
  if(!name||!code||qty<=0){ alert("Nhập đầy đủ tên, mã, số lượng > 0."); return; }
  try{
    await addDoc(collection(db,"equipment"),{name,code,description:desc,quantity_total:qty,quantity_available:qty,is_active:true});
    eqName.value=eqCode.value=eqDesc.value=""; eqQty.value="";
    refreshEquipmentLists();
  }catch(e){ console.error(e); alert("Không thêm được."); }
};

async function refreshEquipmentLists(){
  equipmentList.innerHTML="Đang tải..."; equipmentListAdmin.innerHTML=""; loanEqSelect.innerHTML='<option value="">-- Chọn thiết bị --</option>';
  const snap=await getDocs(collection(db,"equipment"));
  let htmlUser="", htmlAdmin="";
  snap.forEach(d=>{
    const data=d.data(), id=d.id; if(!data.is_active) return;
    const line=`<div class="card"><strong>${data.name}</strong> (${data.code})<br>Còn: ${data.quantity_available}/${data.quantity_total}<br>${data.description||""}</div>`;
    htmlUser+=line; if(isAdmin) htmlAdmin+=line;
    const opt=document.createElement("option"); opt.value=id; opt.textContent=`${data.name} (${data.code}) — còn ${data.quantity_available}`; loanEqSelect.appendChild(opt);
  });
  equipmentList.innerHTML=htmlUser||"<p>Chưa có thiết bị.</p>";
  equipmentListAdmin.innerHTML=htmlAdmin||"<p>Chưa có thiết bị.</p>";
}

// ================== YÊU CẦU MƯỢN ==================
btnCreateLoan.onclick=async()=>{
  if(!currentUser){ alert("Cần đăng nhập."); return; }
  const eqId=loanEqSelect.value, qty=parseInt(loanQty.value,10)||0, note=loanNote.value.trim();
  const start=loanStart.value, due=loanDue.value;
  if(!eqId||qty<=0||!start||!due){ loanCreateMsg.textContent="Nhập đầy đủ thông tin."; return; }
  try{
    const eqRef=doc(db,"equipment",eqId); const eqSnap=await getDoc(eqRef);
    const eq=eqSnap.data();
    if(eq.quantity_available<qty){ loanCreateMsg.textContent="Không đủ số lượng."; return; }
    await addDoc(collection(db,"loans"),{user:currentUser.email,equipment:doc(db,"equipment",eqId),quantity:qty,start, due,note,status:"pending",createdAt:serverTimestamp()});
    await updateDoc(eqRef,{quantity_available:eq.quantity_available-qty});
    loanCreateMsg.textContent="Yêu cầu mượn đã gửi.";
    refreshEquipmentLists(); refreshMyLoans();
  }catch(e){ console.error(e); loanCreateMsg.textContent="Không tạo được yêu cầu."; }
};

// ================== HIỂN THỊ YÊU CẦU ==================
async function refreshMyLoans(){
  if(!currentUser) return;
  const q=query(collection(db,"loans"),where("user","==",currentUser.email),orderBy("createdAt","desc"));
  const snap=await getDocs(q); let html="";
  snap.forEach(d=>{ const l=d.data(); const eq=l.equipment?.id||"unknown"; html+=`<div class="card">${l.quantity} × ${eq}<br>${l.status}<br>${l.note||""}</div>`; });
  myLoans.innerHTML=html||"<p>Chưa có yêu cầu.</p>";
}

async function refreshAllLoans(){
  if(!isAdmin) return;
  const snap=await getDocs(collection(db,"loans"));
  let html="";
  snap.forEach(d=>{ const l=d.data(); const eq=l.equipment?.id||"unknown"; html+=`<div class="card">${l.user} mượn ${l.quantity} × ${eq}<br>${l.status}<br>${l.note||""}</div>`; });
  allLoans.innerHTML=html||"<p>Chưa có yêu cầu.</p>";
}

// ================== THỐNG KÊ ==================
async function refreshStats(){
  statsSummary.innerHTML="<p>Đang tải...</p>";
  const eqSnap=await getDocs(collection(db,"equipment"));
  const loanSnap=await getDocs(collection(db,"loans"));
  let totalEq=0, totalAvailable=0, statusCounts={pending:0,approved:0,rejected:0,returned:0};
  eqSnap.forEach(d=>{ const e=d.data(); if(!e.is_active) return; totalEq+=e.quantity_total; });
  loanSnap.forEach(d=>{ const l=d.data(); statusCounts[l.status] = (statusCounts[l.status]||0)+1; });
  statsSummary.innerHTML=`
    <div class="card">Tổng thiết bị: ${totalEq}</div>
    <div class="card">Yêu cầu pending: ${statusCounts.pending||0}</div>
    <div class="card">Yêu cầu approved: ${statusCounts.approved||0}</div>
    <div class="card">Yêu cầu rejected: ${statusCounts.rejected||0}</div>
    <div class="card">Yêu cầu returned: ${statusCounts.returned||0}</div>
  `;
  if(statsChart) statsChart.destroy();
  statsChart=new Chart(statsChartCanvas,{type:'bar',data:{labels:Object.keys(statusCounts),datasets:[{label:'Số lượng',data:Object.values(statusCounts),backgroundColor:['#b45309','#065f46','#991b1b','#2563eb']}]},options:{}});
}

// ================== AUTO REFRESH STATS ==================
setInterval(()=>{ if(!document.getElementById("page-stats").classList.contains("hidden")) refreshStats(); },30000);
