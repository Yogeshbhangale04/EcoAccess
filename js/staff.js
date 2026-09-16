document.addEventListener('DOMContentLoaded',()=>{
  const u=session();
  if(!u||u.role!=='staff')return location.href='../login.html';
  initStaffI18n();
  const bs=get('bookings');
  if($('#assigned'))renderDash(u,bs);
  if($('#assignedTable'))renderAssigned(u);
  if($('#management'))renderManagement(u);
  if($('#toggle'))renderAvailability(u);
});
function tAvail(status){
  return status==='Unavailable'?t('unavailable'):t('available');
}
function renderDash(u,bs){
  const a=bs.filter(b=>b.staffId===u.employeeId||!b.staffId);
  $('#assigned').textContent=a.filter(b=>b.status!=='Completed').length;
  $('#completed').textContent=bs.filter(b=>b.staffId===u.employeeId&&b.status==='Completed').length;
  const avail=$('#availability');
  if(avail)avail.textContent=tAvail((get('staff').find(x=>x.employeeId===u.employeeId)||u).status);
}
function showDetails(bookingId){
  const b=get('bookings').find(x=>x.id===bookingId);
  if(!b)return;
  const p=get('passengers').find(x=>x.id===b.passengerId);
    const html=`<h2>${b.id}</h2>
    <div class="details-field"><label>${t('passengerName')}</label><div>${p?p.name:b.passenger}</div></div>
    <div class="details-field"><label>${t('mobileNumber')}</label><div>${p?formatIndianMobile(p.mobile):t('na')}</div></div>
    <div class="details-field"><label>${t('serviceType')}</label><div>${tService(b.service)}</div></div>
    <div class="details-field"><label>${t('station')}</label><div>${b.station}</div></div>
    <div class="details-field"><label>${t('pickPlatform')}</label><div>${bookingPick(b)||t('na')}</div></div>
    <div class="details-field"><label>${t('dropPlatform')}</label><div>${bookingDrop(b)||t('na')}</div></div>
    <div class="details-field"><label>${t('trainNumber')}</label><div>${b.train}</div></div>
    <div class="details-field"><label>${t('dateTime')}</label><div>${b.date} ${t('at')} ${b.time}</div></div>
    <div class="details-field"><label>${t('fare')}</label><div>₹${b.fare}</div></div>
    <div class="details-field"><label>${t('status')}</label><div><span class="badge">${tStatus(b.status)}</span></div></div>`;
  $('#detailsInfo').innerHTML=html;
  $('#detailsPanel').classList.add('show');
  $('#detailsPanel').style.display='block';
}
window.showDetails=showDetails;
function closeDetails(){
  $('#detailsPanel').classList.remove('show');
  $('#detailsPanel').style.display='none';
}
window.closeDetails=closeDetails;
function serviceFilterMatch(service,filter){
  if(!filter)return true;
  const s=String(service||'').toLowerCase();
  if(filter==='Vehicle')return s.includes('vehicle');
  return s===filter.toLowerCase();
}
function renderAssigned(u){
  const state={page:1};
  function draw(){
    const q=listQuery('#ssearch'),f=$('#sfilter').value,svc=$('#svcfilter')?.value||'';
    const a=get('bookings').filter(b=>(!b.staffId||b.staffId===u.employeeId)&&textMatch(q,b.id,b.passenger,b.service,b.station)&&(!f||b.status===f)&&serviceFilterMatch(b.service,svc));
    const pg=paginate(a,state.page);state.page=pg.page;
    $('#assignedTable').innerHTML=pg.slice.length?pg.slice.map(b=>`<div class="listrow"><div><b>${b.id}</b> · ${b.passenger}<br>${tService(b.service)} · ${b.station} · ${b.date}<br><span class="muted">${t('pickPlatform')} ${bookingPick(b)||'—'} → ${t('dropPlatform')} ${bookingDrop(b)||'—'}</span></div><span class="badge">${tStatus(b.status)}</span><div class="act-btns">${b.status==='Booked'||b.status==='Assigned'?`<button type="button" class="act-icon tick" title="${t('accept')}" aria-label="${t('accept')}" onclick="staffChange('${b.id}','Accepted')">✓</button><button type="button" class="act-icon cross" title="${t('reject')}" aria-label="${t('reject')}" onclick="staffChange('${b.id}','Rejected')">✕</button>`:''}<button class="btn outline sm" onclick="showDetails('${b.id}')">${t('details')}</button></div></div>`).join(''):`<p class="muted">${t('noBookings')}</p>`;
    staffFillPager('#listPager',pg.page,pg.empty?0:pg.pages);
  }
  $('#sfilter').onchange=()=>{state.page=1;draw()};
  $('#svcfilter')?.addEventListener('change',()=>{state.page=1;draw()});
  attachList('#ssearch','#listPager',state,draw);
  draw();
}
function staffMember(u){
  const list=get('staff',[]);
  if(!u)return null;
  return list.find(x=>x.employeeId&&x.employeeId===u.employeeId)||null;
}
function staffIsAvailable(u){
  const m=staffMember(u);
  return !!m&&String(m.status||'Available').toLowerCase()==='available';
}
function requireStaffAvailable(){
  if(staffIsAvailable(session()))return true;
  toast(t('toast_need_available'),true);
  return false;
}
function staffChange(i,s){
  if(s!=='Rejected'&&!requireStaffAvailable())return;
  const a=get('bookings'),b=a.find(x=>x.id===i),u=session();
  if(!b)return;
  b.status=s;
  if(s==='Accepted')b.staffId=u.employeeId;
  if(s==='Rejected')b.staffId=b.staffId||u.employeeId;
  set('bookings',a);
  toast(t('toast_booking_updated'));
  setTimeout(()=>location.reload(),300);
}
window.staffChange=staffChange;
function renderManagement(u){
  const state={page:1};
  const order=['Accepted','Reached Passenger','Service Started','Completed'];
  function draw(){
    const q=listQuery('#listSearch');
    const a=get('bookings').filter(b=>b.staffId===u.employeeId&&textMatch(q,b.id,b.passenger,b.service,b.status));
    const pg=paginate(a,state.page);state.page=pg.page;
    $('#management').innerHTML=pg.slice.length?pg.slice.map(b=>{
      const i=order.indexOf(b.status),next=order[i+1];
      return `<div class="listrow"><div><b>${b.id}</b><br>${b.passenger} · ${tService(b.service)}</div><span class="badge">${tStatus(b.status)}</span>${next?`<button class="btn sm" onclick="staffChange('${b.id}','${next}')">${t('mark')} ${tStatus(next)}</button>`:''}</div>`;
    }).join(''):`<p class="muted">${t('noAccepted')}</p>`;
    staffFillPager('#listPager',pg.page,pg.empty?0:pg.pages);
  }
  attachList('#listSearch','#listPager',state,draw);
  draw();
}
function renderAvailability(u){
  const s=get('staff'),m=s.find(x=>x.employeeId===u.employeeId);
  if(!m)return;
  $('#astatus').textContent=tAvail(m.status);
  $('#toggle').textContent=String(m.status||'')==='Available'?t('setUnavailable'):t('setAvailable');
  $('#toggle').onclick=()=>{
    m.status=String(m.status||'')==='Available'?'Unavailable':'Available';
    set('staff',s);
    const sess=session()||{};
    sess.status=m.status;
    set('session',sess);
    toast(t('toast_availability_updated'));
    renderAvailability(u);
  };
}
