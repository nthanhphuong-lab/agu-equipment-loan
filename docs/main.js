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

function isAllowedEmail(email) {
  return email.endsWith("@"+ALLOWED_DOMAIN) || TEST_EMAILS.includes(email);
}

// ================== IMPORTS ==================
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithRedirect, signOut, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore, collection, addDoc, doc, getDoc, getDocs, updateDoc, serverTimestamp, query, orderBy, where } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

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
const menuAdmin = document.getElementById("menuAdmin");
const menuUser = document.getElementById("menuUser");

// ================== STATE ==================
let currentUser = null;
let isAdmin = false;

// ================== AUTH ==================
btnGoogleLogin.onclick = async () => {
  loginMessage.textContent = "";
  const provider = new GoogleAuthProvider();
  try { await signInWithRedirect(auth, provider); } 
  catch (err) { loginMessage.textContent = "Đăng nhập thất bại."; }
};

btnLogout.onclick = async () => { await signOut(auth); };

onAuthStateChanged(auth, async (user) => {
  if(!user){
    currentUser=null; isAdmin=false;
    userInfo.classList.add("hidden"); loginArea.classList.remove("hidden");
    menuAdmin.classList.add("hidden"); menuUser.classList.add("hidden");
    return;
  }
  currentUser = user;
  isAdmin = ADMIN_EMAILS.includes(user.email);
  userEmailEl.textContent = user.email;
  userRoleTag.textContent = isAdmin?"ADMIN":"USER";
  userRoleTag.style.background = isAdmin?"#222":"#eee";
  userRoleTag.style.color = isAdmin?"#fff":"#000";
  loginArea.classList.add("hidden"); userInfo.classList.remove("hidden");
  if(isAdmin){ menuAdmin.classList.remove("hidden"); menuUser.classList.add("hidden"); }
  else { menuAdmin.classList.add("hidden"); menuUser.classList.remove("hidden"); }

  await refreshEquipmentLists();
  await refreshMyLoans();
  if(isAdmin) await refreshAllLoans();
});

// ================== FUNCTIONS ==================
// --- Equipment List ---
async function refreshEquipmentLists(){
  const snap = await getDocs(collection(db,"equipment"));
  equipmentList.innerHTML=""; equipmentListAdmin.innerHTML=""; 
  loanEqSelect.innerHTML="<option value=''>-- Chọn thiết bị --</option>";
  snap.forEach(d=>{
    const data=d.data(); const id=d.id;
    if(data.is_active!==false && data.quantity_available>0){
      const opt = document.createElement("option"); opt.value=id;
      opt.textContent=`${data.name} - còn ${data.quantity_available}`; loanEqSelect.appendChild(opt);
    }
    const div=document.createElement("div"); div.className="card";
    div.innerHTML=`<strong>${data.name}</strong> - SL: ${data.quantity_available} / ${data.quantity_total}<br>${data.description||""}`;
    equipmentListAdmin.appendChild(div);
  });
}

// --- Add Equipment ---
btnAddEq.onclick = async () => {
  const name=eqName.value.trim(), code=eqCode.value.trim();
  const qty=parseInt(eqQty.value,10)||0, desc=eqDesc.value.trim();
  if(!name||qty<=0){alert("Tên + SL>0"); return;}
  await addDoc(collection(db,"equipment"),{
    name, code, quantity_total:qty, quantity_available:qty, description:desc, is_active:true
  });
  eqName.value=""; eqCode.value=""; eqQty.value=""; eqDesc.value="";
  await refreshEquipmentLists();
};

// --- Loans ---
async function refreshMyLoans(){
  if(!currentUser) return;
  const qRef=query(collection(db,"loans"),where("userId","==",currentUser.uid));
  const snap=await getDocs(qRef); let html="";
  snap.forEach(d=>html+=renderLoanCard(d.id,d.data(),false));
  myLoans.innerHTML=html||"<p>Chưa có yêu cầu mượn.</p>";
}
async function refreshAllLoans(){
  if(!isAdmin) return;
  const qRef=query(collection(db,"loans"),orderBy("createdAt","desc"));
  const snap=await getDocs(qRef); let html="";
  snap.forEach(d=>html+=renderLoanCard(d.id,d.data(),true));
  allLoans.innerHTML=html||"<p>Chưa có yêu cầu mượn.</p>";
}
function renderLoanCard(id,d,adminView){
  let statusClass="";
  if(d.status==="pending") statusClass="status-pending";
  else if(d.status==="approved"&&!d.returned) statusClass="status-approved";
  else if(d.status==="rejected") statusClass="status-rejected";
  else if(d.returned) statusClass="status-returned";
  let adminControls="";
  if(adminView&&d.status==="pending"){
    adminControls=`<div>
      <label>Bắt đầu: <input type="date" id="ap_start_${id}"></label>
      <label>Hạn trả: <input type="date" id="ap_due_${id}"></label>
      <button onclick="approveLoanWithDates('${id}')">Duyệt</button>
      <button onclick="rejectLoan('${id}')">Từ chối</button>
    </div>`;
  }
  return `<div class="card">
    <div><strong>${d.equipmentName||d.equipmentId}</strong> - SL: ${d.quantity}</div>
    <div>Người mượn: ${d.userEmail}</div>
    <div class="${statusClass}">Trạng thái: ${d.status.toUpperCase()}</div>
    <div>Ghi chú: ${d.note||""}</div>
    ${d.rejectedReason?`<div style="color:red;">Lý do từ chối: ${d.rejectedReason}</div>`:""}
    ${adminControls}
  </div>`;
}

// --- Create Loan ---
btnCreateLoan.onclick=async()=>{
  if(!currentUser){alert("Cần đăng nhập"); return;}
  const eqId=(loanEqSelect.value||"").trim();
  const qty=parseInt(loanQty.value,10)||0; const note=loanNote.value.trim();
  const startStr=loanStart.value, dueStr=loanDue.value;
  if(!eqId||qty<=0){loanCreateMsg.textContent="Chọn thiết bị và SL>0"; return;}
  if(!startStr||!dueStr){loanCreateMsg.textContent="Chọn ngày mượn và hạn trả"; return;}
  const startDate=new Date(`${startStr}T00:00:00`), dueDate=new Date(`${dueStr}T23:59:59`);
  if(startDate>dueDate){loanCreateMsg.textContent="Ngày trả phải sau hoặc bằng ngày mượn"; return;}
  const eqRef=doc(db,"equipment",eqId); const eqSnap=await getDoc(eqRef);
  if(!eqSnap.exists()){loanCreateMsg.textContent="Không tìm thấy thiết bị"; return;}
  const eq=eqSnap.data();
  if(!eq.is_active){loanCreateMsg.textContent="Thiết bị không còn hoạt động"; return;}
  if(eq.quantity_available<qty){loanCreateMsg.textContent="Không đủ SL"; return;}
  await addDoc(collection(db,"loans"),{
    userId: currentUser.uid,
    userEmail: currentUser.email,
    equipmentId: eqId,
    equipmentName: eq.name,
    quantity: qty,
    note,
    status:"pending",
    createdAt:serverTimestamp(),
    requestedStart:startDate,
    requestedDue:dueDate,
    approvedBy:null,
    approvedAt:null,
    startAt:null,
    dueAt:null,
    returned:false,
    returnedAt:null,
    rejectedReason:null
  });
  loanEqSelect.value=""; loanQty.value=""; loanNote.value=""; loanCreateMsg.textContent="Đã gửi yêu cầu mượn.";
  await refreshMyLoans(); if(isAdmin) await refreshAllLoans();
};

// --- Approve/Reject ---
window.approveLoanWithDates=async(loanId)=>{
  const startEl=document.getElementById(`ap_start_${loanId}`);
  const dueEl=document.getElementById(`ap_due_${loanId}`);
  if(!startEl.value||!dueEl.value){alert("Chọn ngày bắt đầu & hạn trả"); return;}
  const startAt=new Date(`${startEl.value}T00:00:00`);
  const dueAt=new Date(`${dueEl.value}T23:59:59`);
  const loanRef=doc(db,"loans",loanId);
  await updateDoc(loanRef,{status:"approved",approvedBy:currentUser.email,approvedAt:serverTimestamp(),startAt,dueAt});
  alert("Đã duyệt yêu cầu"); await refreshAllLoans(); await refreshEquipmentLists();
};
window.rejectLoan=async(loanId)=>{
  const reason=prompt("Nhập lý do từ chối:"); if(reason===null) return;
  const loanRef=doc(db,"loans",loanId);
  await updateDoc(loanRef,{status:"rejected",rejectedReason:reason});
  alert("Đã từ chối yêu cầu"); await refreshAllLoans();
};

// --- Export CSV ---
function downloadCSV(filename,rows){
  const csv=rows.map(r=>r.map(c=>`"${c}"`).join(",")).join("\n");
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
  const link=document.createElement("a"); link.href=URL.createObjectURL(blob); link.setAttribute("download",filename); link.click();
}
document.getElementById("btnExportCSV").onclick=async ()=>{
  const snap=await getDocs(collection(db,"equipment"));
  const rows=[["Tên","Mã","SL Tổng","Còn lại","Mô tả"]];
  snap.forEach(d=>{const data=d.data(); rows.push([data.name,data.code||"",data.quantity_total,data.quantity_available,data.description||""]);});
  downloadCSV("equipment.csv",rows);
};
document.getElementById("btnExportCSVLoan").onclick=async ()=>{
  const snap=await getDocs(collection(db,"loans"));
  const rows=[["Người mượn","Email","Thiết bị","SL","Trạng thái","Ngày tạo","Bắt đầu","Hạn trả","Ghi chú"]];
  snap.forEach(d=>{const data=d.data(); 
    const fmt=t=>t?t.toDate? t.toDate().toLocaleDateString():new Date(t).toLocaleD
