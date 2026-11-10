// Own every preview timer and sound. No save, inventory, or preference writes.
export function createTournamentPreviewAudio({settings={},windowTarget=globalThis,onNotice=()=>{},onMedia=()=>{}}={}){
 const win=windowTarget,state={soundVolumes:{...settings.volumes}},sound={ctx:null,enabled:settings.enabled!==false},timers=new Set(),media=new Set();let closed=false,music=null;
 const setTimeout=(fn,delay)=>{const id=win.setTimeout(()=>{timers.delete(id);if(!closed)fn();},delay);timers.add(id);return id;};
 const clearTimeout=id=>{timers.delete(id);win.clearTimeout(id);};
 const window=win,toast=onNotice;
 function Audio(file){const a=new win.Audio(file);media.add(a);onMedia(a);return a;}
 // BEGIN ORIGINAL TOURNAMENT SOUND
 const bgmAudioFiles = {
  normal: "assets/audio/imasora_labyrinth_normal_v01.mp3",
  outsideHome: "assets/audio/imasora_labyrinth_night_street_v01.mp3",
  retirementCeremony: "assets/audio/imasora_retirement_ceremony_v01.mp3",
  rookieBattle: "assets/audio/imasora_corridor_rookie_battle_v01.mp3",
  rookieFinal: "assets/audio/imasora_adventure_charm_rookie_final_v01.mp3",
  rookieAward: "assets/audio/imasora_award_rookie_ceremony_v01.mp3",
  majorAward: "assets/audio/imasora_award_four_major_ceremony_v01.mp3",
  grandAward: "assets/audio/imasora_grand_award_fanfare_v01.mp3",
  major1: "assets/audio/imasora_password_major_battle_v01.mp3",
  major1Final: "assets/audio/imasora_hero_major_final_v01.mp3",
  major2: "assets/audio/imasora_dream_circuit_major2_battle_v01.mp3",
  major2Final: "assets/audio/sealed_imasora_castle_major2_final_v01.mp3",
  major3: "assets/audio/hoshifuru_michi_major3_battle_v01.mp3",
  major3Final: "assets/audio/kodou_major3_final_v01.mp3",
  major4: "assets/audio/haremichi_major4_battle_v01.mp3",
  major4Final: "assets/audio/climax_major4_final_v01.mp3",
  grand: "assets/audio/maou_grand_battle_v01.mp3",
  grandFinal: "assets/audio/imasora_loop_grand_final_v01.mp3",
  retireParkPracticeMorningDay: "assets/audio/plaza_sparring_retirepark_morning_day_v01.mp3",
  retireParkPracticeEvening: "assets/audio/sunset_sparring_retirepark_evening_v01.mp3",
  retireParkPracticeNight: "assets/audio/night_plaza_sparring_retirepark_night_v01.mp3",
  nightPlaza: "assets/audio/night_plaza_karaoke_v01.mp3",
  battleVictory: "assets/audio/imasora_victory_result_v01.mp3",
  battleDefeat: "assets/audio/imasora_defeat_result_v01.mp3"
};
const sfxAudioFiles = {
  buttonSelect1: "assets/audio/otologic_snes_rpg01_10_button_candidate.mp3",
  buttonSelect2: "assets/audio/otologic_snes_rpg01_11_button_candidate.mp3",
  buttonSelect3: "assets/audio/otologic_snes_rpg01_12_button_candidate.mp3",
  itemGetCandidate1: "assets/audio/otologic_gb_action01_07_item_get_candidate.mp3",
  itemGetCandidate2: "assets/audio/otologic_gb_action01_08_item_get_candidate.mp3",
  itemGetCandidate3: "assets/audio/otologic_gb_action01_09_item_get_candidate.mp3",
  itemUseCandidate1: "assets/audio/otologic_nes_action01_08_item_use_candidate.mp3",
  itemUseCandidate2: "assets/audio/otologic_nes_action01_09_item_use_candidate.mp3",
  itemUseCandidate3: "assets/audio/otologic_nes_action01_10_item_use_candidate.mp3",
  itemUseCandidate4: "assets/audio/otologic_nes_action01_11_item_use_candidate.mp3",
  itemUseCandidate5: "assets/audio/otologic_nes_action01_12_item_use_candidate.mp3",
  itemUseCandidate6: "assets/audio/otologic_nes_action01_13_item_use_candidate.mp3",
  skyScanCandidate1: "assets/audio/otologic_cyber06_1_sky_scan_candidate.mp3",
  skyScanCandidate2: "assets/audio/otologic_cyber06_2_sky_scan_candidate.mp3",
  skyScanCandidate3: "assets/audio/otologic_cyber06_3_sky_scan_candidate.mp3",
  skyScanCandidate4: "assets/audio/otologic_cyber06_4_sky_scan_candidate.mp3",
  skyScanCandidate5: "assets/audio/otologic_cyber06_5_sky_scan_candidate.mp3",
  skyScanCandidate6: "assets/audio/otologic_cyber06_6_sky_scan_candidate.mp3",
  skyScanCandidate7: "assets/audio/otologic_cyber07_1_sky_scan_candidate.mp3",
  skyScanCandidate8: "assets/audio/otologic_cyber07_2_sky_scan_candidate.mp3",
  skyScanCandidate9: "assets/audio/otologic_cyber07_3_sky_scan_candidate.mp3",
  summonRewardCandidate1: "assets/audio/otologic_nes_action01_16_summon_reward_candidate.mp3",
  summonRewardCandidate2: "assets/audio/otologic_nes_action01_14_summon_reward_candidate.mp3",
  summonRewardCandidate3: "assets/audio/otologic_nes_action01_08_summon_reward_candidate.mp3",
  summonRewardCandidate4: "assets/audio/otologic_nes_action01_09_summon_reward_candidate.mp3",
  summonRewardCandidate5: "assets/audio/otologic_nes_action01_10_summon_reward_candidate.mp3",
  summonRewardCandidate6: "assets/audio/otologic_nes_action01_11_summon_reward_candidate.mp3",
  summonRewardCandidate7: "assets/audio/otologic_nes_action01_12_summon_reward_candidate.mp3",
  summonRewardCandidate8: "assets/audio/otologic_nes_action01_13_summon_reward_candidate.mp3",
  skyConfirmCandidate1: "assets/audio/otologic_cyber04_1_sky_confirm_candidate.mp3",
  skyConfirmCandidate2: "assets/audio/otologic_cyber04_2_sky_confirm_candidate.mp3",
  skyConfirmCandidate3: "assets/audio/otologic_cyber04_3_sky_confirm_candidate.mp3",
  entryCandidate1: "assets/audio/otologic_sys_set02_sentaku_entry_candidate.mp3",
  entryCandidate2: "assets/audio/otologic_sys_set02_pop_up_entry_candidate.mp3",
  entryCandidate3: "assets/audio/otologic_sys_set02_pop_down_entry_candidate.mp3",
  chargeCandidate1: "assets/audio/otologic_retro_anime_beam01_1_high_long_charge_candidate.mp3",
  chargeCandidate2: "assets/audio/otologic_retro_anime_beam01_2_high_short_charge_candidate.mp3",
  chargeCandidate3: "assets/audio/otologic_retro_anime_beam01_3_low_long_charge_candidate.mp3",
  chargeCandidate4: "assets/audio/otologic_retro_anime_beam01_4_low_short_charge_candidate.mp3",
  avoidCandidate1: "assets/audio/otologic_onoma_negative16_4_avoid_candidate.mp3",
  matchEndCandidate1: "assets/audio/otologic_quiz_ding_dong01_1_match_end.mp3",
  drumRollCandidate1: "assets/audio/otologic_quiz_results01_1_drum_roll.mp3",
  shopPurchase1: "assets/audio/otologic_snes_rpg03_4_shop_candidate.mp3",
  shopPurchase2: "assets/audio/otologic_snes_rpg03_5_shop_candidate.mp3",
  shopPurchase3: "assets/audio/otologic_snes_rpg03_6_shop_candidate.mp3",
  shopPurchase4: "assets/audio/otologic_snes_rpg03_7_shop_candidate.mp3",
  shopPurchase5: "assets/audio/otologic_snes_rpg03_8_shop_candidate.mp3",
  damageCandidate1: "assets/audio/otologic_gb_action01_04_damage_candidate.mp3",
  damageCandidate2: "assets/audio/otologic_gb_action01_05_damage_candidate.mp3",
  damageSnesShooter1: "assets/audio/otologic_snes_shooter01_05_damage_candidate.mp3",
  damageSnesShooter2: "assets/audio/otologic_snes_shooter01_06_damage_candidate.mp3",
  damageSnesShooter3: "assets/audio/otologic_snes_shooter01_07_damage_candidate.mp3",
  damageGbShooter1: "assets/audio/otologic_gb_shooter01_03_damage_candidate.mp3",
  damageGbShooter2: "assets/audio/otologic_gb_shooter01_04_damage_candidate.mp3",
  damageGbShooter3: "assets/audio/otologic_gb_shooter01_05_damage_candidate.mp3",
  explosionCandidate1: "assets/audio/otologic_explosion04_1_short_candidate.mp3",
  explosionCandidate2: "assets/audio/otologic_explosion04_2_long_candidate.mp3",
  explosionCandidate3: "assets/audio/otologic_explosion05_1_short_candidate.mp3",
  explosionCandidate4: "assets/audio/otologic_explosion05_2_long_candidate.mp3",
  explosionCandidate5: "assets/audio/otologic_explosion06_1_long_candidate.mp3",
  explosionCandidate6: "assets/audio/otologic_explosion06_2_short_candidate.mp3",
  explosionCandidate7: "assets/audio/otologic_explosion06_3_short_close_candidate.mp3",
  explosionCandidate8: "assets/audio/otologic_explosion06_4_long_far_candidate.mp3",
  impactCandidate1: "assets/audio/otologic_onoma_impact08_1_high_candidate.mp3",
  impactCandidate2: "assets/audio/otologic_onoma_impact08_2_high_delay_candidate.mp3",
  impactCandidate3: "assets/audio/otologic_onoma_impact08_3_low_candidate.mp3",
  impactCandidate4: "assets/audio/otologic_onoma_impact08_4_low_delay_candidate.mp3",
  impactCandidate5: "assets/audio/otologic_onoma_impact12_1_long_candidate.mp3",
  impactCandidate6: "assets/audio/otologic_onoma_impact12_2_short_candidate.mp3",
  impactCandidate7: "assets/audio/otologic_onoma_impact07_1_dry_candidate.mp3",
  impactCandidate8: "assets/audio/otologic_onoma_impact07_2_delay_candidate.mp3",
  impactCandidate9: "assets/audio/otologic_onoma_impact07_3_reverb_candidate.mp3",
  electricCandidate1: "assets/audio/otologic_electric_shock05_1long_candidate.mp3",
  electricCandidate2: "assets/audio/otologic_electric_shock05_2mid_candidate.mp3",
  electricCandidate3: "assets/audio/otologic_electric_shock05_3short_candidate.mp3",
  electricCandidate4: "assets/audio/otologic_electric_shock06_1short_candidate.mp3",
  electricCandidate5: "assets/audio/otologic_electric_shock06_2mid_candidate.mp3",
  electricCandidate6: "assets/audio/otologic_electric_shock06_3long_candidate.mp3",
  electricCandidate7: "assets/audio/otologic_electric_shock04_1mid_candidate.mp3",
  electricCandidate8: "assets/audio/otologic_electric_shock04_2long_candidate.mp3",
  electricCandidate9: "assets/audio/otologic_electric_shock04_3short_candidate.mp3",
  electricCandidate10: "assets/audio/otologic_electric_shock01_1long_candidate.mp3",
  electricCandidate11: "assets/audio/otologic_electric_shock01_2mid_candidate.mp3",
  electricCandidate12: "assets/audio/otologic_electric_shock01_3short_candidate.mp3",
  electricCandidate13: "assets/audio/otologic_electric_shock03_1timbre1_short_candidate.mp3",
  electricCandidate14: "assets/audio/otologic_electric_shock03_2timbre1_long_candidate.mp3",
  electricCandidate15: "assets/audio/otologic_electric_shock03_3timbre2_short_candidate.mp3",
  electricCandidate16: "assets/audio/otologic_electric_shock03_4timbre2_long_candidate.mp3",
  electricCandidate17: "assets/audio/otologic_electric_shock03_5timbre3_short_candidate.mp3",
  electricCandidate18: "assets/audio/otologic_electric_shock03_6timbre3_long_candidate.mp3",
  thunderCandidate1: "assets/audio/otologic_thunder_synthetic01_1_candidate.mp3",
  thunderCandidate2: "assets/audio/otologic_thunder_synthetic01_2_candidate.mp3",
  thunderCandidate3: "assets/audio/otologic_thunder_synthetic01_3_candidate.mp3",
  thunderCandidate4: "assets/audio/otologic_thunder_synthetic01_4_candidate.mp3",
  slashCandidate1: "assets/audio/otologic_cut04_1_slash_candidate.mp3",
  slashCandidate2: "assets/audio/otologic_cut04_2_slash_candidate.mp3",
  slashCandidate3: "assets/audio/otologic_cut04_3_slash_candidate.mp3",
  slashCandidate4: "assets/audio/otologic_cut04_4_slash_candidate.mp3",
  starSparkle1: "assets/audio/otologic_onoma_sparkle10_1_short_candidate.mp3",
  starSparkle2: "assets/audio/otologic_onoma_sparkle10_2_mid_candidate.mp3",
  starSparkle3: "assets/audio/otologic_onoma_sparkle10_3_long_candidate.mp3",
  starFlash1: "assets/audio/otologic_onoma_flash11_1_high_candidate.mp3",
  starFlash2: "assets/audio/otologic_onoma_flash11_2_low_candidate.mp3",
  starFlash3: "assets/audio/otologic_onoma_flash11_3_high_delay_candidate.mp3",
  starFlash4: "assets/audio/otologic_onoma_flash11_4_low_delay_candidate.mp3",
  windCandidate1: "assets/audio/otologic_wind_synthetic02_1_candidate.mp3",
  windCandidate2: "assets/audio/otologic_wind_synthetic02_2_candidate.mp3",
  windCandidate3: "assets/audio/otologic_wind_synthetic02_3_candidate.mp3",
  windCandidate4: "assets/audio/otologic_wind_synthetic02_4_candidate.mp3",
  windCandidate5: "assets/audio/otologic_wind_synthetic02_5_candidate.mp3",
  windCandidate6: "assets/audio/otologic_wind_synthetic02_6_candidate.mp3",
  waterRain1: "assets/audio/otologic_rain_real_ambi02_1_candidate.mp3",
  waterRain2: "assets/audio/otologic_rain_real_ambi01_1_candidate.mp3",
  waterRain3: "assets/audio/otologic_rain_real_ambi02_1_alt_candidate.mp3",
  waterShore1: "assets/audio/otologic_seashore_synthetic_ambi01_1_candidate.mp3",
  waterShore2: "assets/audio/otologic_seashore_synthetic_ambi01_2_candidate.mp3",
  waterDrop1: "assets/audio/otologic_water_drop02_1_candidate.mp3",
  waterDrop2: "assets/audio/otologic_water_drop02_2_candidate.mp3",
  waterDrop3: "assets/audio/otologic_water_drop02_3_candidate.mp3",
  waterDrop4: "assets/audio/otologic_water_drop02_4_candidate.mp3",
  waterDrop5: "assets/audio/otologic_water_drop02_5_candidate.mp3",
  waterDrop6: "assets/audio/otologic_water_drop02_6_candidate.mp3",
  iceFlash1: "assets/audio/otologic_onoma_flash14_1_high_ice_candidate.mp3",
  iceFlash2: "assets/audio/otologic_onoma_flash14_2_low_ice_candidate.mp3",
  iceFlash3: "assets/audio/otologic_onoma_flash14_3_high_delay_ice_candidate.mp3",
  iceFlash4: "assets/audio/otologic_onoma_flash14_4_low_delay_ice_candidate.mp3",
  flashCandidate1: "assets/audio/otologic_onoma_flash06_1_low_mid_flash_candidate.mp3",
  flashCandidate2: "assets/audio/otologic_onoma_flash06_2_low_short_flash_candidate.mp3",
  flashCandidate3: "assets/audio/otologic_onoma_flash06_3_low_long_flash_candidate.mp3",
  flashCandidate4: "assets/audio/otologic_onoma_flash06_4_high_mid_flash_candidate.mp3",
  flashCandidate5: "assets/audio/otologic_onoma_flash06_5_high_short_flash_candidate.mp3",
  flashCandidate6: "assets/audio/otologic_onoma_flash06_6_high_long_flash_candidate.mp3",
  streamer1: "assets/audio/otologic_throw_streamers01_1_candidate.mp3",
  streamer2: "assets/audio/otologic_throw_streamers01_2_candidate.mp3",
  streamer3: "assets/audio/otologic_throw_streamers01_3_candidate.mp3",
  streamer4: "assets/audio/otologic_throw_streamers01_4_candidate.mp3",
  streamer5: "assets/audio/otologic_throw_streamers01_5_candidate.mp3",
  streamer6: "assets/audio/otologic_throw_streamers01_6_candidate.mp3",
  streamer7: "assets/audio/otologic_throw_streamers01_7_candidate.mp3",
  cityCrackle1: "assets/audio/otologic_fluorescent_light_noise01_1_candidate.mp3",
  cityCrackle2: "assets/audio/otologic_fluorescent_light_noise01_2_candidate.mp3",
  cityCrackle3: "assets/audio/otologic_fluorescent_light_noise01_3_candidate.mp3",
  cityCrackle4: "assets/audio/otologic_fluorescent_light_noise01_4_candidate.mp3",
  cityHum1: "assets/audio/otologic_fluorescent_light_noise01_5_candidate.mp3",
  cityHum2: "assets/audio/otologic_fluorescent_light_noise01_6_candidate.mp3",
  cityStreet1: "assets/audio/otologic_city_ambi_street01_1_candidate.mp3",
  cityStreet2: "assets/audio/otologic_city_ambi_street01_2_candidate.mp3",
  bicycleHorn1: "assets/audio/otologic_bicycle_horn01_1_candidate.mp3",
  bicycleHorn2: "assets/audio/otologic_bicycle_horn01_2_candidate.mp3",
  bicycleHorn3: "assets/audio/otologic_bicycle_horn01_3_candidate.mp3",
  bicycleHorn4: "assets/audio/otologic_bicycle_horn01_4_candidate.mp3",
  bicycleHorn5: "assets/audio/otologic_bicycle_horn01_5_candidate.mp3",
  bicycleHorn6: "assets/audio/otologic_bicycle_horn01_6_candidate.mp3",
  fantasize8_1: "assets/audio/otologic_fantasize08_1_candidate.mp3",
  fantasize8_2: "assets/audio/otologic_fantasize08_2_candidate.mp3",
  fantasize8_3: "assets/audio/otologic_fantasize08_3_candidate.mp3",
  fantasize8_4: "assets/audio/otologic_fantasize08_4_candidate.mp3",
  fantasize4_1: "assets/audio/otologic_fantasize04_1_candidate.mp3",
  fantasize4_2: "assets/audio/otologic_fantasize04_2_candidate.mp3",
  fantasize4_3: "assets/audio/otologic_fantasize04_3_candidate.mp3",
  fantasize4_4: "assets/audio/otologic_fantasize04_4_candidate.mp3",
  magicSparkle13_1: "assets/audio/otologic_onoma_sparkle13_1_candidate.mp3",
  magicSparkle13_2: "assets/audio/otologic_onoma_sparkle13_2_candidate.mp3",
  magicSparkle13_3: "assets/audio/otologic_onoma_sparkle13_3_candidate.mp3",
  magicSparkle13_4: "assets/audio/otologic_onoma_sparkle13_4_candidate.mp3",
  magicSparkle13_5: "assets/audio/otologic_onoma_sparkle13_5_candidate.mp3",
  magicSparkle13_6: "assets/audio/otologic_onoma_sparkle13_6_candidate.mp3",
  magicSparkle01_1: "assets/audio/otologic_onoma_sparkle01_1_candidate.mp3",
  magicSparkle01_2: "assets/audio/otologic_onoma_sparkle01_2_candidate.mp3",
  animeMotion1: "assets/audio/otologic_anime_motion15_1_candidate.mp3",
  animeMotion2: "assets/audio/otologic_anime_motion15_2_candidate.mp3",
  animeMotion3: "assets/audio/otologic_anime_motion15_3_candidate.mp3",
  animeMotion4: "assets/audio/otologic_anime_motion15_4_candidate.mp3",
  animeMotion5: "assets/audio/otologic_anime_motion15_5_candidate.mp3",
  animeMotion6: "assets/audio/otologic_anime_motion15_6_candidate.mp3",
  mapMove: "assets/audio/otologic_anime_motion21_2_map_move.mp3",
  nesRpg03_01: "assets/audio/otologic_nes_rpg03_01_candidate.mp3",
  nesRpg03_02: "assets/audio/otologic_nes_rpg03_02_candidate.mp3",
  nesRpg03_03: "assets/audio/otologic_nes_rpg03_03_candidate.mp3",
  nesRpg03_04: "assets/audio/otologic_nes_rpg03_04_candidate.mp3",
  nesRpg03_05: "assets/audio/otologic_nes_rpg03_05_candidate.mp3",
  nesRpg03_06: "assets/audio/otologic_nes_rpg03_06_candidate.mp3",
  nesRpg03_07: "assets/audio/otologic_nes_rpg03_07_candidate.mp3",
  nesRpg03_08: "assets/audio/otologic_nes_rpg03_08_candidate.mp3",
  nesRpg03_09: "assets/audio/otologic_nes_rpg03_09_candidate.mp3",
  nesRpg03_10: "assets/audio/otologic_nes_rpg03_10_candidate.mp3",
  nesRpg03_11: "assets/audio/otologic_nes_rpg03_11_candidate.mp3",
  nesRpg03_12: "assets/audio/otologic_nes_rpg03_12_candidate.mp3",
  messageNesRpg01_08: "assets/audio/otologic_nes_rpg01_08_message_candidate.mp3",
  messageNesRpg01_09: "assets/audio/otologic_nes_rpg01_09_message_candidate.mp3",
  messageNesRpg01_10: "assets/audio/otologic_nes_rpg01_10_message_candidate.mp3",
  messageSnesRpg01_07: "assets/audio/otologic_snes_rpg01_07_message_candidate.mp3",
  messageSnesRpg01_08: "assets/audio/otologic_snes_rpg01_08_message_candidate.mp3",
  messageSnesRpg01_09: "assets/audio/otologic_snes_rpg01_09_message_candidate.mp3",
  moveReleaseAssortedSe07_01: "assets/audio/otologic_assorted_se07_01_move_release.mp3",
  customLampFlashShort: "assets/audio/otologic_battle_custom_lamp_flash_short.mp3",
  customLampFlashLong: "assets/audio/otologic_battle_custom_lamp_flash_long.mp3",
  customLaserShort: "assets/audio/otologic_battle_custom_laser_short.mp3",
  customLaserMid: "assets/audio/otologic_battle_custom_laser_mid.mp3",
  customBeamLong: "assets/audio/otologic_battle_custom_beam_long.mp3",
  customAirSwishShort: "assets/audio/otologic_battle_custom_air_swish_short.mp3",
  customWindPressure: "assets/audio/otologic_battle_custom_wind_pressure.mp3",
  customEmberShort: "assets/audio/otologic_battle_custom_ember_short.mp3",
  customSolarSpotlight: "assets/audio/otologic_battle_custom_solar_spotlight.mp3",
  customYuraShort: "assets/audio/otologic_battle_custom_yura_short.mp3",
  customMirrorLong: "assets/audio/otologic_battle_custom_mirror_long.mp3",
  customSproutWhistle: "assets/audio/otologic_battle_custom_sprout_whistle.mp3",
  customBloomPhrase: "assets/audio/otologic_battle_custom_bloom_phrase.mp3",
  customPrismShort: "assets/audio/otologic_battle_custom_prism_short.mp3",
  customMagicGate: "assets/audio/otologic_battle_custom_magic_gate.mp3",
  customCloudPopper: "assets/audio/otologic_party_popper03_1_cloud_puff.mp3"
};
const officialBattleHpDrainSfxMode = "metalBuzz"; // Preview candidates must not change battle playback.
const battleHitSfxFileKey = "damageCandidate1";
const battleHitSfxFileKeys = {
  slash: {
    weak: ["slashCandidate2"],
    medium: ["slashCandidate2", "slashCandidate1"],
    strong: ["slashCandidate2", "slashCandidate1", "slashCandidate3"]
  },
  "cross-slash": {
    weak: ["slashCandidate2"],
    medium: ["slashCandidate2", "slashCandidate1"],
    strong: ["slashCandidate2", "slashCandidate1", "slashCandidate4"]
  },
  starfall: {
    weak: ["damageGbShooter2"],
    medium: ["damageGbShooter2", "damageGbShooter1"],
    strong: ["damageGbShooter2", "damageGbShooter1", "damageGbShooter3"]
  },
  wind: {
    weak: ["damageSnesShooter1"],
    medium: ["damageSnesShooter1", "damageSnesShooter2"],
    strong: ["damageSnesShooter1", "damageSnesShooter2", "damageSnesShooter3"]
  },
  water: {
    weak: ["waterDrop6"],
    medium: ["waterDrop6", "waterDrop5"],
    strong: ["waterDrop6", "waterDrop5", "iceFlash1"]
  },
  ice: {
    weak: ["iceFlash1"],
    medium: ["iceFlash1", "iceFlash2"],
    strong: ["iceFlash1", "iceFlash2", "iceFlash3"]
  },
  flash: {
    weak: ["flashCandidate5"],
    medium: ["flashCandidate5", "flashCandidate4"],
    strong: ["flashCandidate5", "flashCandidate4", "flashCandidate6"]
  },
  "city-spark": {
    weak: ["electricCandidate12"],
    medium: ["electricCandidate12", "electricCandidate11"],
    strong: ["electricCandidate12", "electricCandidate11", "electricCandidate10"]
  },
  electric: {
    weak: ["electricCandidate12"],
    medium: ["electricCandidate12", "electricCandidate11"],
    strong: ["electricCandidate12", "electricCandidate11", "electricCandidate10"]
  },
  thunder: {
    weak: ["electricCandidate9"],
    medium: ["electricCandidate9", "thunderCandidate1"],
    strong: ["electricCandidate9", "thunderCandidate1", "thunderCandidate2"]
  },
  route: {
    weak: ["damageSnesShooter1"],
    medium: ["damageSnesShooter1", "impactCandidate6"],
    strong: ["damageSnesShooter1", "explosionCandidate1", "impactCandidate7"]
  },
  explosion: {
    weak: ["explosionCandidate1"],
    medium: ["impactCandidate6", "explosionCandidate1"],
    strong: ["impactCandidate6", "explosionCandidate1", "impactCandidate7"]
  },
  impact: {
    weak: ["impactCandidate6"],
    medium: ["impactCandidate6", "impactCandidate1"],
    strong: ["impactCandidate6", "impactCandidate1", "impactCandidate7"]
  },
  "walk-lamp-step": {
    weak: ["customLampFlashShort"],
    medium: ["customLampFlashShort", "magicSparkle13_6"],
    strong: ["customLampFlashShort", "customLampFlashLong", "magicSparkle01_1"]
  },
  "walk-signpost-beam": {
    weak: ["customLaserShort"],
    medium: ["customLaserShort", "chargeCandidate4"],
    strong: ["customLaserShort", "customLaserMid", "customBeamLong"]
  },
  "walk-roadstar-comet": {
    weak: ["starSparkle1"],
    medium: ["starSparkle1", "customLaserMid"],
    strong: ["starSparkle1", "customBeamLong", "impactCandidate7"]
  },
  "sky-cloud-puff": {
    weak: ["customCloudPopper"],
    medium: ["customAirSwishShort", "animeMotion4"],
    strong: ["customAirSwishShort", "customWindPressure", "animeMotion5"]
  },
  "sky-jetstream-rune": {
    weak: ["windCandidate4"],
    medium: ["windCandidate4", "customAirSwishShort"],
    strong: ["windCandidate4", "customWindPressure", "impactCandidate1"]
  },
  "sky-sunburst-column": {
    weak: ["customSolarSpotlight"],
    medium: ["customSolarSpotlight", "starFlash1"],
    strong: ["customSolarSpotlight", "starFlash3", "impactCandidate5"]
  },
  "city-lamppost-pop": {
    weak: ["customLampFlashShort"],
    medium: ["customLampFlashShort", "cityCrackle4"],
    strong: ["customLampFlashShort", "cityCrackle3", "electricCandidate12"]
  },
  "city-rune-grid": {
    weak: ["customMagicGate"],
    medium: ["customMagicGate", "electricCandidate13"],
    strong: ["customMagicGate", "electricCandidate13", "electricCandidate11"]
  },
  "city-tower-laser": {
    weak: ["customLaserShort"],
    medium: ["customLaserShort", "electricCandidate15"],
    strong: ["customLaserShort", "customBeamLong", "electricCandidate10"]
  },
  "river-drop-arc": {
    weak: ["waterDrop6"],
    medium: ["waterDrop6", "waterDrop2"],
    strong: ["waterDrop6", "waterDrop2", "impactCandidate6"]
  },
  "river-ripple-gate": {
    weak: ["waterDrop5"],
    medium: ["waterDrop5", "waterDrop3"],
    strong: ["waterDrop5", "waterDrop3", "customMagicGate"]
  },
  "river-mirage-tide": {
    weak: ["customMirrorLong"],
    medium: ["customMirrorLong", "waterDrop4"],
    strong: ["customMirrorLong", "waterDrop4", "impactCandidate5"]
  },
  "ake-ember-rise": {
    weak: ["customEmberShort"],
    medium: ["customEmberShort", "flashCandidate2"],
    strong: ["customEmberShort", "flashCandidate2", "explosionCandidate1"]
  },
  "ake-sunrise-fan": {
    weak: ["customEmberShort"],
    medium: ["customEmberShort", "customSolarSpotlight"],
    strong: ["customEmberShort", "customSolarSpotlight", "flashCandidate4"]
  },
  "ake-solar-crown": {
    weak: ["customSolarSpotlight"],
    medium: ["customSolarSpotlight", "flashCandidate6"],
    strong: ["customSolarSpotlight", "flashCandidate6", "explosionCandidate3"]
  },
  "yura-wobble-orbit": {
    weak: ["fantasize8_1"],
    medium: ["customYuraShort", "fantasize8_2"],
    strong: ["customYuraShort", "fantasize8_2", "impactCandidate6"]
  },
  "yura-phantom-lanterns": {
    weak: ["customYuraShort"],
    medium: ["customMirrorLong", "impactCandidate9"],
    strong: ["customYuraShort", "customMirrorLong", "fantasize4_2"]
  },
  "yura-mirror-maze": {
    weak: ["customMirrorLong"],
    medium: ["customMirrorLong", "customMagicGate"],
    strong: ["customMirrorLong", "customMagicGate", "impactCandidate9"]
  },
  "leaf-sprout-pop": {
    weak: ["customSproutWhistle"],
    medium: ["customSproutWhistle", "animeMotion2"],
    strong: ["customSproutWhistle", "animeMotion2", "magicSparkle13_1"]
  },
  "leaf-forest-crest": {
    weak: ["magicSparkle13_5"],
    medium: ["magicSparkle13_5", "customSproutWhistle"],
    strong: ["magicSparkle13_5", "customBloomPhrase", "impactCandidate1"]
  },
  "leaf-vine-bloom": {
    weak: ["customBloomPhrase"],
    medium: ["customBloomPhrase", "streamer5"],
    strong: ["customBloomPhrase", "streamer6", "impactCandidate5"]
  },
  "white-prism-dot": {
    weak: ["customPrismShort"],
    medium: ["customPrismShort", "magicSparkle01_2"],
    strong: ["customPrismShort", "magicSparkle01_2", "starFlash2"]
  },
  "white-magic-gate": {
    weak: ["customMagicGate"],
    medium: ["customMagicGate", "fantasize4_3"],
    strong: ["customMagicGate", "fantasize4_3", "impactCandidate1"]
  },
  "white-star-crest": {
    weak: ["starSparkle2"],
    medium: ["starSparkle2", "customPrismShort"],
    strong: ["starSparkle2", "customPrismShort", "customSolarSpotlight"]
  }
};
const starfallSfxFileKeys = { sparkle: "starSparkle1", flash: "starFlash1" };
const windSfxFileKey = "windCandidate4";
const waterSfxFileKey = "waterDrop6";
const citySparkSfxFileKey = "cityCrackle4";
const routeMagicSfxFileKey = "magicSparkle13_6";
const chargeSfxFileKey = "chargeCandidate1";
const battleAvoidSfxFileKey = "avoidCandidate1";
const battleMessageSfxFileKey = "messageNesRpg01_10";
const moveReleaseSfxFileKey = "skyConfirmCandidate3";
const buttonSfxFileKey = "buttonSelect1";
const itemGetSfxFileKey = "itemGetCandidate1";
const itemUseSfxFileKey = "itemUseCandidate1";
const skyScanSfxFileKey = "skyScanCandidate1";
const skyConfirmSfxFileKey = "skyConfirmCandidate1";
const summonRewardSfxFileKey = "summonRewardCandidate1";
const shopPurchaseSfxFileKey = "shopPurchase3";
const entrySfxFileKey = "entryCandidate2";
const mapMoveSfxFileKey = "mapMove";
const matchEndSfxFileKey = "matchEndCandidate1";
const drumRollSfxFileKey = "drumRollCandidate1";

function volumeLevel(key) {
  return Math.max(0, Math.min(5, Number(state.soundVolumes?.[key] ?? 1)));
}
function volumeScale(key) {
  return volumeLevel(key) / 5;
}
function initSound() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) {
    toast("この環境はサウンド非対応");
    return false;
  }
  if (!sound.ctx) sound.ctx = new AudioContext();
  if (sound.ctx.state === "suspended") sound.ctx.resume();
  return true;
}
function tone(freq, duration = .08, volume = .035, delay = 0, voice = "lead") {
  if (!sound.enabled || !sound.ctx || !Number.isFinite(volume) || volume <= 0) return;
  if (!freq) return;
  const start = sound.ctx.currentTime + delay;
  const osc = sound.ctx.createOscillator();
  const layer = sound.ctx.createOscillator();
  const gain = sound.ctx.createGain();
  const filter = sound.ctx.createBiquadFilter();
  const layerGain = sound.ctx.createGain();
  const voices = {
    lead: { type: "sawtooth", layer: "square", layerGain: .24, detune: 4, attack: .018, filter: 2100, release: .045 },
    harmony: { type: "triangle", layer: "square", layerGain: .14, detune: -3, attack: .024, filter: 1700, release: .06 },
    bass: { type: "square", layer: "sawtooth", layerGain: .18, detune: 0, attack: .012, filter: 900, release: .075 },
    sfx: { type: "square", layer: "square", layerGain: 0, detune: 0, attack: .006, filter: 2600, release: .02 }
  };
  const setting = voices[voice] || voices.lead;
  osc.type = setting.type;
  layer.type = setting.layer;
  osc.frequency.setValueAtTime(freq, start);
  layer.frequency.setValueAtTime(freq, start);
  layer.detune.setValueAtTime(setting.detune, start);
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(setting.filter, start);
  filter.Q.setValueAtTime(2.2, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + setting.attack);
  gain.gain.setValueAtTime(volume * .72, start + Math.max(setting.attack + .018, duration * .45));
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration + setting.release);
  layerGain.gain.setValueAtTime(volume * setting.layerGain, start);
  osc.connect(filter);
  layer.connect(layerGain);
  layerGain.connect(filter);
  filter.connect(gain);
  gain.connect(sound.ctx.destination);
  osc.start(start);
  layer.start(start);
  osc.stop(start + duration + setting.release + .02);
  layer.stop(start + duration + setting.release + .02);
}
function playSfx(kind = "select") {
  if (!sound.enabled) return;
  const sfxScale = volumeScale("sfx");
  if (sfxScale <= 0) return;
  const sequence = (notes, duration = .06, volume = .035, gap = .065) => {
    notes.forEach((freq, index) => tone(freq, duration, volume * sfxScale, index * gap, "sfx"));
  };
  const chord = (notes, duration = .12, volume = .026, delay = 0) => {
    notes.forEach(freq => tone(freq, duration, volume * sfxScale, delay, "sfx"));
  };
  if (kind === "button" && playAudioSfx(buttonSfxFileKey, 0, .88)) return;
  if (kind === "itemGet" && playAudioSfx(itemGetSfxFileKey, 0, .95)) return;
  if (kind === "itemUse" && playAudioSfx(itemUseSfxFileKey, 0, .92)) return;
  if (kind === "skyScan" && playAudioSfx(skyScanSfxFileKey, 0, .9)) return;
  if (kind === "summon" && playAudioSfx(summonRewardSfxFileKey, 0, .94)) return;
  if (kind === "entry" && playAudioSfx(entrySfxFileKey, 0, .92)) return;
  if (kind === "mapMove" && playAudioSfx(mapMoveSfxFileKey, 0, .74)) return;
  if (kind === "matchEnd" && playAudioSfx(matchEndSfxFileKey, 0, .92)) return;
  if (kind === "drumRoll" && playAudioSfx(drumRollSfxFileKey, 0, .94)) return;
  const patterns = {
    select: () => sequence([740, 988], .045, .025, .055),
    button: () => sequence([740, 988], .045, .025, .055),
    entry: () => { sequence([294, 392, 587], .07, .035, .075); chord([147, 294], .16, .018, .02); },
    itemGet: () => { sequence([523, 659, 784, 1046], .075, .042, .085); chord([262, 523], .18, .018, .03); },
    itemUse: () => sequence([392, 523, 659, 523], .055, .034, .06),
    skyScan: () => { sequence([880, 1175, 880, 1318], .045, .028, .07); chord([440, 880], .2, .014, .02); },
    summon: () => { sequence([392, 523, 659, 784, 1046], .08, .044, .08); chord([196, 392, 784], .26, .02, .12); },
    battle: () => sequence([196, 247, 196, 330], .06, .04, .07),
    mapMove: () => sequence([494, 659], .045, .022, .052),
    matchEnd: () => { sequence([523, 659, 784], .07, .04, .075); chord([262, 523, 1046], .2, .018, .08); },
    drumRoll: () => {
      for (let index = 0; index < 18; index += 1) {
        tone(index % 2 ? 150 : 190, .035, .03 * sfxScale, index * .055, "sfx");
      }
      tone(392, .11, .026 * sfxScale, 1.04, "sfx");
      tone(784, .14, .022 * sfxScale, 1.11, "sfx");
    },
    hit: () => playSlashHitSfx("weak", 0),
    error: () => sequence([140, 110], .13, .04, .12),
    reward: () => patterns.itemGet()
  };
  (patterns[kind] || patterns.select)();
}
function playAudioSfx(key, delay = 0, volume = 1) {
  if (!sound.enabled) return false;
  const file = sfxAudioFiles[key];
  if (!file) return false;
  const sfxScale = volumeScale("sfx");
  if (sfxScale <= 0) return false;
  const play = () => {
    const audio = new Audio(file);
    audio.preload = "auto";
    audio.volume = Math.max(0, Math.min(1, .56 * sfxScale * volume));
    audio.play().catch(() => {});
  };
  if (delay > 0) {
    setTimeout(play, Math.max(0, delay * 1000));
  } else {
    play();
  }
  return true;
}
function playSlashImpact(delay = 0, volume = 1) {
  if (!sound.enabled || !sound.ctx || !Number.isFinite(volume) || volume <= 0) return;
  const start = sound.ctx.currentTime + delay;
  const noiseLength = Math.max(1, Math.floor(sound.ctx.sampleRate * .105));
  const buffer = sound.ctx.createBuffer(1, noiseLength, sound.ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < noiseLength; i += 1) {
    const fade = 1 - i / noiseLength;
    data[i] = (Math.random() * 2 - 1) * fade * fade;
  }
  const noise = sound.ctx.createBufferSource();
  const noiseGain = sound.ctx.createGain();
  const band = sound.ctx.createBiquadFilter();
  const lowCut = sound.ctx.createBiquadFilter();
  const slash = sound.ctx.createOscillator();
  const slashGain = sound.ctx.createGain();
  const bite = sound.ctx.createOscillator();
  const biteGain = sound.ctx.createGain();
  noise.buffer = buffer;
  band.type = "bandpass";
  band.frequency.setValueAtTime(1650, start);
  band.Q.setValueAtTime(1.35, start);
  lowCut.type = "highpass";
  lowCut.frequency.setValueAtTime(520, start);
  noiseGain.gain.setValueAtTime(0.0001, start);
  noiseGain.gain.exponentialRampToValueAtTime(.09 * volume, start + .008);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, start + .118);
  slash.type = "sawtooth";
  slash.frequency.setValueAtTime(580, start);
  slash.frequency.exponentialRampToValueAtTime(118, start + .12);
  slashGain.gain.setValueAtTime(0.0001, start);
  slashGain.gain.exponentialRampToValueAtTime(.048 * volume, start + .006);
  slashGain.gain.exponentialRampToValueAtTime(0.0001, start + .14);
  bite.type = "square";
  bite.frequency.setValueAtTime(1180, start);
  bite.frequency.exponentialRampToValueAtTime(760, start + .038);
  biteGain.gain.setValueAtTime(0.0001, start);
  biteGain.gain.exponentialRampToValueAtTime(.032 * volume, start + .004);
  biteGain.gain.exponentialRampToValueAtTime(0.0001, start + .052);
  noise.connect(band);
  band.connect(lowCut);
  lowCut.connect(noiseGain);
  noiseGain.connect(sound.ctx.destination);
  slash.connect(slashGain);
  slashGain.connect(sound.ctx.destination);
  bite.connect(biteGain);
  biteGain.connect(sound.ctx.destination);
  noise.start(start);
  slash.start(start);
  bite.start(start);
  noise.stop(start + .14);
  slash.stop(start + .16);
  bite.stop(start + .07);
}
function playSlashHitSfx(tier = "weak", delay = 0) {
  if (!initSound() || !sound.enabled) return;
  const count = tier === "strong" ? 3 : tier === "medium" ? 2 : 1;
  const sfxScale = volumeScale("sfx");
  if (sfxScale <= 0) return;
  for (let index = 0; index < count; index += 1) {
    const hitDelay = delay + index * .62;
    if (!playAudioSfx(battleHitSfxFileKey, hitDelay, 1)) {
      playSlashImpact(hitDelay, sfxScale);
    }
  }
}
function playTypedHitSfx(tier = "weak", delay = 2.62, sceneType = "route") {
  const sfxScale = volumeScale("sfx");
  if (!(sfxScale > 0) || !initSound() || !sound.enabled) return;
  const count = tier === "strong" ? 3 : tier === "medium" ? 2 : 1;
  const keySet = battleHitSfxFileKeys[sceneType] || battleHitSfxFileKeys.route;
  const keys = keySet[tier] || keySet.weak || [battleHitSfxFileKey];
  for (let index = 0; index < count; index += 1) {
    const hitDelay = delay + index * .62;
    const key = keys[index] || keys[keys.length - 1] || battleHitSfxFileKey;
    if (!playAudioSfx(key, hitDelay, 1)) {
      playSlashImpact(hitDelay, sfxScale);
    }
  }
}
function playBattleAvoidSfx(delay = 2.62) {
  if (!initSound() || !sound.enabled) return;
  if (!playAudioSfx(battleAvoidSfxFileKey, delay, .88)) {
    setTimeout(() => playSfx("select"), Math.max(0, delay) * 1000);
  }
}
function playStarfallSfx(tier = "weak", startDelay = 0) {
  if (!initSound() || !sound.enabled) return;
  const flashCount = tier === "strong" ? 2 : 1;
  playAudioSfx(starfallSfxFileKeys.sparkle, startDelay + 1.1, tier === "strong" ? 1 : .86);
  for (let index = 0; index < flashCount; index += 1) {
    playAudioSfx(starfallSfxFileKeys.flash, startDelay + 2.42 + index * .38, 1);
  }
}
function playWindSfx(tier = "weak", startDelay = 0) {
  if (!initSound() || !sound.enabled) return;
  const count = tier === "strong" ? 3 : tier === "medium" ? 2 : 1;
  for (let index = 0; index < count; index += 1) {
    playAudioSfx(windSfxFileKey, startDelay + 1.55 + index * .48, tier === "weak" ? .82 : .96);
  }
}
function playWaterSfx(tier = "weak", startDelay = 0) {
  if (!initSound() || !sound.enabled) return;
  const count = tier === "strong" ? 3 : tier === "medium" ? 2 : 1;
  for (let index = 0; index < count; index += 1) {
    playAudioSfx(waterSfxFileKey, startDelay + 1.82 + index * .42, tier === "weak" ? .82 : .98);
  }
}
function playCitySparkSfx(tier = "weak", startDelay = 0) {
  if (!initSound() || !sound.enabled) return;
  const count = tier === "strong" ? 3 : tier === "medium" ? 2 : 1;
  for (let index = 0; index < count; index += 1) {
    playAudioSfx(citySparkSfxFileKey, startDelay + 1.52 + index * .34, tier === "weak" ? .78 : .94);
  }
}
function playRouteMagicSfx(tier = "weak", startDelay = 0) {
  if (!initSound() || !sound.enabled) return;
  playAudioSfx(chargeSfxFileKey, startDelay + .42, tier === "weak" ? .9 : 1);
  if (tier !== "weak") {
    playAudioSfx("chargeCandidate3", startDelay + 1.62, tier === "medium" ? .56 : .64);
  }
  const releaseCount = tier === "strong" ? 2 : 1;
  for (let index = 0; index < releaseCount; index += 1) {
    playAudioSfx(routeMagicSfxFileKey, startDelay + 3.02 + index * .52, tier === "weak" ? .78 : .92);
  }
}
function playFlashSfx(tier = "weak", startDelay = 0) {
  if (!initSound() || !sound.enabled) return;
  playAudioSfx("flashCandidate2", startDelay + 2.06, tier === "weak" ? .72 : .84);
  if (tier !== "weak") {
    playAudioSfx("flashCandidate1", startDelay + 2.28, .76);
  }
  if (tier === "strong") {
    playAudioSfx("flashCandidate3", startDelay + 2.46, .72);
  }
}
function playThunderSfx(tier = "weak", startDelay = 0) {
  if (!initSound() || !sound.enabled) return;
  playAudioSfx("electricCandidate9", startDelay + 1.92, tier === "weak" ? .78 : .9);
  if (tier !== "weak") {
    playAudioSfx("electricCandidate11", startDelay + 2.18, .82);
  }
  if (tier === "strong") {
    playAudioSfx("thunderCandidate3", startDelay + 2.36, .58);
  }
}
function playBattleMessageSfx(delays = []) {
  if (!initSound() || !sound.enabled) return;
  [...new Set(delays.map(delay => Number(delay.toFixed(2))))].forEach(delay => {
    playAudioSfx(battleMessageSfxFileKey, delay, .58);
  });
}
function playBattleMoveReleaseSfx(tier = "weak", delay = 0, onChargeBeat = null) {
  if (!initSound() || !sound.enabled) return;
  const file = sfxAudioFiles[moveReleaseSfxFileKey];
  const sfxScale = volumeScale("sfx");
  if (!file || sfxScale <= 0) return;
  const count = tier === "strong" ? 3 : tier === "medium" ? 2 : 1;
  const interval = .45;
  for (let index = 0; index < count; index += 1) {
    const audio = new Audio(file);
    audio.preload = "auto";
    audio.volume = Math.max(0, Math.min(1, .56 * sfxScale * .72));
    audio.addEventListener?.("playing",()=>onChargeBeat?.(index),{once:true});
    audio.load();
    setTimeout(() => {
      audio.currentTime = 0;
      audio.play().catch(() => onChargeBeat?.(-1));
    }, Math.max(0, (delay + index * interval) * 1000));
  }
}
function playBattleHitSfx(tier = "weak", delay = 2.62, sceneType = "slash", startDelay = 0) {
  if (sceneType === "starfall") {
    playStarfallSfx(tier, startDelay);
    playTypedHitSfx(tier, delay, sceneType);
    return;
  }
  if (sceneType === "wind") {
    playWindSfx(tier, startDelay);
    playTypedHitSfx(tier, delay, sceneType);
    return;
  }
  if (sceneType === "water") {
    playWaterSfx(tier, startDelay);
    playTypedHitSfx(tier, delay, sceneType);
    return;
  }
  if (sceneType === "city-spark") {
    playCitySparkSfx(tier, startDelay);
    playTypedHitSfx(tier, delay, sceneType);
    return;
  }
  if (sceneType === "route") {
    playRouteMagicSfx(tier, startDelay);
    playTypedHitSfx(tier, delay, sceneType);
    return;
  }
  if (sceneType === "flash") {
    playFlashSfx(tier, startDelay);
    playTypedHitSfx(tier, delay, sceneType);
    return;
  }
  if (sceneType === "thunder") {
    playThunderSfx(tier, startDelay);
    playTypedHitSfx(tier, delay, sceneType);
    return;
  }
  playTypedHitSfx(tier, delay, sceneType);
}
function playHpDrainSfx(beforePercent = 100, afterPercent = 100, delay = 3.35, duration = 2.18, previewMode = "") {
  initSound();
  if (!sound.enabled || !sound.ctx) return;
  const sfxScale = volumeScale("sfx");
  if (sfxScale <= 0) return;
  const before = Math.max(0, Math.min(100, beforePercent));
  const after = Math.max(0, Math.min(100, afterPercent));
  const drop = before - after;
  if (drop <= 0) return;
  const presets = {
    retroBuzz: { type: "square", layerType: "square", base: 392, end: 330, layer: 784, layerEnd: 660, filter: "lowpass", filterFreq: 1250, q: 1.4, vibrato: 5.8, detune: 7, layerGain: .24, volume: .062 },
    metalBuzz: { type: "sawtooth", layerType: "square", base: 740, end: 740, layer: 1480, layerEnd: 1480, filter: "lowpass", filterFreq: 2200, q: 1.2, vibrato: 0, detune: 0, layerGain: .28, volume: .095 },
    warningBuzz: { type: "square", layerType: "sawtooth", base: 294, end: 247, layer: 587, layerEnd: 494, filter: "lowpass", filterFreq: 980, q: 2.1, vibrato: 8.4, detune: 13, layerGain: .28, volume: .07 }
  };
  const mode = previewMode || officialBattleHpDrainSfxMode;
  const preset = presets[mode] || presets[officialBattleHpDrainSfxMode];
  const start = sound.ctx.currentTime + delay;
  const end = start + duration;
  const carrier = sound.ctx.createOscillator();
  const layer = sound.ctx.createOscillator();
  const vibrato = sound.ctx.createOscillator();
  const vibratoGain = sound.ctx.createGain();
  const gain = sound.ctx.createGain();
  const filter = sound.ctx.createBiquadFilter();
  const layerGain = sound.ctx.createGain();
  carrier.type = preset.type;
  layer.type = preset.layerType;
  vibrato.type = "sine";
  carrier.frequency.setValueAtTime(preset.base, start);
  carrier.frequency.linearRampToValueAtTime(preset.end, end);
  layer.frequency.setValueAtTime(preset.layer, start);
  layer.frequency.linearRampToValueAtTime(preset.layerEnd, end);
  vibrato.frequency.setValueAtTime(preset.vibrato, start);
  vibratoGain.gain.setValueAtTime(preset.detune, start);
  filter.type = preset.filter;
  filter.frequency.setValueAtTime(preset.filterFreq, start);
  filter.Q.setValueAtTime(preset.q, start);
  layerGain.gain.setValueAtTime(preset.layerGain, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(preset.volume * sfxScale, start + .04);
  gain.gain.setValueAtTime(preset.volume * .86 * sfxScale, Math.max(start + .08, end - .28));
  gain.gain.exponentialRampToValueAtTime(0.0001, end + .18);
  vibrato.connect(vibratoGain);
  vibratoGain.connect(carrier.detune);
  carrier.connect(filter);
  layer.connect(layerGain);
  layerGain.connect(filter);
  filter.connect(gain);
  gain.connect(sound.ctx.destination);
  carrier.start(start);
  layer.start(start);
  vibrato.start(start);
  carrier.stop(end + .22);
  layer.stop(end + .22);
  vibrato.stop(end + .22);
}
function tournamentBgmMode(cup, matchIndex = 0, total = cup ? tournamentMatchCount(cup) : 2) {
  const isFinal = matchIndex >= total - 1;
  const modeMap = {
    rookie: isFinal ? "rookieFinal" : "rookieBattle",
    green: isFinal ? "major1Final" : "major1",
    city: isFinal ? "major2Final" : "major2",
    sky: isFinal ? "major3Final" : "major3",
    river: isFinal ? "major4Final" : "major4",
    grand: isFinal ? "grandFinal" : "grand"
  };
  return modeMap[cup?.id] || (isFinal ? "rookieFinal" : "rookieBattle");
}
function fourMajorCupIds() {
  return ["green", "city", "sky", "river"];
}
function tournamentAwardBgmMode(cup) {
  if (!cup) return "";
  if (cup.id === "rookie") return "rookieAward";
  if (cup.id === "grand") return "grandAward";
  if (fourMajorCupIds().includes(cup.id)) return "majorAward";
  return "";
}
 // END ORIGINAL TOURNAMENT SOUND
 function stop(){if(closed)return;closed=true;for(const id of timers)win.clearTimeout(id);timers.clear();for(const a of media){try{a.pause();a.removeAttribute?.('src');a.load?.();}catch{}}media.clear();try{sound.ctx?.close()?.catch?.(()=>{});}catch{}music=null;}
 function musicFor(cup='rookie',final=false){if(closed||!sound.enabled)return false;const mode=tournamentBgmMode({id:cup},final?1:0,2),file=bgmAudioFiles[mode];if(!file)return false;try{music?.pause();music=new Audio(file);music.loop=true;music.preload='auto';music.volume=.42*volumeScale('battleBgm');if(music.volume>0)music.play().catch(()=>onNotice('音を再生できませんでした。再生ボタンでもう一度試せます。'));return true;}catch{return false;}}
 function prepare(cup,final){if(closed)return;initSound();musicFor(cup,final);}
 function prepareAward(cup='rookie'){if(closed)return;initSound();if(sound.enabled){const mode=tournamentAwardBgmMode({id:cup}),file=bgmAudioFiles[mode];if(file){music?.pause();music=new Audio(file);music.loop=true;music.preload='auto';music.volume=.42*volumeScale('battleBgm');if(music.volume>0)music.play().catch(()=>onNotice('音を再生できませんでした。'));}}playSfx('summon');}
 function receiveMedal(){if(!closed)playSfx('summon');}
 function technique({tier='weak',style='route',impactAt=5.32,releaseAt=3.58,hit=true,onShake=()=>{},cue={},chargeSequence=null}={}){
  if(closed)return;playSfx('battle');playBattleMessageSfx(cue.sounds??[0,1.4,2.35,3.45]);playBattleMoveReleaseSfx(tier,1.4,index=>chargeSequence?.notify(index));
  if(hit){playBattleHitSfx(tier,impactAt,style,2.7);playHpDrainSfx(cue.from??100,cue.to??72,cue.delay??6.05);if(tier==='strong')setTimeout(onShake,impactAt*1000);}else playBattleAvoidSfx(impactAt);
 }
 return{prepare,prepareAward,receiveMedal,technique,stop,get audible(){return sound.enabled&&volumeScale('sfx')>0;},get closed(){return closed;},stats:()=>({timers:timers.size,media:media.size,context:sound.ctx?.state??'idle',closed})};
}
