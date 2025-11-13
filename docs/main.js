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
const ADMIN_EMAILS = ["nthanhphuong@agu.edu.vn", "admin2@agu.edu.vn"];
const TEST_EMAILS = ["test1@local.test", "test2@local.test"];

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

// MENU
const mainNav = document.getElementById("mainNav");
const allPages = () => Array.from(document.querySelectorAll(".page"));
const tabButtons = () => Array.from(document.querySelectorAll(".tab-btn"));
function showPage(pageId){
  allPages().forEach(p => p.classList.add("hidden"));
  tabButtons().forEach(b => b.classList.remove("active"));
  const el = document.getElementById(pageId); if(el) el.classList.remove("hidden");
  const btn = tabButtons().find(b=>b.dataset.page===pageId); if(btn) btn.classList.add("active");
  if(pageId==="page-devices" || pageId==="page-create-loan" || pageId==="page-admin-eq") refreshEquipmentLists();
  if(pageId==="page-my-loans") refreshMyLoans();
  if(pageId==="page-admin-loans") refreshAllLoans();
}
document.addEventListener("click", e => { if(e.target.classList.contains("tab-btn")) showPage(e.target.dataset.page); });

// ================== STATE ==================
let currentUser = null;
let isAdmin = false;

// ================== AUTH FLOW ==================
function isAllowedEmail(email){ return email.endsWith("@"+ALLOWED_DOMAIN)||TEST_EMAILS.includes(email); }
btnGoogleLogin.onclick = async () => {
  loginMessage.textContent = "";
  try{
    const result = await signInWithPopup(auth,new GoogleAuthProvider());
    const email = result.user.email || "";
    if(!isAllowedEmail(email)){ await signOut(auth); loginMessage.textContent=`Chỉ chấp nhận @${ALLOWED_DOMAIN}`; }
  }catch(err){ console.error(err); loginMessage.textContent="Đăng nhập thất bại."; }
};
btnLogout.onclick = async () => await signOut(auth);

const localEmail = document.getElementById("localEmail");
const localPass  = document.getElementById("localPass");
const btnLocalSignup = document.getElementById("btnLocalSignup");
const btnLocalLogin  = document.getElementById("btnLocalLogin");
const localMsg = document.getElementById("localMsg");
btnLocalSignup.onclick = async () => {
  localMsg.textContent = "";
  try{
    const email=(localEmail.value||"").trim(); const pass=localPass.value||"";
    if(!email||!pass){ localMsg.textContent="Nhập email và mật khẩu."; return; }
    if(!isAllowedEmail(email)){ localMsg.textContent="Email không được phép."; return; }
    await createUserWithEmailAndPassword(auth,email,pass);
    localMsg.textContent="Tạo tài khoản test thành công. Bạn đã đăng nhập.";
  }catch(e){ console.error(e); localMsg.textContent="Đăng ký thất bại: "+(e.code||""); }
};
btnLocalLogin.onclick = async () => {
  localMsg.textContent = "";
  try{
    const email=(localEmail.value||"").trim(); const pass=localPass.value||"";
    if(!email||!pass){ localMsg.textContent="Nhập email và mật khẩu."; return; }
    await signInWithEmailAndPassword(auth,email,pass);
    localMsg.textContent="Đăng nhập test thành công.";
  }catch(e){ console.error(e); localMsg.textContent="Đăng nhập thất bại: "+(e.code||""); }
};

onAuthStateChanged(auth,async user=>{
  if(!user){ currentUser=null; isAdmin=false; userInfo.classList.add("hidden"); loginArea.classList.remove("hidden"); mainNav.classList.add("hidden"); allPages().forEach(p=>p.classList.add("hidden")); return; }
  if(!isAllowedEmail(user.email)){ await signOut(auth); loginMessage.textContent=`Chỉ chấp nhận @${ALLOWED_DOMAIN} hoặc email test.`; return; }

  currentUser=user; isAdmin=ADMIN_EMAILS.includes(user.email);
  userEmailEl.textContent=user.email;
  userRoleTag.textContent=isAdmin?"ADMIN":"USER";
  userRoleTag.classList.remove("admin","user");
  userRoleTag.classList.add(isAdmin?"admin":"user");
  loginArea.classList.add("hidden"); userInfo.classList.remove("hidden");

  mainNav.classList.remove("hidden");
  document.querySelectorAll(".admin-only").forEach(b=>isAdmin?b.classList.remove("hidden"):b.classList.add("hidden"));

  showPage(isAdmin?"page-admin-eq":"page-devices");
  await refreshEquipmentLists(); await refreshMyLoans();
  if(isAdmin) await refreshAllLoans();
});

// ================== QUẢN LÝ THIẾT BỊ ==================
btnAddEq.onclick = async () => {
  if(!isAdmin||!currentUser) return;
  const name=eqName.value.trim(); const code=eqCode.value.trim();
  const qty=parseInt(eqQty.value,10)||0; const desc=eqDesc.value.trim();
  if(!name||!code||qty<=0){ alert("Nhập đầy đủ tên, mã, số lượng >0."); return; }
  try{
    await addDoc(collection(db,"equipment"),{name,code,description:desc,quantity_total:qty,quantity_available:qty,is_active:true});
    eqName.value=eqCode.value=eqDesc.value=""; eqQty.value="";
    await refreshEquipmentLists();
  }catch(e){ console.error(e); alert("Không thêm được: "+(e.code||e.message)); }
};

window.editEquipment = async (eqId) => {
  if(!isAdmin) return;
  const eqRef=doc(db,"equipment",eqId); const eqSnap=await getDoc(eqRef);
  if(!eqSnap.exists()) return alert("Thiết bị không tồn tại");
  const d=eqSnap.data();
  const name=prompt("Tên thiết bị:",d.name); if(!name) return;
  const code=prompt("Mã thiết bị:",d.code); if(!code) return;
  const desc=prompt("Mô tả:",d.description||"");
  const qty=parseInt(prompt("Tổng số lượng:",d.quantity_total)||0,10);
  if(qty<=0) return alert("Số lượng phải >0");
  const delta=qty-d.quantity_total;
  await updateDoc(eqRef,{name,code,description:desc,quantity_total:qty,quantity_available:d.quantity_available+delta});
  await refreshEquipmentLists();
};

window.deleteEquipment = async (eqId)=>{
  if(!isAdmin) return alert("Chỉ admin mới xóa thiết bị");
  if(!confirm("Xóa thiết bị này?")) return;
  await updateDoc(doc(db,"equipment",eqId), {is_active:false});
  await refreshEquipmentLists();
};

// ================== TẠO YÊU CẦU MƯỢN ==================
btnCreateLoan.onclick=async()=>{
  if(!currentUser){ alert("Cần đăng nhập."); return; }
  const eqId=loanEqSelect.value.trim(); const qty=parseInt(loanQty.value,10)||0;
  const note=loanNote.value.trim(); const startStr=loanStart.value,dueStr=loanDue.value;
  if(!eqId||qty<=0){ loanCreateMsg.textContent="Chọn thiết bị và số lượng >0"; return; }
  if(!startStr||!dueStr){ loanCreateMsg.textContent="Chọn ngày mượn và ngày trả dự kiến."; return; }
  const startDate=new Date(`${startStr}T00:00:00`); const dueDate=new Date(`${dueStr}T23:59:59`);
  if(startDate>dueDate){ loanCreateMsg.textContent="Ngày trả phải sau hoặc bằng ngày mượn."; return; }
  try{
    const eqRef=doc(db,"equipment",eqId); const eqSnap=await getDoc(eqRef);
    if(!eqSnap.exists()){ loanCreateMsg.textContent="Không tìm thấy thiết bị"; return; }
    const eq=eqSnap.data();
    if(!eq.is_active){ loanCreateMsg.textContent="Thiết bị không hoạt động"; return; }
    if(eq.quantity_available<qty){ loanCreateMsg.textContent="Không đủ số lượng còn lại"; return; }

    await addDoc(collection(db,"loans"),{
      userId:currentUser.uid,userEmail:currentUser.email,
      equipmentId:eqId,equipmentName:eq.name,
      quantity:qty,note,status:"pending",createdAt:serverTimestamp(),
      requestedStart:startDate,requestedDue:dueDate,
      approvedBy:null,approvedAt:null,startAt:null,dueAt:null,
      returned:false,returnedAt:null,rejectedReason:null
    });

    loanEqSelect.value=""; loanQty.value=""; loanNote.value="";
    loanCreateMsg.textContent="Đã gửi yêu cầu mượn.";
    await refreshMyLoans();
    if(isAdmin) await refreshAllLoans();
  }catch(e){ console.error(e); loanCreateMsg.textContent="Gửi yêu cầu thất bại: "+(e.code||e.message); }
};

// ================== RENDER LOAN ==================
function renderLoanCard(id,d,adminView=false,userView=false){
  let statusClass="";
  if(d.status==="pending") statusClass="status-pending";
  else if(d.status==="approved"&&!d.returned) statusClass="status-approved";
  else if(d.status==="rejected") statusClass="status-rejected";
  else if(d.returned) statusClass="status-returned";
  const fmt = ts=>ts?.toDate?ts.toDate().toLocaleDateString():ts?new Date(ts).toLocaleDateString():"";

  let controls="";
  if(adminView){
    if(d.status==="pending") controls+=`<button onclick="approveLoanWithDates('${id}')">Duyệt</button> <button onclick="rejectLoan('${id}')">Từ chối</button>`;
    if(d.status==="approved"&&!d.returned) controls+=`<button onclick="extendLoan('${id}')">Gia hạn</button> <button onclick="returnLoanWithTime('${id}')">Xác nhận trả</button>`;
    controls+=` <button onclick="deleteLoan('${id}')">Xóa</button>`;
  }else if(userView){
    if(d.status==="pending") controls+=`<button onclick="editLoan('${id}')">Sửa</button> <button onclick="deleteLoan('${id}')">Xóa</button>`;
  }

  return `<div class="card">
    <strong>${d.equipmentName}</strong> - SL: ${d.quantity}<br>
    Người mượn: ${d.userEmail}<br>
    <div class="${statusClass}">Trạng thái: ${d.status.toUpperCase()}${d.returned?" (Đã trả)":""}</div>
    ${d.note?`Ghi chú: ${d.note}`:""}
    ${d.requestedStart||d.requestedDue?`Đề xuất: ${fmt(d.requestedStart)} → ${fmt(d.requestedDue)}`:""}
    ${d.startAt||d.dueAt?`Được duyệt: ${fmt(d.startAt)} → ${fmt(d.dueAt)}`:""}
    ${d.rejectedReason?`Lý do từ chối: ${d.rejectedReason}`:""}
    <div>${controls}</div>
  </div>`;
}

// ================== LIST MY LOANS ==================
async function refreshMyLoans(){
  if(!currentUser) return;
  myLoans.innerHTML="Đang tải...";
  const qRef=query(collection(db,"loans"),where("userId","==",currentUser.uid),orderBy("createdAt","desc"));
  const snap=await getDocs(qRef);
  let html=""; snap.forEach(docSnap=>html+=renderLoanCard(docSnap.id,docSnap.data(),false,true));
  myLoans.innerHTML=html||"<p>Chưa có yêu cầu.</p>";
}

// ================== LIST ALL LOANS (ADMIN) ==================
async function refreshAllLoans(){
  if(!isAdmin) return;
  allLoans.innerHTML="Đang tải...";
  const qRef=query(collection(db,"loans"),orderBy("createdAt","desc"));
  const snap=await getDocs(qRef);
  let html=""; snap.forEach(docSnap=>html+=renderLoanCard(docSnap.id,docSnap.data(),true,false));
  allLoans.innerHTML=html||"<p>Chưa có yêu cầu.</p>";
}

// ================== ADMIN ACTIONS ==================
window.approveLoanWithDates=async loanId=>{
  if(!isAdmin) return; 
  const start=document.getElementById(`ap_start_${loanId}`).value;
  const due=document.getElementById(`ap_due_${loanId}`).value;
  if(!start||!due){ alert("Chọn ngày bắt đầu và hạn trả"); return; }
  const startAt=new Date(`${start}T00:00:00`), dueAt=new Date(`${due}T23:59:59`);
  const loanRef=doc(db,"loans",loanId), loanSnap=await getDoc(loanRef); if(!loanSnap.exists()) return;
  const loan=loanSnap.data();
  if(loan.status!=="pending") return;
  const eqRef=doc(db,"equipment",loan.equipmentId), eqSnap=await getDoc(eqRef); if(!eqSnap.exists()) return;
  const eq=eqSnap.data(); if(eq.quantity_available<loan.quantity){ alert("Không đủ số lượng để duyệt"); return; }
  await updateDoc(loanRef,{status:"approved",approvedBy:currentUser.email,approvedAt:serverTimestamp(),startAt,dueAt});
  await updateDoc(eqRef,{quantity_available:eq.quantity_available-loan.quantity});
  await refreshAllLoans(); await refreshEquipmentLists();
};

window.rejectLoan=async loanId=>{
  if(!isAdmin) return;
  const reason=prompt("Lý do từ chối?")||null;
  const loanRef=doc(db,"loans",loanId);
  await updateDoc(loanRef,{status:"rejected",rejectedReason:reason,approvedBy:currentUser.email,approvedAt:serverTimestamp()});
  await refreshAllLoans();
};

window.extendLoan=async loanId=>{
  if(!isAdmin) return;
  const dueStr=document.getElementById(`extend_due_${loanId}`).value; if(!dueStr){ alert("Chọn ngày"); return; }
  const newDue=new Date(`${dueStr}T23:59:59`);
  const loanRef=doc(db,"loans",loanId); const loanSnap=await getDoc(loanRef); if(!loanSnap.exists()) return;
  const loan=loanSnap.data(); if(loan.status!=="approved"||loan.returned) return;
  await updateDoc(loanRef,{dueAt:newDue}); await refreshAllLoans();
};

window.returnLoanWithTime=async loanId=>{
  if(!isAdmin) return;
  const input=document.getElementById(`ret_at_${loanId}`).value;
  const returnedAt=input?new Date(input):new Date();
  const loanRef=doc(db,"loans",loanId); const loanSnap=await getDoc(loanRef); if(!loanSnap.exists()) return;
  const loan=loanSnap.data();
  if(loan.status!=="approved"||loan.returned) return;
  const eqRef=doc(db,"
