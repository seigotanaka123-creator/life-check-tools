// Only completed PNG strings are retained, never live models, textures or GL
// contexts. Two pages at most; a byte cap also bounds unusually large images.
export function createHuntThumbnailCache({maxEntries=24,maxBytes=3*1024*1024}={}){
 if(!Number.isSafeInteger(maxEntries)||maxEntries<1||!Number.isSafeInteger(maxBytes)||maxBytes<1)throw Error('INVALID_THUMBNAIL_LIMIT');
 const rows=new Map();let bytes=0,hits=0,misses=0,evictions=0;
 return{get(key){const row=rows.get(key);if(!row){misses++;return null;}rows.delete(key);rows.set(key,row);hits++;return row.image;},put(key,image){
  if(typeof key!=='string'||!key||typeof image!=='string'||!image.startsWith('data:image/png;base64,')||image.length<=22)return false;
  const cost=image.length*2;if(cost>maxBytes)return false;
  const old=rows.get(key);if(old){bytes-=old.cost;rows.delete(key);}
  while(rows.size>=maxEntries||bytes+cost>maxBytes){const id=rows.keys().next().value;bytes-=rows.get(id).cost;rows.delete(id);evictions++;}
  rows.set(key,{image,cost});bytes+=cost;return true;
 },clear(){rows.clear();bytes=0;},stats:()=>({entries:rows.size,bytes,hits,misses,evictions,maxEntries,maxBytes})};
}
export function huntThumbnailKey(character,pixelRatio){return character.stage+':'+character.id+':front:180x150@'+pixelRatio;}
