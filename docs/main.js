// ... phần import, init, auth, và hiển thị page giống như trước ...

// ================== QUẢN LÝ THIẾT BỊ (ADMIN) ==================
async function refreshEquipmentLists(){
  equipmentList.innerHTML="Đang tải..."; equipmentListAdmin.innerHTML=""; loanEqSelect.innerHTML=`<option value="">-- Chọn thiết bị --</option>`;
  const snap=await getDocs(collection(db,"equipment"));
  let htmlUser="", htmlAdmin="";
  snap.forEach(docSnap=>{
    const d=docSnap.data(), id=docSnap.id; if(!d.is_active) return;
    const lineUser=`<div class="card"><div><strong>${d.name}</strong> (${d.code})</div><div>Còn: ${d.quantity_available}/${d.quantity_total}</div><div class="muted">ID: ${id}</div><div>${d.description||""}</div></div>`;
    htmlUser+=lineUser;

    if(isAdmin){
      const lineAdmin=`<div class="card">
        <div><strong>${d.name}</strong> (${d.code})</div>
        <div>Còn: ${d.quantity_available}/${d.quantity_total}</div>
        <div>${d.description||""}</div>
        <div class="eq-actions">
          <button onclick="editEq('${id}')">Cập nhật</button>
          <button onclick="deleteEq('${id}')">Xóa</button>
        </div>
      </div>`;
      htmlAdmin+=lineAdmin;
    }

    const opt=document.createElement("option"); opt.value=id; opt.textContent=`${d.name} (${d.code}) — còn ${d.quantity_available}/${d.quantity_total}`; loanEqSelect.appendChild(opt);
  });
  equipmentList.innerHTML=htmlUser||"<p>Chưa có thiết bị.</p>";
  if(isAdmin) equipmentListAdmin.innerHTML=htmlAdmin||"<p>Chưa có thiết bị.</p>";
}

// Xóa thiết bị
window.deleteEq=async(id)=>{
  if(!confirm("Bạn có chắc muốn xóa thiết bị này?")) return;
  const ref=doc(db,"equipment",id);
  await updateDoc(ref,{is_active:false});
  await refreshEquipmentLists();
};

// Cập nhật thiết bị
window.editEq=async(id)=>{
  const ref=doc(db,"equipment",id); const snap=await getDoc(ref);
  if(!snap.exists()) return alert("Không tìm thấy thiết bị.");
  const d=snap.data();
  const name=prompt("Tên thiết bị:",d.name); if(!name) return;
  const code=prompt("Mã thiết bị:",d.code); if(!code) return;
  const qty=parseInt(prompt("Số lượng tổng:",d.quantity_total),10); if(isNaN(qty)||qty<0) return;
  const desc=prompt("Mô tả:",d.description||"");
  await updateDoc(ref,{name,code,description:desc,quantity_total:qty});
  await refreshEquipmentLists();
}

// ================== THỐNG KÊ (GRAPH) ==================
let statsChart=null;
async function refreshStats(){
  const eqSnap=await getDocs(collection(db,"equipment"));
  const loanSnap=await getDocs(collection(db,"loans"));
  let totalEq=0, totalAvailable=0, totalLoans=0;
  let eqLabels=[], eqData=[];
  eqSnap.forEach(d=>{
    const e=d.data(); if(!e.is_active) return;
    totalEq+=e.quantity_total; totalAvailable+=e.quantity_available;
    eqLabels.push(e.name); eqData.push(e.quantity_available);
  });
  loanSnap.forEach(d=>{ totalLoans+=1; });

  // Cập nhật summary
  statsSummary.innerHTML=`
    <div class="card"><strong>Tổng số thiết bị:</strong> ${totalEq}</div>
    <div class="card"><strong>Số thiết bị còn:</strong> ${totalAvailable}</div>
    <div class="card"><strong>Tổng yêu cầu mượn:</strong> ${totalLoans}</div>
  `;

  // Vẽ chart
  const ctx=document.getElementById("statsChart").getContext("2d");
  if(statsChart) statsChart.destroy();
  statsChart=new Chart(ctx,{
    type:'bar',
    data:{labels:eqLabels,datasets:[{label:'Số lượng còn',data:eqData,backgroundColor:'rgba(54,162,235,0.6)'}]},
    options:{responsive:true,plugins:{legend:{display:true}},scales:{y:{beginAtZero:true}}}
  });
}

// Auto refresh stats
setInterval(()=>{ if(!document.getElementById("page-stats").classList.contains("hidden")) refreshStats(); },30000);
