document.addEventListener('DOMContentLoaded',()=>{
  let u=session();
  if(!u||u.role!=='admin')return location.href='../login.html';
  if($('#kpiAssign'))dash();
  if($('#staffTable'))staff();
  if($('#wheelchairs'))resources('wheelchairs','wheelchairs');
  if($('#vehicles'))resources('vehicles','vehicles');
  if($('#monitor'))monitor();
  if($('#wreview'))waste();
  if($('#rewards'))rewards();
  if($('#redemptions'))redemptions();
  if($('#adminComplaints'))complaints();
  if($('#resourceAvailability'))availability();
});
function dash(){
  const b=get('bookings');
  $('#kpiAssign').textContent=b.filter(x=>x.status==='Booked'||x.status==='Assigned').length;
  $('#kpiWaste').textContent=get('waste').filter(x=>wasteStatus(x)==='pending').length;
  $('#kpiBookings').textContent=b.length;
  $('#kpiComplaints').textContent=get('complaints').filter(x=>x.status==='Open').length;
  if(window.Chart)new Chart($('#chart'),{type:'line',data:{labels:['Apr','May','Jun','Jul','Aug','Sep'],datasets:[{label:'Bookings',data:[5,8,12,17,21,b.length+3]}]},options:{responsive:true}});
}
function staff(){
  const state={page:1};
  function draw(){
    const q=listQuery('#listSearch');
    const a=get('staff').filter(x=>textMatch(q,x.employeeId,x.name,x.role,x.status));
    const pg=paginate(a,state.page);state.page=pg.page;
    $('#staffTable').innerHTML='<table><tr><th>ID</th><th>Name</th><th>Role</th><th>Status</th><th>Action</th></tr>'+(pg.slice.length?pg.slice.map(x=>`<tr><td>${x.employeeId}</td><td>${x.name}</td><td>${x.role}</td><td>${x.status}</td><td><button class="btn sm" onclick="editStaff('${x.employeeId}')">Edit</button> <button class="btn danger sm" onclick="delStaff('${x.employeeId}')">Delete</button></td></tr>`).join(''):'<tr><td colspan="5" class="muted">No staff.</td></tr>')+'</table>';
    fillPager('#listPager',pg.page,pg.empty?0:pg.pages);
  }
  window.delStaff=i=>{set('staff',get('staff').filter(x=>x.employeeId!==i));draw();toast('Staff deleted.')};
  window.editStaff=i=>{let a=get('staff'),x=a.find(y=>y.employeeId===i),n=prompt('Name',x.name);if(n){x.name=n;set('staff',a);draw()}};
  $('#addStaff').onclick=()=>{let n=prompt('Staff name');if(!n)return;let a=get('staff');a.push({id:id('S'),employeeId:id('STF'),name:n,password:'Staff@123',role:prompt('Role','Porter'),status:'Available'});set('staff',a);draw();toast('Staff added.')};
  attachList('#listSearch','#listPager',state,draw);
  draw();
}
function resources(t,el){
  const state={page:1};
  function draw(){
    const q=listQuery('#listSearch');
    const r=(get('resources')[t]||[]).filter(x=>textMatch(q,x.id,x.station,x.quantity,x.count));
    const pg=paginate(r,state.page);state.page=pg.page;
    $('#'+el).innerHTML='<table><tr><th>ID</th><th>Station</th><th>Quantity</th><th>Action</th></tr>'+(pg.slice.length?pg.slice.map(x=>`<tr><td>${x.id}</td><td>${x.station}</td><td>${x.quantity??x.count}</td><td><button class="btn sm" onclick="upd('${t}','${x.id}')">Update</button> <button class="btn danger sm" onclick="delres('${t}','${x.id}')">Remove</button></td></tr>`).join(''):'<tr><td colspan="4" class="muted">No records.</td></tr>')+'</table>';
    fillPager('#listPager',pg.page,pg.empty?0:pg.pages);
  }
  window.upd=(type,i)=>{let d=get('resources'),x=d[type].find(y=>y.id===i),k=type==='wheelchairs'?'quantity':'count',n=prompt('Quantity',x[k]);if(n!==null){x[k]=+n;set('resources',d);draw()}};
  window.delres=(type,i)=>{let d=get('resources');d[type]=d[type].filter(x=>x.id!==i);set('resources',d);draw()};
  $('#'+(t==='wheelchairs'?'addWheelchair':'addVehicle')).onclick=()=>{let st=prompt('Station','Mumbai Central'),n=+(prompt('Quantity','5')||0),d=get('resources');d[t].push({id:id(t==='wheelchairs'?'WC':'V'),station:st,...(t==='wheelchairs'?{quantity:n}:{count:n})});set('resources',d);draw()};
  attachList('#listSearch','#listPager',state,draw);
  draw();
}
function monitor(){
  const state={page:1};
  function staffName(id){
    if(!id)return '—';
    return (get('staff').find(y=>y.employeeId===id)||{}).name||id;
  }
  function draw(){
    const q=listQuery('#msearch'),s=$('#mservice').value;
    const a=get('bookings').filter(x=>textMatch(q,x.id,x.passenger,x.station,x.status,x.service,x.train,x.staffId)&&(!s||x.service===s));
    const pg=paginate(a,state.page);state.page=pg.page;
    const rows=pg.slice.length?pg.slice.map(x=>{
      const pick=x.pickPlatform||x.platform;
      const drop=x.dropPlatform;
      const route=pick&&drop?`Platform ${pick} → ${drop}`:pick?`Platform ${pick}`:'—';
      const when=[x.date,x.time].filter(Boolean).join(' ');
      return `<tr><td><b>${x.id}</b></td><td>${x.passenger||'—'}</td><td>${x.service||'—'}</td><td><span class="badge">${x.status||'—'}</span></td><td>${x.station||'—'}</td><td>${route}</td><td>${when||'—'}</td><td>${staffName(x.staffId)}</td><td>₹${x.fare??0}</td></tr>`;
    }).join(''):'<tr><td colspan="9" class="muted">No services.</td></tr>';
    $('#monitor').innerHTML=`<div class="table-wrap"><table><thead><tr><th>ID</th><th>Passenger</th><th>Service</th><th>Status</th><th>Station</th><th>Pick & Drop</th><th>Date</th><th>Staff</th><th>Fare</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    fillPager('#listPager',pg.page,pg.empty?0:pg.pages);
  }
  $('#mservice').onchange=()=>{state.page=1;draw()};
  attachList('#msearch','#listPager',state,draw);
  draw();
}
function waste(){
  const due=t=>t?new Date(t+24*60*60*1000).toLocaleString():'';
  const state={page:1};
  function applyReview(i,s,remark){
    let a=get('waste'),x=a.find(y=>y.id===i);
    if(!x||wasteStatus(x)!=='pending')return;
    x.status=s;x.reviewedAt=Date.now();
    if(s==='accepted'){
      x.rewardPoints=20;x.remark='';
      let p=get('passengers'),u=p.find(y=>y.id===x.passengerId);
      if(u){u.points=(u.points||0)+20;set('passengers',p)}
      toast('Accepted. 20 points credited to the reward wallet.');
    }else{x.remark=remark;toast('Submission rejected.')}
    set('waste',a);draw();
  }
  function draw(){
    const q=listQuery('#listSearch');
    const a=get('waste').filter(x=>textMatch(q,x.id,x.passenger,x.platform,x.station,wasteStatus(x)));
    const pg=paginate(a,state.page);state.page=pg.page;
    const rows=pg.slice.length?pg.slice.map(x=>{
      const st=wasteStatus(x);
      const submitted=x.submittedAt?new Date(x.submittedAt).toLocaleString():'—';
      const img=x.photo&&String(x.photo).startsWith('data:')?`<img class="waste-thumb" src="${x.photo}" alt="Waste photo">`:'<span class="muted">No image</span>';
      const action=st==='pending'?`<span class="action-pair"><button class="btn sm" onclick="reviewWaste('${x.id}','accepted')">Accept</button><button class="btn danger sm" onclick="reviewWaste('${x.id}','rejected')">Reject</button></span>`:'—';
      return `<tr><td><b>${x.id}</b></td><td>${x.passenger||'—'}</td><td>${x.platform||x.station||'—'}</td><td>${submitted}</td><td>${x.submittedAt?due(x.submittedAt):'—'}</td><td><span class="badge ${st}">${wasteStatusLabel(x)}</span></td><td>${st==='accepted'?(x.rewardPoints||20):0}</td><td>${st==='rejected'?String(x.remark||'—').replace(/[<>]/g,''):'—'}</td><td>${img}</td><td>${action}</td></tr>`;
    }).join(''):'<tr><td colspan="10" class="muted">No submissions.</td></tr>';
    $('#wreview').innerHTML=`<div class="table-wrap"><table><thead><tr><th>ID</th><th>Passenger</th><th>Platform</th><th>Submitted</th><th>Review by</th><th>Status</th><th>Points</th><th>Remark</th><th>Image</th><th>Action</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    fillPager('#listPager',pg.page,pg.empty?0:pg.pages);
  }
  window.reviewWaste=(i,s)=>{
    if(s==='rejected'){window._rejectWasteId=i;$('#rejectRemark').value='';$('#rejectModal').classList.remove('hidden');$('#rejectRemark').focus();return}
    applyReview(i,'accepted');
  };
  $('#confirmReject')?.addEventListener('click',()=>{const r=($('#rejectRemark')?.value||'').trim();if(!r)return toast('Enter a rejection remark.',true);applyReview(window._rejectWasteId,'rejected',r);$('#rejectModal').classList.add('hidden')});
  $('#closeReject')?.addEventListener('click',()=>$('#rejectModal').classList.add('hidden'));
  $('#rejectModal')?.addEventListener('click',e=>{if(e.target.id==='rejectModal')$('#rejectModal').classList.add('hidden')});
  attachList('#listSearch','#listPager',state,draw);
  draw();
}
function rewards(){
  const state={page:1};
  function draw(){
    const q=listQuery('#listSearch');
    const coupons=get('coupons',[]).filter(x=>textMatch(q,x.code,x.passenger,x.status));
    const pg=paginate(coupons,state.page);state.page=pg.page;
    const rows=pg.slice.length?pg.slice.map(x=>{
      const issued=x.createdAt?new Date(x.createdAt).toLocaleString():'—';
      const exp=typeof couponExpiry==='function'?new Date(couponExpiry(x)).toLocaleString():'—';
      return `<tr><td><b>${x.code}</b></td><td>${x.passenger||'—'}</td><td>${x.pointsRedeemed||0}</td><td>₹${x.value||0}</td><td>₹${x.remaining??x.value??0}</td><td><span class="badge ${(x.status||'').toLowerCase()}">${x.status||'Active'}</span></td><td>${issued}</td><td>${exp}</td></tr>`;
    }).join(''):'<tr><td colspan="8" class="muted">No coupons generated yet.</td></tr>';
    $('#rewards').innerHTML=`<div class="notice"><b>Discount coupon rule</b><br>Passengers redeem at 100+ points. Coupon value = points × 0.5. Coupons apply to resource prebooking or train fare.</div><div class="table-wrap"><table><thead><tr><th>Coupon</th><th>Passenger</th><th>Points</th><th>Value</th><th>Remaining</th><th>Status</th><th>Issued</th><th>Expires</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    fillPager('#listPager',pg.page,pg.empty?0:pg.pages);
  }
  attachList('#listSearch','#listPager',state,draw);
  draw();
}
function redemptions(){
  const state={page:1};
  function stamp(t){if(!t)return '—';return new Date(t).toLocaleString()}
  function field(label,value){return `<div class="details-field"><label>${label}</label><div>${value||'—'}</div></div>`}
  function usageSummary(c){
    if(!c)return field('Usage','Coupon record not found.');
    if(!c.usedFor){
      if(c.status==='Expired'||(typeof couponIsExpired==='function'&&couponIsExpired(c))) return field('Usage','Not used. Coupon expired 24 hours after generation.');
      return field('Usage','Not used yet. Still available for resource prebooking or train fare.');
    }
    if(c.usedFor==='train'){
      return field('Used for','Train fare discount')+field('Where','PNR '+(c.usedOn||'—'))+field('Used at',stamp(c.usedAt));
    }
    const b=get('bookings').find(y=>y.id===c.usedOn);
    if(!b) return field('Used for','Resource booking')+field('Booking',c.usedOn||'—')+field('Used at',stamp(c.usedAt));
    const where=[b.service,b.station,b.pickPlatform||b.dropPlatform?`Pick ${b.pickPlatform||'—'} → Drop ${b.dropPlatform||'—'}`:`Platform ${b.platform||'—'}`].filter(Boolean).join(' · ');
    return field('Used for','Resource prebooking')+field('Booking',b.id)+field('Where',where)+field('Discount applied',b.discount?`₹${b.discount} (payable ₹${b.fare})`:'—')+field('Used at',stamp(c.usedAt||b.date));
  }
  function narrative(x,c){
    const code=x.couponCode||'This coupon';
    const left=c?(c.remaining??c.value):x.couponValue;
    if(!c||!c.usedFor){
      if(c&&(c.status==='Expired'||(typeof couponIsExpired==='function'&&couponIsExpired(c)))) return `${code} was generated but never used. It expired 24 hours after generation.`;
      return `${code} has not been used yet. Remaining balance ₹${left??0}. It can be applied to resource prebooking or train fare.`;
    }
    const when=stamp(c.usedAt);
    if(c.usedFor==='train') return `${code} was used on ${when} for train fare (PNR ${c.usedOn||'—'}). Remaining ₹${left??0}.`;
    const b=get('bookings').find(y=>y.id===c.usedOn);
    if(!b) return `${code} was used on ${when} against booking ${c.usedOn||'—'}. Remaining ₹${left??0}.`;
    return `${code} was used on ${when} at ${b.station||'—'} for ${b.service||'resource'} prebooking (${b.id}). Discount ₹${b.discount||0}; remaining ₹${left??0}.`;
  }
  function draw(){
    const q=listQuery('#listSearch');
    const a=get('redemptions').filter(x=>textMatch(q,x.id,x.passenger,x.couponCode,x.status,x.rewardName));
    const pg=paginate(a,state.page);state.page=pg.page;
    const rows=pg.slice.length?pg.slice.map(x=>{
      const c=get('coupons',[]).find(y=>y.code===x.couponCode);
      const left=c?(c.remaining??c.value):x.couponValue;
      const pending=x.status==='Pending'?`<button class="btn sm" onclick="red('${x.id}','Approved')">Approve</button><button class="btn danger sm" onclick="red('${x.id}','Rejected')">Reject</button>`:'';
      return `<tr><td><b>${x.id}</b></td><td>${x.passenger||'—'}</td><td>${x.couponCode||'—'}</td><td>${x.points||0}</td><td>₹${x.couponValue??0}</td><td>₹${left??0}</td><td><span class="badge ${(x.status||'').toLowerCase()}">${x.status||'—'}</span></td><td>${x.date||(x.createdAt?new Date(x.createdAt).toLocaleDateString():'—')}</td><td><div class="action-pair">${pending}<button class="btn sm outline" onclick="viewRedemption('${x.id}')">View details</button></div></td></tr>`;
    }).join(''):'<tr><td colspan="9" class="muted">No redemptions.</td></tr>';
    $('#redemptions').innerHTML=`<div class="table-wrap"><table><thead><tr><th>ID</th><th>Passenger</th><th>Coupon</th><th>Points</th><th>Value</th><th>Remaining</th><th>Status</th><th>Date</th><th>Action</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    fillPager('#listPager',pg.page,pg.empty?0:pg.pages);
  }
  window.viewRedemption=i=>{
    const x=get('redemptions').find(y=>y.id===i);
    if(!x)return toast('Redemption not found.',true);
    const c=get('coupons',[]).find(y=>y.code===x.couponCode);
    const left=c?(c.remaining??c.value):x.couponValue;
    const exp=c&&typeof couponExpiry==='function'?couponExpiry(c):x.expiresAt;
    $('#redeemDetail').innerHTML=`<p class="notice">${narrative(x,c)}</p>`+field('Redemption ID',x.id)+field('Passenger',x.passenger)+field('Coupon',x.couponCode||'—')+field('Points redeemed',(x.points||0)+' pts × 0.5')+field('Coupon value','₹'+(x.couponValue??0))+field('Remaining','₹'+(left??0))+field('Status',c?c.status:x.status)+field('Generated',stamp(x.createdAt||(c&&c.createdAt)))+field('Expires',stamp(exp))+usageSummary(c);
    $('#redeemDetailModal').classList.remove('hidden');
  };
  window.red=(i,s)=>{let a=get('redemptions'),x=a.find(y=>y.id===i);x.status=s;if(s==='Rejected'){let p=get('passengers'),u=p.find(y=>y.id===x.passengerId);if(u)u.points+=x.points;set('passengers',p)}set('redemptions',a);draw()};
  const close=()=>$('#redeemDetailModal')?.classList.add('hidden');
  $('#closeRedeemDetail')?.addEventListener('click',close);
  $('#redeemDetailModal')?.addEventListener('click',e=>{if(e.target.id==='redeemDetailModal')close()});
  attachList('#listSearch','#listPager',state,draw);
  draw();
}
function complaints(){
  const state={page:1};
  function draw(){
    const q=listQuery('#listSearch');
    const a=get('complaints').filter(x=>textMatch(q,x.id,x.passenger,x.subject,x.status));
    const pg=paginate(a,state.page);state.page=pg.page;
    $('#adminComplaints').innerHTML=pg.slice.length?pg.slice.map(x=>`<div class="listrow"><div><b>${x.id}</b> · ${x.passenger}<br>Booking ${x.bookingId||'—'} · ${x.subject} · Rating ${x.rating}</div><span>${x.status}</span><button class="btn sm" onclick="comp('${x.id}','Resolved')">Resolve</button><button class="btn outline sm" onclick="comp('${x.id}','Closed')">Close</button></div>`).join(''):'<p class="muted">No complaints.</p>';
    fillPager('#listPager',pg.page,pg.empty?0:pg.pages);
  }
  window.comp=(i,s)=>{let a=get('complaints'),x=a.find(y=>y.id===i);x.status=s;set('complaints',a);draw()};
  attachList('#listSearch','#listPager',state,draw);
  draw();
}
function availability(){
  const state={page:1};
  function draw(){
    const r=get('resources'),q=listQuery('#listSearch');
    const stations=[...new Set([...(r.wheelchairs||[]).map(x=>x.station),...(r.vehicles||[]).map(x=>x.station)])].filter(s=>textMatch(q,s));
    const pg=paginate(stations,state.page);state.page=pg.page;
    $('#resourceAvailability').innerHTML='<table><tr><th>Station</th><th>Wheelchairs</th><th>Vehicles</th></tr>'+(pg.slice.length?pg.slice.map(s=>`<tr><td>${s}</td><td>${r.wheelchairs.find(x=>x.station===s)?.quantity||0}</td><td>${r.vehicles.find(x=>x.station===s)?.count||0}</td></tr>`).join(''):'<tr><td colspan="3" class="muted">No stations.</td></tr>')+'</table>';
    fillPager('#listPager',pg.page,pg.empty?0:pg.pages);
  }
  attachList('#listSearch','#listPager',state,draw);
  draw();
}
