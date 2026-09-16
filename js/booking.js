document.addEventListener('DOMContentLoaded',()=>{let u=requireJourney();if(!u)return;if($('#next1'))initBooking();if($('#track'))initTracking()});function show(n){for(let i=1;i<=5;i++)$('#step'+i)?.classList.toggle('hidden',i!==n)}function initBooking(){let service='',base=0,j=journeyValidation();if(j){$('#pnr').value=j.pnr;$('#train').value=j.train;$('#date').value=j.date;$('#station').value=j.station;$('#platform').value=j.platform} $('#next1').onclick=()=>{if(!/^\d{10}$/.test($('#pnr').value.trim()))return toast('Enter a valid 10-digit PNR.');if(!$('#train').value||!$('#date').value)return toast('Enter train and journey date.');show(2)};$$('.choice').forEach(b=>b.onclick=()=>{$$('.choice').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');service=b.dataset.service;base={Porter:150,Wheelchair:100,'Inter Vehicle':180}[service]});$('#next2').onclick=()=>{if(!service)return toast('Select a service.');$('#avail').textContent=`✓ ${service} is available at ${$('#station').value}.`;show(3)};$('#next3').onclick=()=>{$('#base').textContent='₹'+base;$('#tax').textContent='₹'+Math.round(base*.05);$('#total').textContent='₹'+(base+Math.round(base*.05));show(4)};$('#next4').onclick=()=>show(5);$('#pay').onclick=()=>{let u=session(),b={id:id('BK-'),passengerId:u.id,passenger:u.name,service,station:$('#station').value,platform:$('#platform').value,date:$('#date').value,time:'10:30',fare:base+Math.round(base*.05),status:'Booked',staffId:'',train:$('#train').value};let a=get('bookings');a.push(b);set('bookings',a);for(let i=1;i<=5;i++)$('#step'+i).classList.add('hidden');$('#done').classList.remove('hidden');$('#bookingId').textContent=b.id;$('#summary').textContent=`${service} · ${b.station} · Platform ${b.platform} · ₹${b.fare}`;toast('Booking created.')}}function initTracking(){
  const state={page:1};
  const order=['Booked','Assigned','Accepted','Reached Passenger','Service Started','Completed'];
  function showBooking(b){
    $('#result').classList.remove('hidden');
    const ci=order.indexOf(b.status);
    $('#timeline').innerHTML=order.map((s,i)=>`<p class="${i<=ci?'done':''}"><b>${i<=ci?'✓':'○'} ${s}</b></p>`).join('');
    $('#details').innerHTML=`<p><b>Booking:</b> ${b.id}</p><p><b>Passenger:</b> ${b.passenger}</p><p><b>Number of Passenger:</b> ${b.passengerCount||1}</p><p><b>Service:</b> ${b.service}</p><p><b>Train:</b> ${b.train}</p><p><b>Station:</b> ${b.station}</p><p><b>Pick & Drop:</b> Platform ${b.pickPlatform||b.platform} → Platform ${b.dropPlatform||'—'}</p><p><b>Fare:</b> ₹${b.fare}${b.discount?` (₹${b.discount} off with ${b.couponCode})`:''}</p>`;
  }
  function draw(){
    const u=session(),q=listQuery('#search');
    const a=get('bookings').filter(x=>x.passengerId===u.id&&textMatch(q,x.id,x.service,x.status,x.station));
    const pg=paginate(a,state.page);state.page=pg.page;
    $('#bookingList').innerHTML=pg.slice.length?pg.slice.map(b=>`<div class="listrow"><div><b>${b.id}</b> · ${b.service} · ${b.date}<br><span class="badge">${b.status}</span></div><button type="button" class="btn sm" data-track="${b.id}">View</button></div>`).join(''):'<p class="muted">No bookings.</p>';
    fillPager('#listPager',pg.page,pg.empty?0:pg.pages);
  }
  $('#track').onclick=()=>{
    const u=session(),q=$('#search').value.trim().toLowerCase(),b=get('bookings').find(x=>x.id.toLowerCase()===q&&x.passengerId===u.id);
    if(!b)return toast('Booking not found.');
    showBooking(b);
  };
  $('#bookingList')?.addEventListener('click',e=>{
    const btn=e.target.closest('[data-track]');
    if(!btn)return;
    const b=get('bookings').find(x=>x.id===btn.dataset.track);
    if(b)showBooking(b);
  });
  attachList('#search','#listPager',state,draw);
  draw();
}
