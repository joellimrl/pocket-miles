// Refresh only the app shell. Never touch credentials, IndexedDB or notebook data.
export async function updateApp(serviceWorker,baseUrl){
 const base=new URL('./',baseUrl);
 const registration=await serviceWorker.register(new URL('sw.js',base).href,{scope:base.href,updateViaCache:'none'});
 await registration.update();
 const worker=registration.installing||registration.waiting;
 if(!worker){
  if(registration.active?.state==='activated')return;
  throw new Error('The app update is not ready. Please try again.');
 }
 await new Promise((resolve,reject)=>{
  const cleanup=()=>{clearTimeout(timer);worker.removeEventListener('statechange',check);};
  const check=()=>{
   if(worker.state==='installed')worker.postMessage({type:'SKIP_WAITING'});
   if(worker.state==='activated'){cleanup();resolve();}
   if(worker.state==='redundant'){cleanup();reject(new Error('The update could not finish. Please try again.'));}
  };
  const timer=setTimeout(()=>{cleanup();reject(new Error('The update is taking too long. Check your connection and try again.'));},30000);
  worker.addEventListener('statechange',check);check();
 });
}
