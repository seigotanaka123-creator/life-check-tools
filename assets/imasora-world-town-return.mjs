import {materialSourceUrl} from './imasora-construction-material-source.mjs';

export function townReturnUrl(pageUrl, moduleUrl=import.meta.url) {
 const page=new URL(pageUrl);
 const source=materialSourceUrl(moduleUrl,page.searchParams.get('materialHome'));
 const town=new URL('./life-quest-walk.html',source);
 town.searchParams.set('arrival','construction-return');
 return town.href;
}

export async function saveThenReturnToTown({save,navigate,url}) {
 if(await save()===false)return false;
 navigate(url);
 return true;
}
