import {updateApp} from './updater.js';
const status=document.getElementById('update-status'),button=document.getElementById('update-button');
async function start(){
 button.disabled=true;status.textContent='Downloading the latest app…';
 try{
  if(!('serviceWorker' in navigator))throw new Error('Use Refresh in your browser to load the latest app.');
  await updateApp(navigator.serviceWorker,location.href);
  status.textContent='Update ready. Opening Pocket Miles…';
  location.replace(new URL('./',location.href).href);
 }catch(error){status.textContent=error.message;button.disabled=false;}
}
button.addEventListener('click',start);
await start();
