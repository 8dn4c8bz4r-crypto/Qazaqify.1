const API="https://discoveryprovider.audius.co/v1";
const APP="qazaqify_mobile";
const $=id=>document.getElementById(id);
const audio=$("audio");
let tracks=[],queue=[],index=-1,mode="trending",favorites=new Set(JSON.parse(localStorage.getItem("qz-favs")||"[]")),deferredInstall=null;
function toast(t){$("toast").textContent=t;$("toast").style.display="block";setTimeout(()=>$("toast").style.display="none",2600)}
function time(v){return isFinite(v)?`${Math.floor(v/60)}:${String(Math.floor(v%60)).padStart(2,"0")}`:"0:00"}
function artwork(t){return t.artwork?.["150x150"]||t.artwork?.["480x480"]||""}
function stream(t){return `${API}/tracks/${t.id}/stream?app_name=${APP}`}
async function api(path){const r=await fetch(`${API}${path}${path.includes("?")?"&":"?"}app_name=${APP}`);if(!r.ok)throw Error("Каталогқа қосылу мүмкін болмады");const j=await r.json();return j.data||[]}
function safeText(v){return String(v||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function draw(){
 const q=$("search").value.trim().toLowerCase();
 const shown=queue.filter(t=>(mode!=="favorites"||favorites.has(t.id))&&(!q||(`${t.title} ${t.user?.name||""}`).toLowerCase().includes(q)));
 $("heading").textContent=mode==="favorites"?"Ұнаған әндер":mode==="new"?"Жаңа әндер":"Тыңдауға ұсынылады";
 $("list").innerHTML="";
 if(!shown.length){$("list").innerHTML='<div class="empty">Ән табылмады. Іздеуді өзгертіп көр немесе басқа бөлімді таңда.</div>';return}
 shown.forEach(t=>{
  const row=document.createElement("div");row.className="track";
  const img=document.createElement("img");img.className="cover";img.alt="";img.src=artwork(t);img.onerror=()=>{img.style.display="none"};
  const info=document.createElement("div");info.className="trackinfo";
  info.innerHTML=`<b>${safeText(t.title)}</b><small>${safeText(t.user?.name||"Тәуелсіз орындаушы")}</small>`;
  const heart=document.createElement("button");heart.className="plain heart"+(favorites.has(t.id)?" on":"");heart.textContent=favorites.has(t.id)?"♥":"♡";
  heart.onclick=()=>favorite(t);
  const play=document.createElement("button");play.className="plain";play.textContent=currentId()===t.id&&!audio.paused?"Ⅱ":"▶";
  play.onclick=()=>playTrack(t);
  row.append(img,info,heart,play);row.onclick=e=>{if(e.target!==heart&&e.target!==play)playTrack(t)};
  $("list").append(row);
 });
}
function currentId(){return index>=0&&tracks[index]?tracks[index].id:null}
function favorite(t){if(favorites.has(t.id))favorites.delete(t.id);else favorites.add(t.id);localStorage.setItem("qz-favs",JSON.stringify([...favorites]));draw();playerHeart()}
function playerHeart(){if(index<0)return;const yes=favorites.has(tracks[index].id);$("like").textContent=yes?"♥":"♡";$("like").classList.toggle("on",yes)}
function playTrack(t){
 tracks=queue.length?queue:tracks;
 let i=tracks.findIndex(x=>x.id===t.id);if(i<0){tracks=[t];i=0}index=i;
 audio.src=stream(t);$("title").textContent=t.title;$("artist").textContent=t.user?.name||"Тәуелсіз орындаушы";
 $("mini").src=artwork(t);playerHeart();
 audio.play().then(()=>draw()).catch(()=>toast("Бұл ән қазір ойнатылмады. Басқа әнді байқап көр."));
}
function move(n){if(!tracks.length)return;index=(index+n+tracks.length)%tracks.length;playTrack(tracks[index])}
async function load(path,kind){
 $("list").innerHTML='<div class="empty">Әндер жүктеліп жатыр…</div>';
 try{queue=await api(path);tracks=queue;mode=kind;draw()}
 catch(e){$("list").innerHTML='<div class="empty">Музыка каталогына қосыла алмадық. Интернетті тексеріп, бетті жаңарт.</div>'}
}
document.querySelectorAll("[data-mode]").forEach(b=>b.onclick=()=>{
 document.querySelectorAll("[data-mode]").forEach(x=>x.classList.toggle("active",x===b));
 const m=b.dataset.mode;
 if(m==="favorites"){mode=m;draw()}else if(m==="new")load("/tracks?sort=recent&limit=25","new");else load("/tracks?sort=popular&limit=25","trending");
});
$("search").addEventListener("keydown",async e=>{if(e.key==="Enter"){const q=$("search").value.trim();if(!q)return;try{queue=await api(`/tracks/search?query=${encodeURIComponent(q)}&limit=30`);tracks=queue;mode="search";draw()}catch{toast("Іздеу уақытша істемейді")}}});
$("search").addEventListener("input",()=>{if(!$("search").value)draw()});
$("toggle").onclick=()=>{if(!audio.src){if(queue[0])playTrack(queue[0]);return}if(audio.paused)audio.play().catch(()=>toast("Әнді ойнату мүмкін болмады"));else audio.pause()};
$("prev").onclick=()=>move(-1);$("next").onclick=()=>move(1);$("like").onclick=()=>{if(index>=0)favorite(tracks[index])};
audio.onplay=()=>{$("toggle").textContent="Ⅱ";draw()};audio.onpause=()=>{$("toggle").textContent="▶";draw()};audio.onended=()=>move(1);
audio.ontimeupdate=()=>{$("elapsed").textContent=time(audio.currentTime);$("total").textContent=time(audio.duration);$("seek").value=audio.duration?audio.currentTime/audio.duration*100:0};
$("seek").oninput=()=>{if(audio.duration)audio.currentTime=audio.duration*Number($("seek").value)/100};
load("/tracks?sort=popular&limit=25","trending");
if("serviceWorker"in navigator&&location.protocol.startsWith("http"))navigator.serviceWorker.register("./sw.js").catch(()=>{});
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredInstall=e;$("install").hidden=false});
$("install").onclick=async()=>{if(deferredInstall){deferredInstall.prompt();await deferredInstall.userChoice;deferredInstall=null;$("install").hidden=true}else toast("iPhone: Safari → Бөлісу → Home Screen-ге қосу")};
