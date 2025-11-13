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
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore, collection, addDoc, doc, getDoc, getDocs, updateDoc, deleteDoc, serverTimestamp, query, where, orderBy } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

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

// MENU
const mainNav = document.getElementById("mainNav");
const allPages = () => Array.from(document.querySelectorAll(".page"));
const tabButtons = () => Array.from(document.querySelectorAll(".tab-btn"));

function showPage(pageId){
  allPages().forEach(p=>p.classList.add("hidden"));
  tabButtons().forEach(b=>b.classList.remove("active"));
  const el = document.getElementById(pageId); if(el) el.classList.remove("hidden");
  const btn = tabButtons().find(b=>b.dataset.page===pageId); if(btn) btn.classList.add("active");

  if(pageId==="page-devices" || pageId==="page-create-loan" || pageId==="page-admin-eq"){ refreshEquipmentLists(); }
  if(pageId==="page-my-loans"){ refreshMyLoans(); }
  if(pageId==="page-admin-loans"){ refreshAllLoans(); }
}

document.addEventListener("click",(e)=>{
  const t=e.target;
  if(t.classList&&t.classList.contains("tab-btn")) showPage(t.dataset.page);
});

// ================== STATE ==================
let currentUser=null;
let isAdmin=false;

// ================== AUTH ==================
btnGoogleLogin.onclick=async()=>{
  loginMessage.textContent="";
  const provider = new GoogleAuthProvider();
  try{
    const result = await signInWithPopup(auth,provider);
    const email = result.user.email||"";
    if(!email.endsWith("@"+ALLOWED_DOMAIN)){ await signOut(auth); loginMessage.textContent=`Chỉ chấp nhận tài khoản @${ALLOWED_DOMAIN}`; }
  }catch(err){ console.error(err); loginMessage.textContent="Đăng nhập thất bại."; }
};
btnLogout.onclick=async()=>{ await signOut(auth); };

const localEmail = document.getElementById("localEmail");
const localPass  = document.getElementById("localPass");
const btnLocalSignup = document.getElementById("btnLocalSignup");
const btnLocalLogin  = document.getElementById("btnLocalLogin");
const localMsg = document.getElementById("localMsg");

btnLocalSignup.onclick=async()=>{
  localMsg.textContent="";
  try{
    const email=(localEmail.value||"").trim(); const pass=localPass.value||"";
    if(!email||!pass){ localMsg.textContent="Nhập email và mật khẩu."; return; }
    if(!isAllowedEmail(email)){ localMsg.textContent="Email không được phép."; return; }
    await createUserWithEmailAndPassword(auth,email,pass);
    localMsg.textContent="Tạo tài khoản test thành công. Bạn đã đăng nhập.";
  }catch(e){ console.error(e); localMsg.textContent="Đăng ký thất bại: "+(e.code||""); }
};
btnLocalLogin.onclick=async()=>{
  localMsg.textContent="";
  try{
    const email=(localEmail.value||"").trim(); const pass=localPass.value||"";
    if(!email||!pass){ localMsg.textContent="Nhập email và mật khẩu."; return; }
    await signInWithEmailAndPassword(auth,email,pass);
    localMsg.textContent="Đăng nhập test thành công.";
  }catch(e){ console.error(e); localMsg.textContent="Đăng nhập thất bại: "+(e.code||""); }
};

onAuthStateChanged(auth,async(user)=>{
  if(!user){
    currentUser=null; isAdmin=false;
    userInfo.classList.add("hidden");
    loginArea.classList.remove("hidden");
    mainNav.classList.add("hidden");
    allPages().forEach(p=>p.classList.add("hidden"));
    return;
  }
  if(!isAllowedEmail(user.email)){ await signOut(auth); loginMessage.textContent=`Chỉ chấp nhận @${ALLOWED_DOMAIN} hoặc email test trong TEST_EMAILS.`; return; }

  currentUser=user;
  isAdmin=ADMIN_EMAILS.includes(user.email);

  userEmailEl.textContent=user.email;
  userRoleTag.textContent=isAdmin?"ADMIN":"USER";
  userRoleTag.classList.remove("admin","user");
  userRoleTag.classList.add(isAdmin?"admin":"user");

  loginArea.classList.add("hidden");
  userInfo.classList.remove("hidden");

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
  const name=eqName.value.trim(); const code=eqCode.value.trim(); const qty=parseInt(eqQty.value,10)||0; const desc=eqDesc.value.trim();
  if(!name||!code||qty<=0){ alert("Nhập đầy đủ tên, mã, số lượng > 0."); return; }
  try{
    await addDoc(collection(db,"equipment"),{ name, code, description: desc, quantity_total: qty, quantity_available: qty, is_active:true });
    eqName.value=eqCode.value=eqDesc.value=""; eqQty.value="";
    await refreshEquipmentLists();
    alert("Đã thêm thiết bị.");
  }catch(e){ console.error(e); alert("Không thêm được: "+(e.code||e.message)); }
};

// ================== RENDER THIẾT BỊ ADMIN ==================
function renderEquipmentAdmin(docSnap){
  const d=docSnap.data(); const id=docSnap.id;
  if(!d.is_active) return "";
  return `
    <div class="card">
      <div><strong>${d.name}</strong> (${d.code})</div>
      <div>Còn: ${d.quantity_available} / ${d.quantity_total}</div>
      <div class="muted">ID: ${id}</div>
      <div>${d.description||""}</div>
      <button onclick="editEquipment('${id}')">Sửa</button>
      <button onclick="deleteEquipment('${id}')">Xóa</button>
    </div>`;
}

window.editEquipment=async(id)=>{
  const eqRef=doc(db,"equipment",id);
  const eqSnap=await getDoc(eqRef); if(!eqSnap.exists()) return;
  const d=eqSnap.data();
  const name=prompt("Tên thiết bị",d.name); if(!name) return;
  const code=prompt("Mã thiết bị",d.code); if(!code) return;
  const qty=parseInt(prompt("Số lượng tổng",d.quantity_total),10)||d.quantity_total;
  const desc=prompt("Mô tả",d.description||"")||"";
  await updateDoc(eqRef,{ name, code, quantity_total:qty, quantity_available: qty, description: desc });
  await refreshEquipmentLists();
};

window.deleteEquipment=async(id)=>{
  if(!confirm("Xóa thiết bị này?")) return;
  await deleteDoc(doc(db,"equipment",id));
  await refreshEquipmentLists();
};

// ================== REFRESH DANH SÁCH THIẾT BỊ ==================
async function refreshEquipmentLists(){
  equipmentList.innerHTML="Đang tải..."; equipmentListAdmin.innerHTML=""; loanEqSelect.innerHTML=`<option value="">-- Chọn thiết bị --</option>`;
  const snap=await getDocs(collection(db,"equipment"));
  let htmlUser="", htmlAdmin="";
  snap.forEach(docSnap=>{
    const d=docSnap.data(); const id=docSnap.id;
    if(!d.is_active) return;
    const line=`<div class="card"><div><strong>${d.name}</strong> (${d.code})</div><div>Còn: ${d.quantity_available} / ${d.quantity_total}</div><div class="muted">ID: ${id}</div><div>${d.description||""}</div></div>`;
    htmlUser+=line;
    if(isAdmin) htmlAdmin+=renderEquipmentAdmin(docSnap);

    const opt=document.createElement("option"); opt.value=id; opt.textContent=`${d.name} (${d.quantity_available})`; loanEqSelect.appendChild(opt);
  });
  equipmentList.innerHTML=htmlUser;
  if(isAdmin) equipmentListAdmin.innerHTML=htmlAdmin;
}

// ================== CREATE LOAN ==================
btnCreateLoan.onclick=async()=>{
  const eqId=loanEqSelect.value; if(!eqId){ alert("Chọn thiết bị."); return; }
  const qty=parseInt(loanQty.value,10)||0; if(qty<=0){ alert("Số lượng > 0"); return; }
  const start=loanStart.value; const due=loanDue.value;
  if(!start||!due){ alert("Chọn ngày mượn/trả"); return; }
  const note=loanNote.value.trim();
  await addDoc(collection(db,"loans"),{
    equipment_id: eqId,
    user_email: currentUser.email,
    quantity: qty,
    start_date: start,
    due_date: due,
    note,
    status:"pending",
    created_at: serverTimestamp()
  });
  loanEqSelect.value=""; loanQty.value=""; loanStart.value=""; loanDue.value=""; loanNote.value="";
  alert("Yêu cầu đã gửi."); await refreshMyLoans();
};

// ================== RENDER LOAN CARD ==================
function renderLoanCard(docSnap, userView=false){
  const d=docSnap.data(); const id=docSnap.id;
  let statusColor="", statusText=d.status;
  if(d.status==="pending") statusColor="status-pending";
  else if(d.status==="approved") statusColor="status-approved";
  else if(d.status==="rejected") statusColor="status-rejected";
  else if(d.status==="returned") statusColor="status-returned";

  let html=`<div class="card">
    <div><strong>${d.equipment_name||d.equipment_id}</strong> x ${d.quantity}</div>
    <div>Mượn: ${d.start_date} | Trả: ${d.due_date}</div>
    <div class="${statusColor}">Status: ${statusText}</div>
    <div class="muted">${d.note||""}</div>`;

  // Admin / user buttons
  if(userView && d.status==="pending"){
    html+=`<button onclick="editLoan('${id}')">Sửa</button>
           <button onclick="deleteLoan('${id}')">Hủy</button>`;
  }
  if(isAdmin){
    html+=`<button onclick="approveLoan('${id}')">Duyệt</button>
           <button onclick="rejectLoan('${id}')">Từ chối</button>`;
  }
  html+="</div>";
  return html;
}

// ================== REFRESH MY LOANS ==================
async function refreshMyLoans(){
  if(!currentUser) return;
  myLoans.innerHTML="Đang tải...";
  const q=query(collection(db,"loans"),where("user_email","==",currentUser.email),orderBy("created_at","desc"));
  const snap=await getDocs(q);
  let html="";
  for(const docSnap of snap.docs){
    html+=renderLoanCard(docSnap,true);
  }
  myLoans.innerHTML=html||"<p>Chưa có yêu cầu nào.</p>";
}

// ================== REFRESH ALL LOANS (Admin) ==================
async function refreshAllLoans(){
  if(!isAdmin) return;
  allLoans.innerHTML="Đang tải...";
  const snap=await getDocs(collection(db,"loans"));
  let html="";
  for(const docSnap of snap.docs){
    html+=renderLoanCard(docSnap,false);
  }
  allLoans.innerHTML=html||"<p>Chưa có yêu cầu nào.</p>";
}

// ================== USER EDIT / DELETE LOAN ==================
window.editLoan=async(id)=>{
  const loanRef=doc(db,"loans",id); const loanSnap=await getDoc(loanRef);
  if(!loanSnap.exists()) return; const d=loanSnap.data();
  if(d.status!=="pending"){ alert("Chỉ sửa được yêu cầu pending."); return; }
  const qty=parseInt(prompt("Số lượng",d.quantity),10)||d.quantity;
  const start=prompt("Ngày mượn",d.start_date)||d.start_date;
  const due=prompt("Ngày trả dự kiến",d.due_date)||d.due_date;
  await updateDoc(loanRef,{ quantity:qty, start_date:start, due_date:due });
  await refreshMyLoans();
};

window.deleteLoan=async(id)=>{
  if(!confirm("Hủy yêu cầu mượn này?")) return;
  const loanRef=doc(db,"loans",id);
  await updateDoc(loanRef,{ status:"rejected", note:"Hủy bởi người dùng" });
  await refreshMyLoans();
};

// ================== ADMIN APPROVE / REJECT ==================
window.approveLoan=async(id)=>{
  await updateDoc(doc(db,"loans",id),{ status:"approved" }); await refreshAllLoans();
};
window.rejectLoan=async(id)=>{
  const reason=prompt("Lý do từ chối",""); await updateDoc(doc(db,"loans",id),{ status:"rejected", note:reason||"Từ chối" });
  await refreshAllLoans();
};
