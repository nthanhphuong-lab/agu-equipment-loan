import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, collection, getDocs, doc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// FIREBASE CONFIG
const firebaseConfig = { /* your config */ };
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let currentUser=null;
let isAdmin=false;

// ================= LOGIN / LOGOUT =================
const loginArea=document.getElementById("loginArea");
const userInfo=document.getElementById("userInfo");
const userEmailSpan=document.getElementById("userEmail");
const userRoleTag=document.getElementById("userRoleTag");
const mainNav=document.getElementById("mainNav");

function login(user,email,isAdminFlag){
  currentUser=user;
  isAdmin=isAdminFlag;
  loginArea.classList.add("hidden");
  userInfo.classList.remove("hidden");
  userEmailSpan.textContent=email;
  userRoleTag.textContent=isAdmin?"ADMIN":"USER";
  userRoleTag.className="tag "+(isAdmin?"admin":"user");
  document.querySelectorAll(".admin-only").forEach(btn=>{
    btn.style.display=isAdmin?"inline-block":"none";
  });
  mainNav.classList.remove("hidden");
  showPage("page-devices");
}

// ================= NAV / TAB =================
function showPage(pageId){
  document.querySelectorAll(".page").forEach(p=>p.classList.add("hidden"));
  document.getElementById(pageId).classList.remove("hidden");
  document.querySelectorAll(".tab-btn").forEach(btn=>btn.classList.remove("active"));
  document.querySelector(`.tab-btn[data-page="${pageId}"]`)?.classList.add("active");
  if(pageId==="page-stats") refreshStats();
}
document.querySelectorAll(".tab-btn").forEach(btn=>{
  btn.addEventListener("click",()=>showPage(btn.dataset.page));
});

// ================= EQUIPMENT =================
const equipmentList=document.getElementById("equipmentList");
const equipmentListAdmin=document.getElementById("equipmentListAdmin");
const eqName=document.getElementById("eqName");
const eqCode=document.getElementById("eqCode");
const eqQty=document.getElementById("eqQty");
const eqDesc=document.getElementById("eqDesc");
const btnAddEq=document.getElementById("btnAddEq");
const loanEqSelect=document.getElementById("loanEqSelect");

async function refreshEquipmentLists(){
  equipmentList.innerHTML="";
  equipmentListAdmin.innerHTML="";
  loanEqSelect.innerHTML='<option value="">-- Chọn thiết bị --</option>';
  const snap=await getDocs(collection(db,"equipment"));
  snap.forEach(docSnap=>{
    const d=docSnap.data(); const id=docSnap.id;
    if(!d.is_active) return;
    // User view
    const line=document.createElement("div");
    line.className="card";
    line.innerHTML=`<div><strong>${d.name}</strong> (${d.code})</div>
      <div>Còn: ${d.quantity_available} / ${d.quantity_total}</div>
      <div class="muted">${d.description||""}</div>`;
    equipmentList.appendChild(line);

    // Loan select
    const opt=document.createElement("option");
    opt.value=id; opt.textContent=d.name;
    loanEqSelect.appendChild(opt);

    // Admin view
    if(isAdmin){
      const lineAdmin=document.createElement("div");
      lineAdmin.className="card";
      lineAdmin.innerHTML=`
        <div><strong>${d.name}</strong> (${d.code})</div>
        <div>Còn: ${d.quantity_available} / ${d.quantity_total}</div>
        <div class="muted">ID: ${id}</div>
        <div>${d.description||""}</div>
        <button onclick="editEquipment('${id}')">Cập nhật</button>
        <button onclick="deleteEquipment('${id}')">Xóa</button>
      `;
      equipmentListAdmin.appendChild(lineAdmin);
    }
  });
}
btnAddEq.addEventListener("click",async ()=>{
  const name=eqName.value.trim();
  const code=eqCode.value.trim();
  const qty=parseInt(eqQty.value,10);
  const desc=eqDesc.value.trim();
  if(!name||!code||isNaN(qty)||qty<=0) return alert("Nhập đầy đủ tên, mã, số lượng");
  const id=code+"_"+Date.now();
  await setDoc(doc(db,"equipment",id),{
    name, code, quantity_total:qty, quantity_available:qty, description:desc, is_active:true
  });
  eqName.value=""; eqCode.value=""; eqQty.value=""; eqDesc.value="";
  await refreshEquipmentLists();
});

// ================= UPDATE / DELETE EQUIPMENT =================
window.editEquipment=async (id)=>{
  const eqRef=doc(db,"equipment",id);
  const eqSnap=await getDocs(eqRef);
  // ...simplify for demo, can use prompt as above
};

window.deleteEquipment=async (id)=>{
  if(!confirm("Xác nhận xóa thiết bị này?")) return;
  const eqRef=doc(db,"equipment",id);
  await updateDoc(eqRef,{is_active:false});
  await refreshEquipmentLists();
};

// ================= LOAN =================
const loanQty=document.getElementById("loanQty");
const loanStart=document.getElementById("loanStart");
const loanDue=document.getElementById("loanDue");
const loanNote=document.getElementById("loanNote");
const btnCreateLoan=document.getElementById("btnCreateLoan");
const loanCreateMsg=document.getElementById("loanCreateMsg");

btnCreateLoan.addEventListener("click",async ()=>{
  const eqId=loanEqSelect.value;
  const qty=parseInt(loanQty.value,10);
  const start=loanStart.value;
  const due=loanDue.value;
  const note=loanNote.value.trim();
  if(!eqId||isNaN(qty)||qty<=0||!start||!due) return alert("Nhập đầy đủ thông tin");
  const id=Date.now()+"_"+currentUser.email;
  await setDoc(doc(db,"loans",id),{
    userEmail:currentUser.email,
    eqId, quantity:qty, start, due, note, status:"pending", createdAt:Date.now()
  });
  loanCreateMsg.textContent="Đã gửi yêu cầu mượn!";
  loanQty.value=""; loanStart.value=""; loanDue.value=""; loanNote.value="";
  refreshMyLoans();
});

// ================= MY LOANS =================
const myLoans=document.getElementById("myLoans");
async function refreshMyLoans(){
  if(!currentUser) return;
  const snap=await getDocs(collection(db,"loans"));
  myLoans.innerHTML="";
  snap.forEach(d=>{
    const l=d.data();
    if(l.userEmail!==currentUser.email) return;
    const eqNameDisplay=""; // có thể join với equipment collection
    const line=document.createElement("div");
    line.className="card";
    line.innerHTML=`<div><strong>${eqNameDisplay}</strong></div>
      <div>Số lượng: ${l.quantity}, Trạng thái: <span class="status-${l.status}">${l.status}</span></div>
      <div>Ngày mượn: ${l.start} - ${l.due}</div>
      <div>Ghi chú: ${l.note||""}</div>`;
    myLoans.appendChild(line);
  });
}

// ================= STATS =================
let statsChart=null;
const statsSummary=document.getElementById("statsSummary");
async function refreshStats(){
  if(!currentUser) return;
  const eqSnap=await getDocs(collection(db,"equipment"));
  const loanSnap=await getDocs(collection(db,"loans"));

  const eqLabels=[], eqData=[];
  eqSnap.forEach(d=>{
    const e=d.data();
    if(!e.is_active) return;
    eqLabels.push(e.name);
    eqData.push(e.quantity_available);
  });

  const statusCounts={pending:0,approved:0,rejected:0,returned:0};
  loanSnap.forEach(d=>{
    const l=d.data();
    if(isAdmin || l.userEmail===currentUser.email){
      if(statusCounts[l.status]!==undefined) statusCounts[l.status]++;
    }
  });

  let summaryHtml="";
  if(isAdmin){
    let totalEq=0,totalAvailable=0,totalLoans=0;
    eqSnap.forEach(d=>{ const e=d.data(); if(!e.is_active) return; totalEq+=e.quantity_total; totalAvailable+=e.quantity_available; });
    loanSnap.forEach(()=>totalLoans++);
    summaryHtml=`
      <div class="card"><strong>Tổng số thiết bị:</strong> ${totalEq}</div>
      <div class="card"><strong>Số thiết bị còn:</strong> ${totalAvailable}</div>
      <div class="card"><strong>Tổng yêu cầu mượn:</strong> ${totalLoans}</div>
    `;
  } else {
    summaryHtml=`
      <div class="card"><strong>Số yêu cầu đang chờ:</strong> ${statusCounts.pending}</div>
      <div class="card"><strong>Số thiết bị đang mượn:</strong> ${statusCounts.approved}</div>
      <div class="card"><strong>Số yêu cầu bị từ chối:</strong> ${statusCounts.rejected}</div>
      <div class="card"><strong>Số thiết bị đã trả:</strong> ${statusCounts.returned}</div>
    `;
  }
  statsSummary.innerHTML=summaryHtml;

  const ctx=document.getElementById("statsChart").getContext("2d");
  if(statsChart) statsChart.destroy();
  if(isAdmin){
    statsChart=new Chart(ctx,{
      type:'bar',
      data:{labels:eqLabels,datasets:[{label:'Số lượng còn',data:eqData,backgroundColor:'rgba(54,162,235,0.6)'}]},
      options:{responsive:true,plugins:{legend:{display:true}},scales:{y:{beginAtZero:true}}}
    });
  } else {
    statsChart=new Chart(ctx,{
      type:'pie',
      data:{labels:['Đang yêu cầu','Đang mượn','Bị từ chối','Đã trả'],
        datasets:[{data:[
          statusCounts.pending,statusCounts.approved,statusCounts.rejected,statusCounts.returned
        ],backgroundColor:[
          'rgba(255,206,86,0.6)','rgba(54,162,235,0.6)','rgba(255,99,132,0.6)','rgba(75,192,192,0.6)'
        ]}]
      },
      options:{responsive:true,plugins:{legend:{position:'bottom'}}}
    });
  }
}

// Auto refresh stats khi tab thống kê mở
setInterval(()=>{if(!document.getElementById("page-stats").classList.contains("hidden")) refreshStats();},30000);

// ================= INIT =================
refreshEquipmentLists();
refreshMyLoans();
