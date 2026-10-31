// Independent prototype: no inventory, sky recognition or normal saves.
export const STEP=1/120;
export const FIELD=Object.freeze({a:34,b:28});
export const BODY=Object.freeze({radius:2.3,height:5.1,accel:22,max:14,dash:18,gravity:27});
export const BUMPERS=Object.freeze([{x:-10,z:-5,r:4.5,h:1.6},{x:11,z:6,r:4.5,h:1.6},{x:-1,z:17,r:3,h:1.6}].map(Object.freeze));
export const PADS=Object.freeze([{x:-22,z:8,r:6},{x:19,z:-13,r:6},{x:21,z:14,r:5}].map(Object.freeze));
export const RULES='tag-roster-v2';
export const OPPONENTS=Object.freeze([
 Object.freeze({id:'direct',name:'まっすぐ',hint:'ぐいぐい追う。切り返しでかわそう。',character:'star-hero-young-seed-walk-sky-cool-b-forest',lead:.12,margin:5,cover:0,turn:0}),
 Object.freeze({id:'cutoff',name:'さきまわり',hint:'進む先をねらう。進路を変えてみよう。',character:'star-hero-young-seed-sky-sky-cool-b-forest',lead:.65,margin:8,cover:3,turn:1}),
 Object.freeze({id:'feint',name:'きりかえし',hint:'クッションのそばで、くるっとかわす。',character:'star-hero-young-seed-leaf-sky-cool-b-forest',lead:.38,margin:11,cover:7,turn:5})
]);
// Generated from the same canonical 48 flowering / 144 mature descriptors as Imasora Link.
export const CHARACTER_PROFILES=Object.freeze({"walkCute":{"title":"きびきび型","hint":"すぐ加速して、細い道で切り返すのが得意。長い直線では追いつかれやすい。","accel":1.25,"speed":0.88,"turn":1.3,"brake":1.1,"scores":[5,2,5,4],"style":"feint"},"walkBrave":{"title":"勢い型","hint":"出足はゆっくり。速度に乗ると速いけれど、曲がる前には早めに減速しよう。","accel":0.8,"speed":1.17,"turn":0.72,"brake":0.8,"scores":[2,4,2,2],"style":"direct"},"walkSaber":{"title":"直線と切り返し型","hint":"加速と速さを両立。急なカーブでは少し手前から向きを変えよう。","accel":1.1,"speed":1.08,"turn":0.95,"brake":1,"scores":[4,4,3,3],"style":"cutoff"},"rioCute":{"title":"安定型","hint":"減速しやすく、坂の出口や角で落ち着いて曲がれる。","accel":1.08,"speed":1,"turn":1.1,"brake":1.3,"scores":[4,3,4,5],"style":"cutoff"},"rioBrave":{"title":"重量・高速型","hint":"加速は遅いけれど、最高速は一番。小回りは苦手なので広い道が得意。","accel":0.65,"speed":1.3,"turn":0.55,"brake":0.7,"scores":[1,5,1,2],"style":"direct"},"rioSaber":{"title":"旋回型","hint":"速度を保ちながら曲がりやすい。出足よりも進路の選び方で勝負。","accel":1,"speed":1.08,"turn":1.15,"brake":1,"scores":[3,4,4,3],"style":"feint"}});
export const TAG_CHARACTERS=Object.freeze([{"id":"hero-white-young-seed-walk-walk-cute","name":"白ミチメバンフワナ","profileKey":"walkCute","stage":"hero","white":true},{"id":"hero-white-young-seed-walk-walk-cool-a","name":"白ミチメバンブレイブ","profileKey":"walkBrave","stage":"hero","white":true},{"id":"hero-white-young-seed-walk-walk-cool-b","name":"白ミチメバンセイバー","profileKey":"walkSaber","stage":"hero","white":true},{"id":"hero-white-young-seed-walk-sky-cute","name":"白ミチロードフワナ","profileKey":"rioCute","stage":"hero","white":true},{"id":"hero-white-young-seed-walk-sky-cool-a","name":"白ミチロードブレイブ","profileKey":"rioBrave","stage":"hero","white":true},{"id":"hero-white-young-seed-walk-sky-cool-b","name":"白ミチロードセイバー","profileKey":"rioSaber","stage":"hero","white":true},{"id":"hero-young-seed-walk-walk-cute","name":"ミチメバンフワナ","profileKey":"walkCute","stage":"hero","white":false},{"id":"hero-young-seed-walk-walk-cool-a","name":"ミチメバンブレイブ","profileKey":"walkBrave","stage":"hero","white":false},{"id":"hero-young-seed-walk-walk-cool-b","name":"ミチメバンセイバー","profileKey":"walkSaber","stage":"hero","white":false},{"id":"hero-young-seed-walk-sky-cute","name":"ミチロードフワナ","profileKey":"rioCute","stage":"hero","white":false},{"id":"hero-young-seed-walk-sky-cool-a","name":"ミチロードブレイブ","profileKey":"rioBrave","stage":"hero","white":false},{"id":"hero-young-seed-walk-sky-cool-b","name":"ミチロードセイバー","profileKey":"rioSaber","stage":"hero","white":false},{"id":"hero-young-seed-sky-walk-cute","name":"ソラメバンフワナ","profileKey":"walkCute","stage":"hero","white":false},{"id":"hero-young-seed-sky-walk-cool-a","name":"ソラメバンブレイブ","profileKey":"walkBrave","stage":"hero","white":false},{"id":"hero-young-seed-sky-walk-cool-b","name":"ソラメバンセイバー","profileKey":"walkSaber","stage":"hero","white":false},{"id":"hero-young-seed-sky-sky-cute","name":"ソラロードフワナ","profileKey":"rioCute","stage":"hero","white":false},{"id":"hero-young-seed-sky-sky-cool-a","name":"ソラロードブレイブ","profileKey":"rioBrave","stage":"hero","white":false},{"id":"hero-young-seed-sky-sky-cool-b","name":"ソラロードセイバー","profileKey":"rioSaber","stage":"hero","white":false},{"id":"hero-young-seed-leaf-walk-cute","name":"ハニメバンフワナ","profileKey":"walkCute","stage":"hero","white":false},{"id":"hero-young-seed-leaf-walk-cool-a","name":"ハニメバンブレイブ","profileKey":"walkBrave","stage":"hero","white":false},{"id":"hero-young-seed-leaf-walk-cool-b","name":"ハニメバンセイバー","profileKey":"walkSaber","stage":"hero","white":false},{"id":"hero-young-seed-leaf-sky-cute","name":"ハニロードフワナ","profileKey":"rioCute","stage":"hero","white":false},{"id":"hero-young-seed-leaf-sky-cool-a","name":"ハニロードブレイブ","profileKey":"rioBrave","stage":"hero","white":false},{"id":"hero-young-seed-leaf-sky-cool-b","name":"ハニロードセイバー","profileKey":"rioSaber","stage":"hero","white":false},{"id":"hero-young-seed-city-walk-cute","name":"マチメバンフワナ","profileKey":"walkCute","stage":"hero","white":false},{"id":"hero-young-seed-city-walk-cool-a","name":"マチメバンブレイブ","profileKey":"walkBrave","stage":"hero","white":false},{"id":"hero-young-seed-city-walk-cool-b","name":"マチメバンセイバー","profileKey":"walkSaber","stage":"hero","white":false},{"id":"hero-young-seed-city-sky-cute","name":"マチロードフワナ","profileKey":"rioCute","stage":"hero","white":false},{"id":"hero-young-seed-city-sky-cool-a","name":"マチロードブレイブ","profileKey":"rioBrave","stage":"hero","white":false},{"id":"hero-young-seed-city-sky-cool-b","name":"マチロードセイバー","profileKey":"rioSaber","stage":"hero","white":false},{"id":"hero-young-seed-river-walk-cute","name":"ミズメバンフワナ","profileKey":"walkCute","stage":"hero","white":false},{"id":"hero-young-seed-river-walk-cool-a","name":"ミズメバンブレイブ","profileKey":"walkBrave","stage":"hero","white":false},{"id":"hero-young-seed-river-walk-cool-b","name":"ミズメバンセイバー","profileKey":"walkSaber","stage":"hero","white":false},{"id":"hero-young-seed-river-sky-cute","name":"ミズロードフワナ","profileKey":"rioCute","stage":"hero","white":false},{"id":"hero-young-seed-river-sky-cool-a","name":"ミズロードブレイブ","profileKey":"rioBrave","stage":"hero","white":false},{"id":"hero-young-seed-river-sky-cool-b","name":"ミズロードセイバー","profileKey":"rioSaber","stage":"hero","white":false},{"id":"hero-young-seed-night-walk-cute","name":"アケメバンフワナ","profileKey":"walkCute","stage":"hero","white":false},{"id":"hero-young-seed-night-walk-cool-a","name":"アケメバンブレイブ","profileKey":"walkBrave","stage":"hero","white":false},{"id":"hero-young-seed-night-walk-cool-b","name":"アケメバンセイバー","profileKey":"walkSaber","stage":"hero","white":false},{"id":"hero-young-seed-night-sky-cute","name":"アケロードフワナ","profileKey":"rioCute","stage":"hero","white":false},{"id":"hero-young-seed-night-sky-cool-a","name":"アケロードブレイブ","profileKey":"rioBrave","stage":"hero","white":false},{"id":"hero-young-seed-night-sky-cool-b","name":"アケロードセイバー","profileKey":"rioSaber","stage":"hero","white":false},{"id":"hero-young-seed-luck-walk-cute","name":"ユラメバンフワナ","profileKey":"walkCute","stage":"hero","white":false},{"id":"hero-young-seed-luck-walk-cool-a","name":"ユラメバンブレイブ","profileKey":"walkBrave","stage":"hero","white":false},{"id":"hero-young-seed-luck-walk-cool-b","name":"ユラメバンセイバー","profileKey":"walkSaber","stage":"hero","white":false},{"id":"hero-young-seed-luck-sky-cute","name":"ユラロードフワナ","profileKey":"rioCute","stage":"hero","white":false},{"id":"hero-young-seed-luck-sky-cool-a","name":"ユラロードブレイブ","profileKey":"rioBrave","stage":"hero","white":false},{"id":"hero-young-seed-luck-sky-cool-b","name":"ユラロードセイバー","profileKey":"rioSaber","stage":"hero","white":false},{"id":"star-white-hero-young-seed-walk-walk-cute-comet","name":"白ミチメバンフワナル","profileKey":"walkCute","stage":"star","white":true},{"id":"star-white-hero-young-seed-walk-walk-cute-crown","name":"白ミチメバンフワナオウ","profileKey":"walkCute","stage":"star","white":true},{"id":"star-white-hero-young-seed-walk-walk-cute-forest","name":"白ミチメバンフワナレン","profileKey":"walkCute","stage":"star","white":true},{"id":"star-white-hero-young-seed-walk-walk-cool-a-comet","name":"白ミチメバンブレイブル","profileKey":"walkBrave","stage":"star","white":true},{"id":"star-white-hero-young-seed-walk-walk-cool-a-crown","name":"白ミチメバンブレイブオウ","profileKey":"walkBrave","stage":"star","white":true},{"id":"star-white-hero-young-seed-walk-walk-cool-a-forest","name":"白ミチメバンブレイブレン","profileKey":"walkBrave","stage":"star","white":true},{"id":"star-white-hero-young-seed-walk-walk-cool-b-comet","name":"白ミチメバンセイバール","profileKey":"walkSaber","stage":"star","white":true},{"id":"star-white-hero-young-seed-walk-walk-cool-b-crown","name":"白ミチメバンセイバーオウ","profileKey":"walkSaber","stage":"star","white":true},{"id":"star-white-hero-young-seed-walk-walk-cool-b-forest","name":"白ミチメバンセイバーレン","profileKey":"walkSaber","stage":"star","white":true},{"id":"star-white-hero-young-seed-walk-sky-cute-comet","name":"白ミチロードフワナル","profileKey":"rioCute","stage":"star","white":true},{"id":"star-white-hero-young-seed-walk-sky-cute-crown","name":"白ミチロードフワナオウ","profileKey":"rioCute","stage":"star","white":true},{"id":"star-white-hero-young-seed-walk-sky-cute-forest","name":"白ミチロードフワナレン","profileKey":"rioCute","stage":"star","white":true},{"id":"star-white-hero-young-seed-walk-sky-cool-a-comet","name":"白ミチロードブレイブル","profileKey":"rioBrave","stage":"star","white":true},{"id":"star-white-hero-young-seed-walk-sky-cool-a-crown","name":"白ミチロードブレイブオウ","profileKey":"rioBrave","stage":"star","white":true},{"id":"star-white-hero-young-seed-walk-sky-cool-a-forest","name":"白ミチロードブレイブレン","profileKey":"rioBrave","stage":"star","white":true},{"id":"star-white-hero-young-seed-walk-sky-cool-b-comet","name":"白ミチロードセイバール","profileKey":"rioSaber","stage":"star","white":true},{"id":"star-white-hero-young-seed-walk-sky-cool-b-crown","name":"白ミチロードセイバーオウ","profileKey":"rioSaber","stage":"star","white":true},{"id":"star-white-hero-young-seed-walk-sky-cool-b-forest","name":"白ミチロードセイバーレン","profileKey":"rioSaber","stage":"star","white":true},{"id":"star-hero-young-seed-walk-walk-cute-comet","name":"ミチメバンフワナル","profileKey":"walkCute","stage":"star","white":false},{"id":"star-hero-young-seed-walk-walk-cute-crown","name":"ミチメバンフワナオウ","profileKey":"walkCute","stage":"star","white":false},{"id":"star-hero-young-seed-walk-walk-cute-forest","name":"ミチメバンフワナレン","profileKey":"walkCute","stage":"star","white":false},{"id":"star-hero-young-seed-walk-walk-cool-a-comet","name":"ミチメバンブレイブル","profileKey":"walkBrave","stage":"star","white":false},{"id":"star-hero-young-seed-walk-walk-cool-a-crown","name":"ミチメバンブレイブオウ","profileKey":"walkBrave","stage":"star","white":false},{"id":"star-hero-young-seed-walk-walk-cool-a-forest","name":"ミチメバンブレイブレン","profileKey":"walkBrave","stage":"star","white":false},{"id":"star-hero-young-seed-walk-walk-cool-b-comet","name":"ミチメバンセイバール","profileKey":"walkSaber","stage":"star","white":false},{"id":"star-hero-young-seed-walk-walk-cool-b-crown","name":"ミチメバンセイバーオウ","profileKey":"walkSaber","stage":"star","white":false},{"id":"star-hero-young-seed-walk-walk-cool-b-forest","name":"ミチメバンセイバーレン","profileKey":"walkSaber","stage":"star","white":false},{"id":"star-hero-young-seed-walk-sky-cute-comet","name":"ミチロードフワナル","profileKey":"rioCute","stage":"star","white":false},{"id":"star-hero-young-seed-walk-sky-cute-crown","name":"ミチロードフワナオウ","profileKey":"rioCute","stage":"star","white":false},{"id":"star-hero-young-seed-walk-sky-cute-forest","name":"ミチロードフワナレン","profileKey":"rioCute","stage":"star","white":false},{"id":"star-hero-young-seed-walk-sky-cool-a-comet","name":"ミチロードブレイブル","profileKey":"rioBrave","stage":"star","white":false},{"id":"star-hero-young-seed-walk-sky-cool-a-crown","name":"ミチロードブレイブオウ","profileKey":"rioBrave","stage":"star","white":false},{"id":"star-hero-young-seed-walk-sky-cool-a-forest","name":"ミチロードブレイブレン","profileKey":"rioBrave","stage":"star","white":false},{"id":"star-hero-young-seed-walk-sky-cool-b-comet","name":"ミチロードセイバール","profileKey":"rioSaber","stage":"star","white":false},{"id":"star-hero-young-seed-walk-sky-cool-b-crown","name":"ミチロードセイバーオウ","profileKey":"rioSaber","stage":"star","white":false},{"id":"star-hero-young-seed-walk-sky-cool-b-forest","name":"ミチロードセイバーレン","profileKey":"rioSaber","stage":"star","white":false},{"id":"star-hero-young-seed-sky-walk-cute-comet","name":"ソラメバンフワナル","profileKey":"walkCute","stage":"star","white":false},{"id":"star-hero-young-seed-sky-walk-cute-crown","name":"ソラメバンフワナオウ","profileKey":"walkCute","stage":"star","white":false},{"id":"star-hero-young-seed-sky-walk-cute-forest","name":"ソラメバンフワナレン","profileKey":"walkCute","stage":"star","white":false},{"id":"star-hero-young-seed-sky-walk-cool-a-comet","name":"ソラメバンブレイブル","profileKey":"walkBrave","stage":"star","white":false},{"id":"star-hero-young-seed-sky-walk-cool-a-crown","name":"ソラメバンブレイブオウ","profileKey":"walkBrave","stage":"star","white":false},{"id":"star-hero-young-seed-sky-walk-cool-a-forest","name":"ソラメバンブレイブレン","profileKey":"walkBrave","stage":"star","white":false},{"id":"star-hero-young-seed-sky-walk-cool-b-comet","name":"ソラメバンセイバール","profileKey":"walkSaber","stage":"star","white":false},{"id":"star-hero-young-seed-sky-walk-cool-b-crown","name":"ソラメバンセイバーオウ","profileKey":"walkSaber","stage":"star","white":false},{"id":"star-hero-young-seed-sky-walk-cool-b-forest","name":"ソラメバンセイバーレン","profileKey":"walkSaber","stage":"star","white":false},{"id":"star-hero-young-seed-sky-sky-cute-comet","name":"ソラロードフワナル","profileKey":"rioCute","stage":"star","white":false},{"id":"star-hero-young-seed-sky-sky-cute-crown","name":"ソラロードフワナオウ","profileKey":"rioCute","stage":"star","white":false},{"id":"star-hero-young-seed-sky-sky-cute-forest","name":"ソラロードフワナレン","profileKey":"rioCute","stage":"star","white":false},{"id":"star-hero-young-seed-sky-sky-cool-a-comet","name":"ソラロードブレイブル","profileKey":"rioBrave","stage":"star","white":false},{"id":"star-hero-young-seed-sky-sky-cool-a-crown","name":"ソラロードブレイブオウ","profileKey":"rioBrave","stage":"star","white":false},{"id":"star-hero-young-seed-sky-sky-cool-a-forest","name":"ソラロードブレイブレン","profileKey":"rioBrave","stage":"star","white":false},{"id":"star-hero-young-seed-sky-sky-cool-b-comet","name":"ソラロードセイバール","profileKey":"rioSaber","stage":"star","white":false},{"id":"star-hero-young-seed-sky-sky-cool-b-crown","name":"ソラロードセイバーオウ","profileKey":"rioSaber","stage":"star","white":false},{"id":"star-hero-young-seed-sky-sky-cool-b-forest","name":"ソラロードセイバーレン","profileKey":"rioSaber","stage":"star","white":false},{"id":"star-hero-young-seed-leaf-walk-cute-comet","name":"ハニメバンフワナル","profileKey":"walkCute","stage":"star","white":false},{"id":"star-hero-young-seed-leaf-walk-cute-crown","name":"ハニメバンフワナオウ","profileKey":"walkCute","stage":"star","white":false},{"id":"star-hero-young-seed-leaf-walk-cute-forest","name":"ハニメバンフワナレン","profileKey":"walkCute","stage":"star","white":false},{"id":"star-hero-young-seed-leaf-walk-cool-a-comet","name":"ハニメバンブレイブル","profileKey":"walkBrave","stage":"star","white":false},{"id":"star-hero-young-seed-leaf-walk-cool-a-crown","name":"ハニメバンブレイブオウ","profileKey":"walkBrave","stage":"star","white":false},{"id":"star-hero-young-seed-leaf-walk-cool-a-forest","name":"ハニメバンブレイブレン","profileKey":"walkBrave","stage":"star","white":false},{"id":"star-hero-young-seed-leaf-walk-cool-b-comet","name":"ハニメバンセイバール","profileKey":"walkSaber","stage":"star","white":false},{"id":"star-hero-young-seed-leaf-walk-cool-b-crown","name":"ハニメバンセイバーオウ","profileKey":"walkSaber","stage":"star","white":false},{"id":"star-hero-young-seed-leaf-walk-cool-b-forest","name":"ハニメバンセイバーレン","profileKey":"walkSaber","stage":"star","white":false},{"id":"star-hero-young-seed-leaf-sky-cute-comet","name":"ハニロードフワナル","profileKey":"rioCute","stage":"star","white":false},{"id":"star-hero-young-seed-leaf-sky-cute-crown","name":"ハニロードフワナオウ","profileKey":"rioCute","stage":"star","white":false},{"id":"star-hero-young-seed-leaf-sky-cute-forest","name":"ハニロードフワナレン","profileKey":"rioCute","stage":"star","white":false},{"id":"star-hero-young-seed-leaf-sky-cool-a-comet","name":"ハニロードブレイブル","profileKey":"rioBrave","stage":"star","white":false},{"id":"star-hero-young-seed-leaf-sky-cool-a-crown","name":"ハニロードブレイブオウ","profileKey":"rioBrave","stage":"star","white":false},{"id":"star-hero-young-seed-leaf-sky-cool-a-forest","name":"ハニロードブレイブレン","profileKey":"rioBrave","stage":"star","white":false},{"id":"star-hero-young-seed-leaf-sky-cool-b-comet","name":"ハニロードセイバール","profileKey":"rioSaber","stage":"star","white":false},{"id":"star-hero-young-seed-leaf-sky-cool-b-crown","name":"ハニロードセイバーオウ","profileKey":"rioSaber","stage":"star","white":false},{"id":"star-hero-young-seed-leaf-sky-cool-b-forest","name":"ハニロードセイバーレン","profileKey":"rioSaber","stage":"star","white":false},{"id":"star-hero-young-seed-city-walk-cute-comet","name":"マチメバンフワナル","profileKey":"walkCute","stage":"star","white":false},{"id":"star-hero-young-seed-city-walk-cute-crown","name":"マチメバンフワナオウ","profileKey":"walkCute","stage":"star","white":false},{"id":"star-hero-young-seed-city-walk-cute-forest","name":"マチメバンフワナレン","profileKey":"walkCute","stage":"star","white":false},{"id":"star-hero-young-seed-city-walk-cool-a-comet","name":"マチメバンブレイブル","profileKey":"walkBrave","stage":"star","white":false},{"id":"star-hero-young-seed-city-walk-cool-a-crown","name":"マチメバンブレイブオウ","profileKey":"walkBrave","stage":"star","white":false},{"id":"star-hero-young-seed-city-walk-cool-a-forest","name":"マチメバンブレイブレン","profileKey":"walkBrave","stage":"star","white":false},{"id":"star-hero-young-seed-city-walk-cool-b-comet","name":"マチメバンセイバール","profileKey":"walkSaber","stage":"star","white":false},{"id":"star-hero-young-seed-city-walk-cool-b-crown","name":"マチメバンセイバーオウ","profileKey":"walkSaber","stage":"star","white":false},{"id":"star-hero-young-seed-city-walk-cool-b-forest","name":"マチメバンセイバーレン","profileKey":"walkSaber","stage":"star","white":false},{"id":"star-hero-young-seed-city-sky-cute-comet","name":"マチロードフワナル","profileKey":"rioCute","stage":"star","white":false},{"id":"star-hero-young-seed-city-sky-cute-crown","name":"マチロードフワナオウ","profileKey":"rioCute","stage":"star","white":false},{"id":"star-hero-young-seed-city-sky-cute-forest","name":"マチロードフワナレン","profileKey":"rioCute","stage":"star","white":false},{"id":"star-hero-young-seed-city-sky-cool-a-comet","name":"マチロードブレイブル","profileKey":"rioBrave","stage":"star","white":false},{"id":"star-hero-young-seed-city-sky-cool-a-crown","name":"マチロードブレイブオウ","profileKey":"rioBrave","stage":"star","white":false},{"id":"star-hero-young-seed-city-sky-cool-a-forest","name":"マチロードブレイブレン","profileKey":"rioBrave","stage":"star","white":false},{"id":"star-hero-young-seed-city-sky-cool-b-comet","name":"マチロードセイバール","profileKey":"rioSaber","stage":"star","white":false},{"id":"star-hero-young-seed-city-sky-cool-b-crown","name":"マチロードセイバーオウ","profileKey":"rioSaber","stage":"star","white":false},{"id":"star-hero-young-seed-city-sky-cool-b-forest","name":"マチロードセイバーレン","profileKey":"rioSaber","stage":"star","white":false},{"id":"star-hero-young-seed-river-walk-cute-comet","name":"ミズメバンフワナル","profileKey":"walkCute","stage":"star","white":false},{"id":"star-hero-young-seed-river-walk-cute-crown","name":"ミズメバンフワナオウ","profileKey":"walkCute","stage":"star","white":false},{"id":"star-hero-young-seed-river-walk-cute-forest","name":"ミズメバンフワナレン","profileKey":"walkCute","stage":"star","white":false},{"id":"star-hero-young-seed-river-walk-cool-a-comet","name":"ミズメバンブレイブル","profileKey":"walkBrave","stage":"star","white":false},{"id":"star-hero-young-seed-river-walk-cool-a-crown","name":"ミズメバンブレイブオウ","profileKey":"walkBrave","stage":"star","white":false},{"id":"star-hero-young-seed-river-walk-cool-a-forest","name":"ミズメバンブレイブレン","profileKey":"walkBrave","stage":"star","white":false},{"id":"star-hero-young-seed-river-walk-cool-b-comet","name":"ミズメバンセイバール","profileKey":"walkSaber","stage":"star","white":false},{"id":"star-hero-young-seed-river-walk-cool-b-crown","name":"ミズメバンセイバーオウ","profileKey":"walkSaber","stage":"star","white":false},{"id":"star-hero-young-seed-river-walk-cool-b-forest","name":"ミズメバンセイバーレン","profileKey":"walkSaber","stage":"star","white":false},{"id":"star-hero-young-seed-river-sky-cute-comet","name":"ミズロードフワナル","profileKey":"rioCute","stage":"star","white":false},{"id":"star-hero-young-seed-river-sky-cute-crown","name":"ミズロードフワナオウ","profileKey":"rioCute","stage":"star","white":false},{"id":"star-hero-young-seed-river-sky-cute-forest","name":"ミズロードフワナレン","profileKey":"rioCute","stage":"star","white":false},{"id":"star-hero-young-seed-river-sky-cool-a-comet","name":"ミズロードブレイブル","profileKey":"rioBrave","stage":"star","white":false},{"id":"star-hero-young-seed-river-sky-cool-a-crown","name":"ミズロードブレイブオウ","profileKey":"rioBrave","stage":"star","white":false},{"id":"star-hero-young-seed-river-sky-cool-a-forest","name":"ミズロードブレイブレン","profileKey":"rioBrave","stage":"star","white":false},{"id":"star-hero-young-seed-river-sky-cool-b-comet","name":"ミズロードセイバール","profileKey":"rioSaber","stage":"star","white":false},{"id":"star-hero-young-seed-river-sky-cool-b-crown","name":"ミズロードセイバーオウ","profileKey":"rioSaber","stage":"star","white":false},{"id":"star-hero-young-seed-river-sky-cool-b-forest","name":"ミズロードセイバーレン","profileKey":"rioSaber","stage":"star","white":false},{"id":"star-hero-young-seed-night-walk-cute-comet","name":"アケメバンフワナル","profileKey":"walkCute","stage":"star","white":false},{"id":"star-hero-young-seed-night-walk-cute-crown","name":"アケメバンフワナオウ","profileKey":"walkCute","stage":"star","white":false},{"id":"star-hero-young-seed-night-walk-cute-forest","name":"アケメバンフワナレン","profileKey":"walkCute","stage":"star","white":false},{"id":"star-hero-young-seed-night-walk-cool-a-comet","name":"アケメバンブレイブル","profileKey":"walkBrave","stage":"star","white":false},{"id":"star-hero-young-seed-night-walk-cool-a-crown","name":"アケメバンブレイブオウ","profileKey":"walkBrave","stage":"star","white":false},{"id":"star-hero-young-seed-night-walk-cool-a-forest","name":"アケメバンブレイブレン","profileKey":"walkBrave","stage":"star","white":false},{"id":"star-hero-young-seed-night-walk-cool-b-comet","name":"アケメバンセイバール","profileKey":"walkSaber","stage":"star","white":false},{"id":"star-hero-young-seed-night-walk-cool-b-crown","name":"アケメバンセイバーオウ","profileKey":"walkSaber","stage":"star","white":false},{"id":"star-hero-young-seed-night-walk-cool-b-forest","name":"アケメバンセイバーレン","profileKey":"walkSaber","stage":"star","white":false},{"id":"star-hero-young-seed-night-sky-cute-comet","name":"アケロードフワナル","profileKey":"rioCute","stage":"star","white":false},{"id":"star-hero-young-seed-night-sky-cute-crown","name":"アケロードフワナオウ","profileKey":"rioCute","stage":"star","white":false},{"id":"star-hero-young-seed-night-sky-cute-forest","name":"アケロードフワナレン","profileKey":"rioCute","stage":"star","white":false},{"id":"star-hero-young-seed-night-sky-cool-a-comet","name":"アケロードブレイブル","profileKey":"rioBrave","stage":"star","white":false},{"id":"star-hero-young-seed-night-sky-cool-a-crown","name":"アケロードブレイブオウ","profileKey":"rioBrave","stage":"star","white":false},{"id":"star-hero-young-seed-night-sky-cool-a-forest","name":"アケロードブレイブレン","profileKey":"rioBrave","stage":"star","white":false},{"id":"star-hero-young-seed-night-sky-cool-b-comet","name":"アケロードセイバール","profileKey":"rioSaber","stage":"star","white":false},{"id":"star-hero-young-seed-night-sky-cool-b-crown","name":"アケロードセイバーオウ","profileKey":"rioSaber","stage":"star","white":false},{"id":"star-hero-young-seed-night-sky-cool-b-forest","name":"アケロードセイバーレン","profileKey":"rioSaber","stage":"star","white":false},{"id":"star-hero-young-seed-luck-walk-cute-comet","name":"ユラメバンフワナル","profileKey":"walkCute","stage":"star","white":false},{"id":"star-hero-young-seed-luck-walk-cute-crown","name":"ユラメバンフワナオウ","profileKey":"walkCute","stage":"star","white":false},{"id":"star-hero-young-seed-luck-walk-cute-forest","name":"ユラメバンフワナレン","profileKey":"walkCute","stage":"star","white":false},{"id":"star-hero-young-seed-luck-walk-cool-a-comet","name":"ユラメバンブレイブル","profileKey":"walkBrave","stage":"star","white":false},{"id":"star-hero-young-seed-luck-walk-cool-a-crown","name":"ユラメバンブレイブオウ","profileKey":"walkBrave","stage":"star","white":false},{"id":"star-hero-young-seed-luck-walk-cool-a-forest","name":"ユラメバンブレイブレン","profileKey":"walkBrave","stage":"star","white":false},{"id":"star-hero-young-seed-luck-walk-cool-b-comet","name":"ユラメバンセイバール","profileKey":"walkSaber","stage":"star","white":false},{"id":"star-hero-young-seed-luck-walk-cool-b-crown","name":"ユラメバンセイバーオウ","profileKey":"walkSaber","stage":"star","white":false},{"id":"star-hero-young-seed-luck-walk-cool-b-forest","name":"ユラメバンセイバーレン","profileKey":"walkSaber","stage":"star","white":false},{"id":"star-hero-young-seed-luck-sky-cute-comet","name":"ユラロードフワナル","profileKey":"rioCute","stage":"star","white":false},{"id":"star-hero-young-seed-luck-sky-cute-crown","name":"ユラロードフワナオウ","profileKey":"rioCute","stage":"star","white":false},{"id":"star-hero-young-seed-luck-sky-cute-forest","name":"ユラロードフワナレン","profileKey":"rioCute","stage":"star","white":false},{"id":"star-hero-young-seed-luck-sky-cool-a-comet","name":"ユラロードブレイブル","profileKey":"rioBrave","stage":"star","white":false},{"id":"star-hero-young-seed-luck-sky-cool-a-crown","name":"ユラロードブレイブオウ","profileKey":"rioBrave","stage":"star","white":false},{"id":"star-hero-young-seed-luck-sky-cool-a-forest","name":"ユラロードブレイブレン","profileKey":"rioBrave","stage":"star","white":false},{"id":"star-hero-young-seed-luck-sky-cool-b-comet","name":"ユラロードセイバール","profileKey":"rioSaber","stage":"star","white":false},{"id":"star-hero-young-seed-luck-sky-cool-b-crown","name":"ユラロードセイバーオウ","profileKey":"rioSaber","stage":"star","white":false},{"id":"star-hero-young-seed-luck-sky-cool-b-forest","name":"ユラロードセイバーレン","profileKey":"rioSaber","stage":"star","white":false}].map(c=>Object.freeze({...c,ability:CHARACTER_PROFILES[c.profileKey]})));
const characterById=new Map(TAG_CHARACTERS.map(c=>[c.id,c]));
export function opponentSpec(id){const legacy=OPPONENTS.find(p=>p.id===id);if(legacy)return legacy;const c=characterById.get(id);if(!c)return null;return {...OPPONENTS.find(p=>p.id===c.ability.style),id:c.id,character:c.id,name:c.name,hint:c.ability.hint,movement:c.ability,stage:c.stage};}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const surface=(x,z)=>PADS.some(p=>Math.hypot(x-p.x,z-p.z)<=p.r)?'grip':'ice';
// Preserve short taps between render frames without turning a hold into repeats.
export function consumeJump(buffer,held,wasHeld){if(buffer.release){buffer.release=false;return false;}if(buffer.pending>0){if(wasHeld)return false;buffer.pending--;buffer.release=!held;return true;}return held;}
export function actor(x,z){return{x,z,y:0,vx:0,vz:0,vy:0,yaw:0,grounded:true,jumps:0,jumpHeld:false};}
export function clearPath(a,b,padding=BODY.radius){return !BUMPERS.some(o=>{if(Math.min(a.y??0,b.y??0)>=o.h-.001||((a.y??0)>=o.h-.001&&Math.hypot(a.x-o.x,a.z-o.z)<o.r))return false;const dx=b.x-a.x,dz=b.z-a.z,t=clamp(((o.x-a.x)*dx+(o.z-a.z)*dz)/(dx*dx+dz*dz||1),0,1);return Math.hypot(a.x+dx*t-o.x,a.z+dz*t-o.z)<o.r+padding;});}
export function valid(p,padding=BODY.radius){return (p.x/(FIELD.a-padding))**2+(p.z/(FIELD.b-padding))**2<.99&&BUMPERS.every(o=>Math.hypot(p.x-o.x,p.z-o.z)>o.r+padding+.1);}
function bounce(a,nx,nz,restitution){const v=a.vx*nx+a.vz*nz;if(v<0){a.vx-=(1+restitution)*v*nx;a.vz-=(1+restitution)*v*nz;}}
export function move(a,input={},dt=STEP){
 let x=Number.isFinite(input.x)?input.x:0,z=Number.isFinite(input.z)?input.z:0;const len=Math.hypot(x,z);if(len>1){x/=len;z/=len;}
 const tuning=a.tuning??{accel:1,speed:1,turn:1,brake:1};
 const oldY=a.y,ground=a.grounded,grip=a.y>0||surface(a.x,a.z)==='grip',drag=ground?(grip?4.7:.32)*tuning.brake:.08;
 if(input.jump&&!a.jumpHeld&&a.jumps<3){a.vy=[10.5,10,9.5][a.jumps];a.jumps++;a.grounded=false;}
 if(!input.jump&&a.jumpHeld&&a.vy>3)a.vy*=.56;a.jumpHeld=!!input.jump;
 const velocity=Math.hypot(a.vx,a.vz);if(velocity>.1){const nx=a.vx/velocity,nz=a.vz/velocity,dot=x*nx+z*nz;x=dot*nx+(x-dot*nx)*tuning.turn;z=dot*nz+(z-dot*nz)*tuning.turn;}
 const decay=Math.exp(-drag*dt),force=BODY.accel*tuning.accel*(ground?(grip?2.7:1):.22);
 a.vx=a.vx*decay+x*force*dt;a.vz=a.vz*decay+z*force*dt;
 const speed=Math.hypot(a.vx,a.vz),max=(input.dash?BODY.dash:BODY.max)*tuning.speed;if(speed>max){const target=Math.min(speed,Math.max(max,(a.tuning?velocity:speed)-16*dt));a.vx*=target/speed;a.vz*=target/speed;}
 a.x+=a.vx*dt;a.z+=a.vz*dt;
 const support=BUMPERS.reduce((h,o)=>oldY>=o.h-.001&&Math.hypot(a.x-o.x,a.z-o.z)<o.r-.2?Math.max(h,o.h):h,0);
 if(a.grounded&&a.y>support+.001)a.grounded=false;
 if(!a.grounded){a.vy-=BODY.gravity*dt;a.y+=a.vy*dt;if(a.y<=support&&a.vy<=0){a.y=support;a.vy=0;a.grounded=true;a.jumps=0;}}
 for(const o of BUMPERS){if(a.y>=o.h-.001)continue;const dx=a.x-o.x,dz=a.z-o.z,d=Math.hypot(dx,dz),r=o.r+BODY.radius;if(d<r){const nx=d>1e-8?dx/d:1,nz=d>1e-8?dz/d:0;a.x=o.x+nx*r;a.z=o.z+nz*r;bounce(a,nx,nz,.78);}}
 const ax=FIELD.a-BODY.radius,bz=FIELD.b-BODY.radius,q=Math.hypot(a.x/ax,a.z/bz);if(q>1){a.x/=q;a.z/=q;const nx=-a.x/(ax*ax),nz=-a.z/(bz*bz),n=Math.hypot(nx,nz);bounce(a,nx/n,nz/n,.4);}
 if(Math.hypot(a.vx,a.vz)>.2)a.yaw=Math.atan2(a.vx,a.vz);
 return a;
}
export function touching(a,b){return Math.hypot(a.x-b.x,a.z-b.z)<=BODY.radius*2&&Math.abs(a.y-b.y)<BODY.height&&clearPath(a,b,.05);}
export function separate(a,b){const dx=b.x-a.x,dz=b.z-a.z,d=Math.hypot(dx,dz);if(d>=BODY.radius*2||Math.abs(a.y-b.y)>=BODY.height)return;const nx=d>1e-8?dx/d:1,nz=d>1e-8?dz/d:0,over=(BODY.radius*2-d)/2;a.x-=nx*over;a.z-=nz*over;b.x+=nx*over;b.z+=nz*over;const rel=(b.vx-a.vx)*nx+(b.vz-a.vz)*nz;if(rel<0){const f=-rel*.55;a.vx-=nx*f;a.vz-=nz*f;b.vx+=nx*f;b.vz+=nz*f;}}
const NODES=[];for(let x=-30;x<=30;x+=5)for(let z=-25;z<=25;z+=5)if(valid({x,z},BODY.radius+.5))NODES.push({x,z});
const LINKS=NODES.map(a=>NODES.flatMap((b,i)=>Math.hypot(a.x-b.x,a.z-b.z)<7.2&&a!==b&&clearPath(a,b,BODY.radius+.45)?[i]:[]));
function waypoint(a,target){if(clearPath(a,target,BODY.radius-.04))return target;
 const nearest=p=>NODES.reduce((best,n,i)=>Math.hypot(n.x-p.x,n.z-p.z)<best.d&&clearPath(p,n,BODY.radius-.04)?{i,d:Math.hypot(n.x-p.x,n.z-p.z)}:best,{i:-1,d:Infinity}).i;
 const start=nearest(a),end=nearest(target);if(start<0||end<0)return {x:a.x-a.vx,z:a.z-a.vz};
 const open=new Set([start]),cost=new Map([[start,0]]),prev=new Map();let at=start;
 while(open.size){at=[...open].reduce((best,i)=>cost.get(i)+Math.hypot(NODES[i].x-NODES[end].x,NODES[i].z-NODES[end].z)<cost.get(best)+Math.hypot(NODES[best].x-NODES[end].x,NODES[best].z-NODES[end].z)?i:best);if(at===end)break;open.delete(at);for(const i of LINKS[at]){const c=cost.get(at)+Math.hypot(NODES[i].x-NODES[at].x,NODES[i].z-NODES[at].z);if(c<(cost.get(i)??Infinity)){cost.set(i,c);prev.set(i,at);open.add(i);}}}
 if(at!==end)return NODES[start];while(prev.has(at)&&prev.get(at)!==start)at=prev.get(at);return NODES[at];
}
export function brain(profile='cutoff'){if(!opponentSpec(profile))throw Error('invalid opponent');return{profile,next:0,aim:null,lastJump:-10};}
function roofPursuit(a,other){
 const roof=BUMPERS.find(o=>other.y>=o.h-.05&&Math.hypot(other.x-o.x,other.z-o.z)<o.r);
 if(!roof||a.grounded&&a.y>=roof.h-.05)return null;
 const dx=a.x-roof.x,dz=a.z-roof.z,d=Math.hypot(dx,dz),approach={x:roof.x+dx/(d||1)*(roof.r+BODY.radius+3),z:roof.z+dz/(d||1)*(roof.r+BODY.radius+3)};
 if(d>roof.r+BODY.radius+7)return{target:waypoint(a,approach),jump:false};
 const jump=(a.grounded||a.jumpHeld)?(a.grounded||a.vy>4.2):(a.jumps<3&&a.vy<4.3);
 return{target:{x:other.x,z:other.z},jump};
}
export function pilot(a,other,chasing,time,memory){
 const profile=opponentSpec(memory.profile)??OPPONENTS[1],roof=chasing?roofPursuit(a,other):null;
 if(roof)memory.aim=roof.target;
 if(!roof&&(time>=memory.next||!memory.aim)){memory.next=time+.23;
  if(chasing){const lead=clamp(Math.hypot(a.x-other.x,a.z-other.z)/25,.08,profile.lead);let target={x:other.x+other.vx*lead,z:other.z+other.vz*lead};if(!valid(target))target={x:other.x,z:other.z};memory.aim=waypoint(a,target);}
  else {const threat={x:other.x+other.vx*.35,z:other.z+other.vz*.35};let best=-Infinity,target=NODES[0];for(const n of NODES){const from=Math.hypot(n.x-a.x,n.z-a.z);if(from<8||from>24||!clearPath(a,n,BODY.radius-.04))continue;const margin=1-Math.hypot(n.x/(FIELD.a-2),n.z/(FIELD.b-2)),cover=clearPath(threat,n,BODY.radius)?0:1,turn=(a.vx*(n.x-a.x)+a.vz*(n.z-a.z))/(Math.hypot(a.vx,a.vz)*from||1),score=Math.hypot(n.x-threat.x,n.z-threat.z)+margin*profile.margin+cover*profile.cover-turn*profile.turn-from*.14;if(score>best){best=score;target=n;}}memory.aim=waypoint(a,target);}
 }
 const dx=memory.aim.x-a.x,dz=memory.aim.z-a.z,d=Math.hypot(dx,dz),speed=Math.min((chasing?BODY.dash:BODY.max)*(a.tuning?.speed??1),d*2+(chasing?Math.min(7,Math.hypot(other.vx,other.vz)*.5):0)),vx=dx/(d||1)*speed,vz=dz/(d||1)*speed;
 let x=vx-a.vx,z=vz-a.vz,n=Math.hypot(x,z);if(n>1){x/=n;z/=n;}
 const jump=roof?roof.jump:!chasing&&((!a.grounded&&a.jumpHeld&&a.vy>3)||(Math.hypot(a.x-other.x,a.z-other.z)<7&&a.grounded&&time-memory.lastJump>2.5));if(jump&&a.grounded)memory.lastJump=time;
 return{x,z,jump,dash:chasing&&d>3.3};
}
export function match(role='escape',duration=35,opponent='cutoff'){if(!['escape','chase'].includes(role)||!Number.isFinite(duration)||duration<=0||duration>120)throw Error('invalid round');const cpu=actor(22,14),spec=opponentSpec(opponent);if(!spec)throw Error('invalid opponent');if(spec.movement)cpu.tuning=spec.movement;return{rules:RULES,opponent,role,duration,time:0,countdown:2,phase:'countdown',player:actor(-22,-14),cpu,memory:brain(opponent),result:null};}
export function step(s,input={},dt=STEP){if(!['countdown','playing'].includes(s.phase))return s;if(s.countdown>0){s.countdown=Math.max(0,s.countdown-dt);if(!s.countdown)s.phase='playing';return s;}s.phase='playing';const elapsed=Math.min(dt,s.duration-s.time);s.time=Math.min(s.duration,s.time+elapsed);move(s.player,input,elapsed);move(s.cpu,pilot(s.cpu,s.player,s.role==='escape',s.time,s.memory),elapsed);
 const caught=touching(s.player,s.cpu);separate(s.player,s.cpu);if(caught||s.time>=s.duration){s.phase='finished';s.result={caught,win:s.role==='chase'?caught:!caught,time:s.time};}return s;}
// Broad-world revision is deliberately separate from the old circular test rules.
export const WORLD_RADII=Object.freeze({walkCute:3.2,walkBrave:4.5,walkSaber:3.6,rioCute:3.7,rioBrave:4.6,rioSaber:3.5});
export const WORLD_RULES='tag-ice-basin-v13';
export const WORLD_DASH_FORCE=1.18;
export const WORLD=Object.freeze({width:640,depth:480,duration:90,grid:16});
export const WORLD_HILL=Object.freeze({x:-267,z:-20,rx:44,rz:108,h:8,cell:4});
export const WORLD_BASIN=Object.freeze({x:112,z:172,rx:54,rz:44,depth:5.5,brake:Object.freeze({x:112,z:172,w:16,d:24})});
export const WORLD_RISE=Object.freeze({x:116,z:0,halfW:48,halfD:48,topW:16,topD:16,h:7.5});
export const WORLD_ICE_LOOP=Object.freeze([{x:116,z:-48,w:112,d:10},{x:116,z:48,w:112,d:10},{x:60,z:0,w:10,d:96},{x:172,z:0,w:10,d:96}].map(Object.freeze));
export const WORLD_DECK=Object.freeze({x:260,z:0,w:28,length:170,ramp:64,h:13});const deck=WORLD_DECK;
export const WORLD_RIDGE=Object.freeze({start:WORLD_RISE.x+WORLD_RISE.topW,end:WORLD_DECK.x-WORLD_DECK.w/2,startHeight:WORLD_RISE.h,endHeight:WORLD_DECK.h,halfTop:9,halfBase:44,cap:32});
function ridgeGround(x,z){const r=WORLD_RIDGE;if(x<r.start-r.cap||x>WORLD_DECK.x+WORLD_DECK.w/2||Math.abs(z)>r.halfBase)return 0;const along=clamp((x-r.start)/(r.end-r.start),0,1),cap=clamp((x-r.start+r.cap)/r.cap,0,1),across=1-clamp((Math.abs(z)-r.halfTop)/(r.halfBase-r.halfTop),0,1);return(r.startHeight+(r.endHeight-r.startHeight)*along)*cap*across;}
function basinGround(x,z){const b=WORLD_BASIN,q=((x-b.x)/b.rx)**2+((z-b.z)/b.rz)**2;return q<1?-b.depth*(1-q)**2:0;}
function rawGround(x,z){const q=((x-WORLD_HILL.x)/WORLD_HILL.rx)**2+((z-WORLD_HILL.z)/WORLD_HILL.rz)**2;const r=WORLD_RISE,t=Math.max((Math.abs(x-r.x)-r.topW)/(r.halfW-r.topW),(Math.abs(z-r.z)-r.topD)/(r.halfD-r.topD));return Math.max(q<1?WORLD_HILL.h*(1-q)**2:0,r.h*(1-clamp(t,0,1)),ridgeGround(x,z))+basinGround(x,z);}
// Identical triangles in physics and rendering: feet cannot sink into a smoothed mesh.
export function worldGroundHeight(x,z){const h=WORLD_HILL;if((Math.abs(x-h.x)>h.rx+h.cell||Math.abs(z-h.z)>h.rz+h.cell)&&(Math.abs(x-WORLD_RISE.x)>WORLD_RISE.halfW+h.cell||Math.abs(z-WORLD_RISE.z)>WORLD_RISE.halfD+h.cell)&&(x<WORLD_RIDGE.start-WORLD_RIDGE.cap-h.cell||x>WORLD_DECK.x+WORLD_DECK.w/2+h.cell||Math.abs(z)>WORLD_RIDGE.halfBase+h.cell)&&(Math.abs(x-WORLD_BASIN.x)>WORLD_BASIN.rx+h.cell||Math.abs(z-WORLD_BASIN.z)>WORLD_BASIN.rz+h.cell))return 0;const x0=Math.floor(x/h.cell)*h.cell,z0=Math.floor(z/h.cell)*h.cell,u=(x-x0)/h.cell,v=(z-z0)/h.cell,a=rawGround(x0,z0),b=rawGround(x0+h.cell,z0),c=rawGround(x0,z0+h.cell),d=rawGround(x0+h.cell,z0+h.cell);return u+v<=1?a+(b-a)*u+(c-a)*v:d+(c-d)*(1-u)+(b-d)*(1-v);}
export function worldGradient(x,z){return{x:clamp((worldHeight(x+.25,z)-worldHeight(x-.25,z))*2,-.36,.36),z:clamp((worldHeight(x,z+.25)-worldHeight(x,z-.25))*2,-.36,.36)};}
// Built once for rendering; every painted point uses the shared physical ground.
export function worldBasinContours(){
 const positions=[],indices=[];
 for(const radius of[.54,.86])for(let i=0;i<96;i++){
  const start=positions.length/3;
  for(const angle of[i/96*Math.PI*2,(i+1)/96*Math.PI*2])for(const width of[-.006,.006]){
   const x=WORLD_BASIN.x+Math.cos(angle)*WORLD_BASIN.rx*(radius+width),z=WORLD_BASIN.z+Math.sin(angle)*WORLD_BASIN.rz*(radius+width);
   positions.push(x,worldGroundHeight(x,z)+.06,z);
  }
  indices.push(start,start+2,start+1,start+1,start+2,start+3);
 }
 return{positions,indices};
}
export const WORLD_GARDEN=Object.freeze({x:-116,z:128,halfW:56,halfD:80,narrowWidth:8,h:9});
export const WORLD_GARDEN_BEDS=Object.freeze([{x:-128,z:96,w:24,d:28},{x:-96,z:96,w:24,d:28},{x:-120,z:160,w:56,d:28}].map(b=>Object.freeze({...b,h:WORLD_GARDEN.h,kind:'garden'})));
export const WORLD_PATHS=Object.freeze([{...WORLD_BASIN.brake},{x:56,z:128,w:112,d:8},{x:0,z:0,w:28,d:480},{x:-46,z:0,w:548,d:24},{x:260,z:0,w:28,d:480},{x:228,z:0,w:24,d:328},{x:244,z:-164,w:56,d:24},{x:244,z:164,w:56,d:24},{x:34,z:-80,w:40,d:16},{x:116,z:0,w:18,d:96},{x:-32,z:128,w:64,d:16},{x:-116,z:128,w:112,d:16},{x:-68,z:88,w:16,d:64},{x:-164,z:168,w:16,d:64},{x:-112,z:96,w:8,d:56},{x:(WORLD_RIDGE.start+WORLD_RIDGE.end)/2,z:0,w:WORLD_RIDGE.end-WORLD_RIDGE.start,d:18},{x:180,z:0,w:16,d:104}].map(Object.freeze));
export const WORLD_COURTYARD=Object.freeze({x:0,z:-80,halfW:38,halfD:32,wall:8,narrowWidth:8,wideNorth:20,wideEast:16,h:18,archBase:15});
function courtyardParts(){const c=WORLD_COURTYARD,parts=[],wall=(x,z,w,d)=>parts.push(Object.freeze({x:c.x+x,z:c.z+z,w,d,h:c.h,kind:'courtyard'})),arch=(x,z,w,d)=>parts.push(Object.freeze({x:c.x+x,z:c.z+z,w,d,h:c.h-c.archBase,base:c.archBase,kind:'arch'}));wall(-c.halfW+c.wall/2,0,c.wall,c.halfD*2);for(const side of[-1,1]){const north=c.halfW-c.wideNorth/2,south=c.halfW-c.narrowWidth/2,east=c.halfD-c.wideEast/2;wall(side*(c.wideNorth/2+north/2),-c.halfD,north,c.wall);wall(side*(c.narrowWidth/2+south/2),c.halfD,south,c.wall);wall(c.halfW-c.wall/2,side*(c.wideEast/2+east/2),c.wall,east);}arch(0,c.halfD,c.narrowWidth,c.wall);arch(0,-c.halfD,c.wideNorth,c.wall);arch(c.halfW-c.wall/2,0,c.wall,c.wideEast);return parts;}
export const WORLD_BLOCKS=Object.freeze([...Array.from({length:30},(_,i)=>{const col=i%6,row=Math.floor(i/6),x=(col-2.5)*76,z=(row-2)*78;return Object.freeze({x,z,w:34+(i%3)*4,d:32+(i%2)*8,h:30+(i%4)*6});}).filter(b=>!(Math.abs(b.x-WORLD_BASIN.x)<WORLD_BASIN.rx+b.w/2&&Math.abs(b.z-WORLD_BASIN.z)<WORLD_BASIN.rz+b.d/2)&&b.z!==0&&!(Math.abs(b.x)<55&&Math.abs(b.z)<90)&&!(Math.abs(b.x-WORLD_GARDEN.x)<32&&Math.abs(b.z-WORLD_GARDEN.z)<WORLD_GARDEN.halfD)),
 ...courtyardParts(),...WORLD_GARDEN_BEDS]);
export const WORLD_TREES=Object.freeze(Array.from({length:100},(_,i)=>({x:-292+(i%10)*61,z:-222+Math.floor(i/10)*49,r:2.8,h:11})).filter(p=>(((p.x-WORLD_BASIN.x)/WORLD_BASIN.rx)**2+((p.z-WORLD_BASIN.z)/WORLD_BASIN.rz)**2>1.15)&&(Math.abs(p.x-WORLD_GARDEN.x)>WORLD_GARDEN.halfW||Math.abs(p.z-WORLD_GARDEN.z)>WORLD_GARDEN.halfD)&&Math.abs(p.x)>=25&&Math.abs(p.z)>=22&&WORLD_BLOCKS.every(b=>Math.abs(p.x-b.x)>b.w/2+8||Math.abs(p.z-b.z)>b.d/2+8)&&Math.abs(p.x-260)>=23&&WORLD_PATHS.every(r=>Math.abs(p.x-r.x)>r.w/2+6||Math.abs(p.z-r.z)>r.d/2+6)).map(p=>Object.freeze({...p,y:worldGroundHeight(p.x,p.z)})));

export function worldHeight(x,z){const ground=worldGroundHeight(x,z);if(Math.abs(x-deck.x)>deck.w/2)return ground;const az=Math.abs(z);return Math.max(ground,az<=deck.length/2?deck.h:az<deck.length/2+deck.ramp?deck.h*(1-(az-deck.length/2)/deck.ramp):0);}
export function worldSurface(x,z){return WORLD_PATHS.some(p=>Math.abs(x-p.x)<=p.w/2&&Math.abs(z-p.z)<=p.d/2)?'grip':'ice';}
export function worldValid(p,padding=BODY.radius){return Math.abs(p.x)<WORLD.width/2-padding&&Math.abs(p.z)<WORLD.depth/2-padding&&WORLD_BLOCKS.every(b=>(p.y??worldHeight(p.x,p.z))+5.4<=(b.base??0)+.001||Math.abs(p.x-b.x)>b.w/2+padding||Math.abs(p.z-b.z)>b.d/2+padding)&&WORLD_TREES.every(t=>Math.hypot(p.x-t.x,p.z-t.z)>t.r+padding); }
// Slab intersection tests the whole segment; roof/floor separation cannot tag through a wall.
// Immutable broad-phase bounds are shared by navigation, sight and camera rays.
// The narrow phase retains the same divisions, axis order and contact rules.
const sightBoxes=WORLD_BLOCKS.map(b=>({minX:b.x-b.w/2,maxX:b.x+b.w/2,minZ:b.z-b.d/2,maxZ:b.z+b.d/2,minY:b.base??0,maxY:(b.base??0)+b.h}));
const sightRaisedGround=[
 {minX:WORLD_HILL.x-WORLD_HILL.rx-WORLD_HILL.cell,maxX:WORLD_HILL.x+WORLD_HILL.rx+WORLD_HILL.cell,minZ:WORLD_HILL.z-WORLD_HILL.rz-WORLD_HILL.cell,maxZ:WORLD_HILL.z+WORLD_HILL.rz+WORLD_HILL.cell},
 {minX:WORLD_RISE.x-WORLD_RISE.halfW-WORLD_HILL.cell,maxX:WORLD_RISE.x+WORLD_RISE.halfW+WORLD_HILL.cell,minZ:WORLD_RISE.z-WORLD_RISE.halfD-WORLD_HILL.cell,maxZ:WORLD_RISE.z+WORLD_RISE.halfD+WORLD_HILL.cell},
 {minX:WORLD_RIDGE.start-WORLD_RIDGE.cap-WORLD_HILL.cell,maxX:WORLD_DECK.x+WORLD_DECK.w/2+WORLD_HILL.cell,minZ:-WORLD_RIDGE.halfBase-WORLD_HILL.cell,maxZ:WORLD_RIDGE.halfBase+WORLD_HILL.cell},
 {minX:WORLD_DECK.x-WORLD_DECK.w/2,maxX:WORLD_DECK.x+WORLD_DECK.w/2,minZ:-WORLD_DECK.length/2-WORLD_DECK.ramp,maxZ:WORLD_DECK.length/2+WORLD_DECK.ramp}
];
const sightMaxGround=Math.max(WORLD_HILL.h,WORLD_RISE.h,WORLD_DECK.h,WORLD_RIDGE.startHeight,WORLD_RIDGE.endHeight);
export function worldSight(a,b,padding=0){
 const ax=a.x,az=a.z,ay=a.y??2,by=b.y??2,dx=b.x-ax,dz=b.z-az,dy=by-ay,minX=Math.min(ax,b.x),maxX=Math.max(ax,b.x),minZ=Math.min(az,b.z),maxZ=Math.max(az,b.z),minY=Math.min(ay,by),maxY=Math.max(ay,by);
 for(const box of sightBoxes){
  const x0=box.minX-padding,x1=box.maxX+padding,z0=box.minZ-padding,z1=box.maxZ+padding;
  if(maxX<Math.min(x0,x1)||minX>Math.max(x0,x1)||maxZ<Math.min(z0,z1)||minZ>Math.max(z0,z1)||maxY<box.minY||minY>box.maxY)continue;
  let lo=0,hi=1;
  if(Math.abs(dx)<1e-9){if(ax<x0||ax>x1)continue;}else{const t0=(x0-ax)/dx,t1=(x1-ax)/dx;lo=Math.max(lo,Math.min(t0,t1));hi=Math.min(hi,Math.max(t0,t1));}
  if(Math.abs(dz)<1e-9){if(az<z0||az>z1)continue;}else{const t0=(z0-az)/dz,t1=(z1-az)/dz;lo=Math.max(lo,Math.min(t0,t1));hi=Math.min(hi,Math.max(t0,t1));}
  if(Math.abs(dy)<1e-9){if(ay<box.minY||ay>box.maxY)continue;}else{const t0=(box.minY-ay)/dy,t1=(box.maxY-ay)/dy;lo=Math.max(lo,Math.min(t0,t1));hi=Math.min(hi,Math.max(t0,t1));}
  if(lo<=hi&&hi>0&&lo<1)return false;
 }
 for(const tree of WORLD_TREES){
  const reach=tree.r+padding,low=tree.y,high=tree.y+tree.h;
  if(reach<=0||maxX<tree.x-reach||minX>tree.x+reach||maxZ<tree.z-reach||minZ>tree.z+reach||maxY<low||minY>high)continue;
  let lo=0,hi=1;if(Math.abs(dy)<1e-9){if(ay<low||ay>high)continue;}else{const u=(low-ay)/dy,v=(high-ay)/dy;lo=Math.max(0,Math.min(u,v));hi=Math.min(1,Math.max(u,v));if(lo>hi)continue;}
  const t=clamp(((tree.x-ax)*dx+(tree.z-az)*dz)/(dx*dx+dz*dz||1),lo,hi);if(Math.hypot(ax+dx*t-tree.x,az+dz*t-tree.z)<reach)return false;
 }
 // Above the highest terrain, or over flat/lowered land, no ground sample can block.
 // Expand the raised bounds by a mesh cell so rim triangles are never skipped.
 if(minY>=sightMaxGround+.05||minY>=.05&&!sightRaisedGround.some(r=>maxX>=r.minX&&minX<=r.maxX&&maxZ>=r.minZ&&minZ<=r.maxZ))return true;
 const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/3));for(let i=1;i<steps;i++){const t=i/steps,x=ax+dx*t,z=az+dz*t,y=ay+dy*t;if(y<worldHeight(x,z)+.05)return false;}return true;
}
export function worldMove(a,input={},dt=STEP){
 const radius=a.radius??2.7;let x=Number.isFinite(input.x)?input.x:0,z=Number.isFinite(input.z)?input.z:0,n=Math.hypot(x,z);if(n>1){x/=n;z/=n;}
 const t=a.tuning??{accel:1,speed:1,turn:1,brake:1},before={x:a.x,z:a.z,y:a.y},ground=a.grounded,grip=worldSurface(a.x,a.z)==='grip';
 if(input.jump&&!a.jumpHeld&&a.jumps<3){a.vy=[10.5,10,9.5][a.jumps++];a.grounded=false;}if(!input.jump&&a.jumpHeld&&a.vy>3)a.vy*=.56;a.jumpHeld=!!input.jump;
 const velocity=Math.hypot(a.vx,a.vz);if(velocity>.1){const nx=a.vx/velocity,nz=a.vz/velocity,dot=x*nx+z*nz;x=dot*nx+(x-dot*nx)*t.turn;z=dot*nz+(z-dot*nz)*t.turn;}
 const drag=ground?(grip?4.7:.32)*t.brake:.08,decay=Math.exp(-drag*dt),force=BODY.accel*t.accel*(ground?(grip?2.7:1):.22)*(ground&&input.dash?WORLD_DASH_FORCE:1);
 a.vx=a.vx*decay+x*force*dt;a.vz=a.vz*decay+z*force*dt;
 const slope=worldGradient(a.x,a.z),rest=ground&&grip&&Math.hypot(x,z)<.05&&velocity<.45&&Math.hypot(slope.x,slope.z)<.32*t.brake;if(rest){a.vx=0;a.vz=0;}else if(ground){a.vx-=slope.x*BODY.gravity*dt;a.vz-=slope.z*BODY.gravity*dt;}
 const speed=Math.hypot(a.vx,a.vz),downhill=ground?clamp(-(slope.x*a.vx+slope.z*a.vz)/(Math.hypot(a.vx,a.vz)||1)*10,0,3):0,max=(input.dash?BODY.dash:BODY.max)*t.speed+downhill;if(speed>max){const cap=Math.min(speed,Math.max(max,velocity-16*dt));a.vx*=cap/speed;a.vz*=cap/speed;}
 a.x+=a.vx*dt;a.z+=a.vz*dt;
 for(const box of WORLD_BLOCKS){if(a.y>=(box.base??0)+box.h-.01||a.y+5.4<=(box.base??0)+.001)continue;const minX=box.x-box.w/2-radius,maxX=box.x+box.w/2+radius,minZ=box.z-box.d/2-radius,maxZ=box.z+box.d/2+radius;if(a.x>minX&&a.x<maxX&&a.z>minZ&&a.z<maxZ){const options=[[Math.abs(a.x-minX),'x',minX,-1],[Math.abs(maxX-a.x),'x',maxX,1],[Math.abs(a.z-minZ),'z',minZ,-1],[Math.abs(maxZ-a.z),'z',maxZ,1]];const chosen=options.reduce((m,v)=>v[0]<m[0]?v:m);a[chosen[1]]=chosen[2];bounce(a,chosen[1]==='x'?chosen[3]:0,chosen[1]==='z'?chosen[3]:0,.2);}}
 for(const tree of WORLD_TREES){if(a.y>tree.y+tree.h||a.y+5.4<tree.y)continue;const dx=a.x-tree.x,dz=a.z-tree.z,d=Math.hypot(dx,dz),r=tree.r+radius;if(d<r){const nx=d>1e-8?dx/d:1,nz=d>1e-8?dz/d:0;a.x=tree.x+nx*r;a.z=tree.z+nz*r;bounce(a,nx,nz,.2);}}
 for(const axis of['x','z'])for(const sign of[-1,1]){const edge={x:a.x,z:a.z};edge[axis]+=sign*radius;if(sign*(a[axis]-before[axis])>0&&worldHeight(edge.x,edge.z)>a.y+.6&&!terrainContinuous(a,edge)){a[axis]=before[axis];a[axis==='x'?'vx':'vz']*= -.2;break;}}
 a.x=clamp(a.x,-WORLD.width/2+radius,WORLD.width/2-radius);a.z=clamp(a.z,-WORLD.depth/2+radius,WORLD.depth/2-radius);
 const floor=worldHeight(a.x,a.z);if(a.grounded){if(floor<=before.y+.6&&floor>=before.y-.6)a.y=floor;else if(floor>before.y+.6){a.x=before.x;a.z=before.z;a.vx=0;a.vz=0;}else a.grounded=false;}
 if(!a.grounded&&floor>before.y+.6){a.x=before.x;a.z=before.z;}
 if(!a.grounded){a.vy-=BODY.gravity*dt;a.y+=a.vy*dt;const landing=worldHeight(a.x,a.z);if(a.y<=landing&&a.vy<=0){a.y=landing;a.vy=0;a.grounded=true;a.jumps=0;}}
 if(Math.hypot(a.vx,a.vz)>.2)a.yaw=Math.atan2(a.vx,a.vz);return a;
}
function terrainContinuous(a,b){const steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)*2));let h=worldHeight(a.x,a.z);for(let i=1;i<=steps;i++){const t=i/steps,next=worldHeight(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t);if(Math.abs(next-h)>.3)return false;h=next;}return true;}
export function worldTraversable(a,b,padding=BODY.radius+.2){if(!worldSight({...a,y:worldHeight(a.x,a.z)+2},{...b,y:worldHeight(b.x,b.z)+2},padding))return false;const steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)*2));let h=worldHeight(a.x,a.z);for(let i=1;i<=steps;i++){const t=i/steps,next=worldHeight(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t);if(Math.abs(next-h)>.3)return false;h=next;}return true;}
// A fixed sparse graph, built once. Search runs on decisions, never once per render frame.
const WORLD_NODES=[];for(let z=-224;z<=224;z+=16)for(let x=-304;x<=304;x+=16)if(worldValid({x,z},BODY.radius+1))WORLD_NODES.push({x,z,y:worldHeight(x,z)});
const worldCell=new Map(WORLD_NODES.map((n,i)=>[n.x+','+n.z,i]));
const WORLD_LINKS=WORLD_NODES.map(a=>{const list=[];for(const [dx,dz]of[[16,0],[-16,0],[0,16],[0,-16],[16,16],[16,-16],[-16,16],[-16,-16]]){const i=worldCell.get((a.x+dx)+','+(a.z+dz));if(i===undefined)continue;const b=WORLD_NODES[i];if(Math.abs(b.y-a.y)/Math.hypot(dx,dz)<.32&&worldTraversable(a,b))list.push(i);}return list;});
function segmentClearance(a,b){const dx=b.x-a.x,dz=b.z-a.z,length=dx*dx+dz*dz||1,point=(x,z)=>{const t=clamp(((x-a.x)*dx+(z-a.z)*dz)/length,0,1);return Math.hypot(a.x+dx*t-x,a.z+dz*t-z);};let clearance=Infinity;for(const box of WORLD_BLOCKS){if(Math.max(a.y??0,b.y??0)+5.4<=(box.base??0)+.001)continue;const hx=box.w/2,hz=box.d/2;for(const p of[a,b])clearance=Math.min(clearance,Math.hypot(Math.max(Math.abs(p.x-box.x)-hx,0),Math.max(Math.abs(p.z-box.z)-hz,0)));for(const x of[box.x-hx,box.x+hx])for(const z of[box.z-hz,box.z+hz])clearance=Math.min(clearance,point(x,z));}for(const tree of WORLD_TREES)clearance=Math.min(clearance,point(tree.x,tree.z)-tree.r);return clearance;}
const worldEdgeCache=new Map();
// The player and CPU need at most two widths. Keep exact physical clearance,
// including square wall corners, without rounding a body into a larger size.
const worldWidthCaches=new Map();
function worldWidthEdges(padding){
 let edges=worldWidthCaches.get(padding);
 if(!edges){if(worldWidthCaches.size>=2)worldWidthCaches.delete(worldWidthCaches.keys().next().value);edges=new Map();worldWidthCaches.set(padding,edges);}
 return edges;
}
export const WORLD_NAV_COUNT=WORLD_NODES.length;
function worldNear(p,padding){const candidates=[],gx=Math.round(p.x/16)*16,gz=Math.round(p.z/16)*16,h=worldHeight(p.x,p.z);for(let dz=-32;dz<=32;dz+=16)for(let dx=-32;dx<=32;dx+=16){const i=worldCell.get((gx+dx)+','+(gz+dz));if(i===undefined)continue;const n=WORLD_NODES[i];candidates.push({i,d:Math.hypot(n.x-p.x,n.z-p.z)+Math.abs(n.y-h)*4});}candidates.sort((a,b)=>a.d-b.d);for(const c of candidates)if(worldValid(WORLD_NODES[c.i],padding)&&worldTraversable(p,WORLD_NODES[c.i],Math.max(0,padding-.25)))return c.i;return -1;}
// Geometry-only edge samples are shared across bodies; the cache is limited to graph edges.
const worldTravelCache=new Map();
function routeSamples(a,b){
 const ai=worldCell.get(a.x+','+a.z),bi=worldCell.get(b.x+','+b.z),cacheable=WORLD_NODES[ai]===a&&WORLD_NODES[bi]===b&&WORLD_LINKS[ai].includes(bi),key=ai+'>'+bi;
 if(cacheable&&worldTravelCache.has(key))return worldTravelCache.get(key);
 const length=Math.hypot(b.x-a.x,b.z-a.z),count=Math.max(1,Math.ceil(length/4)),rows=[];
 for(let i=0;i<count;i++){const t=i/count,u=(i+1)/count,m=(t+u)/2,x=a.x+(b.x-a.x)*m,z=a.z+(b.z-a.z)*m,d=length/count;rows.push({length:d,grip:worldSurface(x,z)==='grip',grade:d?(worldHeight(a.x+(b.x-a.x)*u,a.z+(b.z-a.z)*u)-worldHeight(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t))/d:0});}
 if(cacheable)worldTravelCache.set(key,rows);return rows;
}
const worldTravelMemos=new Map();
function routeConfig(a){const t=a.tuning??{},top=BODY.dash*(t.speed??1),accel=BODY.accel*(t.accel??1)*WORLD_DASH_FORCE,brake=t.brake??1,key=top+':'+accel+':'+brake;let memo=worldTravelMemos.get(key);if(!memo){if(worldTravelMemos.size>=2)worldTravelMemos.delete(worldTravelMemos.keys().next().value);memo=new WeakMap();worldTravelMemos.set(key,memo);}return{top,accel,turn:t.turn??1,brake,vx:a.vx??0,vz:a.vz??0,memo};}
function segmentSeconds(config,a,b,prior,initial=false){
 const samples=routeSamples(a,b),cached=config.memo.get(samples);let seconds=cached?.seconds??0,cruise=cached?.cruise??config.top;if(!cached){for(const row of samples){const force=config.accel*(row.grip?2.7:1),drag=(row.grip?4.7:.32)*config.brake,limit=config.top+clamp(-row.grade*10,0,3);cruise=clamp(Math.min(limit,(force-row.grade*BODY.gravity)/drag),2,limit);seconds+=row.length/cruise;}config.memo.set(samples,{seconds,cruise});}
 const dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz)||1;
 if(initial){const forward=(config.vx*dx+config.vz*dz)/length;seconds+=Math.max(0,cruise-Math.max(0,forward))**2/(2*config.accel*cruise);seconds+=Math.max(0,-forward)/(config.accel*Math.max(.3,config.brake));}
 else if(prior){const ux=a.x-prior.x,uz=a.z-prior.z,cos=(ux*dx+uz*dz)/((Math.hypot(ux,uz)||length)*length);seconds+=Math.max(0,1-cos)*.22/Math.max(.3,config.turn);}
 return seconds;
}
export function worldRouteSeconds(a,path){const config=routeConfig(a);let seconds=0,from=a,prior=null;for(const to of path){if(Math.hypot(to.x-from.x,to.z-from.z)<1e-6)continue;seconds+=segmentSeconds(config,from,to,prior,prior===null);prior=from;from=to;}return seconds;}
function routePush(heap,item){let at=heap.length;heap.push(item);while(at){const parent=(at-1)>>1;if(heap[parent].f<=item.f)break;heap[at]=heap[parent];at=parent;}heap[at]=item;}
function routePop(heap){const first=heap[0],last=heap.pop();if(heap.length){let at=0;while(at*2+1<heap.length){let child=at*2+1;if(child+1<heap.length&&heap[child+1].f<heap[child].f)child++;if(heap[child].f>=last.f)break;heap[at]=heap[child];at=child;}heap[at]=last;}return first;}
export function worldRoute(a,b){
 const padding=(a.radius??2.7)+.2,start=worldNear(a,padding),end=worldNear(b,padding);if(start<0||end<0)return[];
 const widthEdges=worldWidthEdges(padding),config=routeConfig(a),fastest=Math.max(config.top+3,Math.hypot(config.vx,config.vz)),heuristic=i=>Math.hypot(WORLD_NODES[i].x-WORLD_NODES[end].x,WORLD_NODES[i].z-WORLD_NODES[end].z)/fastest,cost=new Float64Array(WORLD_NODES.length).fill(Infinity),prev=new Int32Array(WORLD_NODES.length).fill(-1),heap=[];
 cost[start]=0;routePush(heap,{i:start,g:0,f:heuristic(start)});let at=-1,visits=0;
 while(heap.length&&visits<WORLD_NODES.length*3){const item=routePop(heap);if(item.g!==cost[item.i])continue;at=item.i;visits++;if(at===end)break;
  for(const i of WORLD_LINKS[at]){const edge=Math.min(at,i)+':'+Math.max(at,i);let clearance=worldEdgeCache.get(edge);if(clearance===undefined){clearance=segmentClearance(WORLD_NODES[at],WORLD_NODES[i]);worldEdgeCache.set(edge,clearance);}if(clearance<padding)continue;
   let allowed=widthEdges.get(edge);if(allowed===undefined){allowed=worldTraversable(WORLD_NODES[at],WORLD_NODES[i],padding);widthEdges.set(edge,allowed);}if(!allowed)continue;
   const from=WORLD_NODES[at],to=WORLD_NODES[i],prior=prev[at]>=0?WORLD_NODES[prev[at]]:a,c=cost[at]+segmentSeconds(config,from,to,prior,prev[at]<0);
   if(c<cost[i]){cost[i]=c;prev[i]=at;routePush(heap,{i,g:c,f:c+heuristic(i)});}
  }
 }
 if(at!==end)return[];const path=[WORLD_NODES[end]];while(at!==start){at=prev[at];if(at<0)return[];path.push(WORLD_NODES[at]);}
 const route=path.reverse(),endNode=route.at(-1),endHeight=worldHeight(b.x,b.z);if(worldValid(b,padding)&&Math.abs(endHeight-endNode.y)<=Math.hypot(b.x-endNode.x,b.z-endNode.z)*.32+.01&&worldTraversable(endNode,b,padding))route.push({x:b.x,z:b.z,y:endHeight});return route;
}


export function worldRouteLookahead(a,path,start=0,threat=null){
 if(!path.length)return 0;let at=start;const remaining=path.slice(start),margin=threat?worldEscapeClearance(a,threat,remaining):-Infinity;
 for(let i=start+1;i<Math.min(path.length,start+5);i++){
  if(!worldTraversable(a,path[i],(a.radius??2.7)-.05))break;
  if(threat&&worldEscapeClearance(a,threat,[path[i]])+.001<margin)break;
  if(worldRouteSeconds(a,[path[i]])>worldRouteSeconds(a,path.slice(start,i+1))*1.03+.02)break;
  at=i;
 }
 return at;
}
export function worldSearchPlan(seen,radius=2.7){const candidates=WORLD_NODES.filter(n=>{const d=Math.hypot(n.x-seen.x,n.z-seen.z);return d>=22&&d<=62&&worldValid(n,radius+.2);}),heading=Math.atan2(seen.vx??0,seen.vz??1),used=new Set(),plan=[];for(const offset of[0,.8,-.8,1.8,-1.8,Math.PI]){let best=-Infinity,pick;for(const n of candidates){if(used.has(n))continue;const dx=n.x-seen.x,dz=n.z-seen.z,d=Math.hypot(dx,dz),score=(dx*Math.sin(heading+offset)+dz*Math.cos(heading+offset))/d*20-Math.abs(d-40)*.2-Math.abs(n.y-(seen.y??0))*.6;if(score>best){best=score;pick=n;}}if(pick){used.add(pick);plan.push({...pick});}}return plan;}
function localPatrol(a,m){m.patrol=(m.patrol??0)+1;const angle=m.patrol*2.399963,tx=a.x+Math.sin(angle)*45,tz=a.z+Math.cos(angle)*45;let best=Infinity,pick=a;for(const n of WORLD_NODES){const d=Math.hypot(n.x-a.x,n.z-a.z);if(d<20||d>70||!worldValid(n,(a.radius??2.7)+.2))continue;const score=Math.hypot(n.x-tx,n.z-tz)+Math.abs(n.y-a.y)*2;if(score<best){best=score;pick=n;}}return {...pick};}
// Inspect the real escape route, not just its endpoint. Only visible threats enter this planner.
export function worldEscapeClearance(a,threat,path,horizon=80){
 if(!path.length)return -Infinity;
 let nearest=Math.hypot(a.x-threat.x,a.z-threat.z),remaining=horizon,from=a;
 for(const to of path){const dx=to.x-from.x,dz=to.z-from.z,length=Math.hypot(dx,dz),portion=Math.min(1,remaining/(length||1)),sx=dx*portion,sz=dz*portion,t=clamp(((threat.x-from.x)*sx+(threat.z-from.z)*sz)/(sx*sx+sz*sz||1),0,1);nearest=Math.min(nearest,Math.hypot(from.x+sx*t-threat.x,from.z+sz*t-threat.z));remaining-=length;if(remaining<=0)break;from=to;}
 return nearest;
}
export function worldEscapePlan(a,threat,preferred){
 const score=n=>Math.hypot(n.x-threat.x,n.z-threat.z)-Math.hypot(n.x-a.x,n.z-a.z)*.35;
 const plan=target=>{const path=worldRoute(a,target);return{target,path,clearance:worldEscapeClearance(a,threat,path)};};
 let best=plan(preferred);const gap=Math.hypot(a.x-threat.x,a.z-threat.z),safe=Math.max((a.radius??2.7)+(threat.radius??2.7)+5,Math.min(28,gap*.6));
 if(best.clearance>=safe)return best;
 // At most one alternative per direction; normal open-ground decisions need only one route.
 const sectors=new Array(8);for(const n of WORLD_NODES){const dx=n.x-a.x,dz=n.z-a.z,d=Math.hypot(dx,dz);if(d<22||d>65||!worldValid(n,(a.radius??2.7)+.2))continue;const sector=Math.floor((Math.atan2(dz,dx)+Math.PI)*4/Math.PI)%8;if(!sectors[sector]||score(n)>score(sectors[sector]))sectors[sector]=n;}
 for(const n of sectors.filter(Boolean).sort((a,b)=>score(b)-score(a))){const candidate=plan(n);if(candidate.clearance>best.clearance+.001||Math.abs(candidate.clearance-best.clearance)<=.001&&score(n)>score(best.target))best=candidate;if(best.clearance>=safe)break;}
 return best;
}
// One room probe per current path leg; old actors and paths are not retained.
const worldSteeringMemos = new WeakMap();
function steeringRoom(a, goal, next) {
 const dx=goal.x-a.x, dz=goal.z-a.z, d=Math.hypot(dx,dz);
 if(!next||d<1e-6)return .25;
 let room=.25;
 for(const r of [1.5,3,6,10]) {
  const to={x:goal.x+dx/d*r,z:goal.z+dz/d*r};
  if(!worldTraversable(goal,to,(a.radius??2.7)+.2))break;
  room=r;
 }
 return room;
}
// Only real input is returned: acceleration, speed caps and collisions stay in worldMove.
export function worldSteering(a, goal, next, {sprint=true,room=10}={}) {
 if(!Number.isFinite(goal?.x)||!Number.isFinite(goal?.z))return {x:0,z:0,dash:false,jump:false};
 const dx=goal.x-a.x,dz=goal.z-a.z,d=Math.hypot(dx,dz),t=a.tuning??{};
 const top=(sprint?BODY.dash:BODY.max)*(t.speed??1);
 // Pass through intermediate points; only the actual destination needs a full stop.
 let speed=next?top:Math.min(top,d*2);
 if(next&&d>1e-6) {
  const nx=next.x-goal.x,nz=next.z-goal.z,length=Math.hypot(nx,nz);
  const cos=length?(dx*nx+dz*nz)/(d*length):1;
  if(cos<.96) {
   const grounded=a.grounded!==false,grip=worldSurface(a.x,a.z)==='grip';
   const drive=BODY.accel*(t.accel??1)*(grounded?(grip?2.7:1):.22)*(grounded&&sprint?WORLD_DASH_FORCE:1);
   const drag=grounded?(grip?4.7:.32)*(t.brake??1):.08;
   // The reserve accounts for discrete waypoint changes and the motor's response time.
   const corner=Math.min(top,Math.sqrt(drive*(t.turn??1)*Math.max(.25,room)*.12/Math.max(.25,1-cos)));
   const v=Math.hypot(a.vx,a.vz),slope=grounded?worldGradient(a.x,a.z):{x:0,z:0};
   const downhill=v>1?-(slope.x*a.vx+slope.z*a.vz)/v*BODY.gravity:0;
   const brake=Math.max(drive*.3,drive+drag*corner-downhill);
   speed=Math.min(speed,Math.sqrt(corner*corner+2*brake*Math.max(0,d-5)));
  }
 }
 let x=dx/(d||1)*speed-a.vx,z=dz/(d||1)*speed-a.vz,n=Math.hypot(x,z);
 if(n>1){x/=n;z/=n;}
 return {x,z,dash:!!sprint,jump:false};
}
export function worldPilot(a,other,chasing,time,m){
 if(time>=m.next||!m.path){m.next=time+.65;const spec=opponentSpec(m.profile)??OPPONENTS[1],style=spec.movement?.style??spec.id,visible=Math.hypot(a.x-other.x,a.z-other.z)<140&&worldSight({...a,y:a.y+3},{...other,y:other.y+3});
 const movement=m.lastDecision?Math.hypot(a.x-m.lastDecision.x,a.z-m.lastDecision.z):Infinity;m.stuck=movement<.4&&m.target&&Math.hypot(m.target.x-a.x,m.target.z-a.z)>10?(m.stuck??0)+1:0;m.lastDecision={x:a.x,z:a.z};
 if(visible){m.seen={x:other.x,z:other.z,y:other.y,vx:other.vx,vz:other.vz};m.seenAt=time;m.searchPlan=null;m.searchIndex=0;}m.visible=visible;let target,plannedPath;if(!chasing&&visible&&Math.hypot(a.x-other.x,a.z-other.z)<55)m.sprintUntil=time+1.6;
 if(chasing&&visible){const horizon=style==='cutoff'?clamp(Math.hypot(a.x-other.x,a.z-other.z)/(BODY.dash*(a.tuning?.speed??1))*.65,.35,2.8):style==='direct'?.18:.8;target={x:other.x+other.vx*horizon,z:other.z+other.vz*horizon,y:other.y};if(!worldValid(target,(a.radius??2.7)+.2)||!worldTraversable(other,target,(other.radius??2.7)-.05))target={x:other.x,z:other.z,y:other.y};m.mode=style==='cutoff'?'intercept':'pursuit';m.goalSince=time;}
 else if(chasing&&m.seen&&time-m.seenAt<18){const last=m.seen,atLast=Math.hypot(a.x-last.x,a.z-last.z)<12;
  if(!atLast&&time-m.seenAt<5.5&&m.stuck<3&&m.path?.length!==0){target={x:last.x,z:last.z,y:last.y};m.mode='last-seen';}
  else{if(!m.searchPlan){m.searchPlan=worldSearchPlan(last,a.radius);m.searchIndex=0;m.goalSince=time;}if(m.target&&m.mode==='search'&&(Math.hypot(a.x-m.target.x,a.z-m.target.z)<8||time-m.goalSince>4||m.stuck>=3)){m.searchIndex++;m.goalSince=time;}target=m.searchPlan[m.searchIndex%m.searchPlan.length];m.mode='search';}
 }
 else if(!chasing&&visible){let best=-Infinity;const candidates=[];for(let i=0;i<WORLD_NODES.length;i+=3){const n=WORLD_NODES[i],distance=Math.hypot(n.x-a.x,n.z-a.z);if(distance<22||distance>75||!worldValid(n,(a.radius??2.7)+.2))continue;candidates.push({n,score:Math.hypot(n.x-other.x,n.z-other.z)-distance*.35});}candidates.sort((a,b)=>b.score-a.score);for(const c of candidates.slice(0,24)){const score=c.score+(worldSight({...other,y:other.y+3},{...c.n,y:c.n.y+3})?0:12+spec.cover*4);if(score>best){best=score;target=c.n;}}if(target){const escape=worldEscapePlan(a,other,target);target=escape.target;plannedPath=escape.path;}m.mode='escape';m.goalSince=time;
 }
 if(!target){if(m.target&&time-(m.goalSince??0)<4&&Math.hypot(a.x-m.target.x,a.z-m.target.z)>8&&m.stuck<3)target=m.target;else{target=localPatrol(a,m);m.goalSince=time;}m.mode='patrol';}
 m.path=plannedPath??worldRoute(a,target);m.target={...target};m.at=worldRouteLookahead(a,m.path,0,!chasing&&visible?m.seen:null);
 }
 const path=m.path??[];while(m.at<path.length-1&&Math.hypot(path[m.at].x-a.x,path[m.at].z-a.z)<2.8)m.at++;const goal=path[m.at]??a,next=path[m.at+1];let memo=worldSteeringMemos.get(a);if(!memo||memo.path!==path||memo.at!==m.at||memo.radius!==a.radius){memo={path,at:m.at,radius:a.radius,room:steeringRoom(a,goal,next)};worldSteeringMemos.set(a,memo);}return worldSteering(a,goal,next,{sprint:chasing||time<(m.sprintUntil??0),room:memo.room});
}
function startSpec(id,name,hint,p,c,swap=false){const pair=(a,b)=>Object.freeze({player:Object.freeze([...a]),cpu:Object.freeze([...b])});return Object.freeze({id,name,hint,escape:pair(p,c),chase:swap?pair(c,p):pair(p,c)});}
export const WORLD_STARTS=Object.freeze([startSpec('boulevard','大通り','直線の勝負',[0,80],[8,-2]),startSpec('hill','氷の丘','坂とすべり',[-245,0],[-309,0],true),startSpec('courtyard','中庭','入口の読み合い',[0,-80],[0,0],true),startSpec('garden','庭のこみち','近道と氷',[-112,64],[-112,128],true),startSpec('basin','氷のくぼ地','勢いと切り返し',[112,132],[112,212],true)]);
export const worldStart=id=>WORLD_STARTS.find(s=>s.id===id);
export function worldNextStart(selection='auto',round=0){if(selection==='auto'){if(!Number.isSafeInteger(round)||round<0)throw Error('invalid start cycle');return WORLD_STARTS[round%WORLD_STARTS.length];}const found=worldStart(selection);if(!found)throw Error('invalid start');return found;}
export function worldMatch(role='escape',duration=WORLD.duration,opponent='cutoff',{playerRadius=2.7,startKey='boulevard'}={}){if(!Number.isFinite(playerRadius)||playerRadius<2||playerRadius>6)throw Error('invalid body');const s=match(role,duration,opponent),area=worldStart(startKey);if(!area)throw Error('invalid start');const points=area[role],spawn=p=>Object.assign(actor(p[0],p[1]),{y:worldHeight(p[0],p[1])});s.rules=WORLD_RULES;s.world=true;s.startKey=startKey;s.player=spawn(points.player);s.player.radius=playerRadius;s.cpu=spawn(points.cpu);if(opponentSpec(opponent).movement)s.cpu.tuning=opponentSpec(opponent).movement;s.cpu.radius=(WORLD_RADII[characterById.get(opponent)?.profileKey]??3.2);if(!worldValid(s.player,playerRadius+.1)||!worldValid(s.cpu,s.cpu.radius+.1)||Math.hypot(s.player.x-s.cpu.x,s.player.z-s.cpu.z)<playerRadius+s.cpu.radius+16)throw Error('unsafe start');const sign=role==='chase'?1:-1,dx=(s.cpu.x-s.player.x)*sign,dz=(s.cpu.z-s.player.z)*sign;s.player.yaw=Math.atan2(dx,dz);s.cameraYaw=Math.atan2(-dx,-dz);s.cpu.yaw=Math.atan2((s.player.x-s.cpu.x)*sign*-1,(s.player.z-s.cpu.z)*sign*-1);s.memory={profile:opponent,next:0};return s;}
export function worldStep(s,input={},dt=STEP){if(!['countdown','playing'].includes(s.phase))return s;if(s.countdown>0){s.countdown=Math.max(0,s.countdown-dt);if(!s.countdown)s.phase='playing';return s;}s.phase='playing';const elapsed=Math.min(dt,s.duration-s.time);s.time=Math.min(s.duration,s.time+elapsed);worldMove(s.player,input,elapsed);worldMove(s.cpu,worldPilot(s.cpu,s.player,s.role==='escape',s.time,s.memory),elapsed);const caught=Math.hypot(s.player.x-s.cpu.x,s.player.z-s.cpu.z)<=(s.player.radius??2.7)+(s.cpu.radius??2.7)&&Math.abs(s.player.y-s.cpu.y)<5.4&&worldSight({...s.player,y:s.player.y+2},{...s.cpu,y:s.cpu.y+2},.05);if(caught||s.time>=s.duration){s.phase='finished';s.result={caught,win:s.role==='chase'?caught:!caught,time:s.time};}return s;}

// Camera planning shares actual wall/arch occlusion, without renderer state.
function cameraRayClear(target,p){return p.y>worldHeight(p.x,p.z)+.2&&worldSight(target,p,.8);}
export function worldCameraPose(target,{yaw=0,pitch=.38,distance=31,minDistance=16,previousYaw=yaw,maxTurn=Math.PI/24}={}){
 const cast=(angle,elevation)=>{const dx=Math.sin(angle)*Math.cos(elevation)*distance,dy=Math.sin(elevation)*distance,dz=Math.cos(angle)*Math.cos(elevation)*distance,at=t=>({x:target.x+dx*t,y:target.y+dy*t,z:target.z+dz*t});let t=1;if(!cameraRayClear(target,at(1))){let low=0,high=1;for(let i=0;i<7;i++){const mid=(low+high)/2;if(cameraRayClear(target,at(mid)))low=mid;else high=mid;}t=Math.max(0,low-.012);}return{position:at(t),yaw:angle,pitch:elevation,distance:distance*t,adjusted:t<.999};};
 let best=cast(yaw,pitch);const delta=Math.atan2(Math.sin(previousYaw-yaw),Math.cos(previousYaw-yaw));if(best.distance>=minDistance){if(Math.abs(delta)>maxTurn){const returning=cast(previousYaw+clamp(-delta,-maxTurn,maxTurn),pitch);returning.adjusted=true;if(returning.distance>=minDistance)return returning;const held=cast(previousYaw,pitch);held.adjusted=true;if(held.distance>=minDistance)return held;}return best;}const sign=delta>0?1:-1;
 for(const offset of[sign*Math.PI/3,sign*Math.PI/2,-sign*Math.PI/3,-sign*Math.PI/2,Math.PI]){const p=cast(yaw+offset,pitch);p.adjusted=true;if(p.distance>=minDistance)return p;if(p.distance>best.distance)best=p;}
 const above=cast(yaw,1.12);above.adjusted=true;return above.distance>best.distance?above:best;
}
// An automatic camera dodge must not steer a held stick/key into another direction.
export function worldCameraInput(memory,x,z,renderYaw){const length=Math.hypot(x,z);if(length>1){x/=length;z/=length;}const previous=Math.hypot(memory.x??0,memory.z??0),direction=length>1e-8&&previous>1e-8?(x*memory.x+z*memory.z)/(Math.hypot(x,z)*previous):1;if(length<.01||previous<.01||direction<.98)memory.yaw=renderYaw;memory.x=x;memory.z=z;const yaw=memory.yaw??renderYaw;return{x:x*Math.cos(yaw)+z*Math.sin(yaw),z:-x*Math.sin(yaw)+z*Math.cos(yaw)};}

// Presentation has its own clock and never mutates a round or its result.
export function createTagFeedback({reducedMotion=false}={}){
 let owner=null,phase=null,event=null,age=0;
 const reset=s=>{owner=s;phase=s?.phase??null;event=null;age=0;};
 return{reset,stop(){event=null;age=0;},get active(){return !!event&&age<event.duration;},sample(s,dt=0){
  if(owner!==s)reset(s);
  if(phase!==s.phase){if(s.phase==='playing'&&phase==='countdown'){event={kind:'start',title:'スタート！',duration:.55,winner:-1};age=0;}
   else if(s.phase==='finished'&&s.result){const caught=!!s.result.caught;event={kind:caught?'touch':'timeout',title:caught?(s.role==='chase'?'タッチ！':'タッチされた！'):(s.role==='escape'?'にげきった！':'タイムアップ！'),duration:1.2,winner:s.result.win?0:1};age=0;}
   phase=s.phase;
  }else age+=Number.isFinite(dt)?Math.max(0,Math.min(dt,1.25)):0;
  const active=!!event&&age<event.duration,t=active?age/event.duration:1;
  return{active,kind:active?event.kind:null,title:active?event.title:'',winner:active?event.winner:-1,progress:t,hop:active&&!reducedMotion&&event.winner>=0?Math.sin(Math.min(1,t*1.6)*Math.PI)*.65:0,opacity:active?Math.max(0,1-t):0};
 }};
}

// Same device-local phase boundaries and 12-minute transition as coastTime/coastLighting.
const TAG_LIGHT=Object.freeze({
 morning:{top:0x89bedb,horizon:0xffdfba,sun:0xffe0b7,ambient:1.8,power:1.8,lamps:.35,night:0,azimuth:-.9,elevation:.2},
 day:{top:0x6eafd5,horizon:0xd6edf3,sun:0xfff3de,ambient:1.8,power:1.9,lamps:0,night:0,azimuth:.25,elevation:.38},
 evening:{top:0x8497c3,horizon:0xffcbab,sun:0xffbf87,ambient:1.7,power:1.7,lamps:.8,night:0,azimuth:.7,elevation:.09},
 night:{top:0x1b3154,horizon:0x526f92,sun:0xddeaff,ambient:1.15,power:.65,lamps:1,night:1,azimuth:-.45,elevation:.48}
});
export function tagAtmosphere(date=new Date()){
 if(!(date instanceof Date)||!Number.isFinite(+date))throw Error('invalid lighting date');
 const hour=date.getHours()+date.getMinutes()/60+date.getSeconds()/3600,phase=hour<6||hour>=19?'night':hour<9?'morning':hour<16?'day':'evening',previous={morning:'night',day:'morning',evening:'day',night:'evening'}[phase],start={morning:6,day:9,evening:16,night:19}[phase],blend=phase==='night'&&hour<6?1:clamp((hour-start)/.2,0,1),a=TAG_LIGHT[previous],b=TAG_LIGHT[phase],result={phase,blend};
 for(const key of['ambient','power','lamps','night','azimuth','elevation'])result[key]=a[key]+(b[key]-a[key])*blend;
 for(const key of['top','horizon','sun']){let hex=0;for(const shift of[16,8,0])hex|=Math.round(((a[key]>>shift)&255)*(1-blend)+((b[key]>>shift)&255)*blend)<<shift;result[key]=hex;}
 return result;
}

// Presentation-only sound edges. Reuses one frame and never changes a match.
export function createTagAudioEvents(){
 const frame={events:[],glide:0};let owner=null,last=null,travel=0,air=0;
 const snapshot=s=>({phase:s.phase,count:Math.ceil(s.countdown??0),x:s.player.x,z:s.player.z,grounded:s.player.grounded,jumps:s.player.jumps});
 function sync(s){owner=s;last=snapshot(s);travel=air=0;frame.events.length=0;frame.glide=0;return frame;}
 function reset(s){sync(s);last.phase=null;last.count=null;}
 function sample(s,dt=0){frame.events.length=0;frame.glide=0;if(owner!==s)reset(s);const a=s.player,next=snapshot(s),seconds=Math.max(0,Math.min(.2,Number.isFinite(dt)?dt:0));
  if(s.phase==='countdown'){if(next.count>0&&next.count!==last.count)frame.events.push({type:'count',count:next.count});}
  else if(s.phase==='finished'){if(last.phase!=='finished'){frame.events.push({type:s.result?.caught?'touch':'timeout'});frame.events.push({type:s.result?.win?'win':'loss'});}}
  else if(s.phase==='playing'){
   if(last.phase==='countdown'||last.phase===null)frame.events.push({type:'go'});
   if(!a.grounded){air+=seconds;travel=0;if(a.jumps>last.jumps)frame.events.push({type:'jump',stage:Math.max(1,Math.min(3,a.jumps))});}
   else{if(!last.grounded&&air>=.12)frame.events.push({type:'land'});air=0;const speed=Math.hypot(a.vx,a.vz),distance=Math.hypot(a.x-last.x,a.z-last.z),ice=worldSurface(a.x,a.z)==='ice';if(ice)frame.glide=Math.max(0,Math.min(1,(speed-2)/16));if(last.grounded&&!ice&&distance<8){travel+=distance;if(travel>=4.5&&speed>2){frame.events.push({type:'step'});travel%=4.5;}}else travel=0;}
  }
  Object.assign(last,next);return frame;
 }
 return{reset,sync,sample};
}
