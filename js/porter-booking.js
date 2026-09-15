window.initBooking=function(){
  let service='',base=0,j=journeyValidation();
  if(j){$('#pnr').value=j.pnr;$('#train').value=j.train;$('#date').value=j.date;$('#station').value=j.station;$('#platform').value=j.platform}
  function gross(){return base+Math.round(base*.05)}
  function selectedCoupon(){
    const cid=$('#couponSelect')?.value;
    return usableCoupons(session().id).find(x=>x.id===cid)||null;
  }
  function discountFor(total){
    const c=selectedCoupon();
    if(!c)return 0;
    return Math.min(Number(c.remaining??c.value)||0,total);
  }
  function fillCoupons(){
    const sel=$('#couponSelect'),box=$('#couponBox');
    if(!sel)return;
    const list=usableCoupons(session().id);
    const exp=typeof couponExpiry==='function'?c=>new Date(couponExpiry(c)).toLocaleString():()=>'';
    sel.innerHTML='<option value="">No coupon</option>'+list.map(c=>`<option value="${c.id}">${c.code} · ₹${c.remaining??c.value} off${typeof couponExpiry==='function'?` · expires ${exp(c)}`:''}</option>`).join('');
    if(box) box.classList.toggle('hidden',false);
    sel.onchange=renderFare;
  }
  function renderFare(){
    const tax=Math.round(base*.05),g=base+tax,disc=discountFor(g),pay=Math.max(0,g-disc);
    $('#base').textContent='₹'+base;
    $('#tax').textContent='₹'+tax;
    if($('#discount')) $('#discount').textContent='₹'+disc;
    $('#total').textContent='₹'+pay;
    const payBtn=$('#pay');
    if(payBtn) payBtn.textContent=pay?`Pay ₹${pay} & Generate Booking ID`:'Confirm Booking (₹0)';
  }
  function availableVehicles(station){
    const stock=Number((get('resources').vehicles||[]).find(x=>x.station===station)?.count||0);
    const used=get('bookings').filter(x=>x.service==='Inter Vehicle'&&x.station===station&&x.status!=='Completed').length;
    return Math.max(0,stock-used);
  }
  function availableWheelchairs(station){
    const stock=Number((get('resources').wheelchairs||[]).find(x=>x.station===station)?.quantity||0);
    const used=get('bookings').filter(x=>x.service==='Wheelchair'&&x.station===station&&x.status!=='Completed').length;
    return Math.max(0,stock-used);
  }
  function availablePorters(){
    return get('staff',[]).filter(x=>String(x.role||'').toLowerCase()==='porter'&&x.status==='Available').length;
  }
  function showAvailability(){
    const station=$('#station').value,vehicles=availableVehicles(station);
    let extra='';
    if(service==='Wheelchair') extra=`<br>Number of available Wheelchairs: <b>${availableWheelchairs(station)}</b>`;
    if(service==='Porter') extra=`<br>Number of available Porters: <b>${availablePorters()}</b>`;
    $('#avail').innerHTML=`✓ ${service} is available at ${station}.<br>Number of available Vehicles: <b>${vehicles}</b>${extra}`;
    const pick=$('#pickPlatform'),drop=$('#dropPlatform');
    if(pick) pick.value=$('#platform').value||'1';
    if(drop) drop.value=pick&&pick.value==='1'?'2':'1';
  }
  $('#next1').onclick=()=>{if(!/^\d{10}$/.test($('#pnr').value.trim()))return toast('Enter a valid 10-digit PNR.');if(!$('#train').value||!$('#date').value)return toast('Enter train and journey date.');show(2)};
  $$('.choice').forEach(b=>b.onclick=()=>{$$('.choice').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');service=b.dataset.service;$('#porterDetails').classList.toggle('hidden',service!=='Porter');base={Porter:150,Wheelchair:100,'Inter Vehicle':180}[service]});
  $('#next2').onclick=()=>{
    if(!service)return toast('Select a service.');
    if(service==='Porter'){
      let bags=Number($('#porterBags').value),rate=Number($('#porterWeight').value);
      if(!Number.isInteger(bags)||bags<1||bags>20)return toast('Enter between 1 and 20 bags.');
      base=rate*bags;
    }
    showAvailability();
    show(3);
  };
  $('#next3').onclick=()=>{
    const count=Number($('#passengerCount').value),pick=$('#pickPlatform').value,drop=$('#dropPlatform').value,station=$('#station').value;
    if(!Number.isInteger(count)||count<1||count>8)return toast('Enter between 1 and 8 passengers.');
    if(!pick||!drop)return toast('Select pick and drop platforms.');
    if(pick===drop)return toast('Pick and drop platforms must be different.');
    if(service==='Inter Vehicle'&&availableVehicles(station)<1)return toast('No vehicles are available at this station.',true);
    if(service==='Wheelchair'&&availableWheelchairs(station)<1)return toast('No wheelchairs are available at this station.',true);
    fillCoupons();renderFare();show(4);
  };
  $('#next4').onclick=()=>show(5);
  $('#pay').onclick=()=>{
    let u=session(),bags=service==='Porter'?Number($('#porterBags').value):0,weightRange=service==='Porter'?$('#porterWeight').selectedOptions[0].textContent:'';
    const g=gross(),c=selectedCoupon(),disc=discountFor(g),pay=Math.max(0,g-disc);
    let b={id:id('BK-'),passengerId:u.id,passenger:u.name,service,station:$('#station').value,platform:$('#platform').value,date:$('#date').value,time:'10:30',fare:pay,grossFare:g,discount:disc,couponCode:c?c.code:'',status:'Booked',staffId:'',train:$('#train').value,bags,weightRange,passengerCount:Number($('#passengerCount').value)||1,pickPlatform:$('#pickPlatform').value,dropPlatform:$('#dropPlatform').value};
    if(c&&disc>0) spendCoupon(c.id,disc,'booking',b.id);
    let a=get('bookings');a.push(b);set('bookings',a);
    for(let i=1;i<=5;i++)$('#step'+i).classList.add('hidden');
    $('#done').classList.remove('hidden');
    $('#bookingId').textContent=b.id;
    toast('Booking created.');
  };
};
