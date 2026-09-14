const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];function get(k,d=[]){try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}}function set(k,v){localStorage.setItem(k,JSON.stringify(v))}function id(p){return p+Date.now().toString().slice(-7)}function toast(m){let x=$('#toast');if(x){x.textContent=m;x.className='toast';setTimeout(()=>x.className='',3000)}}function session(){return get('session',null)}function logout(){localStorage.removeItem('session');location.href='../index.html'}
function journeyValidation(){let u=session();if(!u||u.role!=='passenger')return null;return get('journeyValidations',[]).find(x=>x.passengerId===u.id&&x.valid===true)||null}
function requireJourney(){let u=session();if(!u||u.role!=='passenger'){location.href='../login.html';return null}if(!journeyValidation()){toast('Please validate your journey before booking a service or uploading waste proof.');setTimeout(()=>location.href='journey-validation.html',450);return null}return u}function seed(){if(get('seeded',false))return;set('passengers',[{id:'P1001',name:'Rahul Sharma',mobile:'9876543210',email:'rahul@example.com',password:'Passenger@123',points:320},{id:'P1002',name:'Anita Patil',mobile:'9988776655',email:'anita@example.com',password:'Passenger@123',points:180}]);set('staff',[{id:'STF1001',employeeId:'STF1001',name:'Priya Joshi',password:'Staff@123',role:'Porter',status:'Available'},{id:'STF1002',employeeId:'STF1002',name:'Amit Verma',password:'Staff@123',role:'Wheelchair',status:'Available'}]);set('bookings',[{id:'BK-240101',passengerId:'P1001',passenger:'Rahul Sharma',service:'Wheelchair',station:'Mumbai Central',platform:'4',date:'2026-09-15',time:'10:30',fare:105,status:'Assigned',staffId:'STF1002',train:'12951'},{id:'BK-240102',passengerId:'P1002',passenger:'Anita Patil',service:'Porter',station:'Thane',platform:'2',date:'2026-09-16',time:'16:00',fare:158,status:'Booked',staffId:'',train:'11010'}]);set('waste',[]);set('complaints',[]);set('redemptions',[]);set('rewards',[{id:'R1',name:'Free Tea Coupon',points:100,description:'Free tea coupon'},{id:'R2',name:'Waiting Room Access',points:250,description:'Waiting room access'},{id:'R3',name:'Discount Voucher',points:400,description:'₹100 discount voucher'}]);set('resources',{wheelchairs:[{id:'WC1',station:'Mumbai Central',quantity:8},{id:'WC2',station:'Thane',quantity:6}],vehicles:[{id:'V1',station:'Mumbai Central',count:6},{id:'V2',station:'Thane',count:5}]});set('seeded',true)}seed();
// Always make sure demo accounts exist, even if LocalStorage was created by an older project version.
(function ensureDemoAccounts(){
  const passengers=get('passengers',[]), staff=get('staff',[]);
  if(!passengers.some(x=>x.mobile==='9876543210')) passengers.push({id:'P1001',name:'Rahul Sharma',mobile:'9876543210',email:'rahul@example.com',password:'Passenger@123',points:320});
  if(!staff.some(x=>x.employeeId==='STF1001')) staff.push({id:'STF1001',employeeId:'STF1001',name:'Priya Joshi',password:'Staff@123',role:'Porter',status:'Available'});
  if(!staff.some(x=>x.employeeId==='STF1002')) staff.push({id:'STF1002',employeeId:'STF1002',name:'Amit Verma',password:'Staff@123',role:'Wheelchair',status:'Available'});
  // Repair the demo password if it was changed/corrupted in an earlier local run.
  const demo=staff.find(x=>x.employeeId==='STF1001'); if(demo){demo.password='Staff@123';demo.role=demo.role||'Porter';demo.status=demo.status||'Available';}
  set('passengers',passengers);set('staff',staff);
})();
document.addEventListener('DOMContentLoaded',()=>{$('[data-logout]')?.addEventListener('click',logout);$('#menu')?.addEventListener('click',()=>document.querySelector('aside')?.classList.toggle('open'));if(session()&&$('#user'))$('#user').textContent=session().name||'User';if($('#loginForm'))initLogin();if($('#registerForm'))initRegister()});function initLogin(){
  let role='passenger';
  const roleButtons=$$('[data-role]');
  roleButtons.forEach(b=>b.onclick=()=>{
    role=(b.dataset.role||'passenger').toLowerCase();
    roleButtons.forEach(x=>x.classList.toggle('active',x===b));
    $('#idLabel').firstChild.textContent=role==='passenger'?'Mobile Number':role==='staff'?'Employee ID':'Email';
    $('#identity').placeholder=role==='passenger'?'9876543210':role==='staff'?'STF1001':'admin@railease.demo';
    $('#demo').textContent=role==='passenger'?'Passenger: 9876543210 / Passenger@123':role==='staff'?'Staff: STF1001 / Staff@123':'Admin: admin@railease.demo / Admin@123';
  });
  $('#loginForm').onsubmit=e=>{
    e.preventDefault();
    const a=$('#identity').value.trim(),p=$('#password').value;
    let u=null;
    if(role==='passenger') u=get('passengers',[]).find(x=>x.mobile===a&&x.password===p);
    if(role==='staff') u=get('staff',[]).find(x=>x.employeeId.toUpperCase()===a.toUpperCase()&&x.password===p);
    if(role==='admin'&&a.toLowerCase()==='admin@railease.demo'&&p==='Admin@123') u={id:'ADM1',name:'Administrator'};
    if(!u){toast(role==='staff'?'Staff login failed. Use Employee ID STF1001 and password Staff@123.':'Invalid credentials.');return}
    set('session',{...u,role});
    location.href=role==='passenger'?'passenger/dashboard.html':role==='staff'?'staff/dashboard.html':'admin/dashboard.html';
  }
}
function initRegister(){$('#registerForm').onsubmit=e=>{e.preventDefault();let m=$('#mobile').value.trim(),p=$('#pw').value;if(!/^\d{10}$/.test(m))return toast('Mobile must be exactly 10 digits.');if(!/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).{8,}$/.test(p))return toast('Password needs 8+ chars, upper, lower and number.');if(p!==$('#cpw').value)return toast('Passwords do not match.');if(get('passengers').some(x=>x.mobile===m))return toast('Mobile already registered.');set('pending',{id:id('P'),name:$('#name').value,mobile:m,email:$('#email').value,password:p,points:0});$('#otp').classList.remove('hidden')};$('#verify').onclick=()=>{if($('#otpInput').value!=='123456')return toast('Use demo OTP 123456.');let u=get('pending');let a=get('passengers');a.push(u);set('passengers',a);set('session',{role:'passenger',...u});localStorage.removeItem('pending');location.href='passenger/dashboard.html'}}
