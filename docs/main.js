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

function isAllowedEmail(email){
  return email.endsWith("@"+ALLOWED_DOMAIN) || TEST_EMAILS.includes(email);
}

// ================== IMPORTS ==================
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut,
  onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
  getFirestore, collection, addDoc, doc, getDoc, getDocs, updateDoc, deleteDoc,
  serverTimestamp, query, where, orderBy
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

// MENU
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

  if (pageId==="page-devices" || pageId==="page-create-loan" || pageId==="page-admin-eq") refreshEquipmentLists();
  else if (pageId==="page-my-loans") refreshMyLoans();
  else if (pageId==="page-admin-loans") refreshAllLoans();
}

document.addEventListener("click", (e)=>{
  const t=e.target;
  if(t.classList && t.classList.contains("tab-btn")){
    showPage(t.dataset.page);
  }
});

// ================== STATE ==================
let currentUser=null;
let isAdmin=false;

// ================== AUTH ==================
btnGoogleLogin.onclick = async ()=>{
  loginMessage.textContent="";
  const provider=new GoogleAuthProvider();
  try{
    const result=await signInWithPopup(auth,provider);
    const email=result.user.email||"";
    if(!email.endsWith("@"+ALLOWED_DOMAIN)){
      await signOut(auth);
      loginMessage.textContent=`Chỉ chấp nhận tài khoản @${ALLOWED_DOMAIN}`;
    }
  }catch(err){ console.error(err); loginMessage.textContent="Đăng nhập thất bại.";}
};
btnLogout.onclick = async ()=>{ await signOut(auth); };

const localEmail = document.getElementById("localEmail");
const localPass  = document.getElementById("localPass");
const btnLocalSignup = document.getElementById("btnLocalSignup");
const btnLocalLogin  = document.getElementById("btnLocalLogin");
const localMsg = document.getElementById("localMsg");

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
    userInfo.classList.add("hidden");
    loginArea.classList.remove("hidden");
    mainNav.classList.add("hidden");
    allPages().forEach(p=>p.classList.add("hidden"));
    return;
  }
  if(!isAllowedEmail(user.email)){
    await signOut(auth);
    loginMessage.textContent=`Chỉ chấp nhận @${ALLOWED_DOMAIN} hoặc email test trong TEST_EMAILS.`;
    return;
  }
  currentUser=user;
  isAdmin=ADMIN_EMAILS.includes(user.email);

  userEmailEl.textContent=user.email;
  userRoleTag.textContent=isAdmin?"ADMIN":"USER";
  userRoleTag.classList.remove("admin","user");
  userRoleTag.classList.add(isAdmin?"admin":"user");

  loginArea.classList.add("hidden");
  userInfo.classList.remove("hidden");

  // bật menu
  mainNav.classList.remove("hidden");
  document.querySelectorAll(".admin-only").forEach(b=>{
    if(isAdmin) b.classList.remove("hidden"); else b.classList.add("hidden");
  });

  // Trang mặc định
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
    await refreshEquipmentLists();
    alert("Đã thêm thiết bị.");
  }catch(e){ console.error(e); alert("Không thêm được: "+(e.code||e.message)); }
};

async function refreshEquipmentLists(){
  equipmentList.innerHTML="Đang tải...";
  equipmentListAdmin.innerHTML="";
  loanEqSelect.innerHTML=`<option value="">-- Chọn thiết bị --</option>`;
  const snap=await getDocs(collection(db,"equipment"));
  let htmlUser="", htmlAdmin="";
  snap.forEach(docSnap=>{
    const d=docSnap.data(); const id=docSnap.id;
    if(!d.is_active) return;
    const line=`<div class="card"><div><strong>${d.name}</strong> (${d.code})</div><div>Còn: ${d.quantity_available} / ${d.quantity_total}</div><div class="muted">ID: ${id}</div><div>${d.description||""}</div></div>`;
    htmlUser+=line; if(isAdmin) htmlAdmin+=line;
    const opt=document.createElement("option"); opt.value=id;
    opt.textContent=`${d.name} (${d.code}) — còn ${d.quantity_available}/${d.quantity_total}`;
    loanEqSelect.appendChild(opt);
  });
  equipmentList.innerHTML=htmlUser||"<p>Chưa có thiết bị.</p>";
  if(isAdmin) equipmentListAdmin.innerHTML=htmlAdmin||"<p>Chưa có thiết bị.</p>";

  // set mặc định ngày
  const today=new Date();
  const pad=n=>String(n).padStart(2,"0");
  const toInput=dt=>`${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}`;
  if(!loanStart.value) loanStart.value=toInput(today);
  if(!loanDue.value){ const t=new Date(today); t.setDate(t.getDate()+7); loanDue.value=toInput(t); }
}

// ================== TẠO YÊU CẦU MƯỢN (USER) ==================
btnCreateLoan.onclick=async()=>{
  if(!currentUser){ alert("Cần đăng nhập."); return; }
  const eqId=(loanEqSelect.value||"").trim();
  const qty=parseInt(loanQty.value,10)||0;
  const note=loanNote.value.trim();
  const startStr=loanStart.value, dueStr=loanDue.value;
  if(!eqId||qty<=0){ loanCreateMsg.textContent="Chọn thiết bị và số lượng > 0."; return; }
  if(!startStr||!dueStr){ loanCreateMsg.textContent="Chọn ngày mượn và ngày trả dự kiến."; return; }
  const startDate=new Date(`${startStr}T00:00:00`);
  const dueDate=new Date(`${dueStr}T23:59:59`);
  if(startDate>dueDate){ loanCreateMsg.textContent="Ngày trả phải sau hoặc bằng ngày mượn."; return; }

  try{
    const eqRef=doc(db,"equipment",eqId);
    const eqSnap=await getDoc(eqRef);
    if(!eqSnap.exists()){ loanCreateMsg.textContent="Không tìm thấy thiết bị."; return; }
    const eq=eqSnap.data();
    if(!eq.is_active){ loanCreateMsg.textContent="Thiết bị không hoạt động."; return; }
    if(eq.quantity_available<qty){ loanCreateMsg.textContent="Không đủ số lượng còn lại."; return; }

    await addDoc(collection(db,"loans"),{
      userId:currentUser.uid, userEmail:currentUser.email, equipmentId:eqId,
      equipmentName:eq.name, quantity:qty, note, status:"pending",
      createdAt:serverTimestamp(), requestedStart:startDate, requestedDue:dueDate,
      approvedBy:null, approvedAt:null, startAt:null, dueAt:null,
      returned:false, returnedAt:null, rejectedReason:null
    });
    loanEqSelect.value=""; loanQty.value=""; loanNote.value="";
    loanCreateMsg.textContent="Đã gửi yêu cầu mượn.";
    await refreshMyLoans();
    if(isAdmin) await refreshAllLoans();
  }catch(e){ console.error("Create loan error:", e); loanCreateMsg.textContent="Gửi yêu cầu thất bại: "+(e.code||e.message); }
};

// ================== RENDER LOAN CARD USER ==================
function renderLoanCardUser(id,d){
  let statusClass="";
  if(d.status==="pending") statusClass="status-pending";
  else if(d.status==="approved"&&!d.returned) statusClass="status-approved";
  else if(d.status==="rejected") statusClass="status-rejected";
  else if(d.returned) statusClass="status-returned";

  const fmt=ts=>{ if(!ts) return ""; const date=ts.toDate?ts.toDate():new Date(ts); return date.toLocaleDateString(); };

  let userControls="";
  if(d.status==="pending"){
    userControls=`<div style="margin-top:6px"><button onclick="editLoan('${id}')">Cập nhật</button> <button onclick="deleteLoan('${id}')">Xóa</button></div>`;
  }

  return `<div class="card">
    <div><strong>${d.equipmentName}</strong> - SL: ${d.quantity}</div>
    <div class="${statusClass}">Trạng thái: ${d.status.toUpperCase()}</div>
    <div>Ghi chú: ${d.note||""}</div>
    <div>Đề xuất: ${fmt(d.requestedStart)} → ${fmt(d.requestedDue)}</div>
    ${userControls}
  </div>`;
}

// ================== USER ACTIONS ==================
window.deleteLoan=async(loanId)=>{
  if(!currentUser) return;
  if(!confirm("Bạn có chắc muốn xóa yêu cầu này?")) return;
  const loanRef=doc(db,"loans",loanId);
  const loanSnap=await getDoc(loanRef);
  if(!loanSnap.exists()) return;
  const loan=loanSnap.data();
  if(loan.userId!==currentUser.uid||loan.status!=="pending"){ alert("Không thể xóa."); return; }
  await deleteDoc(loanRef);
  await refreshMyLoans();
};

window.editLoan=async(loanId)=>{
  if(!currentUser) return;
  const loanRef=doc(db,"loans",loanId);
  const loanSnap=await getDoc(loanRef);
  if(!loanSnap.exists()) return;
  const loan=loanSnap.data();
  if(loan.userId!==currentUser.uid||loan.status!=="pending"){ alert("Không thể chỉnh sửa."); return; }
  const newQty=parseInt(prompt("Số lượng mượn:",loan.quantity),10);
  if(isNaN(newQty)||newQty<=0){ alert("Số lượng không hợp lệ."); return; }
  const newNote=prompt("Ghi chú:",loan.note||"")||"";
  await updateDoc(loanRef,{quantity:newQty,note:newNote});
  await refreshMyLoans();
};

// ================== LIST MY LOANS ==================
async function refreshMyLoans(){
  if(!currentUser) return;
  myLoans.innerHTML="Đang tải...";
  try{
    const qRef=query(collection(db,"loans"),where("userId","==",currentUser.uid));
    const snap=await getDocs(qRef);
    const arr=[];
    snap.forEach(docSnap=>{
      const d=docSnap.data();
      if(!d.createdAt) d.createdAt={toDate:()=>new Date()};
      arr.push({id:docSnap.id,data:d});
    });
    arr.sort((a,b)=>b.data.createdAt.toDate()-a.data.createdAt.toDate());
    let html="";
    arr.forEach(d=>{ html+=renderLoanCardUser(d.id,d.data); });
    myLoans.innerHTML=html||"<p>Chưa có yêu cầu.</p>";
  }catch(e){ console.error("refreshMyLoans error:",e); myLoans.innerHTML="<p>Lỗi tải yêu cầu mượn.</p>"; }
}

// ================== RENDER & LIST ADMIN LOANS ==================
function renderLoanCard(id,d,adminView){
  let statusClass="";
  if(d.status==="pending") statusClass="status-pending";
  else if(d.status==="approved"&&!d.returned) statusClass="status-approved";
  else if(d.status==="rejected") statusClass="status-rejected";
  else if(d.returned) statusClass="status-returned";

  const fmt=ts=>{ if(!ts) return ""; const date=ts.toDate?ts.toDate():new Date(ts); return date.toLocaleDateString(); };

  let adminControls="";
  if(adminView && d.status==="pending"){
    adminControls=`<div style="margin-top:6px">
      <div><em>Người mượn đề xuất:</em> ${fmt(d.requestedStart)} → ${fmt(d.requestedDue)}</div>
      <label>Bắt đầu: <input type="date" id="ap_start_${id}"></label>
      <label>Hạn trả: <input type="date" id="ap_due_${id}"></label>
      <button onclick="approveLoanWithDates('${id}')">Duyệt</button>
      <button onclick="rejectLoan('${id}')">Từ chối</button>
    </div>`;
  }
  if(adminView && d.status==="approved"&&!d.returned){
    adminControls+=`<div style="margin-top:6px">
      <div><em>Đang mượn:</em> ${fmt(d.startAt)} → ${fmt(d.dueAt)}</div>
      <label>Gia hạn đến: <input type="date" id="extend_due_${id}"></label>
      <button onclick="extendLoan('${id}')">Gia hạn</button>
      &nbsp; | &nbsp;
      <label>Thời điểm trả: <input type="date" id="return_at_${id}"></label>
      <button onclick="returnLoan('${id}')">Trả</button>
    </div>`;
  }

  return `<div class="card">
    <div><strong>${d.equipmentName}</strong> - SL: ${d.quantity}</div>
    <div class="${statusClass}">Trạng thái: ${d.status.toUpperCase()}</div>
    <div>Người mượn: ${d.userEmail}</div>
    <div>Ghi chú: ${d.note||""}</div>
    <div>Đề xuất: ${fmt(d.requestedStart)} → ${fmt(d.requestedDue)}</div>
    ${adminControls}
  </div>`;
}

async function refreshAllLoans(){
  if(!currentUser||!isAdmin) return;
  allLoans.innerHTML="Đang tải...";
  try{
    const snap=await getDocs(collection(db,"loans"));
    let arr=[];
    snap.forEach(docSnap=>{
      const d=docSnap.data();
      if(!d.createdAt) d.createdAt={toDate:()=>new Date()};
      arr.push({id:docSnap.id,data:d});
    });
    arr.sort((a,b)=>b.data.createdAt.toDate()-a.data.createdAt.toDate());
    let html="";
    arr.forEach(d=>{ html+=renderLoanCard(d.id,d.data,true); });
    allLoans.innerHTML=html||"<p>Chưa có yêu cầu.</p>";
  }catch(e){ console.error("refreshAllLoans error:",e); allLoans.innerHTML="<p>Lỗi tải yêu cầu mượn.</p>"; }
}
