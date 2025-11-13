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
  getFirestore, collection, addDoc, doc, getDoc, getDocs,
  updateDoc, deleteDoc, serverTimestamp, query, where, orderBy, runTransaction
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

  if (pageId === "page-devices" || pageId === "page-create-loan" || pageId==="page-admin-eq") refreshEquipmentLists();
  if (pageId==="page-my-loans") refreshMyLoans();
  if (pageId==="page-admin-loans") refreshAllLoans();
}

document.addEventListener("click", (e) => {
  const t = e.target;
  if (t.classList && t.classList.contains("tab-btn")) showPage(t.dataset.page);
});

// ================== STATE ==================
let currentUser = null;
let isAdmin = false;

// ================== AUTH FLOW ==================
btnGoogleLogin.onclick = async () => {
  loginMessage.textContent = "";
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    const email = result.user.email || "";
    if (!isAllowedEmail(email)) {
      await signOut(auth);
      loginMessage.textContent = `Chỉ chấp nhận tài khoản @${ALLOWED_DOMAIN}`;
    }
  } catch (err) {
    console.error(err);
    loginMessage.textContent = "Đăng nhập thất bại.";
  }
};

btnLogout.onclick = async () => { await signOut(auth); };

// ================== LOCAL LOGIN (TEST) ==================
const localEmail = document.getElementById("localEmail");
const localPass  = document.getElementById("localPass");
const btnLocalSignup = document.getElementById("btnLocalSignup");
const btnLocalLogin  = document.getElementById("btnLocalLogin");
const localMsg = document.getElementById("localMsg");

btnLocalSignup.onclick = async () => {
  localMsg.textContent = "";
  try {
    const email = (localEmail.value||"").trim();
    const pass = localPass.value || "";
    if (!email || !pass){ localMsg.textContent = "Nhập email và mật khẩu."; return; }
    if (!isAllowedEmail(email)){ localMsg.textContent = "Email không được phép."; return; }
    await createUserWithEmailAndPassword(auth, email, pass);
    localMsg.textContent = "Tạo tài khoản test thành công. Bạn đã đăng nhập.";
  } catch(e){ console.error(e); localMsg.textContent = "Đăng ký thất bại: " + (e.code||""); }
};
btnLocalLogin.onclick = async () => {
  localMsg.textContent = "";
  try {
    const email = (localEmail.value||"").trim();
    const pass = localPass.value || "";
    if (!email || !pass){ localMsg.textContent = "Nhập email và mật khẩu."; return; }
    await signInWithEmailAndPassword(auth, email, pass);
    localMsg.textContent = "Đăng nhập test thành công.";
  } catch(e){ console.error(e); localMsg.textContent = "Đăng nhập thất bại: " + (e.code||""); }
};

// ================== AUTH STATE CHANGE ==================
onAuthStateChanged(auth, async (user) => {
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
    loginMessage.textContent = `Chỉ chấp nhận @${ALLOWED_DOMAIN} hoặc email test.`;
    return;
  }

  currentUser = user;
  isAdmin = ADMIN_EMAILS.includes(user.email);

  userEmailEl.textContent = user.email;
  userRoleTag.textContent = isAdmin ? "ADMIN" : "USER";
  userRoleTag.classList.remove("admin","user");
  userRoleTag.classList.add(isAdmin ? "admin" : "user");

  loginArea.classList.add("hidden");
  userInfo.classList.remove("hidden");

  mainNav.classList.remove("hidden");
  document.querySelectorAll(".admin-only").forEach(b=>{
    if(isAdmin) b.classList.remove("hidden"); else b.classList.add("hidden");
  });

  showPage(isAdmin ? "page-admin-eq":"page-devices");
  await refreshEquipmentLists();
  await refreshMyLoans();
  if(isAdmin) await refreshAllLoans();
});

// ================== EQUIPMENT CRUD ==================
btnAddEq.onclick = async () => {
  if(!isAdmin || !currentUser) return;
  const name = eqName.value.trim();
  const code = eqCode.value.trim();
  const qty = parseInt(eqQty.value,10) || 0;
  const desc = eqDesc.value.trim();
  if(!name || !code || qty<=0){ alert("Nhập đầy đủ tên, mã, số lượng >0."); return; }

  try{
    await addDoc(collection(db,"equipment"),{
      name, code, description:desc,
      quantity_total:qty, quantity_available:qty,
      is_active:true
    });
    eqName.value=eqCode.value=eqDesc.value=""; eqQty.value="";
    await refreshEquipmentLists();
    alert("Đã thêm thiết bị.");
  }catch(e){ console.error(e); alert("Không thêm được: "+(e.code||e.message)); }
};

async function refreshEquipmentLists(){
  equipmentList.innerHTML="Đang tải...";
  equipmentListAdmin.innerHTML="";
  loanEqSelect.innerHTML=`<option value="">-- Chọn thiết bị --</option>`;

  const snap = await getDocs(collection(db,"equipment"));
  let htmlUser="", htmlAdmin="";
  snap.forEach(docSnap=>{
    const d=docSnap.data(); const id=docSnap.id;
    if(!d.is_active) return;
    const line=`
      <div class="card">
        <div><strong>${d.name}</strong> (${d.code})</div>
        <div>Còn: ${d.quantity_available}/${d.quantity_total}</div>
        <div class="muted">ID: ${id}</div>
        <div>${d.description||""}</div>
        ${isAdmin? `<button onclick="editEquipment('${id}')">Sửa</button> <button onclick="deleteEquipment('${id}')">Xóa</button>` : ""}
      </div>`;
    htmlUser+=line; if(isAdmin) htmlAdmin+=line;

    const opt=document.createElement("option");
    opt.value=id;
    opt.textContent=`${d.name} (${d.code}) — còn ${d.quantity_available}/${d.quantity_total}`;
    loanEqSelect.appendChild(opt);
  });

  equipmentList.innerHTML = htmlUser || "<p>Chưa có thiết bị.</p>";
  if(isAdmin) equipmentListAdmin.innerHTML = htmlAdmin || "<p>Chưa có thiết bị.</p>";

  const today=new Date();
  const pad=n=>String(n).padStart(2,"0");
  const toInput=dt=>`${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}`;
  if(!loanStart.value) loanStart.value = toInput(today);
  if(!loanDue.value){ const t=new Date(today); t.setDate(t.getDate()+7); loanDue.value=toInput(t);}
}

// Edit & Delete Equipment (Admin)
window.deleteEquipment = async (id)=>{
  if(!isAdmin) return;
  if(!confirm("Xác nhận xóa thiết bị?")) return;
  const eqRef = doc(db,"equipment",id);
  await deleteDoc(eqRef);
  await refreshEquipmentLists();
};

window.editEquipment = async (id)=>{
  const eqRef = doc(db,"equipment",id);
  const snap = await getDoc(eqRef); if(!snap.exists()) return;
  const d = snap.data();
  const newName = prompt("Tên thiết bị:",d.name) || d.name;
  const newCode = prompt("Mã thiết bị:",d.code) || d.code;
  const newQty = parseInt(prompt("Số lượng tổng:",d.quantity_total)||d.quantity_total,10);
  const newDesc = prompt("Mô tả:",d.description||"")||d.description;
  await updateDoc(eqRef,{
    name:newName, code:newCode, description:newDesc,
    quantity_total:newQty,
    quantity_available: newQty // reset lại, bạn có thể giữ cũ nếu muốn
  });
  await refreshEquipmentLists();
};

// ================== LOAN CRUD ==================
// Tạo loan
btnCreateLoan.onclick = async () => {
  if(!currentUser){ alert("Cần đăng nhập."); return;}
  const eqId = (loanEqSelect.value||"").trim();
  const qty = parseInt(loanQty.value,10) ||0;
  const note = loanNote.value.trim();
  const startStr=loanStart.value, dueStr=loanDue.value;
  if(!eqId||qty<=0){ loanCreateMsg.textContent="Chọn thiết bị và số lượng >0."; return;}
  if(!startStr||!dueStr){ loanCreateMsg.textContent="Chọn ngày mượn và ngày trả dự kiến."; return;}
  const startDate=new Date(`${startStr}T00:00:00`);
  const dueDate=new Date(`${dueStr}T23:59:59`);
  if(startDate>dueDate){ loanCreateMsg.textContent="Ngày trả phải sau hoặc bằng ngày mượn."; return;}

  try{
    await runTransaction(db, async (t)=>{
      const eqRef = doc(db,"equipment",eqId);
      const eqSnap = await t.get(eqRef);
      if(!eqSnap.exists()) throw new Error("Thiết bị không tồn tại!");
      const eq = eqSnap.data();
      if(!eq.is_active) throw new Error("Thiết bị không hoạt động");
      if(eq.quantity_available<qty) throw new Error(`Chỉ còn ${eq.quantity_available} thiết bị.`);

      const loanRef = doc(collection(db,"loans"));
      t.set(loanRef,{
        userId:currentUser.uid, userEmail:currentUser.email,
        equipmentId:eqId, equipmentName:eq.name,
        quantity:qty, note,
        status:"pending",
        createdAt:serverTimestamp(),
        requestedStart:startDate,
        requestedDue:dueDate,
        approvedBy:null, approvedAt:null,
        startAt:null, dueAt:null,
        returned:false, returnedAt:null,
        rejectedReason:null
      });

      t.update(eqRef,{quantity_available:eq.quantity_available - qty});
    });

    loanEqSelect.value=""; loanQty.value=""; loanNote.value="";
    loanCreateMsg.textContent="Đã gửi yêu cầu mượn.";
    await refreshMyLoans(); if(isAdmin) await refreshAllLoans();
  }catch(e){ console.error(e); loanCreateMsg.textContent="Không gửi được: "+(e.message||e.code);}
};

// Xem loan
function renderLoanCard(id,d,adminView){
  let statusClass="";
  if(d.status==="pending") statusClass="status-pending";
  else if(d.status==="approved"&&!d.returned) statusClass="status-approved";
  else if(d.status==="rejected") statusClass="status-rejected";
  else if(d.returned) statusClass="status-returned";

  const fmt=ts=>{ if(!ts) return ""; const date=ts.toDate?ts.toDate():new Date(ts); return date.toLocaleDateString(); };

  let adminControls="", userControls="";
  if(adminView){
    if(d.status==="pending"){
      adminControls+=`
        <div style="margin-top:6px">
          <div><em>Người mượn đề xuất:</em> ${fmt(d.requestedStart)||"-"} → ${fmt(d.requestedDue)||"-"}</div>
          <label>Bắt đầu: <input type="date" id="ap_start_${id}"></label>
          <label>Hạn trả: <input type="date" id="ap_due_${id}"></label>
          <button onclick="approveLoanWithDates('${id}')">Duyệt</button>
          <button onclick="rejectLoan('${id}')">Từ chối</button>
        </div>`;
    } else if(d.status==="approved"&&!d.returned){
      adminControls+=`
        <div style="margin-top:6px">
          <div><em>Đang mượn:</em> ${fmt(d.startAt)||"-"} → ${fmt(d.dueAt)||"-"}</div>
          <label>Gia hạn đến: <input type="date" id="extend_due_${id}"></label>
          <button onclick="extendLoan('${id}')">Gia hạn</button>
          &nbsp; | &nbsp;
          <label>Thời điểm trả: <input type="datetime-local" id="ret_at_${id}"></label>
          <button onclick="returnLoanWithTime('${id}')">Xác nhận trả</button>
        </div>`;
    }
  } else {
    // User controls
    if(d.status==="pending"){
      userControls+=`<button onclick="deleteMyLoan('${id}')">Xóa</button> `;
      userControls+=`<button onclick="editMyLoan('${id}')">Cập nhật</button>`;
    }
  }

  return `
    <div class="card">
      <div><strong>${d.equipmentName}</strong> - SL: ${d.quantity}</div>
      <div>Người mượn: ${d.userEmail}</div>
      <div class="${statusClass}">Trạng thái: ${d.status.toUpperCase()}${d.returned?" (ĐÃ TRẢ)":""}</div>
      <div>Ghi chú: ${d.note||""}</div>
      ${ (d.requestedStart||d.requestedDue) ? `<div>Đề xuất: ${fmt(d.requestedStart)} → ${fmt(d.requestedDue)}</div>` : "" }
      ${ (d.startAt||d.dueAt) ? `<div>Được duyệt: ${fmt(d.startAt)} → ${fmt(d.dueAt)}</div>` : "" }
      ${ d.rejectedReason ? `<div>Lý do từ chối: ${d.rejectedReason}</div>` : "" }
      ${ adminControls } ${ userControls }
    </div>`;
}

// ================== MY LOANS ==================
async function refreshMyLoans(){
  if(!currentUser) return;
  myLoans.innerHTML="Đang tải...";
  try{
    let q;
    if(isAdmin) q = query(collection(db,"loans"), orderBy("createdAt","desc"));
    else q = query(collection(db,"loans"), where("userId","==",currentUser.uid), orderBy("createdAt","desc"));
    const snap = await getDocs(q);
    let html="";
    snap.forEach(docSnap=>{ html+=renderLoanCard(docSnap.id,docSnap.data(),isAdmin); });
    myLoans.innerHTML = html || "<p>Chưa có yêu cầu.</p>";
  }catch(e){ console.warn(e); myLoans.innerHTML="<p>Không tải được yêu cầu.</p>"; }
}

// ================== ALL LOANS ==================
async function refreshAllLoans(){
  if(!isAdmin) return;
  allLoans.innerHTML="Đang tải...";
  try{
    const snap = await getDocs(query(collection(db,"loans"),orderBy("createdAt","desc")));
    let html=""; snap.forEach(d=>html+=renderLoanCard(d.id,d.data(),true));
    allLoans.innerHTML = html || "<p>Chưa có yêu cầu.</p>";
  }catch(e){ console.warn(e); allLoans.innerHTML="<p>Không tải được.</p>";}
}

// ================== ADMIN ACTIONS ==================
window.approveLoanWithDates = async (id)=>{
  const startInput=document.getElementById(`ap_start_${id}`);
  const dueInput=document.getElementById(`ap_due_${id}`);
  if(!startInput.value||!dueInput.value){ alert("Chọn ngày bắt đầu & hạn trả"); return;}
  const start=new Date(startInput.value+"T00:00:00");
  const due=new Date(dueInput.value+"T23:59:59");
  const loanRef = doc(db,"loans",id);
  await updateDoc(loanRef,{status:"approved",approvedBy:currentUser.email,approvedAt:serverTimestamp(), startAt:start, dueAt:due});
  await refreshMyLoans(); await refreshAllLoans();
};

window.rejectLoan = async (id)=>{
  const reason = prompt("Nhập lý do từ chối") || "Không rõ lý do";
  const loanRef = doc(db,"loans",id);
  await updateDoc(loanRef,{status:"rejected",approvedBy:currentUser.email,approvedAt:serverTimestamp(), rejectedReason:reason});
  await refreshMyLoans(); await refreshAllLoans();
};

window.extendLoan = async (id)=>{
  const dueInput = document.getElementById(`extend_due_${id}`);
  if(!dueInput.value){ alert("Chọn ngày gia hạn"); return;}
  const newDue = new Date(dueInput.value+"T23:59:59");
  const loanRef = doc(db,"loans",id);
  await updateDoc(loanRef,{dueAt:newDue});
  await refreshMyLoans(); await refreshAllLoans();
};

window.returnLoanWithTime = async (id)=>{
  const retInput = document.getElementById(`ret_at_${id}`);
  if(!retInput.value){ alert("Chọn thời điểm trả"); return;}
  const retTime = new Date(retInput.value);
  const loanRef = doc(db,"loans",id);
  const loanSnap = await getDoc(loanRef);
  if(!loanSnap.exists()) return;
  const eqId = loanSnap.data().equipmentId;
  const eqRef = doc(db,"equipment",eqId);

  await runTransaction(db, async t=>{
    t.update(loanRef,{returned:true,returnedAt:retTime});
    const eqSnap = await t.get(eqRef);
    t.update(eqRef,{quantity_available: eqSnap.data().quantity_available + loanSnap.data().quantity});
  });

  await refreshMyLoans(); await refreshAllLoans();
};

// ================== USER ACTIONS ==================
window.deleteMyLoan = async (id)=>{
  if(!currentUser) return;
  if(!confirm("Xác nhận xóa yêu cầu mượn?")) return;
  const loanRef = doc(db,"loans",id);
  const loanSnap = await getDoc(loanRef); if(!loanSnap.exists()) return;
  const d = loanSnap.data();
  if(d.status!=="pending"){ alert("Chỉ xóa yêu cầu chưa duyệt"); return; }
  const eqRef = doc(db,"equipment",d.equipmentId);
  await runTransaction(db, async t=>{
    t.delete(loanRef);
    const eqSnap = await t.get(eqRef);
    t.update(eqRef,{quantity_available: eqSnap.data().quantity_available + d.quantity});
  });
  await refreshMyLoans(); if(isAdmin) await refreshAllLoans();
};

window.editMyLoan = async (id)=>{
  const loanRef = doc(db,"loans",id);
  const snap = await getDoc(loanRef); if(!snap.exists()) return;
  const d = snap.data();
  if(d.status!=="pending"){ alert("Chỉ chỉnh sửa yêu cầu chưa duyệt"); return; }
  const newQty = parseInt(prompt("Số lượng:",d.quantity)||d.quantity,10);
  const newNote=prompt("Ghi chú:",d.note||"")||d.note;
  const eqRef = doc(db,"equipment",d.equipmentId);
  await runTransaction(db, async t=>{
    const eqSnap = await t.get(eqRef);
    const delta = newQty - d.quantity;
    if(eqSnap.data().quantity_available < delta) throw new Error(`Chỉ còn ${eqSnap.data().quantity_available} thiết bị`);
    t.update(loanRef,{quantity:newQty,note:newNote});
    t.update(eqRef,{quantity_available: eqSnap.data().quantity_available - delta});
  });
  await refreshMyLoans(); if(isAdmin) await refreshAllLoans();
};
