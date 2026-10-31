(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.ImasoraIslandFruits=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const items=Object.freeze([
  {id:'courage-fruit',name:'ゆうきの木の実',type:'大会',mark:'実',color:'#ee7864',sub:'次の大会だけ防御 +10',text:'島の木から落ちる赤い実。大会へ行く前に食べると、次の大会で守りが強くなる。',use:'battleDef',islandOnly:true},
  {id:'sprout-fruit',name:'すくすくの木の実',type:'育成',mark:'実',color:'#81be55',sub:'相棒経験値 +3',text:'島の木から落ちる緑の実。相棒が育つおやつ。',use:'fruitXp',islandOnly:true},
  {id:'trail-fruit',name:'よりみちの木の実',type:'散歩',mark:'実',color:'#c390ed',sub:'次のイマソラ認識で Coin +8',text:'25マス散歩へ出かける前に食べよう。次に空を認識するとコインが増える。',use:'fruitWalk',islandOnly:true},
  {id:'golden-fruit',name:'黄金の木の実',type:'育成',mark:'金',color:'#f2bf38',sub:'相棒経験値 +10・次の散歩 Coin +20・次の大会 防御 +10',text:'ごくまれに見つかる金色の実。育成・散歩・大会の3つを応援する。各木の実は1日1こ食べられる。',use:'goldenFruit',islandOnly:true}
 ].map(Object.freeze));
 const hash=text=>{let h=2166136261;for(const c of text)h=Math.imul(h^c.charCodeAt(0),16777619);h=Math.imul(h^(h>>>16),0x7feb352d);h=Math.imul(h^(h>>>15),0x846ca68b);return(h^(h>>>16))>>>0;};
 const species=tree=>items[hash(tree)%3];
 const roll=(source,tree,cycle)=>{const key=source+'|'+tree+'|'+cycle;if(hash(key)%10000>=6500)return null;return hash(key+'|gold')%10000<200?'golden-fruit':species(tree).id;};
 // Stable daily growth: revisiting or reopening does not reroll the forest.
 // Only 13.5% of the formerly fruit-bearing trees grow fruit on a given day.
 const seasonAt=cycle=>Math.floor(cycle/48);
 const bearingV2=(source,tree,cycle)=>typeof source==='string'&&/^[0-9a-f]{8}$/.test(source)&&hash(source+'|'+tree+'|'+seasonAt(cycle)+'|bearing-v2')%10000<1350;
 // Canonical reachable fruit trees: keep the home/CJS and world/Worker draws
 // identical without loading terrain during receipt validation. Geometry tests
 // check this catalogue against the real forest and its safe landing points.
 const groves=Object.freeze(Object.fromEntries(Object.entries({"shell-island":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120],"wind-island":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103],"tide-island":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,123,124,125,126,127,128,129],"star-island":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,123,124,125],"uncharted-island":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39]}).map(([island,indices])=>[island,Object.freeze(indices.map(n=>'coast-tree-'+island+'-'+n))])));
 const growthCache=new Map(),readyCache=new Map(),valid=(source,cycle)=>typeof source==='string'&&/^[0-9a-f]{8}$/.test(source)&&Number.isSafeInteger(cycle)&&cycle>=0&&cycle<=1e9;
 const remember=(cache,key,value)=>{if(cache.size>=24)cache.delete(cache.keys().next().value);cache.set(key,value);return value;};
 function growth(source,cycle){if(!valid(source,cycle))return null;const day=seasonAt(cycle),key=source+'|'+day;if(growthCache.has(key))return growthCache.get(key);const groups=[],all=new Set();for(const ids of Object.values(groves)){let minimum=null,score=Infinity;const grown=[];for(const tree of ids){const rank=hash(source+'|'+tree+'|'+day+'|bearing-v2')%10000;if(rank<score){score=rank;minimum=tree;}if(rank<1350)grown.push(tree);}if(!grown.length&&minimum)grown.push(minimum);groups.push(grown);for(const t of grown)all.add(t);}return remember(growthCache,key,{groups,all});}
 const bearing=(source,tree,cycle)=>growth(source,cycle)?.all.has(tree)??false;
 // Every tree has its own half-hour draw. Keep at least one ripe tree per
 // island, and remove the second empty roll once a fruit is ripe. Previously
 // 55% ripeness * 65% falling gave only 35.75%; now it is about 45%.
 function ready(source,cycle){const grown=growth(source,cycle);if(!grown)return null;const key=source+'|'+cycle;if(readyCache.has(key))return readyCache.get(key);const all=new Set();for(const ids of grown.groups){let minimum=null,score=Infinity,found=false;for(const tree of ids){const rank=hash(source+'|'+tree+'|'+cycle+'|ripe-v3')%10000;if(rank<score){score=rank;minimum=tree;}if(rank<4500){all.add(tree);found=true;}}if(!found&&minimum)all.add(minimum);}return remember(readyCache,key,all);}
 const ripe=(source,tree,cycle)=>ready(source,cycle)?.has(tree)??false;
 const harvest=(source,tree,cycle)=>ripe(source,tree,cycle)?(hash(source+'|'+tree+'|'+cycle+'|gold')%10000<200?'golden-fruit':species(tree).id):null;
 // Old outcomes stay immutable, including unripe/empty receipts and dropped
 // fruit not yet collected. Never reinterpret them using the new schedule.
 const harvestV2=(source,tree,cycle)=>bearingV2(source,tree,cycle)&&hash(source+'|'+tree+'|'+cycle+'|ripe-v2')%10000<5500?roll(source,tree,cycle):null;
 const receiptId=(tree,cycle)=>'fruit-'+tree.replace('coast-tree-','')+'-'+cycle;
 function validateEvent(e,source){const modern=e?.rule===2||e?.rule===3,shape=modern?'cycle|fruit|id|kind|picked|rule|tree':'cycle|fruit|id|kind|picked|tree';if(!e||Object.keys(e).sort().join('|')!==shape||e.kind!=='coast-fruit'||!/^coast-tree-(shell|wind|tide|star|uncharted)-island-\d{1,3}$/.test(e.tree)||!Number.isSafeInteger(e.cycle)||e.cycle<0||e.cycle>1e9||e.id!==receiptId(e.tree,e.cycle)||e.fruit!==(e.rule===3?harvest:e.rule===2?harvestV2:roll)(source,e.tree,e.cycle)||typeof e.picked!=='boolean'||(!e.fruit&&e.picked))throw Error('木の実の記録を残して止めました。');return e;}
 return Object.freeze({items,hash,species,roll,groves,bearing,ripe,harvest,seasonAt,receiptId,validateEvent,cycleAt:ms=>Math.floor(ms/1800000)});
});
