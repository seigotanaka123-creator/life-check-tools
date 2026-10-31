import {gardenStock} from './imasora-construction-garden.mjs?v=120ps';

// Display projections only. The save service still validates every material change.
const stockViews = new WeakMap();
export function readOutdoorStock(service) {
 const ledger = service.ledger, old = stockViews.get(service);
 if (old?.ledger === ledger && old.revision === ledger.revision) return old.value;
 const stock = service.constructionStock;
 const value = Object.freeze({
  stored: Object.freeze({...stock.stored}),
  receivedWaterML: stock.receipts.reduce((n, r) => n + (r.offerId === 'mars-water' ? r.amount : 0), 0),
  decorationLeft: gardenStock(ledger.world).decorationLeft
 });
 stockViews.set(service, {ledger, revision: ledger.revision, value});
 return value;
}

const choiceViews = new WeakMap();
// Retain the actual buttons through autosaves, selection and clock changes.
export function syncOutdoorChoices(box, items, options) {
 let view = choiceViews.get(box);
 if (!view) {
  view = {rows: new Map(), ids: [], options, heading: null};
  choiceViews.set(box, view);
 }
 view.options = options;
 const doc = box.ownerDocument, ids = items.map(i => i.id);
 if (options.heading && !view.heading) {
  view.heading = doc.createElement('strong');
  view.heading.textContent = options.heading;
 }
 for (const item of items) {
  let row = view.rows.get(item.id);
  if (!row) {
   const button = doc.createElement('button'), text = doc.createTextNode('');
   button.type = 'button';
   if (options.iconClass) {
    const icon = doc.createElement('span');
    icon.className = options.iconClass;
    icon.setAttribute('aria-hidden', 'true');
    button.append(icon);
   }
   button.append(text);
   row = {button, text, item};
   button.onclick = () => {
    if (view.options.enabled && !button.disabled) view.options.onChoose(row.item);
   };
   view.rows.set(item.id, row);
  }
  row.item = item;
  const label = options.label(item), pressed = String(options.selected === item.id);
  if (row.text.data !== label) row.text.data = label;
  if (row.button.disabled === options.enabled) row.button.disabled = !options.enabled;
  if (row.button.getAttribute('aria-pressed') !== pressed) row.button.setAttribute('aria-pressed', pressed);
 }
 if (ids.length !== view.ids.length || ids.some((id, n) => id !== view.ids[n])) {
  box.replaceChildren(...(ids.length && view.heading ? [view.heading] : []), ...ids.map(id => view.rows.get(id).button));
  const keep = new Set(ids);
  for (const id of view.rows.keys()) if (!keep.has(id)) view.rows.delete(id);
  view.ids = ids;
 }
}

// Point at the current island rewards and town supplies, not the removed coast workshop.
const outdoorMaterialHints=Object.freeze({
 'かざりが足りないよ。建築セットを「かざり」で開け、建材受取所で受け取ろう。':'かざりが足りないよ。街で建築セットを「かざり」にしてひらき、建材受取所でもらおう。',
 '木材が足りないよ。建材受取所で受け取ろう。':'木材が足りないよ。島への上陸でもらえるよ。街の建材は建材受取所で受け取ろう。',
 '土が足りないよ。建材受取所で受け取ろう。':'土が足りないよ。島への上陸や、建材受取所で補給しよう。花壇にはすくった土も使えるよ。',
 '保管庫の水が足りないよ。建材受取所で水を受け取るか、給水車の水を保管庫へもどそう。':'水が足りないよ。島への上陸や建材受取所で補給しよう。給水車の水を保管庫へもどすこともできるよ。'
 });
export function outdoorMaterialHint(message){return Object.hasOwn(outdoorMaterialHints,message)?outdoorMaterialHints[message]:message;}
