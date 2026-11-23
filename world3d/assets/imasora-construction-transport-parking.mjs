import {validateScoopDumpWork} from './imasora-construction-fragment-scoop.mjs?v=120pv';
import {widenSoilTransport} from './imasora-construction-soil-transport.mjs?v=120pv';
import {transportBay} from './imasora-construction-transport-field.mjs?v=120ov';
import {shovelStanding,shovelMachines,shovelSoilBoxes} from './imasora-construction-shovel-work.mjs?v=120pv';
import {linkedArmClear,linkedExcavatorSeat} from './imasora-construction-bucket-dump.mjs?v=120pv';
import {dumpPositionSafe,dumpBoxesOverlap,dumpDriverSeat} from './imasora-construction-dump-work.mjs?v=120pv';
import {transportExcavatorPositionSafe} from './imasora-construction-transport-drive.mjs?v=121gf';

export function returnTransportToParking(work){
 const current=work.frame;
 if(current.version!==2)throw Error('先に共通駐車場をひらこう。');
 if(work.scoop||work.link||work.unload||current.job||current.soil.pending)throw Error('今の作業が終わってから駐車場に戻ろう。');
 if(!['excavating','driving'].includes(work.mode))throw Error('運転席に乗ってから戻そう。');
 const frame={...current,revision:current.revision+1};
 if(work.mode==='excavating'){
  frame.machineVehicle={...current.machineVehicle,...transportBay(current.soil,'excavator'),groundY:0};
  if(!frame.decks)delete frame.machineVehicle.groundY;
  frame.machineArm={...current.machineArm,slew:0};
  if(!transportExcavatorPositionSafe(frame))throw Error('ショベルカーの駐車枠がふさがっています。');
  frame.player=linkedExcavatorSeat(frame);
 }else{
  frame.dump={...current.dump,...transportBay(current.soil,'dump'),groundY:0};
  if(!frame.decks)delete frame.dump.groundY;
  if(!dumpPositionSafe(frame))throw Error('ダンプカーの駐車枠がふさがっています。');
  frame.player=dumpDriverSeat(frame);
 }
 return validateScoopDumpWork({...work,revision:work.revision+1,frame});
}

export function transportParkingProblem(s){
 if(s.frame.version!==1||s.frame.soil.schema!==2)return 'この車はすでに共通駐車場へ移しています。';
 if(s.mode!=='foot')return '車を降りてから移そう。';
 if(s.scoop||s.link||s.unload||s.frame.job||s.frame.soil.pending)return 'いまの作業を終えてから移そう。';
 if(s.frame.soil.containers.shovel.amount)return '手に持った土を置いてから移そう。';
 return '';
}
// Staging is pure: the caller must commit this together with the world's
// parking record. No constructor, ordinary save or continuation calls it.
export function prepareTransportParking(work,corner){
 validateScoopDumpWork(work);const problem=transportParkingProblem(work);if(problem)throw Error(problem);
 const soil=widenSoilTransport(work.frame.soil,corner),frame={...work.frame,version:2,revision:work.frame.revision+1,soil,machineVehicle:{...transportBay(soil,'excavator'),wheelTravel:0},dump:transportBay(soil,'dump')};
 if(!shovelStanding(frame,frame.player)||!dumpPositionSafe(frame)||!linkedArmClear(frame)||shovelSoilBoxes(soil).some(b=>dumpBoxesOverlap(shovelMachines(frame)[0],b)))throw Error('土や作業を残したまま駐車できる場所を確認してください。');
 return validateScoopDumpWork({...work,revision:work.revision+1,frame});
}
