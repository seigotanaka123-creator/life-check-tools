// Exact comparison for domain-checked construction records, without creating
// two enormous canonical strings. This does not replace domain validation or
// the physical receipt. Never invoke getters or toJSON while comparing copies.
// Use this version only after BOTH values passed the domain checks in the
// current synchronous operation, or for privately owned validated frozen data.
export function sameValidatedConstructionRecordValue(a,b){
 if(a===b)return true;
 if(a===null||b===null||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;
 const keys=Object.keys(a);if(keys.length!==Object.keys(b).length)return false;
 if(Array.isArray(a)&&a.length!==b.length)return false;
 for(const k of keys)if(!Object.hasOwn(b,k)||!sameValidatedConstructionRecordValue(a[k],b[k]))return false;
 return true;
}

// Mutable or imported comparison inputs must use the descriptor-safe version.
export function sameConstructionRecordValue(a,b){
 if(a===b)return true;
 if(a===null||b===null||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;
 const proto=Array.isArray(a)?Array.prototype:Object.prototype;
 if(Object.getPrototypeOf(a)!==proto||Object.getPrototypeOf(b)!==proto)return false;
 const keys=Reflect.ownKeys(a),other=Reflect.ownKeys(b);
 if(keys.length!==other.length)return false;
 for(const k of keys){
  if(typeof k==='symbol'||!Object.hasOwn(b,k))return false;
  const x=Object.getOwnPropertyDescriptor(a,k),y=Object.getOwnPropertyDescriptor(b,k);
  if(!Object.hasOwn(x,'value')||!Object.hasOwn(y,'value')||x.enumerable!==y.enumerable||!sameConstructionRecordValue(x.value,y.value))return false;
 }
 return true;
}
