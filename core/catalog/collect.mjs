// Walks a catalog directory, reads every product.yaml (or .yml), validates it and lists the media
// next to it. Pure Node: no Cloudflare, no build output. scripts/generate-catalog.mjs writes the
// result to catalog.json and scripts/build.mjs copies the media it names.
import {readdir, readFile} from 'node:fs/promises';
import path from 'node:path';
import {parseDocument} from 'yaml';
import {localized} from '../i18n/localized.mjs';

export {localized};
export const imageExtensions = new Set(['.jpg','.jpeg','.png','.webp','.avif','.gif']);
export const videoExtensions = new Set(['.mp4','.webm','.mov']);
const known = new Set(['id','name','category','price','currency','description','sizes','tags','featured','available','model','cover','order','placeholder','color','bg','inventory','type','options','addons','fulfillment','ordering']);
// Product types Tiemora knows. `rental` books physical items by date range; `sale` sells by quantity
// (with options, add-ons, pickup / delivery and time slots). Other types are planned, not implemented.
export const PRODUCT_TYPES = ['rental','sale'];
const OPTION_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const isMoney = value => typeof value==='number'&&Number.isFinite(value);
const collator = new Intl.Collator('en', {numeric:true, sensitivity:'base'});
export const naturalCompare = (a,b) => collator.compare(a,b) || (a < b ? -1 : a > b ? 1 : 0);
export function webPath(relative) {
  return '/catalog/' + relative.replaceAll('\\','/').split('/').filter(Boolean).map(encodeURIComponent).join('/');
}
function isMap(value) { return value && typeof value === 'object' && !Array.isArray(value); }

// Returns {products, files}. `files` lists every media file found ({source, relative, url}) so the
// build can publish exactly what the catalog references and nothing else.
export async function collectCatalog(root, {warn=console.warn, currency='VND'}={}) {
  root=path.resolve(root);
  const products=[],files=[],ids=new Map();
  const warning=(folder,message)=>warn(`[catalog] ${path.relative(root,folder)||'.'}: ${message}`);
  async function walk(folder) {
    const entries=(await readdir(folder,{withFileTypes:true})).sort((a,b)=>naturalCompare(a.name,b.name));
    const metadata=entries.filter(e=>e.isFile() && /^product\.ya?ml$/i.test(e.name));
    if (metadata.length) {
      metadata.sort((a,b)=>Number(!/\.yaml$/i.test(a.name))-Number(!/\.yaml$/i.test(b.name)) || naturalCompare(a.name,b.name));
      if(metadata.length>1)warning(folder,`Multiple YAML files; using ${metadata[0].name}.`);
      let data;
      try {
        const doc=parseDocument(await readFile(path.join(folder,metadata[0].name),'utf8'),{uniqueKeys:true});
        if(doc.errors.length)throw new Error(doc.errors.map(e=>e.message).join('; '));
        doc.warnings.forEach(w=>warning(folder,w.message));
        data=doc.toJS({maxAliasCount:50}) ?? {};
        if(!isMap(data))throw new Error('Product YAML must be a mapping.');
      } catch(error) { warning(folder,`Skipping product: ${error.message}`); }
      if(data && isMap(data)) {
        const relative=path.relative(root,folder).split(path.sep).join('/');
        const id=(typeof data.id==='string'||typeof data.id==='number')?String(data.id).trim():'';
        const product={id:id||relative||'catalog-root'};
        if(!id)warning(folder,`No id; using stable folder identity "${product.id}".`);
        if(ids.has(product.id))throw new Error(`[catalog] Duplicate id "${product.id}": ${ids.get(product.id)} and ${folder}`);
        ids.set(product.id,folder);
        for(const key of Object.keys(data))if(!known.has(key))warning(folder,`Unknown field "${key}" ignored.`);
        for(const key of ['name','description']) {
          if(typeof data[key]==='string')product[key]=data[key];
          else if(isMap(data[key])) {
            product[key]=Object.fromEntries(Object.entries(data[key]).filter(([,v])=>typeof v==='string'));
            if(Object.keys(product[key]).length!==Object.keys(data[key]).length)warning(folder,`${key}: non-string translations ignored.`);
          } else if(data[key]!=null)warning(folder,`${key} must be text or a language mapping; using fallback.`);
        }
        if(!localized(product.name))product.name=path.basename(folder);
        // category: one id, or a list when a product belongs to several collections (the first is primary).
        const categoryList=Array.isArray(data.category)?data.category.filter(c=>typeof c==='string'&&c.trim()).map(c=>c.trim()):[];
        if(Array.isArray(data.category)&&categoryList.length!==data.category.length)warning(folder,'category: non-text entries ignored.');
        product.category=categoryList[0]||(typeof data.category==='string'&&data.category.trim()?data.category.trim():(relative.includes('/')?relative.split('/')[0]:'uncategorized'));
        if(categoryList.length>1)product.categories=[...new Set(categoryList)];
        product.currency=typeof data.currency==='string'&&/^[A-Za-z]{3}$/.test(data.currency)?data.currency.toUpperCase():currency;
        if(data.currency!=null && product.currency!==String(data.currency).toUpperCase())warning(folder,`Invalid currency; using ${currency}.`);
        // type: explicit, else inferred from the price key (price.sale -> sale), else rental.
        const priceMap=isMap(data.price)?data.price:{};
        if(typeof data.type==='string'&&PRODUCT_TYPES.includes(data.type))product.type=data.type;
        else{product.type=isMoney(priceMap.sale)&&!isMoney(priceMap.rental)?'sale':'rental';if(data.type!=null)warning(folder,`type must be one of ${PRODUCT_TYPES.join(', ')}; using ${product.type}.`);}
        const priceKey=product.type==='sale'?'sale':'rental';
        if(isMoney(priceMap[priceKey])&&priceMap[priceKey]>=0)product.price={[priceKey]:priceMap[priceKey]};
        else if(data.price!=null)warning(folder,`Invalid ${priceKey} price; showing contact-for-price.`);
        // A rental may charge less for every day after the first. It is a price per day, not a
        // percentage, and it can never be more than the daily rate -- that would be a surcharge.
        if(product.type==='rental'&&priceMap.additionalDay!=null){
          if(product.price&&isMoney(priceMap.additionalDay)&&priceMap.additionalDay>=0&&priceMap.additionalDay<=product.price.rental)product.price.additionalDay=priceMap.additionalDay;
          else warning(folder,`price.additionalDay must be a number between 0 and price.rental; charging the daily rate for every day.`);
        }
        if(isMap(data.price)&&data.price.original!=null) {
          if(product.price&&isMoney(data.price.original)&&data.price.original>product.price[priceKey])product.price.original=data.price.original;
          else warning(folder,`price.original must be a number above price.${priceKey}; ignoring the discount.`);
        }
        // Sale products: option groups (size / tone / wrapping ...), add-ons, fulfillment and ordering rules.
        // Labels and default prices for the ids live in config/store.yaml (ordering.options / ordering.addons);
        // a product only lists which ids it offers, optionally with its own price delta.
        const choice=(value,where)=>{
          if(typeof value==='string'&&OPTION_ID.test(value))return {id:value};
          if(isMap(value)&&typeof value.id==='string'&&OPTION_ID.test(value.id)){const c={id:value.id};if(isMoney(value.price))c.price=value.price;else if(value.price!=null)warning(folder,`${where}: price of "${value.id}" must be a number; ignored.`);return c;}
          warning(folder,`${where}: entries must be ids (lowercase, digits, hyphens) or {id, price}; ${JSON.stringify(value)} ignored.`);return null;
        };
        if(isMap(data.options)) {
          product.options={};
          for(const [group,list] of Object.entries(data.options)) {
            if(!OPTION_ID.test(group)){warning(folder,`options.${group}: invalid group id ignored.`);continue;}
            if(!Array.isArray(list)){warning(folder,`options.${group} must be a list; ignored.`);continue;}
            const choices=list.map(v=>choice(v,`options.${group}`)).filter(Boolean);
            if(choices.length)product.options[group]=choices;
          }
        } else if(data.options!=null)warning(folder,'options must be a mapping of group -> list; ignored.');
        if(Array.isArray(data.addons))product.addons=data.addons.map(v=>choice(v,'addons')).filter(Boolean);
        else if(data.addons!=null)warning(folder,'addons must be a list; ignored.');
        if(product.type==='sale') {
          const f=isMap(data.fulfillment)?data.fulfillment:{};
          if(data.fulfillment!=null&&!isMap(data.fulfillment))warning(folder,'fulfillment must be a mapping; using defaults.');
          product.fulfillment={pickup:f.pickup!==false,delivery:f.delivery!==false,dine_in:f.dine_in===true};
          const o=isMap(data.ordering)?data.ordering:{};
          if(data.ordering!=null&&!isMap(data.ordering))warning(folder,'ordering must be a mapping; using defaults.');
          // stockPeriod says what `stock` counts. `total` is a campaign ("40 bouquets for Tet") and
          // never refills; `daily` is a kitchen ("30 bowls a day") and is counted per fulfillment
          // date, so tomorrow starts full again. Default stays `total`: that is what v0.2 did.
          product.ordering={preorder:o.preorder!==false,stock:null,stockPeriod:'total',deadline:null};
          if(Number.isInteger(o.stock)&&o.stock>=0)product.ordering.stock=o.stock;else if(o.stock!=null)warning(folder,'ordering.stock must be a whole number >= 0; treating as unlimited.');
          if(o.stockPeriod==='daily'||o.stockPeriod==='total')product.ordering.stockPeriod=o.stockPeriod;else if(o.stockPeriod!=null)warning(folder,'ordering.stockPeriod must be "total" or "daily"; using total.');
          if(typeof o.deadline==='string'&&!Number.isNaN(Date.parse(o.deadline)))product.ordering.deadline=o.deadline;else if(o.deadline!=null)warning(folder,'ordering.deadline must be an ISO date-time; ignored.');
        } else if(data.fulfillment!=null||data.ordering!=null)warning(folder,'fulfillment / ordering only apply to type: sale; ignored.');
        for(const key of ['featured','available','placeholder']) {
          if(typeof data[key]==='boolean')product[key]=data[key];
          else {product[key]=key==='available'?null:false;if(data[key]!=null)warning(folder,`${key} must be a boolean; using default.`);}
        }
        if(typeof data.order==='number'&&Number.isFinite(data.order))product.order=data.order;
        else if(data.order!=null)warning(folder,'Invalid order ignored.');
        for(const key of ['sizes','tags']) {
          if(Array.isArray(data[key]))product[key]=data[key].filter(v=>typeof v==='string');
          else if(data[key]!=null)warning(folder,`${key} must be a list of strings.`);
        }
        if(isMap(data.model)) {
          product.model={};
          if(typeof data.model.height==='number'&&data.model.height>0)product.model.height=data.model.height;
          if(typeof data.model.wearing_size==='string')product.model.wearing_size=data.model.wearing_size;
        }
        for(const key of ['color','bg'])if(typeof data[key]==='string'&&/^#[0-9a-f]{6}$/i.test(data[key]))product[key]=data[key];
        // inventory.managed: the live status comes from D1 (see worker/); otherwise `available` above is the answer.
        if(isMap(data.inventory)) {
          if(typeof data.inventory.managed==='boolean')product.inventory={managed:data.inventory.managed};
          else warning(folder,'inventory.managed must be a boolean; ignoring inventory.');
          for(const key of Object.keys(data.inventory))if(key!=='managed')warning(folder,`Unknown field "inventory.${key}" ignored.`);
        } else if(data.inventory!=null)warning(folder,'inventory must be a mapping; ignoring.');
        const media=entries.filter(e=>e.isFile()&&(imageExtensions.has(path.extname(e.name).toLowerCase())||videoExtensions.has(path.extname(e.name).toLowerCase()))).map(e=>e.name);
        const allImages=media.filter(name=>imageExtensions.has(path.extname(name).toLowerCase()));
        const videos=media.filter(name=>videoExtensions.has(path.extname(name).toLowerCase()));
        const posterFor=new Map();
        for(const video of videos) {
          const base=path.parse(video).name.toLowerCase();
          const poster=allImages.find(name=>path.parse(name).name.toLowerCase()===base);
          if(poster)posterFor.set(video,poster);
        }
        const posterNames=new Set(posterFor.values());
        const images=allImages.filter(name=>!posterNames.has(name));
        let cover;
        if(data.cover!=null) {
          if(typeof data.cover==='string')cover=images.find(name=>name===data.cover)||images.find(name=>name.toLowerCase()===data.cover.toLowerCase());
          if(!cover)warning(folder,`Cover "${String(data.cover)}" is not an image in this directory; using automatic fallback.`);
        }
        cover ||= ['cover.jpg','cover.jpeg','cover.webp','cover.png'].map(name=>images.find(file=>file.toLowerCase()===name)).find(Boolean)||images[0];
        const url=name=>webPath([relative,name].filter(Boolean).join('/'));
        product.path=webPath(relative).replace(/\/$/,'')+'/';
        product.cover=cover?url(cover):null;
        product.images=(cover?[cover,...images.filter(name=>name!==cover)]:images).map(url);
        product.videos=videos.map(url);
        if(posterFor.size)product.posters=Object.fromEntries([...posterFor].map(([video,poster])=>[url(video),url(poster)]));
        if(!media.length)warning(folder,'No supported media; displaying placeholder.');
        for(const name of media)files.push({source:path.join(folder,name),relative:path.join('catalog',relative,name),url:url(name)});
        products.push(product);
      }
    }
    for(const entry of entries) {
      if(entry.isDirectory())await walk(path.join(folder,entry.name));
      else if(entry.isSymbolicLink())warning(folder,`Skipping symbolic link "${entry.name}".`);
    }
  }
  try { await walk(root); }
  catch(error) { if(error.code==='ENOENT'&&error.path===root)warn(`[catalog] Missing ${root}; generating an empty catalog.`);else throw error; }
  products.sort((a,b)=>(a.order??Infinity)-(b.order??Infinity)||naturalCompare(localized(a.name),localized(b.name))||naturalCompare(a.path,b.path));
  return {products,files};
}
