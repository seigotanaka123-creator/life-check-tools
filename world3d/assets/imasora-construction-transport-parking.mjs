import {validateScoopDumpWork} from './imasora-construction-fragment-scoop.mjs?v=120fw';
import {widenSoilTransport} from './imasora-construction-soil-transport.mjs?v=120fw';
import {transportBay} from './imasora-construction-transport-field.mjs?v=120fc';
import {shovelStanding,shovelMachines,shovelSoilBoxes} from './imasora-construction-shovel-work.mjs?v=120fw';
import {linkedArmClear} from './imasora-construction-bucket-dump.mjs?v=120fw';
import {dumpPositionSafe,dumpBoxesOverlap} from './imasora-construction-dump-work.mjs?v=120fw';

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
