const form=document.getElementById('login-form'),error=document.getElementById('login-error');
form.addEventListener('submit',async e=>{
  e.preventDefault();
  error.textContent='';
  const button=form.querySelector('button');button.disabled=true;
  try{
    const response=await fetch('/api/admin/login',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json','x-requested-with':'fetch'},body:JSON.stringify({password:form.password.value})});
    if(response.ok){location.replace('/admin/');return;}
    const data=await response.json().catch(()=>({}));
    error.textContent=response.status===401?'Wrong password.':(data.message||`HTTP ${response.status}`);
  }catch{error.textContent='Could not reach the server.';}
  button.disabled=false;
});
