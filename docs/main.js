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
const TEST_EMAILS = ["test1@local.test", "test2@local.test"];

function isAllowedEmail(email){
  return email.endsWith("@"+ALLOWED_DOMAIN) || TEST_EMAILS.includes(email);
}

// ================== IMPORTS ==================
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut,
  onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore, collection, addDoc, doc, getDoc, getDocs,
  updateDoc, serverTimestamp, query, where, orderBy } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

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

const mainNav = document.getElementById("mainNav");
const allPages = () => Array.from(document.querySelectorAll(".page"));
const tabButtons = () => Array.from(document.querySelectorAll(".tab-btn"));

function showPage(pageId){
  allPages().forEach(p => p.classList.add("hidden"));
  tabButtons().forEach(b => b.classList.remove("active"));
  const el = document.getElementById(pageId); if (el) el.classList.remove("hidden");
  const btn = tabButtons().find(b => b.dataset.page === pageId); if (btn) btn.classList.add("active");
  if (["page-devices","page-create-loan","page-admin-eq"].includes(pageId)) refreshEquipmentLists();
  else if (pageId==="page-my-loans") refreshMyLoans();
  else if (pageId==="page-admin-loans") refreshAllLoans();
}

document.addEventListener("click", (e)=>{
  const t=e.target;
  if(t.classList&&t.classList.contains("tab-btn")) showPage(t.dataset.page);
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

const localEmail=document.getElementById("localEmail");
const localPass=document.getElementById("localPass");
const btnLocalSignup=document.getElementById("btnLocalSignup");
const btnLocalLogin=document.getElementById("btnLocalLogin");
const localMsg=document.getElementById("localMsg");

btnLocalSignup.onclick=async ()=>{
  localMsg.textContent="";
  try{
    const email=(localEmail.value||"").trim();
    const pass=localPass.value||"";
    if(!email||!pass){ localMsg.textContent="Nhập email và mật khẩu."; return; }
    if(!isAllowedEmail(email)){ localMsg.textContent="Email không được phép."; return; }
    await createUserWithEmailAndPassword(auth,email,pass);
    localMsg.textContent="Tạo tài khoản test thành công. Bạn đã đăng nhập.";
  }catch(e){ console.error(e); localMsg.textContent="Đăng ký thất bại: "+(e.code||"");}
};

btnLocalLogin.onclick=async ()=>{
  localMsg.textContent="";
  try{
    const email=(localEmail.value||"").trim();
    const pass=localPass.value||"";
    if(!email||!pass){ localMsg.textContent="Nhập email và mật khẩu."; return; }
    await signInWithEmailAndPassword(auth,email,pass);
    localMsg.textContent="Đăng nhập test thành công.";
  }catch(e){ console.error(e); localMsg.textContent="Đăng nhập thất bại: "+(e.code||"");}
};

onAuthStateChanged(auth, async (user)=>{
  if(!user){
    currentUser=null; isAdmin=false;
    userInfo.classList.add("hidden"); loginArea.classList.remove("hidden"); mainNav.classList.add("hidden");
    allPages().forEach(p=>p.classList.add("hidden")); return;
  }
  if(!isAllowedEmail(user.email)){
    await signOut(auth);
    loginMessage.textContent=`Chỉ chấp nhận @${ALLOWED_DOMAIN} hoặc email test.`;
    return;
  }
  currentUser=user;
  isAdmin=ADMIN_EMAILS.includes(user.email);
  userEmailEl.textContent=user.email;
  userRoleTag.textContent=isAdmin?"ADMIN":"USER";
  userRoleTag.classList.remove("admin","user");
  userRoleTag.classList.add(isAdmin?"admin":"user");
  loginArea.classList.add("hidden"); userInfo.classList.remove("hidden");
  mainNav.classList.remove("hidden");
  document.querySelectorAll(".admin-only").forEach(b=>{
    if(isAdmin) b.classList.remove("hidden"); else b.classList.add("hidden");
  });
  showPage(isAdmin?"page-admin-eq":"page-devices");
  await refreshEquipmentLists(); await refreshMyLoans(); if(isAdmin) await refreshAllLoans();
});

// ================== THIẾT BỊ ==================
btnAddEq.onclick=async ()=>{
  if(!isAdmin||!currentUser) return;
  const name=eqName.value.trim(), code=eqCode.value.trim();
  const qty=parseInt(eqQty.value,10)||0, desc=eqDesc.value.trim();
  if(!name||!code||qty<=0){ alert("Nhập đầy đủ tên, mã, số lượng >0."); return;}
  try{
    await addDoc(collection(db,"equipment"), { name, code, description:desc, quantity_total:qty, quantity_available:qty, is_active:true });
    eqName.value=eqCode.value=eqDesc.value=""; eqQty.value="";
    await refreshEquipmentLists(); alert("Đã thêm thiết bị.");
  }catch(e){ console.error(e); alert("Không thêm được: "+(e.code||e.message));}
};

async function refreshEquipmentLists(){
  equipmentList.innerHTML="Đang tải..."; equipmentListAdmin.innerHTML=""; loanEqSelect.innerHTML=`<option value="">-- Chọn thiết bị --</option>`;
  const snap=await getDocs(collection(db,"equipment"));
  let htmlUser="", htmlAdmin="";
  snap.forEach(docSnap=>{
    const d=docSnap.data(); const id=docSnap.id; if(!d.is_active) return;
    htmlUser+=`<div class="card"><div><strong>${d.name}</strong> (${d.code})</div>
      <div>Còn: ${d.quantity_available}/${d.quantity_total}</div>
      <div class="muted">ID: ${id}</div><div>${d.description||""}</div></div>`;
    if(isAdmin){
      htmlAdmin+=`<div class="card"><div><strong>${d.name}</strong> (${d.code})</div>
      <div>Số lượng: <input type="number" id="eqQty_${id}" value="${d.quantity_total}" min="1" style="width:60px" /> / ${d.quantity_available}</div>
      <div class="muted">ID: ${id}</div><div>${d.description||""}</div>
      <button onclick="updateEquipment('${id}')">Cập nhật</button>
      <button onclick="deleteEquipment('${id}')">Xóa</button></div>`;
    }
    const opt=document.createElement("option"); opt.value=id; opt.textContent=`${d.name} (${d.code}) — còn ${d.quantity_available}/${d.quantity_total}`; loanEqSelect.appendChild(opt);
  });
  equipmentList.innerHTML=htmlUser||"<p>Chưa có thiết bị.</p>";
  if(isAdmin) equipmentListAdmin.innerHTML=htmlAdmin||"<p>Chưa có thiết bị.</p>";
  const today=new Date(); const pad=n=>String(n).padStart(2,"0"); const toInput=dt=>`${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}`;
  if(!loanStart.value) loanStart.value=toInput(today);
  if(!loanDue.value){ const t=new Date(today); t.setDate(t.getDate()+7); loanDue.value=toInput(t);}
}

// ================== LOAN ==================
btnCreateLoan.onclick=async ()=>{
  if(!currentUser){ alert("Cần đăng nhập."); return;}
  const eqId=(loanEqSelect.value||"").trim(), qty=parseInt(loanQty.value,10)||0, note=loanNote.value.trim();
  const startStr=loanStart.value, dueStr=loanDue.value;
  if(!eqId||qty<=0){ loanCreateMsg.textContent="Chọn thiết bị và số lượng >0."; return;}
  if(!startStr||!dueStr){ loanCreateMsg.textContent="Chọn ngày mượn và ngày trả dự kiến."; return;}
  const startDate=new Date(`${startStr}T00:00:00`), dueDate=new Date(`${dueStr}T23:59:59`);
  if(startDate>dueDate){ loanCreateMsg.textContent="Ngày trả phải sau hoặc bằng ngày mượn."; return;}
  try{
    const eqRef=doc(db,"equipment",eqId); const eqSnap=await getDoc(eqRef);
    if(!eqSnap.exists()){ loanCreateMsg.textContent="Không tìm thấy thiết bị."; return;}
    const eq=eqSnap.data();
    if(!eq.is_active){ loanCreateMsg.textContent="Thiết bị không hoạt động."; return;}
    if(eq.quantity_available<qty){ loanCreateMsg.textContent=`Chỉ còn ${eq.quantity_available} thiết bị.`; return;}
    await addDoc(collection(db,"loans"),{
      userEmail:currentUser.email,
      equipmentId:eqId,
      equipmentName:eq.name,
      quantity:qty,
      note,
      status:"pending",
      returned:false,
      createdAt:serverTimestamp()
    });
    await updateDoc(eqRef,{ quantity_available: eq.quantity_available - qty });
    loanQty.value=""; loanNote.value="";
    await refreshEquipmentLists(); await refreshMyLoans();
    loanCreateMsg.textContent="Gửi yêu cầu thành công.";
  }catch(e){ console.error(e); loanCreateMsg.textContent="Không gửi được: "+(e.code||e.message);}
};

// ================== ADMIN EQUIPMENT ==================
window.updateEquipment=async (id)=>{
  if(!isAdmin) return;
  const qtyInput=document.getElementById(`eqQty_${id}`);
  const newQty=parseInt(qtyInput.value,10);
  if(isNaN(newQty)||newQty<=0){ alert("Số lượng phải >0"); return;}
  const eqRef=doc(db,"equipment",id); const eqSnap=await getDoc(eqRef);
  if(!eqSnap.exists()) return;
  const eq=eqSnap.data(); const delta=newQty-eq.quantity_total;
  await updateDoc(eqRef,{ quantity_total:newQty, quantity_available: eq.quantity_available+delta });
  await refreshEquipmentLists(); alert("Cập nhật thành công");
};

window.deleteEquipment=async (id)=>{
  if(!isAdmin) return;
  if(!confirm("Bạn có chắc muốn xóa thiết bị này?")) return;
  const eqRef=doc(db,"equipment",id); await updateDoc(eqRef,{ is_active:false });
  await refreshEquipmentLists(); alert("Đã xóa thiết bị");
};

// ================== MY LOANS ==================
async function refreshMyLoans(){
  if(!currentUser){ myLoans.innerHTML="Chưa đăng nhập."; return;}
  const q=query(collection(db,"loans"), where("userEmail","==",currentUser.email), orderBy("createdAt","desc"));
  const snap=await getDocs(q);
  let html="";
  snap.forEach(docSnap=>{
    const d=docSnap.data(); const id=docSnap.id;
    const statusClass="status-"+(d.status||"pending");
    let userControls="";
    if(d.status==="pending"){
      userControls+=`<div style="margin-top:6px">
        <button onclick="cancelMyLoan('${id}')">Hủy yêu cầu</button>
        <label>Số lượng: <input type="number" id="myLoanQty_${id}" value="${d.quantity}" min="1" style="width:60px"/></label>
        <button onclick="updateMyLoan('${id}')">Cập nhật</button>
      </div>`;
    }
    html+=`<div class="card"><div><strong>${d.equipmentName}</strong> - SL: ${d.quantity}</div>
      <div>Người mượn: ${d.userEmail}</div>
      <div class="${statusClass}">Trạng thái: ${d.status.toUpperCase()}${d.returned?" (ĐÃ TRẢ)":""}</div>
      <div>Ghi chú: ${d.note||""}</div>${userControls}</div>`;
  });
  myLoans.innerHTML=html||"<p>Chưa có yêu cầu nào.</p>";
}

window.cancelMyLoan=async (loanId)=>{
  if(!currentUser) return;
  if(!confirm("Bạn có chắc muốn hủy yêu cầu này?")) return;
  const loanRef=doc(db,"loans",loanId); const loanSnap=await getDoc(loanRef);
  if(!loanSnap.exists()) return;
  const loan=loanSnap.data();
  const eqRef=doc(db,"equipment",loan.equipmentId);
  const eqSnap=await getDoc(eqRef); if(!eqSnap.exists()) return;
  await updateDoc(loanRef,{ status:"rejected", rejectedReason:"Hủy bởi user" });
  await updateDoc(eqRef,{ quantity_available: eqSnap.data().quantity_available + loan.quantity });
  await refreshMyLoans(); await refreshEquipmentLists();
  alert("Đã hủy yêu cầu");
};

window.updateMyLoan=async (loanId)=>{
  if(!currentUser) return;
  const qtyInput=document.getElementById(`myLoanQty_${loanId}`);
  const newQty=parseInt(qtyInput.value,10);
  if(isNaN(newQty)||newQty<=0){ alert("Số lượng phải >0"); return;}
  const loanRef=doc(db,"loans",loanId); const loanSnap=await getDoc(loanRef); if(!loanSnap.exists()) return;
  const loan=loanSnap.data();
  if(loan.status!=="pending"){ alert("Chỉ có thể cập nhật yêu cầu đang chờ"); return;}
  const eqRef=doc(db,"equipment",loan.equipmentId); const eqSnap=await getDoc(eqRef); if(!eqSnap.exists()) return;
  const eq=eqSnap.data();
  if(eq.quantity_available + loan.quantity < newQty){ alert("Không đủ số lượng còn lại"); return;}
  const delta=newQty - loan.quantity;
  await updateDoc(loanRef,{ quantity:newQty });
  await updateDoc(eqRef,{ quantity_available: eq.quantity_available - delta });
  await refreshMyLoans(); await refreshEquipmentLists(); alert("Cập nhật thành công");
};

// ================== ADMIN LOANS ==================
async function refreshAllLoans(){
  if(!isAdmin){ allLoans.innerHTML="Chỉ admin xem được."; return;}
  const q=query(collection(db,"loans"), orderBy("createdAt","desc"));
  const snap=await getDocs(q);
  let html="";
  snap.forEach(docSnap=>{
    const d=docSnap.data(); const id=docSnap.id;
    const statusClass="status-"+(d.status||"pending");
    let adminControls="";
    if(d.status==="pending"){
      adminControls+=`<div style="margin-top:4px">
        <button onclick="approveLoan('${id}')">Duyệt</button>
        <button onclick="rejectLoan('${id}')">Từ chối</button>
      </div>`;
    }
    html+=`<div class="card">
      <div><strong>${d.equipmentName}</strong> - SL: ${d.quantity}</div>
      <div>Người mượn: ${d.userEmail}</div>
      <div class="${statusClass}">Trạng thái: ${d.status.toUpperCase()}</div>
      <div>Ghi chú: ${d.note||""}</div>${adminControls}
    </div>`;
  });
  allLoans.innerHTML=html||"<p>Chưa có yêu cầu nào.</p>";
}

window.approveLoan=async (loanId)=>{
  const loanRef=doc(db,"loans",loanId); const loanSnap=await getDoc(loanRef); if(!loanSnap.exists()) return;
  const loan=loanSnap.data();
  if(loan.status!=="pending"){ alert("Yêu cầu không còn pending."); return;}
  await updateDoc(loanRef,{ status:"approved" }); await refreshAllLoans(); alert("Đã duyệt");
};

window.rejectLoan=async (loanId)=>{
  const loanRef=doc(db,"loans",loanId); const loanSnap=await getDoc(loanRef); if(!loanSnap.exists()) return;
  const loan=loanSnap.data();
  if(loan.status!=="pending"){ alert("Yêu cầu không còn pending."); return;}
  const eqRef=doc(db,"equipment",loan.equipmentId); const eqSnap=await getDoc(eqRef);
  await updateDoc(loanRef,{ status:"rejected", rejectedReason:"Từ chối bởi admin" });
  if(eqSnap.exists()) await updateDoc(eqRef,{ quantity_available: eqSnap.data().quantity_available + loan.quantity });
  await refreshAllLoans(); await refreshEquipmentLists(); alert("Đã từ chối");
};
