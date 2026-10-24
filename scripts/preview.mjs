// Local development only. Does not use Streetbot, Telegram, or MongoDB.
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {WALLET_DEFAULTS} from '../public/recommend.js';
import {validateNotebook} from '../public/merchants.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const publicDir=path.join(root,'public'),dataDir=path.join(root,'data');
await mkdir(dataDir,{recursive:true});
const file=path.join(dataDir,'preview.json');
let notebook={data:{version:1,merchants:[],settings:WALLET_DEFAULTS},revision:0};
try{notebook=JSON.parse(await readFile(file,'utf8'));validateNotebook(notebook.data);}catch(e){if(e.code!=='ENOENT')throw e;}
const port=Number(process.env.PORT||8741),origin='http://127.0.0.1:'+port;
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
let writing=false;
const server=createServer(async(req,res)=>{
 const json=(data,status=200)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
 try{
  if(req.headers.host!==new URL(origin).host)return json({error:'Invalid host'},403);
  const pathname=new URL(req.url,origin).pathname;
  if(pathname==='/pocket-miles/notebook'){
   if(req.method==='GET')return json(notebook);
   if(req.method!=='PUT')return json({error:'Method not allowed'},405);
   if(req.headers.origin!==origin)return json({error:'Open the preview directly to save'},403);
   let body='';for await(const chunk of req){body+=chunk;if(body.length>700000)return json({error:'Too large'},413);}
   const input=JSON.parse(body),data=validateNotebook(input.data);
   if(writing||input.revision!==notebook.revision)return json({error:'Another device saved changes. Refresh first.'},409);
   writing=true;
   try{const next={data,revision:notebook.revision+1};await writeFile(file,JSON.stringify(next));notebook=next;}finally{writing=false;}
   return json(notebook);
  }
  if(!['GET','HEAD'].includes(req.method))return json({error:'Method not allowed'},405);
  if(pathname==='/'){res.writeHead(302,{Location:'/pocket-miles/'});return res.end();}
  const name=pathname==='/pocket-miles/'?'index.html':pathname.slice('/pocket-miles/'.length);
  if(!pathname.startsWith('/pocket-miles/')||!/^[\w.-]+$/.test(name)||!types[path.extname(name)])return json({error:'Not found'},404);
  const content=await readFile(path.join(publicDir,name));
  res.writeHead(200,{'Content-Type':types[path.extname(name)],'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:content);
 }catch(e){json({error:e.code==='ENOENT'?'Not found':'Invalid request'},e.code==='ENOENT'?404:400);}
});
server.listen(port,'127.0.0.1',()=>console.log('Local preview: '+origin+'/pocket-miles/'));
