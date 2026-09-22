const galleryCopy = {
  vi:{image:'Ảnh',video:'Video',placeholder:'Hình minh họa tạm',previous:'Trước',next:'Tiếp',gallery:'Ảnh và video',error:'Không thể tải nội dung này.',download:'Mở video',detail:'Chi tiết'},
  en:{image:'Photo',video:'Video',placeholder:'Placeholder illustration',previous:'Previous',next:'Next',gallery:'Photos and videos',error:'This media could not be loaded.',download:'Open video',detail:'Detail'},
  zh:{image:'照片',video:'视频',placeholder:'临时示意图',previous:'上一项',next:'下一项',gallery:'照片与视频',error:'无法加载此内容。',download:'打开视频',detail:'细节'},
  ja:{image:'写真',video:'動画',placeholder:'仮画像・イメージ',previous:'前へ',next:'次へ',gallery:'写真・動画',error:'このメディアを読み込めませんでした。',download:'動画を開く',detail:'ディテール'}
};
let mediaIndex=0;
function escapeMarkup(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
const videoTypes={'.mp4':'video/mp4','.webm':'video/webm','.mov':'video/quicktime'};
function videoType(src){return videoTypes[(src.match(/\.[a-z0-9]+$/i)||[''])[0].toLowerCase()]||'';}
function mediaItems(product){const media=[...(product.images||[]).map(src=>({type:'image',src})),...(product.videos||[]).map(src=>({type:'video',src,poster:product.posters?.[src]}))];return media.length?media:[{type:'placeholder'}];}
// The build writes smaller copies for the grid and the strip; without them the full image is served.
function sized(product,src,size){return src&&product.variants?.[src]?.[size]||src;}
function placeholderArt(product,item){const svg=artwork({color:'#b3aa9a',bg:'#ebe6dc',...product});return item.detail?svg.replace('viewBox="0 0 326 510"','viewBox="105 65 110 175"'):svg;}
function mediaCover(product){const first=mediaItems(product)[0];if(first.type==='image')return `<img src="${escapeMarkup(sized(product,first.src,'card'))}" alt="" loading="lazy">`;if(first.type==='video')return first.poster?`<img src="${escapeMarkup(sized(product,first.poster,'card'))}" alt="" loading="lazy"><span class="cover-play" aria-hidden="true">▶</span>`:'<span class="video-cover" aria-hidden="true">▶</span>';return placeholderArt(product,first);}
function stopGalleryVideo(){document.querySelector('#gallery-stage video')?.pause();}
function renderGallery(reset=false){
  stopGalleryVideo();
  if(reset)mediaIndex=0;
  const items=mediaItems(selected),t=galleryCopy[language];
  mediaIndex=Math.max(0,Math.min(mediaIndex,items.length-1));
  document.getElementById('dialog-art').innerHTML=`<div id="gallery-stage" class="gallery-stage"></div><div class="gallery-navigation"><button type="button" id="media-previous" aria-label="${t.previous}">←</button><span id="media-status" aria-live="polite"></span><button type="button" id="media-next" aria-label="${t.next}">→</button></div><div id="media-thumbnails" class="media-thumbnails" role="group" aria-label="${t.gallery}">${items.map((item,i)=>`<button type="button" data-media-index="${i}" aria-label="${item.type==='placeholder'?t.placeholder:t[item.type]} ${i+1}${item.detail?' · '+t.detail:''}" aria-pressed="false">${item.type==='placeholder'?placeholderArt(selected,item):item.type==='image'?`<img src="${escapeMarkup(sized(selected,item.src,'thumb'))}" alt="" loading="lazy">`:item.poster?`<img src="${escapeMarkup(sized(selected,item.poster,'thumb'))}" alt="" loading="lazy"><span class="thumbnail-play" aria-hidden="true">▶</span>`:'<span class="thumbnail-play" aria-hidden="true">▶</span>'}<span class="thumbnail-number">${i+1}</span></button>`).join('')}</div>`;
  document.getElementById('media-thumbnails').addEventListener('click',e=>{const button=e.target.closest('[data-media-index]');if(button)showMedia(Number(button.dataset.mediaIndex));});
  document.getElementById('media-previous').addEventListener('click',()=>showMedia(mediaIndex-1));
  document.getElementById('media-next').addEventListener('click',()=>showMedia(mediaIndex+1));
  showMedia(mediaIndex);
}
function showMedia(index){
  const items=mediaItems(selected);if(index<0||index>=items.length)return;
  stopGalleryVideo();mediaIndex=index;
  const item=items[index],t=galleryCopy[language],stage=document.getElementById('gallery-stage');
  const name=productName(selected);
  const alt=typeof item.alt==='object'?(item.alt[language]||name):(item.alt||name);
  if(item.type==='video'){
    stage.innerHTML=`<video controls playsinline preload="metadata" aria-label="${escapeMarkup(alt)}"${item.poster?` poster="${escapeMarkup(item.poster)}"`:''}><source src="${escapeMarkup(item.src)}"${videoType(item.src)?` type="${videoType(item.src)}"`:''}><a href="${escapeMarkup(item.src)}" target="_blank" rel="noopener noreferrer">${t.download}</a></video>`;
  }else if(item.type==='image'){
    stage.innerHTML=`<img src="${escapeMarkup(item.src)}" alt="${escapeMarkup(alt)}">`;
  }else{
    stage.innerHTML=`<div class="gallery-placeholder" role="img" aria-label="${escapeMarkup(name+' · '+t.placeholder)}">${placeholderArt(selected,item)}<span class="sample-label">${t.placeholder}${item.detail?' · '+t.detail:''}</span></div>`;
  }
  const media=stage.querySelector('img,video');
  if(media){const failure=()=>{if(!stage.contains(media)||stage.querySelector('.media-error'))return;const message=document.createElement('p');message.className='media-error';message.setAttribute('role','status');message.textContent=t.error;stage.append(message);};media.addEventListener('error',failure,{once:true});media.querySelector('source')?.addEventListener('error',failure,{once:true});if(media.tagName==='IMG'&&media.complete&&media.naturalWidth===0)failure();}
  document.getElementById('media-status').textContent=`${index+1} / ${items.length} · ${item.type==='placeholder'?t.placeholder:t[item.type]}`;
  document.getElementById('media-previous').disabled=index===0;
  document.getElementById('media-next').disabled=index===items.length-1;
  document.querySelectorAll('[data-media-index]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.mediaIndex)===index)));
}
