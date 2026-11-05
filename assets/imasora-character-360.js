import * as THREE from "./three.module.min.js";
/* BEGIN MONSTER NAME REGISTRY */
(function(root,factory){const api=factory();root.ImasoraMonsterNames=api;})(globalThis,function(){
'use strict';const VERSION='individual-224-v1',entries=[{"id":"seed-walk","name":"コロミ","oldName":"ミチタネ","parentId":null,"stage":"タネ期","family":"walk","decoration":null},{"id":"seed-sky","name":"ソラネ","oldName":"ソラタネ","parentId":null,"stage":"タネ期","family":"sky","decoration":null},{"id":"seed-leaf","name":"ハノミ","oldName":"ハッパタネ","parentId":null,"stage":"タネ期","family":"leaf","decoration":null},{"id":"seed-city","name":"マチル","oldName":"マチタネ","parentId":null,"stage":"タネ期","family":"city","decoration":null},{"id":"seed-river","name":"ミナコロ","oldName":"ミズタネ","parentId":null,"stage":"タネ期","family":"river","decoration":null},{"id":"seed-night","name":"アケノミ","oldName":"ヨルタネ","parentId":null,"stage":"タネ期","family":"night","decoration":null},{"id":"seed-luck","name":"ユラミ","oldName":"ユラタネ","parentId":null,"stage":"タネ期","family":"luck","decoration":null},{"id":"sprout-seed-walk","name":"ミチメ","oldName":"ミチメバ","parentId":"seed-walk","stage":"新芽期","family":"walk","decoration":null},{"id":"sprout-seed-sky","name":"ピソラ","oldName":"ソラメバ","parentId":"seed-sky","stage":"新芽期","family":"sky","decoration":null},{"id":"sprout-seed-leaf","name":"ハニネ","oldName":"ハニメバ","parentId":"seed-leaf","stage":"新芽期","family":"leaf","decoration":null},{"id":"sprout-seed-city","name":"ポマチ","oldName":"マチメバ","parentId":"seed-city","stage":"新芽期","family":"city","decoration":null},{"id":"sprout-seed-river","name":"ミズピ","oldName":"ミズメバ","parentId":"seed-river","stage":"新芽期","family":"river","decoration":null},{"id":"sprout-seed-night","name":"アケル","oldName":"アケメバ","parentId":"seed-night","stage":"新芽期","family":"night","decoration":null},{"id":"sprout-seed-luck","name":"ポユラ","oldName":"ユラメバ","parentId":"seed-luck","stage":"新芽期","family":"luck","decoration":null},{"id":"young-seed-walk-walk","name":"ミチポ","oldName":"ミチメバン","parentId":"sprout-seed-walk","stage":"青葉期","family":"walk","decoration":null},{"id":"young-seed-walk-sky","name":"ルミチ","oldName":"ミチロード","parentId":"sprout-seed-walk","stage":"青葉期","family":"walk","decoration":null},{"id":"young-seed-sky-walk","name":"ソルポ","oldName":"ソラメバン","parentId":"sprout-seed-sky","stage":"青葉期","family":"sky","decoration":null},{"id":"young-seed-sky-sky","name":"ソラリ","oldName":"ソラロード","parentId":"sprout-seed-sky","stage":"青葉期","family":"sky","decoration":null},{"id":"young-seed-leaf-walk","name":"ハニム","oldName":"ハニメバン","parentId":"sprout-seed-leaf","stage":"青葉期","family":"leaf","decoration":null},{"id":"young-seed-leaf-sky","name":"ハノル","oldName":"ハニロード","parentId":"sprout-seed-leaf","stage":"青葉期","family":"leaf","decoration":null},{"id":"young-seed-city-walk","name":"マチロ","oldName":"マチメバン","parentId":"sprout-seed-city","stage":"青葉期","family":"city","decoration":null},{"id":"young-seed-city-sky","name":"ネオチ","oldName":"マチロード","parentId":"sprout-seed-city","stage":"青葉期","family":"city","decoration":null},{"id":"young-seed-river-walk","name":"ミナポ","oldName":"ミズメバン","parentId":"sprout-seed-river","stage":"青葉期","family":"river","decoration":null},{"id":"young-seed-river-sky","name":"ミズル","oldName":"ミズロード","parentId":"sprout-seed-river","stage":"青葉期","family":"river","decoration":null},{"id":"young-seed-night-walk","name":"アケム","oldName":"アケメバン","parentId":"sprout-seed-night","stage":"青葉期","family":"night","decoration":null},{"id":"young-seed-night-sky","name":"ヨアリ","oldName":"アケロード","parentId":"sprout-seed-night","stage":"青葉期","family":"night","decoration":null},{"id":"young-seed-luck-walk","name":"ユラノ","oldName":"ユラメバン","parentId":"sprout-seed-luck","stage":"青葉期","family":"luck","decoration":null},{"id":"young-seed-luck-sky","name":"リユラ","oldName":"ユラロード","parentId":"sprout-seed-luck","stage":"青葉期","family":"luck","decoration":null},{"id":"hero-young-seed-walk-walk-cute","name":"ミチモ","oldName":"ミチメバンフワナ","parentId":"young-seed-walk-walk","stage":"開花期","family":"walk","decoration":null},{"id":"hero-young-seed-walk-walk-cool-a","name":"バルチ","oldName":"ミチメバンブレイブ","parentId":"young-seed-walk-walk","stage":"開花期","family":"walk","decoration":null},{"id":"hero-young-seed-walk-walk-cool-b","name":"セイチ","oldName":"ミチメバンセイバー","parentId":"young-seed-walk-walk","stage":"開花期","family":"walk","decoration":null},{"id":"hero-young-seed-walk-sky-cute","name":"ミチフワ","oldName":"ミチロードフワナ","parentId":"young-seed-walk-sky","stage":"開花期","family":"walk","decoration":null},{"id":"hero-young-seed-walk-sky-cool-a","name":"ルバン","oldName":"ミチロードブレイブ","parentId":"young-seed-walk-sky","stage":"開花期","family":"walk","decoration":null},{"id":"hero-young-seed-walk-sky-cool-b","name":"レイチ","oldName":"ミチロードセイバー","parentId":"young-seed-walk-sky","stage":"開花期","family":"walk","decoration":null},{"id":"hero-young-seed-sky-walk-cute","name":"ソルモ","oldName":"ソラメバンフワナ","parentId":"young-seed-sky-walk","stage":"開花期","family":"sky","decoration":null},{"id":"hero-young-seed-sky-walk-cool-a","name":"ガルソ","oldName":"ソラメバンブレイブ","parentId":"young-seed-sky-walk","stage":"開花期","family":"sky","decoration":null},{"id":"hero-young-seed-sky-walk-cool-b","name":"ソルカ","oldName":"ソラメバンセイバー","parentId":"young-seed-sky-walk","stage":"開花期","family":"sky","decoration":null},{"id":"hero-young-seed-sky-sky-cute","name":"ソラノア","oldName":"ソラロードフワナ","parentId":"young-seed-sky-sky","stage":"開花期","family":"sky","decoration":null},{"id":"hero-young-seed-sky-sky-cool-a","name":"ラグソル","oldName":"ソラロードブレイブ","parentId":"young-seed-sky-sky","stage":"開花期","family":"sky","decoration":null},{"id":"hero-young-seed-sky-sky-cool-b","name":"セラリ","oldName":"ソラロードセイバー","parentId":"young-seed-sky-sky","stage":"開花期","family":"sky","decoration":null},{"id":"hero-young-seed-leaf-walk-cute","name":"ポニハ","oldName":"ハニメバンフワナ","parentId":"young-seed-leaf-walk","stage":"開花期","family":"leaf","decoration":null},{"id":"hero-young-seed-leaf-walk-cool-a","name":"ハノガ","oldName":"ハニメバンブレイブ","parentId":"young-seed-leaf-walk","stage":"開花期","family":"leaf","decoration":null},{"id":"hero-young-seed-leaf-walk-cool-b","name":"ハセリ","oldName":"ハニメバンセイバー","parentId":"young-seed-leaf-walk","stage":"開花期","family":"leaf","decoration":null},{"id":"hero-young-seed-leaf-sky-cute","name":"ハノナ","oldName":"ハニロードフワナ","parentId":"young-seed-leaf-sky","stage":"開花期","family":"leaf","decoration":null},{"id":"hero-young-seed-leaf-sky-cool-a","name":"ルハナ","oldName":"ハニロードブレイブ","parentId":"young-seed-leaf-sky","stage":"開花期","family":"leaf","decoration":null},{"id":"hero-young-seed-leaf-sky-cool-b","name":"ハニレ","oldName":"ハニロードセイバー","parentId":"young-seed-leaf-sky","stage":"開花期","family":"leaf","decoration":null},{"id":"hero-young-seed-city-walk-cute","name":"マチポ","oldName":"マチメバンフワナ","parentId":"young-seed-city-walk","stage":"開花期","family":"city","decoration":null},{"id":"hero-young-seed-city-walk-cool-a","name":"ドマル","oldName":"マチメバンブレイブ","parentId":"young-seed-city-walk","stage":"開花期","family":"city","decoration":null},{"id":"hero-young-seed-city-walk-cool-b","name":"マゼリ","oldName":"マチメバンセイバー","parentId":"young-seed-city-walk","stage":"開花期","family":"city","decoration":null},{"id":"hero-young-seed-city-sky-cute","name":"ネオナ","oldName":"マチロードフワナ","parentId":"young-seed-city-sky","stage":"開花期","family":"city","decoration":null},{"id":"hero-young-seed-city-sky-cool-a","name":"ネグラ","oldName":"マチロードブレイブ","parentId":"young-seed-city-sky","stage":"開花期","family":"city","decoration":null},{"id":"hero-young-seed-city-sky-cool-b","name":"チセラ","oldName":"マチロードセイバー","parentId":"young-seed-city-sky","stage":"開花期","family":"city","decoration":null},{"id":"hero-young-seed-river-walk-cute","name":"ミナモ","oldName":"ミズメバンフワナ","parentId":"young-seed-river-walk","stage":"開花期","family":"river","decoration":null},{"id":"hero-young-seed-river-walk-cool-a","name":"ガルミ","oldName":"ミズメバンブレイブ","parentId":"young-seed-river-walk","stage":"開花期","family":"river","decoration":null},{"id":"hero-young-seed-river-walk-cool-b","name":"ミセラ","oldName":"ミズメバンセイバー","parentId":"young-seed-river-walk","stage":"開花期","family":"river","decoration":null},{"id":"hero-young-seed-river-sky-cute","name":"ミズナ","oldName":"ミズロードフワナ","parentId":"young-seed-river-sky","stage":"開花期","family":"river","decoration":null},{"id":"hero-young-seed-river-sky-cool-a","name":"ルゼミ","oldName":"ミズロードブレイブ","parentId":"young-seed-river-sky","stage":"開花期","family":"river","decoration":null},{"id":"hero-young-seed-river-sky-cool-b","name":"リミオ","oldName":"ミズロードセイバー","parentId":"young-seed-river-sky","stage":"開花期","family":"river","decoration":null},{"id":"hero-young-seed-night-walk-cute","name":"アケモ","oldName":"アケメバンフワナ","parentId":"young-seed-night-walk","stage":"開花期","family":"night","decoration":null},{"id":"hero-young-seed-night-walk-cool-a","name":"ガノア","oldName":"アケメバンブレイブ","parentId":"young-seed-night-walk","stage":"開花期","family":"night","decoration":null},{"id":"hero-young-seed-night-walk-cool-b","name":"セアケ","oldName":"アケメバンセイバー","parentId":"young-seed-night-walk","stage":"開花期","family":"night","decoration":null},{"id":"hero-young-seed-night-sky-cute","name":"ヨアナ","oldName":"アケロードフワナ","parentId":"young-seed-night-sky","stage":"開花期","family":"night","decoration":null},{"id":"hero-young-seed-night-sky-cool-a","name":"ロアゼ","oldName":"アケロードブレイブ","parentId":"young-seed-night-sky","stage":"開花期","family":"night","decoration":null},{"id":"hero-young-seed-night-sky-cool-b","name":"レイアケ","oldName":"アケロードセイバー","parentId":"young-seed-night-sky","stage":"開花期","family":"night","decoration":null},{"id":"hero-young-seed-luck-walk-cute","name":"ユラモ","oldName":"ユラメバンフワナ","parentId":"young-seed-luck-walk","stage":"開花期","family":"luck","decoration":null},{"id":"hero-young-seed-luck-walk-cool-a","name":"ラグユ","oldName":"ユラメバンブレイブ","parentId":"young-seed-luck-walk","stage":"開花期","family":"luck","decoration":null},{"id":"hero-young-seed-luck-walk-cool-b","name":"セユリ","oldName":"ユラメバンセイバー","parentId":"young-seed-luck-walk","stage":"開花期","family":"luck","decoration":null},{"id":"hero-young-seed-luck-sky-cute","name":"リユナ","oldName":"ユラロードフワナ","parentId":"young-seed-luck-sky","stage":"開花期","family":"luck","decoration":null},{"id":"hero-young-seed-luck-sky-cool-a","name":"ユゼル","oldName":"ユラロードブレイブ","parentId":"young-seed-luck-sky","stage":"開花期","family":"luck","decoration":null},{"id":"hero-young-seed-luck-sky-cool-b","name":"ラユイ","oldName":"ユラロードセイバー","parentId":"young-seed-luck-sky","stage":"開花期","family":"luck","decoration":null},{"id":"star-hero-young-seed-walk-walk-cute-comet","name":"ミチル","oldName":"ミチメバンフワナル","parentId":"hero-young-seed-walk-walk-cute","stage":"満開期","family":"walk","decoration":"comet"},{"id":"star-hero-young-seed-walk-walk-cute-crown","name":"ミチモア","oldName":"ミチメバンフワナオウ","parentId":"hero-young-seed-walk-walk-cute","stage":"満開期","family":"walk","decoration":"crown"},{"id":"star-hero-young-seed-walk-walk-cute-forest","name":"ミチモレン","oldName":"ミチメバンフワナレン","parentId":"hero-young-seed-walk-walk-cute","stage":"満開期","family":"walk","decoration":"forest"},{"id":"star-hero-young-seed-walk-walk-cool-a-comet","name":"バルティア","oldName":"ミチメバンブレイブル","parentId":"hero-young-seed-walk-walk-cool-a","stage":"満開期","family":"walk","decoration":"comet"},{"id":"star-hero-young-seed-walk-walk-cool-a-crown","name":"ヴァルド","oldName":"ミチメバンブレイブオウ","parentId":"hero-young-seed-walk-walk-cool-a","stage":"満開期","family":"walk","decoration":"crown"},{"id":"star-hero-young-seed-walk-walk-cool-a-forest","name":"バルセド","oldName":"ミチメバンブレイブレン","parentId":"hero-young-seed-walk-walk-cool-a","stage":"満開期","family":"walk","decoration":"forest"},{"id":"star-hero-young-seed-walk-walk-cool-b-comet","name":"チルセイ","oldName":"ミチメバンセイバール","parentId":"hero-young-seed-walk-walk-cool-b","stage":"満開期","family":"walk","decoration":"comet"},{"id":"star-hero-young-seed-walk-walk-cool-b-crown","name":"セオル","oldName":"ミチメバンセイバーオウ","parentId":"hero-young-seed-walk-walk-cool-b","stage":"満開期","family":"walk","decoration":"crown"},{"id":"star-hero-young-seed-walk-walk-cool-b-forest","name":"セイラント","oldName":"ミチメバンセイバーレン","parentId":"hero-young-seed-walk-walk-cool-b","stage":"満開期","family":"walk","decoration":"forest"},{"id":"star-hero-young-seed-walk-sky-cute-comet","name":"ルミフワ","oldName":"ミチロードフワナル","parentId":"hero-young-seed-walk-sky-cute","stage":"満開期","family":"walk","decoration":"comet"},{"id":"star-hero-young-seed-walk-sky-cute-crown","name":"フワリオ","oldName":"ミチロードフワナオウ","parentId":"hero-young-seed-walk-sky-cute","stage":"満開期","family":"walk","decoration":"crown"},{"id":"star-hero-young-seed-walk-sky-cute-forest","name":"ミチフワレン","oldName":"ミチロードフワナレン","parentId":"hero-young-seed-walk-sky-cute","stage":"満開期","family":"walk","decoration":"forest"},{"id":"star-hero-young-seed-walk-sky-cool-a-comet","name":"ルビオン","oldName":"ミチロードブレイブル","parentId":"hero-young-seed-walk-sky-cool-a","stage":"満開期","family":"walk","decoration":"comet"},{"id":"star-hero-young-seed-walk-sky-cool-a-crown","name":"バンロア","oldName":"ミチロードブレイブオウ","parentId":"hero-young-seed-walk-sky-cool-a","stage":"満開期","family":"walk","decoration":"crown"},{"id":"star-hero-young-seed-walk-sky-cool-a-forest","name":"ルバント","oldName":"ミチロードブレイブレン","parentId":"hero-young-seed-walk-sky-cool-a","stage":"満開期","family":"walk","decoration":"forest"},{"id":"star-hero-young-seed-walk-sky-cool-b-comet","name":"チレイル","oldName":"ミチロードセイバール","parentId":"hero-young-seed-walk-sky-cool-b","stage":"満開期","family":"walk","decoration":"comet"},{"id":"star-hero-young-seed-walk-sky-cool-b-crown","name":"レイオル","oldName":"ミチロードセイバーオウ","parentId":"hero-young-seed-walk-sky-cool-b","stage":"満開期","family":"walk","decoration":"crown"},{"id":"star-hero-young-seed-walk-sky-cool-b-forest","name":"レイゼン","oldName":"ミチロードセイバーレン","parentId":"hero-young-seed-walk-sky-cool-b","stage":"満開期","family":"walk","decoration":"forest"},{"id":"star-hero-young-seed-sky-walk-cute-comet","name":"ソルフィ","oldName":"ソラメバンフワナル","parentId":"hero-young-seed-sky-walk-cute","stage":"満開期","family":"sky","decoration":"comet"},{"id":"star-hero-young-seed-sky-walk-cute-crown","name":"ソルメア","oldName":"ソラメバンフワナオウ","parentId":"hero-young-seed-sky-walk-cute","stage":"満開期","family":"sky","decoration":"crown"},{"id":"star-hero-young-seed-sky-walk-cute-forest","name":"モルソア","oldName":"ソラメバンフワナレン","parentId":"hero-young-seed-sky-walk-cute","stage":"満開期","family":"sky","decoration":"forest"},{"id":"star-hero-young-seed-sky-walk-cool-a-comet","name":"ソアガル","oldName":"ソラメバンブレイブル","parentId":"hero-young-seed-sky-walk-cool-a","stage":"満開期","family":"sky","decoration":"comet"},{"id":"star-hero-young-seed-sky-walk-cool-a-crown","name":"ガルセオン","oldName":"ソラメバンブレイブオウ","parentId":"hero-young-seed-sky-walk-cool-a","stage":"満開期","family":"sky","decoration":"crown"},{"id":"star-hero-young-seed-sky-walk-cool-a-forest","name":"ガルゼア","oldName":"ソラメバンブレイブレン","parentId":"hero-young-seed-sky-walk-cool-a","stage":"満開期","family":"sky","decoration":"forest"},{"id":"star-hero-young-seed-sky-walk-cool-b-comet","name":"ソルケア","oldName":"ソラメバンセイバール","parentId":"hero-young-seed-sky-walk-cool-b","stage":"満開期","family":"sky","decoration":"comet"},{"id":"star-hero-young-seed-sky-walk-cool-b-crown","name":"ソルカラ","oldName":"ソラメバンセイバーオウ","parentId":"hero-young-seed-sky-walk-cool-b","stage":"満開期","family":"sky","decoration":"crown"},{"id":"star-hero-young-seed-sky-walk-cool-b-forest","name":"カルソナ","oldName":"ソラメバンセイバーレン","parentId":"hero-young-seed-sky-walk-cool-b","stage":"満開期","family":"sky","decoration":"forest"},{"id":"star-hero-young-seed-sky-sky-cute-comet","name":"ノアリル","oldName":"ソラロードフワナル","parentId":"hero-young-seed-sky-sky-cute","stage":"満開期","family":"sky","decoration":"comet"},{"id":"star-hero-young-seed-sky-sky-cute-crown","name":"ノアソリス","oldName":"ソラロードフワナオウ","parentId":"hero-young-seed-sky-sky-cute","stage":"満開期","family":"sky","decoration":"crown"},{"id":"star-hero-young-seed-sky-sky-cute-forest","name":"ノアルカ","oldName":"ソラロードフワナレン","parentId":"hero-young-seed-sky-sky-cute","stage":"満開期","family":"sky","decoration":"forest"},{"id":"star-hero-young-seed-sky-sky-cool-a-comet","name":"ソルライズ","oldName":"ソラロードブレイブル","parentId":"hero-young-seed-sky-sky-cool-a","stage":"満開期","family":"sky","decoration":"comet"},{"id":"star-hero-young-seed-sky-sky-cool-a-crown","name":"ラグセラ","oldName":"ソラロードブレイブオウ","parentId":"hero-young-seed-sky-sky-cool-a","stage":"満開期","family":"sky","decoration":"crown"},{"id":"star-hero-young-seed-sky-sky-cool-a-forest","name":"ラグメル","oldName":"ソラロードブレイブレン","parentId":"hero-young-seed-sky-sky-cool-a","stage":"満開期","family":"sky","decoration":"forest"},{"id":"star-hero-young-seed-sky-sky-cool-b-comet","name":"セリルア","oldName":"ソラロードセイバール","parentId":"hero-young-seed-sky-sky-cool-b","stage":"満開期","family":"sky","decoration":"comet"},{"id":"star-hero-young-seed-sky-sky-cool-b-crown","name":"セラリオン","oldName":"ソラロードセイバーオウ","parentId":"hero-young-seed-sky-sky-cool-b","stage":"満開期","family":"sky","decoration":"crown"},{"id":"star-hero-young-seed-sky-sky-cool-b-forest","name":"セラヴェル","oldName":"ソラロードセイバーレン","parentId":"hero-young-seed-sky-sky-cool-b","stage":"満開期","family":"sky","decoration":"forest"},{"id":"star-hero-young-seed-leaf-walk-cute-comet","name":"ハニポル","oldName":"ハニメバンフワナル","parentId":"hero-young-seed-leaf-walk-cute","stage":"満開期","family":"leaf","decoration":"comet"},{"id":"star-hero-young-seed-leaf-walk-cute-crown","name":"ニハリナ","oldName":"ハニメバンフワナオウ","parentId":"hero-young-seed-leaf-walk-cute","stage":"満開期","family":"leaf","decoration":"crown"},{"id":"star-hero-young-seed-leaf-walk-cute-forest","name":"ポニルカ","oldName":"ハニメバンフワナレン","parentId":"hero-young-seed-leaf-walk-cute","stage":"満開期","family":"leaf","decoration":"forest"},{"id":"star-hero-young-seed-leaf-walk-cool-a-comet","name":"ハルガノ","oldName":"ハニメバンブレイブル","parentId":"hero-young-seed-leaf-walk-cool-a","stage":"満開期","family":"leaf","decoration":"comet"},{"id":"star-hero-young-seed-leaf-walk-cool-a-crown","name":"ガノリア","oldName":"ハニメバンブレイブオウ","parentId":"hero-young-seed-leaf-walk-cool-a","stage":"満開期","family":"leaf","decoration":"crown"},{"id":"star-hero-young-seed-leaf-walk-cool-a-forest","name":"ハノグラ","oldName":"ハニメバンブレイブレン","parentId":"hero-young-seed-leaf-walk-cool-a","stage":"満開期","family":"leaf","decoration":"forest"},{"id":"star-hero-young-seed-leaf-walk-cool-b-comet","name":"リセハル","oldName":"ハニメバンセイバール","parentId":"hero-young-seed-leaf-walk-cool-b","stage":"満開期","family":"leaf","decoration":"comet"},{"id":"star-hero-young-seed-leaf-walk-cool-b-crown","name":"ハセリオ","oldName":"ハニメバンセイバーオウ","parentId":"hero-young-seed-leaf-walk-cool-b","stage":"満開期","family":"leaf","decoration":"crown"},{"id":"star-hero-young-seed-leaf-walk-cool-b-forest","name":"セリハナ","oldName":"ハニメバンセイバーレン","parentId":"hero-young-seed-leaf-walk-cool-b","stage":"満開期","family":"leaf","decoration":"forest"},{"id":"star-hero-young-seed-leaf-sky-cute-comet","name":"ハノエル","oldName":"ハニロードフワナル","parentId":"hero-young-seed-leaf-sky-cute","stage":"満開期","family":"leaf","decoration":"comet"},{"id":"star-hero-young-seed-leaf-sky-cute-crown","name":"ハノシア","oldName":"ハニロードフワナオウ","parentId":"hero-young-seed-leaf-sky-cute","stage":"満開期","family":"leaf","decoration":"crown"},{"id":"star-hero-young-seed-leaf-sky-cute-forest","name":"ノナリム","oldName":"ハニロードフワナレン","parentId":"hero-young-seed-leaf-sky-cute","stage":"満開期","family":"leaf","decoration":"forest"},{"id":"star-hero-young-seed-leaf-sky-cool-a-comet","name":"ルハリス","oldName":"ハニロードブレイブル","parentId":"hero-young-seed-leaf-sky-cool-a","stage":"満開期","family":"leaf","decoration":"comet"},{"id":"star-hero-young-seed-leaf-sky-cool-a-crown","name":"ハナセロ","oldName":"ハニロードブレイブオウ","parentId":"hero-young-seed-leaf-sky-cool-a","stage":"満開期","family":"leaf","decoration":"crown"},{"id":"star-hero-young-seed-leaf-sky-cool-a-forest","name":"ルハナク","oldName":"ハニロードブレイブレン","parentId":"hero-young-seed-leaf-sky-cool-a","stage":"満開期","family":"leaf","decoration":"forest"},{"id":"star-hero-young-seed-leaf-sky-cool-b-comet","name":"レハニア","oldName":"ハニロードセイバール","parentId":"hero-young-seed-leaf-sky-cool-b","stage":"満開期","family":"leaf","decoration":"comet"},{"id":"star-hero-young-seed-leaf-sky-cool-b-crown","name":"ニレオラ","oldName":"ハニロードセイバーオウ","parentId":"hero-young-seed-leaf-sky-cool-b","stage":"満開期","family":"leaf","decoration":"crown"},{"id":"star-hero-young-seed-leaf-sky-cool-b-forest","name":"ハニレント","oldName":"ハニロードセイバーレン","parentId":"hero-young-seed-leaf-sky-cool-b","stage":"満開期","family":"leaf","decoration":"forest"},{"id":"star-hero-young-seed-city-walk-cute-comet","name":"マチピア","oldName":"マチメバンフワナル","parentId":"hero-young-seed-city-walk-cute","stage":"満開期","family":"city","decoration":"comet"},{"id":"star-hero-young-seed-city-walk-cute-crown","name":"マチルド","oldName":"マチメバンフワナオウ","parentId":"hero-young-seed-city-walk-cute","stage":"満開期","family":"city","decoration":"crown"},{"id":"star-hero-young-seed-city-walk-cute-forest","name":"ポマリエ","oldName":"マチメバンフワナレン","parentId":"hero-young-seed-city-walk-cute","stage":"満開期","family":"city","decoration":"forest"},{"id":"star-hero-young-seed-city-walk-cool-a-comet","name":"マルティオ","oldName":"マチメバンブレイブル","parentId":"hero-young-seed-city-walk-cool-a","stage":"満開期","family":"city","decoration":"comet"},{"id":"star-hero-young-seed-city-walk-cool-a-crown","name":"ドルマゼ","oldName":"マチメバンブレイブオウ","parentId":"hero-young-seed-city-walk-cool-a","stage":"満開期","family":"city","decoration":"crown"},{"id":"star-hero-young-seed-city-walk-cool-a-forest","name":"ドマルガ","oldName":"マチメバンブレイブレン","parentId":"hero-young-seed-city-walk-cool-a","stage":"満開期","family":"city","decoration":"forest"},{"id":"star-hero-young-seed-city-walk-cool-b-comet","name":"マゼフィル","oldName":"マチメバンセイバール","parentId":"hero-young-seed-city-walk-cool-b","stage":"満開期","family":"city","decoration":"comet"},{"id":"star-hero-young-seed-city-walk-cool-b-crown","name":"ゼリオス","oldName":"マチメバンセイバーオウ","parentId":"hero-young-seed-city-walk-cool-b","stage":"満開期","family":"city","decoration":"crown"},{"id":"star-hero-young-seed-city-walk-cool-b-forest","name":"マゼノア","oldName":"マチメバンセイバーレン","parentId":"hero-young-seed-city-walk-cool-b","stage":"満開期","family":"city","decoration":"forest"},{"id":"star-hero-young-seed-city-sky-cute-comet","name":"ネオルナ","oldName":"マチロードフワナル","parentId":"hero-young-seed-city-sky-cute","stage":"満開期","family":"city","decoration":"comet"},{"id":"star-hero-young-seed-city-sky-cute-crown","name":"ノアネス","oldName":"マチロードフワナオウ","parentId":"hero-young-seed-city-sky-cute","stage":"満開期","family":"city","decoration":"crown"},{"id":"star-hero-young-seed-city-sky-cute-forest","name":"ネオミラ","oldName":"マチロードフワナレン","parentId":"hero-young-seed-city-sky-cute","stage":"満開期","family":"city","decoration":"forest"},{"id":"star-hero-young-seed-city-sky-cool-a-comet","name":"ネグリス","oldName":"マチロードブレイブル","parentId":"hero-young-seed-city-sky-cool-a","stage":"満開期","family":"city","decoration":"comet"},{"id":"star-hero-young-seed-city-sky-cool-a-crown","name":"グラニオ","oldName":"マチロードブレイブオウ","parentId":"hero-young-seed-city-sky-cool-a","stage":"満開期","family":"city","decoration":"crown"},{"id":"star-hero-young-seed-city-sky-cool-a-forest","name":"ネグレム","oldName":"マチロードブレイブレン","parentId":"hero-young-seed-city-sky-cool-a","stage":"満開期","family":"city","decoration":"forest"},{"id":"star-hero-young-seed-city-sky-cool-b-comet","name":"チリゼア","oldName":"マチロードセイバール","parentId":"hero-young-seed-city-sky-cool-b","stage":"満開期","family":"city","decoration":"comet"},{"id":"star-hero-young-seed-city-sky-cool-b-crown","name":"セラチオ","oldName":"マチロードセイバーオウ","parentId":"hero-young-seed-city-sky-cool-b","stage":"満開期","family":"city","decoration":"crown"},{"id":"star-hero-young-seed-city-sky-cool-b-forest","name":"チセリナ","oldName":"マチロードセイバーレン","parentId":"hero-young-seed-city-sky-cool-b","stage":"満開期","family":"city","decoration":"forest"},{"id":"star-hero-young-seed-river-walk-cute-comet","name":"ミナエル","oldName":"ミズメバンフワナル","parentId":"hero-young-seed-river-walk-cute","stage":"満開期","family":"river","decoration":"comet"},{"id":"star-hero-young-seed-river-walk-cute-crown","name":"ミナティア","oldName":"ミズメバンフワナオウ","parentId":"hero-young-seed-river-walk-cute","stage":"満開期","family":"river","decoration":"crown"},{"id":"star-hero-young-seed-river-walk-cute-forest","name":"ナモリル","oldName":"ミズメバンフワナレン","parentId":"hero-young-seed-river-walk-cute","stage":"満開期","family":"river","decoration":"forest"},{"id":"star-hero-young-seed-river-walk-cool-a-comet","name":"ミルガノ","oldName":"ミズメバンブレイブル","parentId":"hero-young-seed-river-walk-cool-a","stage":"満開期","family":"river","decoration":"comet"},{"id":"star-hero-young-seed-river-walk-cool-a-crown","name":"ミガロス","oldName":"ミズメバンブレイブオウ","parentId":"hero-young-seed-river-walk-cool-a","stage":"満開期","family":"river","decoration":"crown"},{"id":"star-hero-young-seed-river-walk-cool-a-forest","name":"ガルミア","oldName":"ミズメバンブレイブレン","parentId":"hero-young-seed-river-walk-cool-a","stage":"満開期","family":"river","decoration":"forest"},{"id":"star-hero-young-seed-river-walk-cool-b-comet","name":"ミセルナ","oldName":"ミズメバンセイバール","parentId":"hero-young-seed-river-walk-cool-b","stage":"満開期","family":"river","decoration":"comet"},{"id":"star-hero-young-seed-river-walk-cool-b-crown","name":"セラミア","oldName":"ミズメバンセイバーオウ","parentId":"hero-young-seed-river-walk-cool-b","stage":"満開期","family":"river","decoration":"crown"},{"id":"star-hero-young-seed-river-walk-cool-b-forest","name":"ミセリオ","oldName":"ミズメバンセイバーレン","parentId":"hero-young-seed-river-walk-cool-b","stage":"満開期","family":"river","decoration":"forest"},{"id":"star-hero-young-seed-river-sky-cute-comet","name":"ミズフィア","oldName":"ミズロードフワナル","parentId":"hero-young-seed-river-sky-cute","stage":"満開期","family":"river","decoration":"comet"},{"id":"star-hero-young-seed-river-sky-cute-crown","name":"ナズレア","oldName":"ミズロードフワナオウ","parentId":"hero-young-seed-river-sky-cute","stage":"満開期","family":"river","decoration":"crown"},{"id":"star-hero-young-seed-river-sky-cute-forest","name":"ミズネア","oldName":"ミズロードフワナレン","parentId":"hero-young-seed-river-sky-cute","stage":"満開期","family":"river","decoration":"forest"},{"id":"star-hero-young-seed-river-sky-cool-a-comet","name":"ルゼリカ","oldName":"ミズロードブレイブル","parentId":"hero-young-seed-river-sky-cool-a","stage":"満開期","family":"river","decoration":"comet"},{"id":"star-hero-young-seed-river-sky-cool-a-crown","name":"ゼミリオ","oldName":"ミズロードブレイブオウ","parentId":"hero-young-seed-river-sky-cool-a","stage":"満開期","family":"river","decoration":"crown"},{"id":"star-hero-young-seed-river-sky-cool-a-forest","name":"ルゼナ","oldName":"ミズロードブレイブレン","parentId":"hero-young-seed-river-sky-cool-a","stage":"満開期","family":"river","decoration":"forest"},{"id":"star-hero-young-seed-river-sky-cool-b-comet","name":"リミゼル","oldName":"ミズロードセイバール","parentId":"hero-young-seed-river-sky-cool-b","stage":"満開期","family":"river","decoration":"comet"},{"id":"star-hero-young-seed-river-sky-cool-b-crown","name":"オリミナ","oldName":"ミズロードセイバーオウ","parentId":"hero-young-seed-river-sky-cool-b","stage":"満開期","family":"river","decoration":"crown"},{"id":"star-hero-young-seed-river-sky-cool-b-forest","name":"リミスト","oldName":"ミズロードセイバーレン","parentId":"hero-young-seed-river-sky-cool-b","stage":"満開期","family":"river","decoration":"forest"},{"id":"star-hero-young-seed-night-walk-cute-comet","name":"アケフィ","oldName":"アケメバンフワナル","parentId":"hero-young-seed-night-walk-cute","stage":"満開期","family":"night","decoration":"comet"},{"id":"star-hero-young-seed-night-walk-cute-crown","name":"モアリネ","oldName":"アケメバンフワナオウ","parentId":"hero-young-seed-night-walk-cute","stage":"満開期","family":"night","decoration":"crown"},{"id":"star-hero-young-seed-night-walk-cute-forest","name":"アケモラ","oldName":"アケメバンフワナレン","parentId":"hero-young-seed-night-walk-cute","stage":"満開期","family":"night","decoration":"forest"},{"id":"star-hero-young-seed-night-walk-cool-a-comet","name":"ノアガル","oldName":"アケメバンブレイブル","parentId":"hero-young-seed-night-walk-cool-a","stage":"満開期","family":"night","decoration":"comet"},{"id":"star-hero-young-seed-night-walk-cool-a-crown","name":"ガノシス","oldName":"アケメバンブレイブオウ","parentId":"hero-young-seed-night-walk-cool-a","stage":"満開期","family":"night","decoration":"crown"},{"id":"star-hero-young-seed-night-walk-cool-a-forest","name":"ガノレム","oldName":"アケメバンブレイブレン","parentId":"hero-young-seed-night-walk-cool-a","stage":"満開期","family":"night","decoration":"forest"},{"id":"star-hero-young-seed-night-walk-cool-b-comet","name":"セアリカ","oldName":"アケメバンセイバール","parentId":"hero-young-seed-night-walk-cool-b","stage":"満開期","family":"night","decoration":"comet"},{"id":"star-hero-young-seed-night-walk-cool-b-crown","name":"アケセオン","oldName":"アケメバンセイバーオウ","parentId":"hero-young-seed-night-walk-cool-b","stage":"満開期","family":"night","decoration":"crown"},{"id":"star-hero-young-seed-night-walk-cool-b-forest","name":"セアノル","oldName":"アケメバンセイバーレン","parentId":"hero-young-seed-night-walk-cool-b","stage":"満開期","family":"night","decoration":"forest"},{"id":"star-hero-young-seed-night-sky-cute-comet","name":"アナセリ","oldName":"アケロードフワナル","parentId":"hero-young-seed-night-sky-cute","stage":"満開期","family":"night","decoration":"comet"},{"id":"star-hero-young-seed-night-sky-cute-crown","name":"ヨアミラ","oldName":"アケロードフワナオウ","parentId":"hero-young-seed-night-sky-cute","stage":"満開期","family":"night","decoration":"crown"},{"id":"star-hero-young-seed-night-sky-cute-forest","name":"ヨアネル","oldName":"アケロードフワナレン","parentId":"hero-young-seed-night-sky-cute","stage":"満開期","family":"night","decoration":"forest"},{"id":"star-hero-young-seed-night-sky-cool-a-comet","name":"ロアフィル","oldName":"アケロードブレイブル","parentId":"hero-young-seed-night-sky-cool-a","stage":"満開期","family":"night","decoration":"comet"},{"id":"star-hero-young-seed-night-sky-cool-a-crown","name":"ゼロアス","oldName":"アケロードブレイブオウ","parentId":"hero-young-seed-night-sky-cool-a","stage":"満開期","family":"night","decoration":"crown"},{"id":"star-hero-young-seed-night-sky-cool-a-forest","name":"ロアゼン","oldName":"アケロードブレイブレン","parentId":"hero-young-seed-night-sky-cool-a","stage":"満開期","family":"night","decoration":"forest"},{"id":"star-hero-young-seed-night-sky-cool-b-comet","name":"レイアス","oldName":"アケロードセイバール","parentId":"hero-young-seed-night-sky-cool-b","stage":"満開期","family":"night","decoration":"comet"},{"id":"star-hero-young-seed-night-sky-cool-b-crown","name":"アケリオン","oldName":"アケロードセイバーオウ","parentId":"hero-young-seed-night-sky-cool-b","stage":"満開期","family":"night","decoration":"crown"},{"id":"star-hero-young-seed-night-sky-cool-b-forest","name":"レアクル","oldName":"アケロードセイバーレン","parentId":"hero-young-seed-night-sky-cool-b","stage":"満開期","family":"night","decoration":"forest"},{"id":"star-hero-young-seed-luck-walk-cute-comet","name":"ユラセナ","oldName":"ユラメバンフワナル","parentId":"hero-young-seed-luck-walk-cute","stage":"満開期","family":"luck","decoration":"comet"},{"id":"star-hero-young-seed-luck-walk-cute-crown","name":"モユレア","oldName":"ユラメバンフワナオウ","parentId":"hero-young-seed-luck-walk-cute","stage":"満開期","family":"luck","decoration":"crown"},{"id":"star-hero-young-seed-luck-walk-cute-forest","name":"ユラメル","oldName":"ユラメバンフワナレン","parentId":"hero-young-seed-luck-walk-cute","stage":"満開期","family":"luck","decoration":"forest"},{"id":"star-hero-young-seed-luck-walk-cool-a-comet","name":"ラユグス","oldName":"ユラメバンブレイブル","parentId":"hero-young-seed-luck-walk-cool-a","stage":"満開期","family":"luck","decoration":"comet"},{"id":"star-hero-young-seed-luck-walk-cool-a-crown","name":"ユグレオ","oldName":"ユラメバンブレイブオウ","parentId":"hero-young-seed-luck-walk-cool-a","stage":"満開期","family":"luck","decoration":"crown"},{"id":"star-hero-young-seed-luck-walk-cool-a-forest","name":"ラグユル","oldName":"ユラメバンブレイブレン","parentId":"hero-young-seed-luck-walk-cool-a","stage":"満開期","family":"luck","decoration":"forest"},{"id":"star-hero-young-seed-luck-walk-cool-b-comet","name":"セリユノ","oldName":"ユラメバンセイバール","parentId":"hero-young-seed-luck-walk-cool-b","stage":"満開期","family":"luck","decoration":"comet"},{"id":"star-hero-young-seed-luck-walk-cool-b-crown","name":"ユリゼア","oldName":"ユラメバンセイバーオウ","parentId":"hero-young-seed-luck-walk-cool-b","stage":"満開期","family":"luck","decoration":"crown"},{"id":"star-hero-young-seed-luck-walk-cool-b-forest","name":"セユリム","oldName":"ユラメバンセイバーレン","parentId":"hero-young-seed-luck-walk-cool-b","stage":"満開期","family":"luck","decoration":"forest"},{"id":"star-hero-young-seed-luck-sky-cute-comet","name":"リユフィ","oldName":"ユラロードフワナル","parentId":"hero-young-seed-luck-sky-cute","stage":"満開期","family":"luck","decoration":"comet"},{"id":"star-hero-young-seed-luck-sky-cute-crown","name":"ユナリオ","oldName":"ユラロードフワナオウ","parentId":"hero-young-seed-luck-sky-cute","stage":"満開期","family":"luck","decoration":"crown"},{"id":"star-hero-young-seed-luck-sky-cute-forest","name":"リユノア","oldName":"ユラロードフワナレン","parentId":"hero-young-seed-luck-sky-cute","stage":"満開期","family":"luck","decoration":"forest"},{"id":"star-hero-young-seed-luck-sky-cool-a-comet","name":"ユゼノス","oldName":"ユラロードブレイブル","parentId":"hero-young-seed-luck-sky-cool-a","stage":"満開期","family":"luck","decoration":"comet"},{"id":"star-hero-young-seed-luck-sky-cool-a-crown","name":"ゼルナオ","oldName":"ユラロードブレイブオウ","parentId":"hero-young-seed-luck-sky-cool-a","stage":"満開期","family":"luck","decoration":"crown"},{"id":"star-hero-young-seed-luck-sky-cool-a-forest","name":"ユゼリカ","oldName":"ユラロードブレイブレン","parentId":"hero-young-seed-luck-sky-cool-a","stage":"満開期","family":"luck","decoration":"forest"},{"id":"star-hero-young-seed-luck-sky-cool-b-comet","name":"ラユセス","oldName":"ユラロードセイバール","parentId":"hero-young-seed-luck-sky-cool-b","stage":"満開期","family":"luck","decoration":"comet"},{"id":"star-hero-young-seed-luck-sky-cool-b-crown","name":"ユイレア","oldName":"ユラロードセイバーオウ","parentId":"hero-young-seed-luck-sky-cool-b","stage":"満開期","family":"luck","decoration":"crown"},{"id":"star-hero-young-seed-luck-sky-cool-b-forest","name":"ラユリナ","oldName":"ユラロードセイバーレン","parentId":"hero-young-seed-luck-sky-cool-b","stage":"満開期","family":"luck","decoration":"forest"},{"id":"white-seed-walk","name":"ハクノミ","oldName":"白ミチタネ","parentId":null,"stage":"タネ期","family":"white","decoration":null},{"id":"white-sprout-seed-walk","name":"ハクノ","oldName":"白ミチメバ","parentId":"white-seed-walk","stage":"新芽期","family":"white","decoration":null},{"id":"white-young-seed-walk-walk","name":"コハノ","oldName":"白ミチメバン","parentId":"white-sprout-seed-walk","stage":"青葉期","family":"white","decoration":null},{"id":"white-young-seed-walk-sky","name":"ハクル","oldName":"白ミチロード","parentId":"white-sprout-seed-walk","stage":"青葉期","family":"white","decoration":null},{"id":"hero-white-young-seed-walk-walk-cute","name":"コハモ","oldName":"白ミチメバンフワナ","parentId":"white-young-seed-walk-walk","stage":"開花期","family":"white","decoration":null},{"id":"hero-white-young-seed-walk-walk-cool-a","name":"バルハ","oldName":"白ミチメバンブレイブ","parentId":"white-young-seed-walk-walk","stage":"開花期","family":"white","decoration":null},{"id":"hero-white-young-seed-walk-walk-cool-b","name":"ハクセ","oldName":"白ミチメバンセイバー","parentId":"white-young-seed-walk-walk","stage":"開花期","family":"white","decoration":null},{"id":"hero-white-young-seed-walk-sky-cute","name":"ハクネ","oldName":"白ミチロードフワナ","parentId":"white-young-seed-walk-sky","stage":"開花期","family":"white","decoration":null},{"id":"hero-white-young-seed-walk-sky-cool-a","name":"ルハク","oldName":"白ミチロードブレイブ","parentId":"white-young-seed-walk-sky","stage":"開花期","family":"white","decoration":null},{"id":"hero-white-young-seed-walk-sky-cool-b","name":"セハル","oldName":"白ミチロードセイバー","parentId":"white-young-seed-walk-sky","stage":"開花期","family":"white","decoration":null},{"id":"star-white-hero-young-seed-walk-walk-cute-comet","name":"ハモリナ","oldName":"白ミチメバンフワナル","parentId":"hero-white-young-seed-walk-walk-cute","stage":"満開期","family":"white","decoration":"comet"},{"id":"star-white-hero-young-seed-walk-walk-cute-crown","name":"コハリア","oldName":"白ミチメバンフワナオウ","parentId":"hero-white-young-seed-walk-walk-cute","stage":"満開期","family":"white","decoration":"crown"},{"id":"star-white-hero-young-seed-walk-walk-cute-forest","name":"コハリム","oldName":"白ミチメバンフワナレン","parentId":"hero-white-young-seed-walk-walk-cute","stage":"満開期","family":"white","decoration":"forest"},{"id":"star-white-hero-young-seed-walk-walk-cool-a-comet","name":"バルヒア","oldName":"白ミチメバンブレイブル","parentId":"hero-white-young-seed-walk-walk-cool-a","stage":"満開期","family":"white","decoration":"comet"},{"id":"star-white-hero-young-seed-walk-walk-cool-a-crown","name":"ハルバド","oldName":"白ミチメバンブレイブオウ","parentId":"hero-white-young-seed-walk-walk-cool-a","stage":"満開期","family":"white","decoration":"crown"},{"id":"star-white-hero-young-seed-walk-walk-cool-a-forest","name":"バルハレン","oldName":"白ミチメバンブレイブレン","parentId":"hero-white-young-seed-walk-walk-cool-a","stage":"満開期","family":"white","decoration":"forest"},{"id":"star-white-hero-young-seed-walk-walk-cool-b-comet","name":"ハクリゼ","oldName":"白ミチメバンセイバール","parentId":"hero-white-young-seed-walk-walk-cool-b","stage":"満開期","family":"white","decoration":"comet"},{"id":"star-white-hero-young-seed-walk-walk-cool-b-crown","name":"セハクロ","oldName":"白ミチメバンセイバーオウ","parentId":"hero-white-young-seed-walk-walk-cool-b","stage":"満開期","family":"white","decoration":"crown"},{"id":"star-white-hero-young-seed-walk-walk-cool-b-forest","name":"ハクセリア","oldName":"白ミチメバンセイバーレン","parentId":"hero-white-young-seed-walk-walk-cool-b","stage":"満開期","family":"white","decoration":"forest"},{"id":"star-white-hero-young-seed-walk-sky-cute-comet","name":"ハクフィナ","oldName":"白ミチロードフワナル","parentId":"hero-white-young-seed-walk-sky-cute","stage":"満開期","family":"white","decoration":"comet"},{"id":"star-white-hero-young-seed-walk-sky-cute-crown","name":"ネハシア","oldName":"白ミチロードフワナオウ","parentId":"hero-white-young-seed-walk-sky-cute","stage":"満開期","family":"white","decoration":"crown"},{"id":"star-white-hero-young-seed-walk-sky-cute-forest","name":"ハクネール","oldName":"白ミチロードフワナレン","parentId":"hero-white-young-seed-walk-sky-cute","stage":"満開期","family":"white","decoration":"forest"},{"id":"star-white-hero-young-seed-walk-sky-cool-a-comet","name":"ルクシエ","oldName":"白ミチロードブレイブル","parentId":"hero-white-young-seed-walk-sky-cool-a","stage":"満開期","family":"white","decoration":"comet"},{"id":"star-white-hero-young-seed-walk-sky-cool-a-crown","name":"ハクレノア","oldName":"白ミチロードブレイブオウ","parentId":"hero-white-young-seed-walk-sky-cool-a","stage":"満開期","family":"white","decoration":"crown"},{"id":"star-white-hero-young-seed-walk-sky-cool-a-forest","name":"ルハクド","oldName":"白ミチロードブレイブレン","parentId":"hero-white-young-seed-walk-sky-cool-a","stage":"満開期","family":"white","decoration":"forest"},{"id":"star-white-hero-young-seed-walk-sky-cool-b-comet","name":"セハリス","oldName":"白ミチロードセイバール","parentId":"hero-white-young-seed-walk-sky-cool-b","stage":"満開期","family":"white","decoration":"comet"},{"id":"star-white-hero-young-seed-walk-sky-cool-b-crown","name":"ハルセオ","oldName":"白ミチロードセイバーオウ","parentId":"hero-white-young-seed-walk-sky-cool-b","stage":"満開期","family":"white","decoration":"crown"},{"id":"star-white-hero-young-seed-walk-sky-cool-b-forest","name":"セハルネ","oldName":"白ミチロードセイバーレン","parentId":"hero-white-young-seed-walk-sky-cool-b","stage":"満開期","family":"white","decoration":"forest"}].map(Object.freeze),ids=new Map(entries.map(e=>[e.id,e])),names=new Map(entries.map(e=>[e.name,e])),aliases=new Map();
for(const e of entries){aliases.set(e.oldName,e);aliases.set(e.oldName.replaceAll('ロード','リオード'),e);}
const normalizeId=value=>{const id=typeof value==='string'?value.replace(/^current-/,''):'';return id==='white-michi-road-saber-ren'?'star-white-hero-young-seed-walk-sky-cool-b-forest':id==='seed-white'?'white-seed-walk':id==='sprout-seed-white'?'white-sprout-seed-walk':id.replace(/^white-hero-/,'hero-white-').replace(/^young-white-/,'white-young-');};
function get(value){return typeof value==='string'?(ids.get(normalizeId(value))||names.get(value)||aliases.get(value)||null):null;}
function name(value,fallback=''){return get(value)?.name||fallback;}
function currentId(m){if(!m||!/^seed-(walk|sky|leaf|city|river|night|luck|white)$/.test(m.seedId||''))return'';const white=m.seedId==='seed-white',seed=white?'seed-walk':m.seedId;let stage=Math.min(4,Math.max(0,Number(m.evolutionStage||0)));if(stage===4&&Number(m.lifeExtensionUses||0)<3)stage=3;const branch=Number(m.sky||0)>=Math.max(Number(m.nature||0),Number(m.city||0))?'sky':'walk';return stage===0?(white?'white-':'')+seed:stage===1?(white?'white-':'')+'sprout-'+seed:stage===2?(white?'white-':'')+'young-'+seed+'-'+branch:stage===3?'hero-'+(white?'white-':'')+'young-'+seed+'-'+branch+'-cute':'star-'+(white?'white-':'')+'hero-young-'+seed+'-'+branch+'-cute-comet';}
function currentName(m,fallback=''){return name(currentId(m),fallback);}
function record(value,fallback='記録モンスター'){if(!value||typeof value!=='object')return name(value,fallback);for(const key of [value.artId,value.characterId,value.monsterId,value.sourceMonsterId,value.appearance?.artId,value.art?.id,value.item?.id,value.profileId,value.id]){const e=get(key);if(e)return e.name;}if(/(?:playtest-retired-full-|記録テスト)1$/.test(String(value.id||value.name||'')))return name('star-white-hero-young-seed-walk-sky-cool-b-forest');const named=get(value.name)||get(value.baseName);if(named)return named.name;if(value.monster&&typeof value.monster==='object'){const id=currentId({...value.monster,seedId:value.monster.seedId||value.seedId,lifeExtensionUses:Number(value.monster.evolutionStage)===4?Math.max(3,Number(value.monster.lifeExtensionUses||0)):value.monster.lifeExtensionUses});if(ids.has(id))return ids.get(id).name;}return name(value.name||value.baseName,String(value.name||value.baseName||fallback));}
const escape=s=>[...s].map(c=>[92,94,36,46,42,43,63,40,41,91,93,123,125,124].includes(c.codePointAt(0))?String.fromCharCode(92)+c:c).join('');
const textAliases=new Map([...aliases].map(([old,e])=>[old,e.name]));for(const [old,name]of Object.entries({'メバンフワナ系':'歩き系・やわらか型','メバンブレイブ系':'歩き系・力強い型','メバンセイバー系':'歩き系・鋭い型','ロードフワナ系':'空系・やわらか型','ロードブレイブ系':'空系・力強い型','ロードセイバー系':'空系・鋭い型','ル末尾':'羽根型','オウ末尾':'王冠型','レン末尾':'マント型'}))textAliases.set(old,name);const textCache=new Map();
function text(value,{protect=[]}={}){const input=String(value??''),protectedNames=new Set(protect.filter(v=>typeof v==='string'&&v)),cacheKey=JSON.stringify([...protectedNames].sort());let regex=textCache.get(cacheKey);if(!regex){const tokens=[...new Set([...textAliases.keys(),...protectedNames])].sort((a,b)=>b.length-a.length);regex=new RegExp('(^|[^ァ-ヶー])('+tokens.map(escape).join('|')+')(?=$|[^ァ-ヶー])','g');if(textCache.size>=16)textCache.delete(textCache.keys().next().value);textCache.set(cacheKey,regex);}regex.lastIndex=0;return input.replace(regex,(match,prefix,token)=>prefix+(protectedNames.has(token)?token:textAliases.get(token)||token));}

function children(value){const id=get(value)?.id;return id?entries.filter(e=>e.parentId===id):[];}
return Object.freeze({VERSION,entries:Object.freeze(entries),get,name,currentId,currentName,record,text,children});
});
/* END MONSTER NAME REGISTRY */
// Every activity uses the same real palms. Rounded skin joins stay attached
// to the authored torso, including in lessons, jumps and vehicle models.
// They do not move a palm, a held tool, the actor or its collision footprint.
const handAttachmentAnchors = new Map();
function attachCharacterHands(model) {
  const { body, hands = [], profileKey } = model.userData;
  if (!body?.geometry || !hands.length) return model;
  body.updateMatrix();
  const geometry = new THREE.SphereGeometry(1, 12, 8);
  const axis = new THREE.Vector3(0, 1, 0), delta = new THREE.Vector3();
  const entries = hands.map((hand, index) => {
    const neutral = hand.position.clone(), radius = Math.min(hand.scale.x, hand.scale.y, hand.scale.z);
    const key = [profileKey, index, ...neutral.toArray(), ...body.matrix.elements].join(',');
    let anchor = handAttachmentAnchors.get(key);
    if (!anchor) {
      const inverse = body.matrix.clone().invert(), point = neutral.clone().applyMatrix4(inverse);
      const position = body.geometry.attributes.position, indices = body.geometry.index;
      const triangle = new THREE.Triangle(), nearest = new THREE.Vector3();
      let distance = Infinity; anchor = point.clone();
      for (let n = 0; n < (indices?.count ?? position.count); n += 3) {
        triangle.a.fromBufferAttribute(position, indices ? indices.getX(n) : n);
        triangle.b.fromBufferAttribute(position, indices ? indices.getX(n + 1) : n + 1);
        triangle.c.fromBufferAttribute(position, indices ? indices.getX(n + 2) : n + 2);
        triangle.closestPointToPoint(point, nearest);
        const d = nearest.distanceToSquared(point);
        if (d < distance) { distance = d; anchor.copy(nearest); }
      }
      anchor.applyMatrix4(body.matrix);
      handAttachmentAnchors.set(key, anchor.clone());
    }
    const sleeve = new THREE.Mesh(geometry, hand.material);
    sleeve.name = index ? '体につながる右手' : '体につながる左手';
    sleeve.castShadow = hand.castShadow; sleeve.receiveShadow = hand.receiveShadow;
    model.add(sleeve);
    return { hand, sleeve, anchor: anchor.clone(), neutral, radius,
      last: new THREE.Vector3(Infinity, Infinity, Infinity), material: null };
  });
  function sync() {
    for (const e of entries) {
      if (e.sleeve.material !== e.hand.material) e.sleeve.material = e.hand.material;
      e.sleeve.visible = e.hand.visible;
      if (e.last.equals(e.hand.position)) continue;
      e.last.copy(e.hand.position);
      delta.subVectors(e.hand.position, e.anchor);
      const length = delta.length(), width = e.radius * .56;
      e.sleeve.position.copy(e.anchor).addScaledVector(delta, .5);
      e.sleeve.scale.set(width, Math.max(width, length / 2 + width * .7), width);
      e.sleeve.quaternion.setFromUnitVectors(axis, length > 1e-8 ? delta.multiplyScalar(1 / length) : axis);
    }
  }
  // Matrix updates precede both tool contact measurements and rendering.
  // Repeated stationary updates reuse the same two meshes and cached anchors.
  const update = model.updateMatrixWorld, world = model.updateWorldMatrix;
  model.updateMatrixWorld = function (force) { sync(); return update.call(this, force); };
  model.updateWorldMatrix = function (parents, children) { sync(); return world.call(this, parents, children); };
  model.userData.handConnections = entries;
  sync();
  return model;
}

export const MonsterNames=globalThis.ImasoraMonsterNames;

export const WHITE_MICHI_ROAD_SABER_REN_ID = "star-white-hero-young-seed-walk-sky-cool-b-forest";
export const WHITE_MICHI_ROAD_SABER_FLOWERING_ID = "hero-white-young-seed-walk-sky-cool-b";

const MATURE_FORM_BASES = Object.freeze([
  { key: "walk-cute", profileKey: "walkCute", youngTail: "メバン", heroTail: "フワナ" },
  { key: "walk-cool-a", profileKey: "walkBrave", youngTail: "メバン", heroTail: "ブレイブ" },
  { key: "walk-cool-b", profileKey: "walkSaber", youngTail: "メバン", heroTail: "セイバー" },
  { key: "sky-cute", profileKey: "rioCute", youngTail: "ロード", heroTail: "フワナ" },
  { key: "sky-cool-a", profileKey: "rioBrave", youngTail: "ロード", heroTail: "ブレイブ" },
  { key: "sky-cool-b", profileKey: "rioSaber", youngTail: "ロード", heroTail: "セイバー" }
]);

const MATURE_DECORATIONS = Object.freeze([
  { key: "comet", suffix: "ル", label: "羽根" },
  { key: "crown", suffix: "オウ", label: "王冠" },
  { key: "forest", suffix: "レン", label: "マント" }
]);

export const MATURE_CHARACTER_FAMILIES = Object.freeze([
  Object.freeze({ key: "white", label: "白（特別版）", base: "ミチ", seedKey: "walk", route: "白", bodyColor: 0xffffff, bodyColorCss: "#ffffff", sourceBodyColorCss: "#f8fbff", bodyEmissiveIntensity: .82, whiteVariant: true }),
  Object.freeze({ key: "walk", label: "ミチ系", base: "ミチ", seedKey: "walk", route: "道", bodyColor: 0xff984f, bodyColorCss: "#ff984f", sourceBodyColorCss: "#ffb978", bodyEmissiveIntensity: .42 }),
  Object.freeze({ key: "sky", label: "ソラ系", base: "ソラ", seedKey: "sky", route: "空", bodyColor: 0x56c2ff, bodyColorCss: "#56c2ff", sourceBodyColorCss: "#9ed8ff", bodyEmissiveIntensity: .42 }),
  Object.freeze({ key: "leaf", label: "ハニ系", base: "ハニ", seedKey: "leaf", route: "自然", bodyColor: 0x7cdf4d, bodyColorCss: "#7cdf4d", sourceBodyColorCss: "#aee58b", bodyEmissiveIntensity: .42 }),
  Object.freeze({ key: "city", label: "マチ系", base: "マチ", seedKey: "city", route: "街", bodyColor: 0xa085ff, bodyColorCss: "#a085ff", sourceBodyColorCss: "#c4b9ff", bodyEmissiveIntensity: .42 }),
  Object.freeze({ key: "river", label: "ミズ系", base: "ミズ", seedKey: "river", route: "水辺", bodyColor: 0x46e0d2, bodyColorCss: "#46e0d2", sourceBodyColorCss: "#8eeadf", bodyEmissiveIntensity: .42 }),
  Object.freeze({ key: "night", label: "アケ系", base: "アケ", seedKey: "night", route: "朝夕", bodyColor: 0xf673af, bodyColorCss: "#f673af", sourceBodyColorCss: "#f9a7cb", bodyEmissiveIntensity: .42 }),
  Object.freeze({ key: "luck", label: "ユラ系", base: "ユラ", seedKey: "luck", route: "ゆらぎ", bodyColor: 0xffc737, bodyColorCss: "#ffc737", sourceBodyColorCss: "#ffd66f", bodyEmissiveIntensity: .42 })
]);

function buildMatureCharacterDescriptor(family, base, decoration) {
  const whitePrefix = family.whiteVariant ? "white-" : "";
  const whiteNamePrefix = family.whiteVariant ? "白" : "";
  return Object.freeze({
    id: `star-${whitePrefix}hero-young-seed-${family.seedKey}-${base.key}-${decoration.key}`,
    name: MonsterNames.name(`star-${whitePrefix}hero-young-seed-${family.seedKey}-${base.key}-${decoration.key}`),
    familyKey: family.key,
    familyLabel: family.label,
    route: family.route,
    bodyColor: family.bodyColor,
    bodyColorCss: family.bodyColorCss,
    sourceBodyColorCss: family.sourceBodyColorCss,
    bodyEmissiveIntensity: family.bodyEmissiveIntensity,
    whiteVariant: Boolean(family.whiteVariant),
    profileKey: base.profileKey,
    formKey: base.key,
    decoration: decoration.key,
    decorationLabel: decoration.label,
    stageKey: "mature",
    growthStage: "満開期",
    templateCharacterId: `star-white-hero-young-seed-walk-${base.key}-${decoration.key}`
  });
}

function buildFloweringCharacterDescriptor(family, base) {
  const whiteIdPart = family.whiteVariant ? "white-" : "";
  const whiteNamePrefix = family.whiteVariant ? "白" : "";
  return Object.freeze({
    id: `hero-${whiteIdPart}young-seed-${family.seedKey}-${base.key}`,
    name: MonsterNames.name(`hero-${whiteIdPart}young-seed-${family.seedKey}-${base.key}`),
    familyKey: family.key,
    familyLabel: family.label,
    route: family.route,
    bodyColor: family.bodyColor,
    bodyColorCss: family.bodyColorCss,
    sourceBodyColorCss: family.sourceBodyColorCss,
    bodyEmissiveIntensity: family.bodyEmissiveIntensity,
    whiteVariant: Boolean(family.whiteVariant),
    profileKey: base.profileKey,
    formKey: base.key,
    decoration: null,
    decorationLabel: "装飾なし",
    stageKey: "flowering",
    growthStage: "開花期",
    templateCharacterId: `hero-white-young-seed-walk-${base.key}`
  });
}

export const ALL_MATURE_STAR_CHARACTERS = Object.freeze(
  MATURE_CHARACTER_FAMILIES.flatMap((family) => MATURE_FORM_BASES.flatMap((base) =>
    MATURE_DECORATIONS.map((decoration) => buildMatureCharacterDescriptor(family, base, decoration))
  ))
);

export const WHITE_MICHI_STAR_CHARACTERS = Object.freeze(
  ALL_MATURE_STAR_CHARACTERS.filter((item) => item.whiteVariant)
);

export const FLOWERING_CHARACTER_FAMILIES = MATURE_CHARACTER_FAMILIES;

export const ALL_FLOWERING_HERO_CHARACTERS = Object.freeze(
  FLOWERING_CHARACTER_FAMILIES.flatMap((family) =>
    MATURE_FORM_BASES.map((base) => buildFloweringCharacterDescriptor(family, base))
  )
);

const MATURE_CHARACTER_BY_ID = new Map(ALL_MATURE_STAR_CHARACTERS.map((item) => [item.id, item]));
const WHITE_MICHI_CHARACTER_BY_ID = new Map(WHITE_MICHI_STAR_CHARACTERS.map((item) => [item.id, item]));
const FLOWERING_CHARACTER_BY_ID = new Map(ALL_FLOWERING_HERO_CHARACTERS.map((item) => [item.id, item]));

const SVG_SCALE = 1.04;
const BODY_CENTER_Y = 78;
const BODY_DEPTH_OFFSET = 5.5 * SVG_SCALE;

const BODY_PROFILES = Object.freeze({
  walkCute: Object.freeze({
    key: "walkCute",
    sourceSilhouette: "unique-index-0",
    top: { svgY: 24, centerX: 58 },
    bottom: { svgY: 99, centerX: 57 },
    rings: [
      { svgY: 27, centerX: 58, radiusX: 12 },
      { svgY: 34, centerX: 58, radiusX: 22 },
      { svgY: 46, centerX: 58, radiusX: 29 },
      { svgY: 61, centerX: 58, radiusX: 31 },
      { svgY: 76, centerX: 57, radiusX: 28 },
      { svgY: 87, centerX: 57, radiusX: 22 },
      { svgY: 95, centerX: 57, radiusX: 11 }
    ],
    depthRatio: .79,
    crossSectionPower: 2.25,
    eyeSvgY: 50,
    handSvgY: 66,
    handX: 35,
    handZ: 13,
    handAttachmentOffsets: {
      left: { x: 1.12, y: .08, z: -.53 },
      right: { x: -1.49, y: .30, z: -.71 }
    },
    footSvgY: 91,
    footX: 15,
    bodyScale: 1,
    crown: { radius: 17.5, bandY: 110.25, pointHeight: 14 },
    wing: { rootY: 88, span: 29, rise: 27 },
    cape: { anchorX: 21, anchorY: 79, bottomWidth: 31, bottomY: 50, bottomZ: -24 }
  }),
  walkBrave: Object.freeze({
    key: "walkBrave",
    sourceSilhouette: "unique-index-1",
    top: { svgY: 38, centerX: 58 },
    bottom: { svgY: 91, centerX: 58 },
    rings: [
      { svgY: 41, centerX: 58, radiusX: 16 },
      { svgY: 47, centerX: 58, radiusX: 28 },
      { svgY: 57, centerX: 58, radiusX: 35 },
      { svgY: 68, centerX: 58, radiusX: 37 },
      { svgY: 79, centerX: 58, radiusX: 31 },
      { svgY: 87, centerX: 58, radiusX: 17 }
    ],
    depthRatio: .64,
    crossSectionPower: 2.55,
    eyeSvgY: 54,
    handSvgY: 68,
    handX: 42,
    handZ: 10,
    handAttachmentOffsets: {
      left: { x: .59, y: .07, z: -.15 },
      right: { x: -.59, y: .07, z: -.15 }
    },
    footSvgY: 91,
    footX: 16,
    hasSoraDama: true,
    crown: { radius: 18, bandY: 99, pointHeight: 12 },
    wing: { rootY: 86, span: 32, rise: 24 },
    cape: { anchorX: 25, anchorY: 74, bottomWidth: 37, bottomY: 49, bottomZ: -22, seamlessWrap: true, wrapClearance: 3.2 }
  }),
  walkSaber: Object.freeze({
    key: "walkSaber",
    sourceSilhouette: "unique-index-2",
    top: { svgY: 27, centerX: 58 },
    bottom: { svgY: 89, centerX: 59 },
    rings: [
      { svgY: 31, centerX: 58, radiusX: 11 },
      { svgY: 38, centerX: 59, radiusX: 22 },
      { svgY: 50, centerX: 60, radiusX: 28 },
      { svgY: 64, centerX: 59, radiusX: 28 },
      { svgY: 76, centerX: 58, radiusX: 22 },
      { svgY: 84, centerX: 59, radiusX: 13 }
    ],
    depthRatio: .76,
    crossSectionPower: 2.2,
    eyeSvgY: 50,
    handSvgY: 66,
    handX: 34,
    handZ: 13,
    handAttachmentOffsets: {
      left: { x: 4.07, y: .74, z: -2.05 },
      right: { x: -2.38, y: .83, z: -1.20 }
    },
    footSvgY: 91,
    footX: 15,
    footAttachmentOffsets: {
      left: { x: 1.81, y: 3.39, z: -.26 },
      right: { x: -1.53, y: 2.90, z: -.80 }
    },
    crown: { radius: 17, bandY: 105.75, pointHeight: 15 },
    wing: { rootY: 89, span: 30, rise: 28 },
    cape: { anchorX: 18.5, anchorY: 79, bottomWidth: 27, bottomY: 50, bottomZ: -24 }
  }),
  rioCute: Object.freeze({
    key: "rioCute",
    sourceSilhouette: "unique-index-3",
    top: { svgY: 26, centerX: 58 },
    bottom: { svgY: 87, centerX: 58 },
    rings: [
      { svgY: 28, centerX: 58, radiusX: 22 },
      { svgY: 32, centerX: 58, radiusX: 27 },
      { svgY: 46, centerX: 58, radiusX: 28 },
      { svgY: 65, centerX: 58, radiusX: 28 },
      { svgY: 79, centerX: 58, radiusX: 27 },
      { svgY: 85, centerX: 58, radiusX: 20 }
    ],
    depthRatio: .77,
    crossSectionPower: 4.6,
    eyeSvgY: 50,
    handSvgY: 66,
    handX: 35,
    handZ: 14,
    handAttachmentOffsets: {
      left: { x: 2.08, y: .06, z: -.42 },
      right: { x: -2.08, y: .06, z: -.42 }
    },
    footSvgY: 91,
    footX: 15,
    footAttachmentOffsets: {
      left: { x: .12, y: 1.27, z: 0 },
      right: { x: -.12, y: 1.28, z: -.02 }
    },
    crown: { radius: 19.5, bandY: 112, pointHeight: 14 },
    wing: { rootY: 88, span: 32, rise: 27 },
    cape: { anchorX: 20, anchorY: 79, bottomWidth: 31, bottomY: 50, bottomZ: -24, seamlessWrap: true, wrapClearance: 3 }
  }),
  rioBrave: Object.freeze({
    key: "rioBrave",
    sourceSilhouette: "unique-index-4",
    top: { svgY: 29, centerX: 75 },
    bottom: { svgY: 88, centerX: 61 },
    rings: [
      { svgY: 33, centerX: 70, radiusX: 13 },
      { svgY: 40, centerX: 66, radiusX: 26 },
      { svgY: 50, centerX: 64, radiusX: 36 },
      { svgY: 62, centerX: 64, radiusX: 43 },
      { svgY: 73, centerX: 62, radiusX: 38 },
      { svgY: 82, centerX: 61, radiusX: 25 },
      { svgY: 86, centerX: 61, radiusX: 12 }
    ],
    depthRatio: .57,
    crossSectionPower: 2.25,
    eyeSvgY: 56,
    eyeCenterX: 62,
    handSvgY: 67,
    handX: 46,
    handCenterX: 5,
    handZ: 8,
    footSvgY: 87,
    footX: 16,
    crown: { radius: 19, bandY: 104.15, pointHeight: 12, offsetX: 11.2 },
    wing: { rootY: 87, span: 35, rise: 25 },
    cape: { anchorX: 24, anchorY: 77, bottomWidth: 34, bottomY: 50, bottomZ: -22, seamlessWrap: true, wrapClearance: 3.3 }
  }),
  rioSaber: Object.freeze({
    key: "rioSaber",
    sourceSilhouette: "unique-index-5-eight-direction",
    useApprovedBody: true,
    top: { svgY: 23, centerX: 58 },
    bottom: { svgY: 91, centerX: 58 },
    rings: [],
    depthRatio: .875,
    crossSectionPower: 2,
    eyeSvgY: 50,
    handSvgY: 66,
    handX: 30,
    handZ: 18,
    handAttachmentOffsets: {
      right: { x: -3.37, y: 0, z: -2.96 }
    },
    footSvgY: 91,
    footX: 15,
    footAttachmentOffsets: {
      left: { x: .34, y: 1.31, z: .12 },
      right: { x: -.34, y: 1.31, z: -.12 }
    },
    crown: { radius: 18.5, bandY: 112.85, pointHeight: 16 },
    wing: { rootY: 91, span: 33, rise: 30 },
    cape: { anchorX: 19.5, anchorY: 80, bottomWidth: 32, bottomY: 51, bottomZ: -28 }
  })
});

const toWorldY = svgY => BODY_CENTER_Y + (58 - svgY) * SVG_SCALE;

function withAttachmentOffset(position, offsets, side) {
  const offset = offsets?.[side];
  if (!offset) return position;
  return {
    x: position.x + (offset.x || 0),
    y: position.y + (offset.y || 0),
    z: position.z + (offset.z || 0)
  };
}

function cubicPoint(p0, p1, p2, p3, t) {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y
  };
}

function buildBodyGeometry() {
  const profile = [];
  for (let step = 1; step <= 14; step += 1) {
    const point = cubicPoint(
      { x: 58, y: 23 },
      { x: 74, y: 23 },
      { x: 86, y: 33 },
      { x: 86, y: 49 },
      step / 14
    );
    profile.push({ radiusX: (point.x - 58) * SVG_SCALE, y: toWorldY(point.y) });
  }
  for (let step = 1; step <= 7; step += 1) {
    const svgY = 49 + (30 * step) / 7;
    profile.push({ radiusX: 28 * SVG_SCALE, y: toWorldY(svgY) });
  }
  for (let step = 1; step <= 12; step += 1) {
    const point = cubicPoint(
      { x: 86, y: 79 },
      { x: 75, y: 91 },
      { x: 41, y: 91 },
      { x: 30, y: 79 },
      .5 * step / 12
    );
    profile.push({ radiusX: Math.max(0, (point.x - 58) * SVG_SCALE), y: toWorldY(point.y) });
  }

  const radialSegments = 72;
  const positions = [0, toWorldY(23), BODY_DEPTH_OFFSET];
  const uvs = [.5, 1];
  const indices = [];
  const ringStart = [];
  profile.slice(0, -1).forEach((ring, ringIndex) => {
    ringStart.push(positions.length / 3);
    const radiusZ = ring.radiusX * .875;
    for (let segment = 0; segment < radialSegments; segment += 1) {
      const angle = segment / radialSegments * Math.PI * 2;
      positions.push(
        Math.sin(angle) * ring.radiusX,
        ring.y,
        BODY_DEPTH_OFFSET + Math.cos(angle) * radiusZ
      );
      uvs.push(segment / radialSegments, 1 - ringIndex / Math.max(1, profile.length - 1));
    }
  });

  const bottomIndex = positions.length / 3;
  const bottom = profile[profile.length - 1];
  positions.push(0, bottom.y, BODY_DEPTH_OFFSET);
  uvs.push(.5, 0);

  for (let segment = 0; segment < radialSegments; segment += 1) {
    const next = (segment + 1) % radialSegments;
    indices.push(0, ringStart[0] + segment, ringStart[0] + next);
  }
  for (let ring = 0; ring < ringStart.length - 1; ring += 1) {
    for (let segment = 0; segment < radialSegments; segment += 1) {
      const next = (segment + 1) % radialSegments;
      const a = ringStart[ring] + segment;
      const b = ringStart[ring] + next;
      const c = ringStart[ring + 1] + segment;
      const d = ringStart[ring + 1] + next;
      indices.push(a, c, b, b, c, d);
    }
  }
  const lastRing = ringStart[ringStart.length - 1];
  for (let segment = 0; segment < radialSegments; segment += 1) {
    const next = (segment + 1) % radialSegments;
    indices.push(lastRing + segment, bottomIndex, lastRing + next);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function buildCapeGeometry() {
  const horizontalSegments = 48;
  const verticalSegments = 18;
  const rowSize = horizontalSegments + 1;
  const layerSize = rowSize * (verticalSegments + 1);
  const thickness = 1.8;
  const positions = [];
  const uvs = [];
  const indices = [];

  const { capePath } = buildCapeFastenerPoints();
  const rearCordCurve = new THREE.CatmullRomCurve3(capePath, false, "centripetal", .45);

  const sampleCape = (u, v) => {
    const top = rearCordCurve.getPoint(u);
    const edge = Math.abs(u * 2 - 1);
    const easedV = v * v * (3 - 2 * v);
    const fullBottom = new THREE.Vector3(
      THREE.MathUtils.lerp(32, -32, u),
      51 + 5.2 * (1 - Math.pow(edge, 1.45)),
      -28 + 9.5 * Math.pow(edge, 1.6)
    );
    const bottom = fullBottom;
    const billow = -3.2 * Math.sin(Math.PI * v) * (.72 + .28 * (1 - edge));
    const softFold = 1.05 * Math.sin((u * 4 + .25) * Math.PI) * Math.sin(Math.PI * v);
    return top.clone().lerp(bottom, easedV).add(new THREE.Vector3(0, 0, billow + softFold));
  };

  for (let layer = 0; layer < 2; layer += 1) {
    const zOffset = layer === 0 ? thickness * .5 : -thickness * .5;
    for (let vIndex = 0; vIndex <= verticalSegments; vIndex += 1) {
      const v = vIndex / verticalSegments;
      for (let uIndex = 0; uIndex <= horizontalSegments; uIndex += 1) {
        const u = uIndex / horizontalSegments;
        const point = sampleCape(u, v);
        positions.push(point.x, point.y, point.z + zOffset);
        uvs.push(u, 1 - v);
      }
    }
  }

  const vertex = (layer, uIndex, vIndex) => layer * layerSize + vIndex * rowSize + uIndex;
  for (let vIndex = 0; vIndex < verticalSegments; vIndex += 1) {
    for (let uIndex = 0; uIndex < horizontalSegments; uIndex += 1) {
      const a = vertex(0, uIndex, vIndex);
      const b = vertex(0, uIndex + 1, vIndex);
      const c = vertex(0, uIndex, vIndex + 1);
      const d = vertex(0, uIndex + 1, vIndex + 1);
      indices.push(a, b, c, b, d, c);

      const backA = vertex(1, uIndex, vIndex);
      const backB = vertex(1, uIndex + 1, vIndex);
      const backC = vertex(1, uIndex, vIndex + 1);
      const backD = vertex(1, uIndex + 1, vIndex + 1);
      indices.push(backA, backC, backB, backB, backC, backD);
    }
  }

  const addQuad = (a, b, c, d) => indices.push(a, b, c, a, c, d);
  for (let uIndex = 0; uIndex < horizontalSegments; uIndex += 1) {
    addQuad(
      vertex(0, uIndex, 0),
      vertex(1, uIndex, 0),
      vertex(1, uIndex + 1, 0),
      vertex(0, uIndex + 1, 0)
    );
    addQuad(
      vertex(0, uIndex, verticalSegments),
      vertex(0, uIndex + 1, verticalSegments),
      vertex(1, uIndex + 1, verticalSegments),
      vertex(1, uIndex, verticalSegments)
    );
  }
  for (let vIndex = 0; vIndex < verticalSegments; vIndex += 1) {
    addQuad(
      vertex(0, 0, vIndex),
      vertex(0, 0, vIndex + 1),
      vertex(1, 0, vIndex + 1),
      vertex(1, 0, vIndex)
    );
    addQuad(
      vertex(0, horizontalSegments, vIndex),
      vertex(1, horizontalSegments, vIndex),
      vertex(1, horizontalSegments, vIndex + 1),
      vertex(0, horizontalSegments, vIndex + 1)
    );
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function frontSurfaceZ(x) {
  const radiusX = 28 * SVG_SCALE;
  const radiusZ = radiusX * .875;
  return BODY_DEPTH_OFFSET + radiusZ * Math.sqrt(Math.max(0, 1 - Math.pow(x / radiusX, 2)));
}

function buildCapeFrontAnchors() {
  const anchorY = 80;
  const anchorX = 19.5;
  return {
    leftFront: new THREE.Vector3(-anchorX, anchorY, frontSurfaceZ(-anchorX) + 1.15),
    rightFront: new THREE.Vector3(anchorX, anchorY, frontSurfaceZ(anchorX) + 1.15)
  };
}

function buildRearCordPath(leftFront, rightFront) {
  const radiusX = 29.2;
  const startAngle = Math.asin(rightFront.x / radiusX);
  const radiusZ = (rightFront.z - BODY_DEPTH_OFFSET) / Math.cos(startAngle);
  const endAngle = Math.PI * 2 - startAngle;
  const segments = 40;
  const points = [];
  for (let index = 0; index <= segments; index += 1) {
    const t = index / segments;
    const angle = THREE.MathUtils.lerp(startAngle, endAngle, t);
    points.push(new THREE.Vector3(
      radiusX * Math.sin(angle),
      80 + 4 * Math.sin(Math.PI * t),
      BODY_DEPTH_OFFSET + radiusZ * Math.cos(angle)
    ));
  }
  points[0].copy(rightFront);
  points[points.length - 1].copy(leftFront);
  return points;
}

function buildCapeAttachmentPath(rightFront) {
  const radiusX = 29.2;
  const fullStartAngle = Math.asin(rightFront.x / radiusX);
  const fullEndAngle = Math.PI * 2 - fullStartAngle;
  const radiusZ = (rightFront.z - BODY_DEPTH_OFFSET) / Math.cos(fullStartAngle);
  const segments = 28;
  const points = [];
  for (let index = 0; index <= segments; index += 1) {
    const t = index / segments;
    const angle = THREE.MathUtils.lerp(Math.PI / 2, Math.PI * 1.5, t);
    const fullPathT = (angle - fullStartAngle) / (fullEndAngle - fullStartAngle);
    points.push(new THREE.Vector3(
      radiusX * Math.sin(angle),
      80 + 4 * Math.sin(Math.PI * fullPathT),
      BODY_DEPTH_OFFSET + radiusZ * Math.cos(angle)
    ));
  }
  return points;
}

function buildCapeFastenerPoints() {
  const { leftFront, rightFront } = buildCapeFrontAnchors();
  return {
    leftFront,
    centerFront: new THREE.Vector3(0, 77, frontSurfaceZ(0) + 1.2),
    rightFront,
    rearPath: buildRearCordPath(leftFront, rightFront),
    capePath: buildCapeAttachmentPath(rightFront)
  };
}

function buildCapeYokeGeometry() {
  const { rearPath } = buildCapeFastenerPoints();
  const curve = new THREE.CatmullRomCurve3(rearPath, false, "centripetal", .45);
  const segments = 56;
  const positions = [];
  const uvs = [];
  const indices = [];

  for (let index = 0; index <= segments; index += 1) {
    const u = index / segments;
    const top = curve.getPoint(u);
    const radial = new THREE.Vector3(top.x, 0, top.z - BODY_DEPTH_OFFSET).normalize();
    const shoulderBlend = Math.pow(Math.sin(Math.PI * u), .72);
    const bottom = top.clone()
      .addScaledVector(radial, 2.1 * shoulderBlend)
      .add(new THREE.Vector3(0, -8.8 * shoulderBlend, -2 * shoulderBlend));
    positions.push(top.x, top.y, top.z, bottom.x, bottom.y, bottom.z);
    uvs.push(u, 1, u, 0);
  }
  for (let index = 0; index < segments; index += 1) {
    const top = index * 2;
    const bottom = top + 1;
    const nextTop = top + 2;
    const nextBottom = top + 3;
    indices.push(top, nextTop, bottom, nextTop, nextBottom, bottom);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function makePhysical(color, roughness = .55, clearcoat = .18) {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness,
    clearcoat,
    clearcoatRoughness: .45,
    metalness: 0
  });
}

function makeCharacterMaterials(options = {}) {
  const bodyColor = options.bodyColor ?? 0xf8fbff;
  const body = makePhysical(bodyColor, .52, .06);
  body.emissive.set(bodyColor);
  body.emissiveIntensity = Number.isFinite(options.bodyEmissiveIntensity)
    ? Math.max(0, options.bodyEmissiveIntensity)
    : .14;
  body.toneMapped = false;
  const materials = {
    body,
    eye: makePhysical(options.eyeColor ?? 0x16202c, .3, .5),
    hand: makePhysical(options.handColor ?? 0x58bf72, .56, .16),
    foot: makePhysical(options.footColor ?? 0x8b5a34, .68, .08),
    cape: makePhysical(options.capeColor ?? 0xc92f3a, .66, .12),
    cord: makePhysical(options.cordColor ?? 0x8f2948, .58, .12),
    brooch: makePhysical(options.broochColor ?? 0xe6ad45, .34, .48),
    clasp: makePhysical(options.claspColor ?? 0xa82d46, .42, .32),
    crown: makePhysical(options.crownColor ?? 0xffd65b, .27, .62),
    crownShade: makePhysical(options.crownShadeColor ?? 0x9a6108, .4, .4),
    jewelRed: makePhysical(options.jewelRedColor ?? 0xe74658, .22, .72),
    jewelBlue: makePhysical(options.jewelBlueColor ?? 0x4fb4ff, .2, .78),
    wingEdge: makePhysical(options.wingEdgeColor ?? 0x1f6d9c, .28, .48),
    soraDama: makePhysical(options.soraDamaColor ?? 0x7edcff, .16, .72),
    soraDamaHighlight: new THREE.MeshBasicMaterial({ color: 0xf5fdff, transparent: true, opacity: .82 })
  };
  materials.cape.side = THREE.DoubleSide;
  materials.wing = new THREE.MeshPhysicalMaterial({
    color: options.wingColor ?? 0xc7f3ff,
    roughness: .18,
    clearcoat: .72,
    clearcoatRoughness: .22,
    transmission: .08,
    transparent: true,
    opacity: .82,
    metalness: 0,
    side: THREE.DoubleSide
  });
  return materials;
}

function profileSamples(profile) {
  return [
    { svgY: profile.top.svgY, centerX: profile.top.centerX, radiusX: 0 },
    ...profile.rings,
    { svgY: profile.bottom.svgY, centerX: profile.bottom.centerX, radiusX: 0 }
  ];
}

function profileSliceAtWorldY(profile, worldY) {
  const svgY = 58 - (worldY - BODY_CENTER_Y) / SVG_SCALE;
  const samples = profileSamples(profile);
  if (svgY <= samples[0].svgY) return samples[0];
  if (svgY >= samples[samples.length - 1].svgY) return samples[samples.length - 1];
  for (let index = 0; index < samples.length - 1; index += 1) {
    const start = samples[index];
    const end = samples[index + 1];
    if (svgY < start.svgY || svgY > end.svgY) continue;
    const t = (svgY - start.svgY) / Math.max(.0001, end.svgY - start.svgY);
    return {
      svgY,
      centerX: THREE.MathUtils.lerp(start.centerX, end.centerX, t),
      radiusX: THREE.MathUtils.lerp(start.radiusX, end.radiusX, t)
    };
  }
  return samples[samples.length - 1];
}

function profileFrontSurfaceZ(profile, worldX, worldY) {
  if (profile.useApprovedBody) return frontSurfaceZ(worldX);
  const slice = profileSliceAtWorldY(profile, worldY);
  const centerX = (slice.centerX - 58) * SVG_SCALE;
  const radiusX = Math.max(.001, slice.radiusX * SVG_SCALE);
  const radiusZ = Math.max(2.5, radiusX * profile.depthRatio);
  const power = profile.crossSectionPower || 2;
  const normalizedX = Math.min(1, Math.abs((worldX - centerX) / radiusX));
  const frontRatio = Math.pow(Math.max(0, 1 - Math.pow(normalizedX, power)), 1 / power);
  return BODY_DEPTH_OFFSET + radiusZ * frontRatio;
}

function buildProfiledBodyGeometry(profile) {
  const radialSegments = 72;
  const power = profile.crossSectionPower || 2;
  const ringStart = [];
  const positions = [];
  const uvs = [];
  const indices = [];
  const controlSamples = profileSamples(profile);
  const profileCurve = new THREE.CatmullRomCurve3(
    controlSamples.map((sample) => new THREE.Vector3(sample.centerX, sample.radiusX, sample.svgY)),
    false,
    "centripetal",
    .42
  );
  const samples = profileCurve.getPoints(48).map((point) => ({
    centerX: point.x,
    radiusX: Math.max(0, point.y),
    svgY: point.z
  }));
  samples[0] = { ...controlSamples[0] };
  samples[samples.length - 1] = { ...controlSamples[controlSamples.length - 1] };
  const top = samples[0];
  const bottom = samples[samples.length - 1];
  positions.push(
    (top.centerX - 58) * SVG_SCALE,
    toWorldY(top.svgY),
    BODY_DEPTH_OFFSET
  );
  uvs.push(.5, 1);

  samples.slice(1, -1).forEach((ring, ringIndex) => {
    ringStart.push(positions.length / 3);
    const radiusX = ring.radiusX * SVG_SCALE;
    const radiusZ = radiusX * profile.depthRatio;
    const centerX = (ring.centerX - 58) * SVG_SCALE;
    for (let segment = 0; segment < radialSegments; segment += 1) {
      const angle = segment / radialSegments * Math.PI * 2;
      const sin = Math.sin(angle);
      const cos = Math.cos(angle);
      const superX = Math.sign(sin) * Math.pow(Math.abs(sin), 2 / power);
      const superZ = Math.sign(cos) * Math.pow(Math.abs(cos), 2 / power);
      positions.push(
        centerX + superX * radiusX,
        toWorldY(ring.svgY),
        BODY_DEPTH_OFFSET + superZ * radiusZ
      );
      uvs.push(segment / radialSegments, 1 - (ringIndex + 1) / Math.max(1, samples.length - 1));
    }
  });

  const bottomIndex = positions.length / 3;
  positions.push(
    (bottom.centerX - 58) * SVG_SCALE,
    toWorldY(bottom.svgY),
    BODY_DEPTH_OFFSET
  );
  uvs.push(.5, 0);

  for (let segment = 0; segment < radialSegments; segment += 1) {
    const next = (segment + 1) % radialSegments;
    indices.push(0, ringStart[0] + segment, ringStart[0] + next);
  }
  for (let ring = 0; ring < ringStart.length - 1; ring += 1) {
    for (let segment = 0; segment < radialSegments; segment += 1) {
      const next = (segment + 1) % radialSegments;
      const a = ringStart[ring] + segment;
      const b = ringStart[ring] + next;
      const c = ringStart[ring + 1] + segment;
      const d = ringStart[ring + 1] + next;
      indices.push(a, c, b, b, c, d);
    }
  }
  const lastRing = ringStart[ringStart.length - 1];
  for (let segment = 0; segment < radialSegments; segment += 1) {
    const next = (segment + 1) % radialSegments;
    indices.push(lastRing + segment, bottomIndex, lastRing + next);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function makeEllipsoid(material, scale, position, name, segments = 28) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, segments, Math.max(16, Math.round(segments * .66))), material);
  mesh.name = name;
  mesh.scale.set(scale.x, scale.y, scale.z);
  mesh.position.set(position.x, position.y, position.z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function buildCrownDecoration(profile, materials) {
  const settings = profile.crown;
  const crown = new THREE.Group();
  crown.name = "star-decoration-crown";
  const jewels = new THREE.Group();
  jewels.name = "crown-jewels";
  const radius = settings.radius;
  const bandY = settings.bandY;

  const band = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * .91, radius, 5, 64, 1, true),
    materials.crown
  );
  band.name = "crown-rounded-band";
  band.position.set(0, bandY, BODY_DEPTH_OFFSET);
  band.castShadow = true;
  crown.add(band);

  const lowerRim = new THREE.Mesh(new THREE.TorusGeometry(radius * .96, 1.35, 12, 64), materials.crownShade);
  lowerRim.rotation.x = Math.PI / 2;
  lowerRim.position.set(0, bandY - 2.35, BODY_DEPTH_OFFSET);
  crown.add(lowerRim);

  const pointCount = 8;
  for (let index = 0; index < pointCount; index += 1) {
    const angle = index / pointCount * Math.PI * 2;
    const frontWeight = .86 + .14 * Math.max(0, Math.cos(angle));
    const height = settings.pointHeight * (index % 2 ? .78 : 1) * frontWeight;
    const spike = new THREE.Mesh(
      new THREE.ConeGeometry(3.25, height, 4, 1, false),
      materials.crown
    );
    spike.name = `crown-point-${index + 1}`;
    spike.position.set(
      Math.sin(angle) * radius * .78,
      bandY + 2.2 + height * .5,
      BODY_DEPTH_OFFSET + Math.cos(angle) * radius * .78
    );
    spike.rotation.y = -angle + Math.PI / 4;
    spike.castShadow = true;
    crown.add(spike);

    const tip = new THREE.Mesh(new THREE.SphereGeometry(.86, 16, 12), materials.crown);
    tip.position.set(spike.position.x, bandY + 2.2 + height + .2, spike.position.z);
    crown.add(tip);
  }

  [
    { angle: 0, material: materials.jewelBlue, scale: 1.35 },
    { angle: Math.PI * .31, material: materials.jewelRed, scale: 1.15 },
    { angle: -Math.PI * .31, material: materials.jewelRed, scale: 1.15 },
    { angle: Math.PI * .68, material: materials.jewelBlue, scale: 1 },
    { angle: -Math.PI * .68, material: materials.jewelBlue, scale: 1 }
  ].forEach((jewel, index) => {
    const gem = makeEllipsoid(
      jewel.material,
      { x: 1.65 * jewel.scale, y: 1.9 * jewel.scale, z: .95 * jewel.scale },
      {
        x: Math.sin(jewel.angle) * radius * .94,
        y: bandY,
        z: BODY_DEPTH_OFFSET + Math.cos(jewel.angle) * radius * .94
      },
      `crown-jewel-${index + 1}`,
      20
    );
    gem.rotation.y = jewel.angle;
    jewels.add(gem);
  });
  crown.add(jewels);
  crown.position.x = Number.isFinite(settings.offsetX) ? settings.offsetX : 0;
  crown.userData = { primary: crown, secondary: jewels };
  return crown;
}

function buildCometWingShape(span, rise) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(span * .26, rise * .56, span * .62, rise * 1.07, span, rise * .8);
  shape.bezierCurveTo(span * .96, rise * .26, span * .48, -rise * .18, 0, 0);
  return shape;
}

function buildCometDecoration(profile, materials) {
  const settings = profile.wing;
  const wings = new THREE.Group();
  wings.name = "star-decoration-comet-wings";
  const veins = new THREE.Group();
  veins.name = "comet-wing-veins";
  const shape = buildCometWingShape(settings.span, settings.rise);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 2.1,
    bevelEnabled: true,
    bevelSegments: 3,
    steps: 1,
    bevelSize: .9,
    bevelThickness: .65,
    curveSegments: 22
  });

  [-1, 1].forEach((side) => {
    const wingAssembly = new THREE.Group();
    wingAssembly.name = side < 0 ? "comet-wing-left" : "comet-wing-right";
    wingAssembly.scale.x = side;
    wingAssembly.position.set(
      side * 13,
      settings.rootY,
      BODY_DEPTH_OFFSET - 11
    );
    wingAssembly.rotation.y = side * -.16;
    wingAssembly.rotation.z = side * -.12;

    const wing = new THREE.Mesh(geometry, materials.wing);
    wing.name = "comet-wing-volume";
    wing.position.z = -1.05;
    wing.castShadow = true;
    wing.receiveShadow = true;
    wingAssembly.add(wing);
    wings.add(wingAssembly);

    const veinCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(1, 1, 1.05),
      new THREE.Vector3(settings.span * .28, settings.rise * .32, 1.22),
      new THREE.Vector3(settings.span * .58, settings.rise * .55, 1.14),
      new THREE.Vector3(settings.span * .85, settings.rise * .69, 1.02)
    ]);
    const vein = new THREE.Mesh(new THREE.TubeGeometry(veinCurve, 32, .58, 8, false), materials.wingEdge);
    vein.name = "comet-wing-vein";
    vein.castShadow = true;
    const veinAssembly = new THREE.Group();
    veinAssembly.name = side < 0 ? "comet-wing-vein-left" : "comet-wing-vein-right";
    veinAssembly.scale.x = side;
    veinAssembly.position.copy(wingAssembly.position);
    veinAssembly.rotation.copy(wingAssembly.rotation);
    veinAssembly.add(vein);
    veins.add(veinAssembly);
  });
  wings.add(veins);

  wings.userData = { primary: wings, secondary: veins };
  return wings;
}

function buildGenericCapeSheetGeometry(topPoints, capeSettings) {
  const horizontalSegments = 48;
  const verticalSegments = 18;
  const rowSize = horizontalSegments + 1;
  const layerSize = rowSize * (verticalSegments + 1);
  const thickness = 1.8;
  const positions = [];
  const uvs = [];
  const indices = [];
  const topCurve = new THREE.CatmullRomCurve3(topPoints, false, "centripetal", .45);

  const sampleCape = (u, v) => {
    const top = topCurve.getPoint(u);
    const edge = Math.abs(u * 2 - 1);
    const easedV = v * v * (3 - 2 * v);
    const baseBottomX = THREE.MathUtils.lerp(capeSettings.bottomWidth, -capeSettings.bottomWidth, u);
    const baseBottomZ = capeSettings.bottomZ + 8.5 * Math.pow(edge, 1.55);
    const bottom = new THREE.Vector3(
      baseBottomX,
      capeSettings.bottomY + 4.8 * (1 - Math.pow(edge, 1.4)),
      baseBottomZ
    );
    const billow = -3 * Math.sin(Math.PI * v) * (.72 + .28 * (1 - edge));
    const fold = .95 * Math.sin((u * 4 + .25) * Math.PI) * Math.sin(Math.PI * v);
    return top.clone().lerp(bottom, easedV).add(new THREE.Vector3(0, 0, billow + fold));
  };

  for (let layer = 0; layer < 2; layer += 1) {
    const zOffset = layer === 0 ? thickness * .5 : -thickness * .5;
    for (let vIndex = 0; vIndex <= verticalSegments; vIndex += 1) {
      const v = vIndex / verticalSegments;
      for (let uIndex = 0; uIndex <= horizontalSegments; uIndex += 1) {
        const u = uIndex / horizontalSegments;
        const point = sampleCape(u, v);
        positions.push(point.x, point.y, point.z + zOffset);
        uvs.push(u, 1 - v);
      }
    }
  }

  const vertex = (layer, uIndex, vIndex) => layer * layerSize + vIndex * rowSize + uIndex;
  for (let vIndex = 0; vIndex < verticalSegments; vIndex += 1) {
    for (let uIndex = 0; uIndex < horizontalSegments; uIndex += 1) {
      const a = vertex(0, uIndex, vIndex);
      const b = vertex(0, uIndex + 1, vIndex);
      const c = vertex(0, uIndex, vIndex + 1);
      const d = vertex(0, uIndex + 1, vIndex + 1);
      indices.push(a, b, c, b, d, c);
      const backA = vertex(1, uIndex, vIndex);
      const backB = vertex(1, uIndex + 1, vIndex);
      const backC = vertex(1, uIndex, vIndex + 1);
      const backD = vertex(1, uIndex + 1, vIndex + 1);
      indices.push(backA, backC, backB, backB, backC, backD);
    }
  }
  const addQuad = (a, b, c, d) => indices.push(a, b, c, a, c, d);
  for (let uIndex = 0; uIndex < horizontalSegments; uIndex += 1) {
    addQuad(vertex(0, uIndex, 0), vertex(1, uIndex, 0), vertex(1, uIndex + 1, 0), vertex(0, uIndex + 1, 0));
    addQuad(vertex(0, uIndex, verticalSegments), vertex(0, uIndex + 1, verticalSegments), vertex(1, uIndex + 1, verticalSegments), vertex(1, uIndex, verticalSegments));
  }
  for (let vIndex = 0; vIndex < verticalSegments; vIndex += 1) {
    addQuad(vertex(0, 0, vIndex), vertex(0, 0, vIndex + 1), vertex(1, 0, vIndex + 1), vertex(1, 0, vIndex));
    addQuad(vertex(0, horizontalSegments, vIndex), vertex(1, horizontalSegments, vIndex), vertex(1, horizontalSegments, vIndex + 1), vertex(0, horizontalSegments, vIndex + 1));
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function buildGenericCapeYokeGeometry(rearPath) {
  const curve = new THREE.CatmullRomCurve3(rearPath, false, "centripetal", .45);
  const segments = 56;
  const positions = [];
  const uvs = [];
  const indices = [];
  for (let index = 0; index <= segments; index += 1) {
    const u = index / segments;
    const top = curve.getPoint(u);
    const radial = new THREE.Vector3(top.x, 0, top.z - BODY_DEPTH_OFFSET).normalize();
    const blend = Math.pow(Math.sin(Math.PI * u), .72);
    const bottom = top.clone().addScaledVector(radial, 2 * blend).add(new THREE.Vector3(0, -8.4 * blend, -1.8 * blend));
    positions.push(top.x, top.y, top.z, bottom.x, bottom.y, bottom.z);
    uvs.push(u, 1, u, 0);
  }
  for (let index = 0; index < segments; index += 1) {
    const top = index * 2;
    indices.push(top, top + 2, top + 1, top + 2, top + 3, top + 1);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function buildSmoothCapeYokeGeometry(rearPath, centerX) {
  const curve = new THREE.CatmullRomCurve3(rearPath, false, "centripetal", .45);
  const segments = 64;
  const positions = [];
  const uvs = [];
  const indices = [];
  for (let index = 0; index <= segments; index += 1) {
    const u = index / segments;
    const top = curve.getPoint(u);
    const radial = new THREE.Vector3(top.x - centerX, 0, top.z - BODY_DEPTH_OFFSET).normalize();
    const lift = Math.sin(Math.PI * u);
    const outerTop = top.clone().addScaledVector(radial, .72).add(new THREE.Vector3(0, -.28, 0));
    const width = 1.3 + 3.6 * lift;
    const bottom = outerTop.clone().addScaledVector(radial, .32).add(new THREE.Vector3(0, -width, 0));
    positions.push(outerTop.x, outerTop.y, outerTop.z, bottom.x, bottom.y, bottom.z);
    uvs.push(u, 1, u, 0);
  }
  for (let index = 0; index < segments; index += 1) {
    const top = index * 2;
    indices.push(top, top + 2, top + 1, top + 2, top + 3, top + 1);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function buildGenericForestDecoration(profile, materials) {
  const capeSettings = profile.cape;
  const slice = profileSliceAtWorldY(profile, capeSettings.anchorY);
  const centerX = (slice.centerX - 58) * SVG_SCALE;
  const seamlessWrap = capeSettings.seamlessWrap === true;
  if (seamlessWrap) materials.cape.side = THREE.DoubleSide;
  const wrapClearance = seamlessWrap ? capeSettings.wrapClearance : 1.25;
  const bodyRadiusX = slice.radiusX * SVG_SCALE;
  const wrapRadiusX = Math.max(capeSettings.anchorX + 2, bodyRadiusX + wrapClearance);
  const wrapRadiusZ = Math.max(12, bodyRadiusX * profile.depthRatio + (seamlessWrap ? wrapClearance : 1.15));
  const wrapPower = seamlessWrap ? profile.crossSectionPower || 2 : 2;
  const wrapExponent = 2 / wrapPower;
  const pointOnWrap = (angle, y) => {
    const sin = Math.sin(angle);
    const cos = Math.cos(angle);
    const superX = Math.sign(sin) * Math.pow(Math.abs(sin), wrapExponent);
    const superZ = Math.sign(cos) * Math.pow(Math.abs(cos), wrapExponent);
    return new THREE.Vector3(
      centerX + wrapRadiusX * superX,
      y,
      BODY_DEPTH_OFFSET + wrapRadiusZ * superZ
    );
  };
  const startRatio = Math.min(.98, capeSettings.anchorX / wrapRadiusX);
  const startAngle = Math.asin(seamlessWrap ? Math.pow(startRatio, wrapPower / 2) : startRatio);
  const endAngle = Math.PI * 2 - startAngle;
  const rightFront = seamlessWrap
    ? pointOnWrap(startAngle, capeSettings.anchorY)
    : new THREE.Vector3(
      centerX + capeSettings.anchorX,
      capeSettings.anchorY,
      profileFrontSurfaceZ(profile, centerX + capeSettings.anchorX, capeSettings.anchorY) + 1.15
    );
  const leftFront = seamlessWrap
    ? pointOnWrap(endAngle, capeSettings.anchorY)
    : new THREE.Vector3(
      centerX - capeSettings.anchorX,
      capeSettings.anchorY,
      profileFrontSurfaceZ(profile, centerX - capeSettings.anchorX, capeSettings.anchorY) + 1.15
    );
  const rearPath = [];
  for (let index = 0; index <= 40; index += 1) {
    const t = index / 40;
    const angle = THREE.MathUtils.lerp(startAngle, endAngle, t);
    rearPath.push(pointOnWrap(angle, capeSettings.anchorY + 3.6 * Math.sin(Math.PI * t)));
  }
  rearPath[0].copy(rightFront);
  rearPath[rearPath.length - 1].copy(leftFront);

  const capePath = [];
  for (let index = 0; index <= 28; index += 1) {
    const t = index / 28;
    const angle = THREE.MathUtils.lerp(Math.PI / 2, Math.PI * 1.5, t);
    const cordPathT = seamlessWrap ? (angle - startAngle) / (endAngle - startAngle) : t;
    const attachmentLift = seamlessWrap
      ? 3.6 * Math.sin(Math.PI * cordPathT)
      : 3.4 * Math.sin(Math.PI * t);
    capePath.push(pointOnWrap(angle, capeSettings.anchorY + attachmentLift));
  }

  const decoration = new THREE.Group();
  decoration.name = "star-decoration-forest";
  const cape = new THREE.Mesh(buildGenericCapeSheetGeometry(capePath, capeSettings), materials.cape);
  cape.name = "cape-curved";
  cape.castShadow = true;
  cape.receiveShadow = true;
  cape.renderOrder = 2;
  const yoke = new THREE.Mesh(
    seamlessWrap
      ? buildSmoothCapeYokeGeometry(rearPath, centerX)
      : buildGenericCapeYokeGeometry(rearPath),
    materials.cape
  );
  if (yoke) {
    yoke.name = "cape-upper-overlap-yoke";
    yoke.castShadow = true;
    yoke.receiveShadow = true;
    yoke.renderOrder = 3;
    cape.add(yoke);
  }
  decoration.add(cape);

  const fastener = new THREE.Group();
  fastener.name = "cape-fastener";
  const centerFront = new THREE.Vector3(
    centerX,
    capeSettings.anchorY - 3,
    profileFrontSurfaceZ(profile, centerX, capeSettings.anchorY - 3) + (seamlessWrap ? wrapClearance + .8 : 1.2)
  );
  const cord = new THREE.Group();
  cord.name = "cape-cord-continuous";
  const frontCurve = new THREE.CatmullRomCurve3([leftFront, centerFront, rightFront], false, "centripetal", .45);
  const frontCord = new THREE.Mesh(new THREE.TubeGeometry(frontCurve, 56, 1.2, 12, false), materials.cord);
  frontCord.name = "cape-cord-front-v";
  frontCord.castShadow = true;
  frontCord.renderOrder = 6;
  const rearCurve = new THREE.CatmullRomCurve3(rearPath, false, "centripetal", .45);
  const rearCord = new THREE.Mesh(new THREE.TubeGeometry(rearCurve, 96, 1.2, 12, false), materials.cord);
  rearCord.name = "cape-cord-rear-loop";
  rearCord.castShadow = true;
  rearCord.renderOrder = 1;
  cord.add(frontCord, rearCord);
  fastener.add(cord);

  const brooches = [];
  [leftFront, rightFront].forEach((position, index) => {
    const brooch = makeEllipsoid(
      materials.brooch,
      { x: 3.35, y: 3.35, z: 1.55 },
      { x: position.x, y: position.y, z: position.z + 1.15 },
      index === 0 ? "cape-brooch-left" : "cape-brooch-right"
    );
    brooches.push(brooch);
    fastener.add(brooch);
  });
  const clasp = new THREE.Group();
  clasp.name = "cape-clasp";
  clasp.position.copy(centerFront).add(new THREE.Vector3(0, 0, 1.3));
  const claspOuter = makeEllipsoid(materials.brooch, { x: 4.15, y: 4.6, z: 1.65 }, { x: 0, y: 0, z: 0 }, "cape-clasp-outer");
  const claspCore = makeEllipsoid(materials.clasp, { x: 2.55, y: 2.9, z: 1.75 }, { x: 0, y: 0, z: 1.25 }, "cape-clasp-core");
  clasp.add(claspOuter, claspCore);
  fastener.add(clasp);
  fastener.userData = { cord, frontCord, backCord: rearCord, clasp, brooches, closedLoop: true };
  decoration.add(fastener);
  decoration.userData = { primary: cape, secondary: fastener, cape, yoke, fastener };
  return decoration;
}

function buildGenericMatureCharacter(descriptor, options = {}) {
  const profile = BODY_PROFILES[descriptor.profileKey];
  const materials = makeCharacterMaterials(options);
  const model = new THREE.Group();
  model.name = `${descriptor.id}-360`;

  const body = new THREE.Mesh(buildProfiledBodyGeometry(profile), materials.body);
  body.name = "body-seamless";
  body.castShadow = true;
  body.receiveShadow = true;
  body.renderOrder = 3;
  model.add(body);

  const eyeCenterSvg = profile.eyeCenterX ?? 58.5;
  const eyeY = toWorldY(profile.eyeSvgY);
  const eyeLeftX = (eyeCenterSvg - 9.5 - 58) * SVG_SCALE;
  const eyeRightX = (eyeCenterSvg + 9.5 - 58) * SVG_SCALE;
  const eyeLeft = makeEllipsoid(materials.eye, { x: 3.33, y: 3.33, z: 1.72 }, {
    x: eyeLeftX,
    y: eyeY,
    z: profileFrontSurfaceZ(profile, eyeLeftX, eyeY) + .55
  }, "eye-left");
  const eyeRight = makeEllipsoid(materials.eye, { x: 3.33, y: 3.33, z: 1.72 }, {
    x: eyeRightX,
    y: eyeY,
    z: profileFrontSurfaceZ(profile, eyeRightX, eyeY) + .55
  }, "eye-right");
  model.add(eyeLeft, eyeRight);

  const handCenterX = profile.handCenterX || 0;
  const handY = toWorldY(profile.handSvgY);
  const leftHand = makeEllipsoid(materials.hand, { x: 6.24, y: 6.24, z: 5.55 }, withAttachmentOffset({
    x: handCenterX - profile.handX * SVG_SCALE,
    y: handY,
    z: BODY_DEPTH_OFFSET + profile.handZ
  }, profile.handAttachmentOffsets, "left"), "hand-left");
  const rightHand = makeEllipsoid(materials.hand, { x: 6.24, y: 6.24, z: 5.55 }, withAttachmentOffset({
    x: handCenterX + profile.handX * SVG_SCALE,
    y: handY,
    z: BODY_DEPTH_OFFSET + profile.handZ
  }, profile.handAttachmentOffsets, "right"), "hand-right");
  model.add(leftHand, rightHand);

  let soraDama = null;
  if (profile.hasSoraDama) {
    soraDama = new THREE.Group();
    soraDama.name = "sora-dama";
    const orb = makeEllipsoid(materials.soraDama, { x: 10.5, y: 10.5, z: 9.6 }, {
      x: 35.5,
      y: toWorldY(57),
      z: BODY_DEPTH_OFFSET + 18
    }, "sora-dama-orb", 32);
    const shine = makeEllipsoid(materials.soraDamaHighlight, { x: 2.6, y: 2.6, z: 1.35 }, {
      x: 32.2,
      y: toWorldY(54),
      z: BODY_DEPTH_OFFSET + 27.25
    }, "sora-dama-highlight", 20);
    soraDama.add(orb, shine);
    model.add(soraDama);
  }

  const footY = toWorldY(profile.footSvgY);
  const leftFoot = makeEllipsoid(materials.foot, { x: 8.32, y: 4.16, z: 9.2 }, withAttachmentOffset({
    x: -profile.footX * SVG_SCALE,
    y: footY,
    z: BODY_DEPTH_OFFSET + 2
  }, profile.footAttachmentOffsets, "left"), "foot-left", 30);
  const rightFoot = makeEllipsoid(materials.foot, { x: 8.32, y: 4.16, z: 9.2 }, withAttachmentOffset({
    x: profile.footX * SVG_SCALE,
    y: footY,
    z: BODY_DEPTH_OFFSET + 6
  }, profile.footAttachmentOffsets, "right"), "foot-right", 30);
  model.add(leftFoot, rightFoot);

  let decoration = null;
  if (descriptor.decoration === "comet") decoration = buildCometDecoration(profile, materials);
  else if (descriptor.decoration === "crown") decoration = buildCrownDecoration(profile, materials);
  else if (descriptor.decoration === "forest") decoration = buildGenericForestDecoration(profile, materials);
  if (decoration) model.add(decoration);
  model.scale.setScalar(Number.isFinite(options.scale) ? options.scale : 1);

  const primaryDecoration = decoration?.userData?.primary || decoration || null;
  const secondaryDecoration = decoration?.userData?.secondary || null;
  const hasDecoration = Boolean(decoration);
  model.userData = {
    continuous3d: true,
    seamlessVolumetric3d: true,
    reusableCharacter360: true,
    sourceCharacterId: descriptor.id,
    characterName: descriptor.name,
    familyKey: descriptor.familyKey,
    familyLabel: descriptor.familyLabel,
    bodyColorCss: descriptor.bodyColorCss,
    whiteVariant: descriptor.whiteVariant,
    templateCharacterId: descriptor.templateCharacterId,
    profileKey: descriptor.profileKey,
    decorationType: descriptor.decoration ?? null,
    decorationLabel: descriptor.decorationLabel || "装飾なし",
    stageKey: descriptor.stageKey || "mature",
    growthStage: descriptor.growthStage || "満開期",
    sourceSilhouette: profile.sourceSilhouette,
    body,
    faceFeatures: [eyeLeft, eyeRight],
    hands: [leftHand, rightHand],
    feet: [leftFoot, rightFoot],
    soraDama,
    primaryDecoration,
    secondaryDecoration,
    primaryDecorationLabel: !hasDecoration ? "満開期装飾なし" : descriptor.decoration === "forest" ? "マント" : descriptor.decoration === "comet" ? "羽根" : "王冠",
    secondaryDecorationLabel: !hasDecoration ? "追加装飾なし" : descriptor.decoration === "forest" ? "紐・留め具" : descriptor.decoration === "comet" ? "翼のライン" : "王冠の宝石",
    cape: decoration?.userData?.cape || null,
    capeYoke: decoration?.userData?.yoke || null,
    capeFastener: decoration?.userData?.fastener || null,
    materials,
    cameraTargetY: descriptor.profileKey === "walkBrave" ? 70 : descriptor.profileKey === "rioBrave" ? 74 : 78,
    cameraDistanceScale: descriptor.profileKey === "rioBrave" ? 1.12 : descriptor.profileKey === "walkBrave" ? 1.07 : 1
  };
  return attachCharacterHands(model);
}

function buildCapeFastener(materials) {
  const group = new THREE.Group();
  group.name = "cape-fastener";
  const { leftFront, centerFront, rightFront, rearPath } = buildCapeFastenerPoints();
  // The fastener is one visual loop, but is drawn as front and rear tubes so the
  // rear half can never leak through the opaque body and resemble a mouth.
  // Both tube ends are buried under the shoulder brooches, leaving no visible cut.
  const cord = new THREE.Group();
  cord.name = "cape-cord-continuous";

  const frontCurve = new THREE.CatmullRomCurve3(
    [leftFront, centerFront, rightFront],
    false,
    "centripetal",
    .45
  );
  const frontCord = new THREE.Mesh(
    new THREE.TubeGeometry(frontCurve, 56, 1.2, 12, false),
    materials.cord
  );
  frontCord.name = "cape-cord-front-v";
  frontCord.castShadow = true;
  frontCord.receiveShadow = true;
  frontCord.renderOrder = 6;
  cord.add(frontCord);

  const backCurve = new THREE.CatmullRomCurve3(rearPath, false, "centripetal", .45);
  const backCord = new THREE.Mesh(
    new THREE.TubeGeometry(backCurve, 96, 1.2, 12, false),
    materials.cord
  );
  backCord.name = "cape-cord-rear-loop";
  backCord.castShadow = true;
  backCord.receiveShadow = true;
  backCord.renderOrder = 1;
  cord.add(backCord);
  group.add(cord);

  const broochGeometry = new THREE.SphereGeometry(1, 28, 18);
  const makeBrooch = (position, name) => {
    const brooch = new THREE.Mesh(broochGeometry, materials.brooch);
    brooch.name = name;
    brooch.scale.set(3.35, 3.35, 1.55);
    brooch.position.copy(position).add(new THREE.Vector3(0, 0, 1.15));
    brooch.castShadow = true;
    group.add(brooch);
    return brooch;
  };
  const leftBrooch = makeBrooch(leftFront, "cape-brooch-left");
  const rightBrooch = makeBrooch(rightFront, "cape-brooch-right");

  const clasp = new THREE.Group();
  clasp.name = "cape-clasp";
  clasp.position.copy(centerFront).add(new THREE.Vector3(0, 0, 1.3));
  const claspOuter = new THREE.Mesh(new THREE.SphereGeometry(1, 30, 20), materials.brooch);
  claspOuter.scale.set(4.15, 4.6, 1.65);
  const claspCore = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 18), materials.clasp);
  claspCore.scale.set(2.55, 2.9, 1.75);
  claspCore.position.z = 1.25;
  claspOuter.castShadow = claspCore.castShadow = true;
  clasp.add(claspOuter, claspCore);
  group.add(clasp);

  group.userData = {
    cord,
    frontCord,
    backCord,
    clasp,
    brooches: [leftBrooch, rightBrooch],
    closedLoop: true
  };
  return group;
}

export function buildWhiteMichiRoadSaberRen360(options = {}) {
  const decorationType = Object.prototype.hasOwnProperty.call(options, "decoration")
    ? options.decoration
    : "forest";
  const sourceCharacterId = options.sourceCharacterId ?? WHITE_MICHI_ROAD_SABER_REN_ID;
  const descriptor = options.characterDescriptor
    || MATURE_CHARACTER_BY_ID.get(sourceCharacterId)
    || FLOWERING_CHARACTER_BY_ID.get(sourceCharacterId)
    || WHITE_MICHI_CHARACTER_BY_ID.get(WHITE_MICHI_ROAD_SABER_REN_ID);
  const materials = makeCharacterMaterials(options);
  const model = new THREE.Group();
  model.name = `${sourceCharacterId}-360`;

  const body = new THREE.Mesh(buildBodyGeometry(), materials.body);
  body.name = "body-seamless";
  body.castShadow = true;
  body.receiveShadow = true;
  body.renderOrder = 3;
  model.add(body);

  const makeEye = (x, y, name) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 18), materials.eye);
    eye.name = name;
    eye.scale.set(3.33, 3.33, 1.72);
    eye.position.set(x, y, frontSurfaceZ(x) + .55);
    eye.castShadow = true;
    return eye;
  };
  const eyeLeft = makeEye((49 - 58) * SVG_SCALE, toWorldY(50), "eye-left");
  const eyeRight = makeEye((68 - 58) * SVG_SCALE, toWorldY(50), "eye-right");
  model.add(eyeLeft, eyeRight);

  const makeHand = (x, z, side, name) => {
    const hand = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 20), materials.hand);
    hand.name = name;
    hand.scale.set(6.24, 6.24, 5.55);
    const position = withAttachmentOffset(
      { x, y: toWorldY(66), z },
      BODY_PROFILES.rioSaber.handAttachmentOffsets,
      side
    );
    hand.position.set(position.x, position.y, position.z);
    hand.castShadow = true;
    hand.receiveShadow = true;
    return hand;
  };
  const leftHand = makeHand((28 - 58) * SVG_SCALE, (77 - 58) * SVG_SCALE, "left", "hand-left");
  const rightHand = makeHand((88 - 58) * SVG_SCALE, (84 - 58) * SVG_SCALE, "right", "hand-right");
  model.add(leftHand, rightHand);

  const makeFoot = (x, z, side, name) => {
    const foot = new THREE.Mesh(new THREE.SphereGeometry(1, 30, 20), materials.foot);
    foot.name = name;
    foot.scale.set(8.32, 4.16, 9.2);
    const position = withAttachmentOffset(
      { x, y: toWorldY(91), z },
      BODY_PROFILES.rioSaber.footAttachmentOffsets,
      side
    );
    foot.position.set(position.x, position.y, position.z);
    foot.castShadow = true;
    foot.receiveShadow = true;
    return foot;
  };
  const leftFoot = makeFoot((43 - 58) * SVG_SCALE, (59 - 58) * SVG_SCALE, "left", "foot-left");
  const rightFoot = makeFoot((73 - 58) * SVG_SCALE, (68 - 58) * SVG_SCALE, "right", "foot-right");
  model.add(leftFoot, rightFoot);

  let cape = null;
  let capeYoke = null;
  let capeFastener = null;
  let decoration = null;
  let primaryDecoration = null;
  let secondaryDecoration = null;
  if (decorationType === "forest") {
    cape = new THREE.Mesh(buildCapeGeometry(), materials.cape);
    cape.name = "cape-curved";
    cape.castShadow = true;
    cape.receiveShadow = true;
    cape.renderOrder = 2;
    capeYoke = new THREE.Mesh(buildCapeYokeGeometry(), materials.cape);
    capeYoke.name = "cape-upper-overlap-yoke";
    capeYoke.castShadow = true;
    capeYoke.receiveShadow = true;
    capeYoke.renderOrder = 3;
    cape.add(capeYoke);
    model.add(cape);
    capeFastener = buildCapeFastener(materials);
    model.add(capeFastener);
    primaryDecoration = cape;
    secondaryDecoration = capeFastener;
  } else if (decorationType === "comet" || decorationType === "crown") {
    decoration = decorationType === "comet"
      ? buildCometDecoration(BODY_PROFILES.rioSaber, materials)
      : buildCrownDecoration(BODY_PROFILES.rioSaber, materials);
    primaryDecoration = decoration.userData.primary || decoration;
    secondaryDecoration = decoration.userData.secondary || null;
    model.add(decoration);
  }
  model.scale.setScalar(Number.isFinite(options.scale) ? options.scale : 1);

  model.userData = {
    continuous3d: true,
    seamlessVolumetric3d: true,
    reusableCharacter360: true,
    sourceCharacterId,
    characterName: descriptor?.name || MonsterNames.name(WHITE_MICHI_ROAD_SABER_REN_ID),
    familyKey: descriptor?.familyKey || "white",
    familyLabel: descriptor?.familyLabel || "白（特別版）",
    bodyColorCss: descriptor?.bodyColorCss || "#f8fbff",
    whiteVariant: Boolean(descriptor?.whiteVariant ?? true),
    templateCharacterId: descriptor?.templateCharacterId || WHITE_MICHI_ROAD_SABER_REN_ID,
    profileKey: "rioSaber",
    decorationType: decorationType ?? null,
    decorationLabel: descriptor?.decorationLabel || (decorationType ? "満開期装飾" : "装飾なし"),
    stageKey: descriptor?.stageKey || "mature",
    growthStage: descriptor?.growthStage || "満開期",
    sourceSilhouette: "unique-index-5-eight-direction",
    body,
    faceFeatures: [eyeLeft, eyeRight],
    hands: [leftHand, rightHand],
    feet: [leftFoot, rightFoot],
    cape,
    capeYoke,
    capeFastener,
    capeCord: capeFastener?.userData?.cord || null,
    capeClasp: capeFastener?.userData?.clasp || null,
    capeBrooches: capeFastener?.userData?.brooches || [],
    primaryDecoration,
    secondaryDecoration,
    primaryDecorationLabel: !decorationType ? "満開期装飾なし" : decorationType === "forest" ? "マント" : decorationType === "comet" ? "羽根" : "王冠",
    secondaryDecorationLabel: !decorationType ? "追加装飾なし" : decorationType === "forest" ? "紐・留め具" : decorationType === "comet" ? "翼のライン" : "王冠の宝石",
    materials,
    cameraTargetY: 78,
    cameraDistanceScale: 1
  };
  return attachCharacterHands(model);
}

export function buildWhiteMichiStarCharacter360(characterId, options = {}) {
  const descriptor = WHITE_MICHI_CHARACTER_BY_ID.get(characterId) || WHITE_MICHI_CHARACTER_BY_ID.get(WHITE_MICHI_ROAD_SABER_REN_ID);
  return buildMatureStarCharacter360(descriptor.id, options);
}

export function buildMatureStarCharacter360(characterId, options = {}) {
  const descriptor = MATURE_CHARACTER_BY_ID.get(characterId) || MATURE_CHARACTER_BY_ID.get(WHITE_MICHI_ROAD_SABER_REN_ID);
  const materialOptions = {
    bodyColor: descriptor.bodyColor,
    bodyEmissiveIntensity: descriptor.bodyEmissiveIntensity,
    ...options
  };
  if (descriptor.profileKey === "rioSaber") {
    return buildWhiteMichiRoadSaberRen360({
      ...materialOptions,
      sourceCharacterId: descriptor.id,
      decoration: descriptor.decoration
    });
  }
  return buildGenericMatureCharacter(descriptor, materialOptions);
}

export function buildFloweringHeroCharacter360(characterId, options = {}) {
  const descriptor = FLOWERING_CHARACTER_BY_ID.get(characterId)
    || FLOWERING_CHARACTER_BY_ID.get(WHITE_MICHI_ROAD_SABER_FLOWERING_ID)
    || ALL_FLOWERING_HERO_CHARACTERS[0];
  const materialOptions = {
    bodyColor: descriptor.bodyColor,
    bodyEmissiveIntensity: descriptor.bodyEmissiveIntensity,
    ...options
  };
  if (descriptor.profileKey === "rioSaber") {
    return buildWhiteMichiRoadSaberRen360({
      ...materialOptions,
      sourceCharacterId: descriptor.id,
      characterDescriptor: descriptor,
      decoration: null
    });
  }
  return buildGenericMatureCharacter(descriptor, materialOptions);
}

export function getWhiteMichiStarCharacter(characterId) {
  return WHITE_MICHI_CHARACTER_BY_ID.get(characterId) || null;
}

export function getMatureStarCharacter(characterId) {
  return MATURE_CHARACTER_BY_ID.get(characterId) || null;
}

export function getFloweringHeroCharacter(characterId) {
  return FLOWERING_CHARACTER_BY_ID.get(characterId) || null;
}

export function setWhiteMichiModelWireframe(model, enabled) {
  model?.traverse?.(object => {
    if (object.isMesh && object.material && "wireframe" in object.material) {
      object.material.wireframe = Boolean(enabled);
      object.material.needsUpdate = true;
    }
  });
}

export function disposeWhiteMichiModel(model) {
  const geometries = new Set(), materials = new Set();
  model?.traverse?.(object => {
    if (object.geometry) geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) if (material) materials.add(material);
  });
  geometries.forEach(geometry => geometry.dispose());
  materials.forEach(material => material.dispose());
}

export const setMatureCharacterModelWireframe = setWhiteMichiModelWireframe;
export const disposeMatureCharacterModel = disposeWhiteMichiModel;
export const setFloweringCharacterModelWireframe = setWhiteMichiModelWireframe;
export const disposeFloweringCharacterModel = disposeWhiteMichiModel;
