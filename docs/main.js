// ================== CONFIG ==================
const firebaseConfig = {
  apiKey: "AIzaSyALw-kDEXZeKBQk__Mnfrqogb7vKuPu92w",
  authDomain: "qltb-37efe.firebaseapp.com",
  projectId: "qltb-37efe",
  storageBucket: "qltb-37efe.firebasestorage.app",
  messagingSenderId: "405387499869",
  appId: "1:405387499869:web:78c8799d558f0acc4270b4",
  measurementId: "G-QKQFMLZBD2"
};
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
const statsArea = document.getElementById("statsArea");

const mainNav = document.getElementById("mainNav");
const allPages = () => Array.from(document.querySelectorAll(".page"));
const tabButtons = () => Array.from(document.querySelectorAll(".tab-btn"));

function showPage(pageId){
  allPages().forEach(p => p.classList.add("hidden"));
  tabButtons().forEach(b => b.classList.remove("active"));
  const el = document.getElementById(pageId);
  if (el) el.classList.remove("hidden");
  const btn = tabButtons().find(b => b.dataset.page === pageId);
  if (btn) btn.classList.add("active");

  if (["page-devices","page-create-loan","page-admin-eq"].includes(pageId)) refreshEquipmentLists();
  else if (pageId==="page-my-loans") refreshMyLoans();
  else if (pageId==="page-admin-loans") refreshAllLoans();
  else if (pageId==="page-stats") refreshStats();
}

document.addEventListener("click", (e)=>{ if(e.target.classList.contains("tab-btn")) showPage(e.target.dataset.page); });

// ================== STATE ==================
let currentUser=null, isAdmin=false;

// ================== AUTH ==================
btnGoogleLogin.onclick = async ()=>{
  loginMessage.textContent="";
  const provider=new GoogleAuthProvider();
  try{
    const result=await signInWithPopup(auth,provider);
    if(!result.user.email.endsWith("@"+ALLOWED_DOMAIN)){
      await signOut(auth);
      loginMessage.textContent=`Chỉ chấp nhận tài khoản @${ALLOWED_DOMAIN}`;
    }
  }catch(err){ console.error(err); loginMessage.textContent="Đăng nhập thất bại."; }
};
btnLogout.onclick=async()=>await signOut(auth);

const localEmail=document.getElementById("localEmail");
const localPass=document.getElementById("localPass");
const btnLocalSignup=document.getElementById("btnLocalSignup");
const btnLocalLogin=document.getElementById("btnLocalLogin");
const localMsg=document.getElementById("localMsg");

btnLocalSignup.onclick=async()=>{
  localMsg.textContent="";
  try{
    const email=(localEmail.value||"").trim();
    const pass=localPass.value||"";
    if(!email||!pass){ localMsg.textContent="Nhập email và mật khẩu."; return; }
    if(!isAllowedEmail(email)){ localMsg.textContent="Email không được phép."; return; }
    await createUserWithEmailAndPassword(auth,email,pass);
    localMsg.textContent="Tạo tài khoản test thành công. Bạn đã đăng nhập.";
  }catch(e){ console.error(e); localMsg.textContent="Đăng ký thất bại: "+(e.code||""); }
};
btnLocalLogin.onclick=async()=>{
  localMsg.textContent="";
  try{
    const email=(localEmail.value||"").trim();
    const pass=localPass.value||"";
    if(!email||!pass){ localMsg.textContent="Nhập email và mật khẩu."; return; }
    await signInWithEmailAndPassword(auth,email,pass);
    localMsg.textContent="Đăng nhập test thành công.";
  }catch(e){ console.error(e); localMsg.textContent="Đăng nhập thất bại: "+(e.code||""); }
};

onAuthStateChanged(auth,async(user)=>{
  if(!user){
    currentUser=null; isAdmin=false;
    userInfo.classList.add("hidden"); loginArea.classList.remove("hidden");
    mainNav.classList.add("hidden"); allPages().forEach(p=>p.classList.add("hidden"));
    return;
  }
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

  loginArea.classList.add("hidden"); userInfo.classList.remove("hidden");
  mainNav.classList.remove("hidden");
  document.querySelectorAll(".admin-only").forEach(b=>{ if(isAdmin) b.classList.remove("hidden"); else b.classList.add("hidden"); });
  showPage(isAdmin?"page-admin-eq":"page-devices");

  await refreshEquipmentLists();
  await refreshMyLoans();
  if(isAdmin) await refreshAllLoans();
});

// ================== THIẾT BỊ ==================
btnAddEq.onclick=async()=>{
  if(!isAdmin||!currentUser) return;
  const name=eqName.value.trim(), code=eqCode.value.trim(), qty=parseInt(eqQty.value,10)||0, desc=eqDesc.value.trim();
  if(!name||!code||qty<=0){ alert("Nhập đầy đủ tên, mã, số lượng > 0."); return; }
  try{
    await addDoc(collection(db,"equipment"),{name,code,description:desc,quantity_total:qty,quantity_available:qty,is_active:true});
    eqName.value=eqCode.value=eqDesc.value=""; eqQty.value="";
    await refreshEquipmentLists(); alert("Đã thêm thiết bị.");
  }catch(e){ console.error(e); alert("Không thêm được: "+(e.code||e.message)); }
};

async function refreshEquipmentLists(){
  equipmentList.innerHTML="Đang tải..."; equipmentListAdmin.innerHTML=""; loanEqSelect.innerHTML=`<option value="">-- Chọn thiết bị --</option>`;
  const snap=await getDocs(collection(db,"equipment"));
  let htmlUser="", htmlAdmin="";
  snap.forEach(docSnap=>{
    const d=docSnap.data(), id=docSnap.id; if(!d.is_active) return;
    const line=`<div class="card"><div><strong>${d.name}</strong> (${d.code})</div><div>Còn: ${d.quantity_available}/${d.quantity_total}</div><div class="muted">ID: ${id}</div><div>${d.description||""}</div></div>`;
    htmlUser+=line; if(isAdmin) htmlAdmin+=line;
    const opt=document.createElement("option"); opt.value=id; opt.textContent=`${d.name} (${d.code}) — còn ${d.quantity_available}/${d.quantity_total}`; loanEqSelect.appendChild(opt);
  });
  equipmentList.innerHTML=htmlUser||"<p>Chưa có thiết bị.</p>";
  if(isAdmin) equipmentListAdmin.innerHTML=htmlAdmin||"<p>Chưa có thiết bị.</p>";

  const today=new Date(), pad=n=>String(n).padStart(2,"0"), toInput=dt=>`${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}`;
  if(!loanStart.value) loanStart.value=toInput(today);
  if(!loanDue.value){ const t=new Date(today); t.setDate(t.getDate()+7); loanDue.value=toInput(t); }
}

// ================== YÊU CẦU MƯỢN ==================
btnCreateLoan.onclick=async()=>{
  if(!currentUser){ alert("Cần đăng nhập."); return; }
  const eqId=(loanEqSelect.value||"").trim(), qty=parseInt(loanQty.value,10)||0, note=loanNote.value.trim();
  const startStr=loanStart.value, dueStr=loanDue.value;
  if(!eqId||qty<=0){ loanCreateMsg.textContent="Chọn thiết bị và số lượng > 0."; return; }
  if(!startStr||!dueStr){ loanCreateMsg.textContent="Chọn ngày mượn và ngày trả dự kiến."; return; }
  const startDate=new Date(`${startStr}T00:00:00`), dueDate=new Date(`${dueStr}T23:59:59`);
  if(startDate>dueDate){ loanCreateMsg.textContent="Ngày trả phải sau hoặc bằng ngày mượn."; return; }

  try{
    const eqRef=doc(db,"equipment",eqId); const eqSnap=await getDoc(eqRef);
    if(!eqSnap.exists()){ loanCreateMsg.textContent="Không tìm thấy thiết bị."; return; }
    const eq=eqSnap.data();
    if(!eq.is_active){ loanCreateMsg.textContent="Thiết bị không hoạt động."; return; }
    if(eq.quantity_available<qty){ loanCreateMsg.textContent="Không đủ số lượng còn lại."; return; }

    await addDoc(collection(db,"loans"),{
      user:currentUser.email,equipment:doc(db,"equipment",eqId),quantity:qty,
      start:startDate,due:dueDate,note:note,status:"pending",createdAt:serverTimestamp()
    });

    await updateDoc(eqRef,{quantity_available: eq.quantity_available - qty});
    loanCreateMsg.textContent="Yêu cầu mượn đã gửi.";
    await refreshEquipmentLists(); await refreshMyLoans();
  }catch(e){ console.error(e); loanCreateMsg.textContent="Không tạo được yêu cầu."; }
};

// ================== HIỂN THỊ YÊU CẦU ==================
async function refreshMyLoans(){
  if(!currentUser) return;
  const q=query(collection(db,"loans"),where("user","==",currentUser.email),orderBy("createdAt","desc"));
  const snap=await getDocs(q); let html="";
  snap.forEach(d=>{
    const l=d.data(); const eq=l.equipment?.id||"unknown";
    html+=`<div class="card"><div>${l.quantity} × ${eq}</div><div>${l.status}</div><div>${l.note||""}</div></div>`;
  });
  myLoans.innerHTML=html||"<p>Chưa có yêu cầu.</p>";
}

async function refreshAllLoans(){
  if(!isAdmin) return;
  const snap=await getDocs(collection(db,"loans"));
  let html="";
  snap.forEach(d=>{
    const l=d.data(); const eq=l.equipment?.id||"unknown";
    html+=`<div class="card"><div>${l.user} mượn ${l.quantity} × ${eq}</div><div>${l.status}</div><div>${l.note||""}</div></div>`;
  });
  allLoans.innerHTML=html||"<p>Chưa có yêu cầu.</p>";
}

// ================== THỐNG KÊ ==================
async function refreshStats(){
  statsArea.innerHTML="<p>Đang tải thống kê...</p>";
  const eqSnap=await getDocs(collection(db,"equipment"));
  const loanSnap=await getDocs(collection(db,"loans"));
  let totalEq=0, totalAvailable=0, totalLoans=0;
  eqSnap.forEach(d=>{ const e=d.data(); if(!e.is_active) return; totalEq+=e.quantity_total; totalAvailable+=e.quantity_available; });
  loanSnap.forEach(d=>{ totalLoans+=1; });
  statsArea.innerHTML=`
    <div class="card"><strong>Tổng số thiết bị:</strong> ${totalEq}</div>
    <div class="card"><strong>Số thiết bị còn:</strong> ${totalAvailable}</div>
    <div class="card"><strong>Tổng yêu cầu mượn:</strong> ${totalLoans}</div>
  `;
}

// ================== AUTO REFRESH STATS ==================
setInterval(()=>{
  if(document.getElementById("page-stats").classList.contains("hidden")) return;
  refreshStats();
},30000);
