window.ResourceManifest = (() => {
  const entries = {
    intro_bgm: { id: "bgm:introLogo", kind: "audio", src: "./assets/bgm/intro-logo/jeremusic70-space-intro-no-copyright-music-124261.mp3" },
    intro_ui_hover: { id: "audio:introUiHover", kind: "audio", src: "./assets/sfx/kenney_ui-audio/Audio/rollover2.ogg" },
    intro_ui_click: { id: "audio:introUiClick", kind: "audio", src: "./assets/sfx/kenney_ui-audio/Audio/click3.ogg" },
    avatar_rhea: { id: "image:rhea", kind: "image", src: "./resources/avatar-controller.jpg", fallbackSrc: "./resources/avatar-controller.png" },
    avatar_serin: { id: "image:serin", kind: "image", src: "./resources/avatar-controller2.jpg", fallbackSrc: "./resources/avatar-controller2.png" },
    bgm_stage_briefing: { id: "bgm:stageBriefing:intro", kind: "audio", src: "./assets/bgm/stage-ready/the_mountain-jazz-cafe-music-496552.mp3" },
    bgm_stage1_gameplay: { id: "bgm:stage1:gameplay", kind: "audio", src: "./assets/bgm/stage-1/gameplay/Everything falls apart.ogg" },
    bgm_stage1_boss: { id: "bgm:stage1:boss", kind: "audio", src: "./assets/bgm/stage-1/boss/usb.mp3" },
    bgm_stage2_gameplay: { id: "bgm:stage2:gameplay", kind: "audio", src: "./assets/bgm/stage-2/gameplay/racing tecno.ogg" },
    bgm_stage2_boss_phase1: { id: "bgm:stage2:boss:phase1", kind: "audio", src: "./assets/bgm/stage-2/boss/phase1/racing tecno_v2(slow).ogg" },
    bgm_stage2_boss_phase2: { id: "bgm:stage2:boss:phase2", kind: "audio", src: "./assets/bgm/stage-2/boss/phase2/racing tecno_v2.ogg" },
    bgm_stage3_gameplay: { id: "bgm:stage3:gameplay", kind: "audio", src: "./assets/bgm/stage-3/gameplay/ente_evil.ogg" },
    bgm_stage3_boss_phase1: { id: "bgm:stage3:boss:phase1", kind: "audio", src: "./assets/bgm/stage-3/boss/phase1/Boss Battle 6 V1.wav" },
    bgm_stage3_boss_phase2: { id: "bgm:stage3:boss:phase2", kind: "audio", src: "./assets/bgm/stage-3/boss/phase2/litesaturation-nu-metal-no-solo-109317.mp3" },
    sfx_player_fire: { id: "sfx:player_fire", kind: "audio", src: "./assets/sfx/kenney_digital-audio/Audio/laser2.ogg" },
    sfx_laser_fire: { id: "sfx:laser_fire", kind: "audio", src: "./assets/sfx/kenney_digital-audio/Audio/laser9.ogg" },
    sfx_shotgun_fire: { id: "sfx:shotgun_fire", kind: "audio", src: "./assets/sfx/kenney_digital-audio/Audio/laser5.ogg" },
    sfx_missile_launch: { id: "sfx:missile_launch", kind: "audio", src: "./assets/sfx/kenney_digital-audio/Audio/laser1.ogg" },
    sfx_player_hit: { id: "sfx:player_hit", kind: "audio", src: "./assets/sfx/kenney_sci-fi-sounds/Audio/forceField_003.ogg" },
    sfx_level_up: { id: "sfx:level_up", kind: "audio", src: "./assets/sfx/kenney_digital-audio/Audio/powerUp5.ogg" },
    sfx_comms: { id: "sfx:comms", kind: "audio", src: "./assets/sfx/kenney_digital-audio/Audio/phaserUp3.ogg" },
    sfx_radio_in: { id: "sfx:radio_in", kind: "audio", src: "./assets/sfx/kenney_digital-audio/Audio/phaserUp2.ogg" },
    sfx_radio_out: { id: "sfx:radio_out", kind: "audio", src: "./assets/sfx/kenney_digital-audio/Audio/phaserDown2.ogg" },
    sfx_upgrade_pick: { id: "sfx:upgrade_pick", kind: "audio", src: "./assets/sfx/levelup/universfield-level-up-05-326133.mp3" },
    sfx_ui_hover: { id: "sfx:ui_hover", kind: "audio", src: "./assets/sfx/kenney_ui-audio/Audio/rollover2.ogg" },
    sfx_boss_alarm: { id: "sfx:boss_alarm", kind: "audio", src: "./assets/sfx/alert/red-alert.mp3" },
    sfx_low_explosion: { id: "sfx:low_explosion", kind: "audio", src: "./assets/sfx/kenney_sci-fi-sounds/Audio/lowFrequency_explosion_001.ogg" },
    sfx_boss_destroy: { id: "sfx:boss_destroy", kind: "audio", src: "./assets/sfx/kenney_sci-fi-sounds/Audio/explosionCrunch_001.ogg" },
    sfx_boss_clear: { id: "sfx:boss_clear", kind: "audio", src: "./assets/sfx/kenney_digital-audio/Audio/powerUp10.ogg" },
    sfx_stage_clear: { id: "sfx:stage_clear", kind: "audio", src: "./assets/sfx/stage/clear/grumpynora-rock-ending-8-440862.mp3" },
    sfx_player_death: { id: "sfx:player_death", kind: "audio", src: "./assets/sfx/kenney_sci-fi-sounds/Audio/explosionCrunch_000.ogg" },
    sfx_enemy_destroy: { id: "sfx:enemy_destroy", kind: "audio", src: "./assets/sfx/kenney_sci-fi-sounds/Audio/explosionCrunch_003.ogg" },
    sfx_debris_glass: { id: "sfx:debris_glass", kind: "audio", src: "./assets/sfx/kenney_impact-sounds/Audio/impactGlass_heavy_003.ogg" },
    sfx_armor_hit: { id: "sfx:armor_hit", kind: "audio", src: "./assets/sfx/kenney_impact-sounds/Audio/impactPlate_heavy_001.ogg" }
  };

  const groups = {
    intro: ["intro_bgm", "intro_ui_hover", "intro_ui_click"],
    common: ["avatar_rhea", "avatar_serin", "bgm_stage_briefing", "sfx_comms", "sfx_radio_in", "sfx_radio_out", "sfx_ui_hover"],
    gameBoot: [
      "bgm_stage1_gameplay", "bgm_stage1_boss", "sfx_player_fire", "sfx_laser_fire", "sfx_shotgun_fire",
      "sfx_missile_launch", "sfx_player_hit", "sfx_level_up", "sfx_upgrade_pick", "sfx_boss_alarm",
      "sfx_low_explosion", "sfx_boss_destroy", "sfx_boss_clear", "sfx_stage_clear", "sfx_player_death",
      "sfx_enemy_destroy", "sfx_debris_glass", "sfx_armor_hit"
    ],
    gameDeferred: [
      "bgm_stage2_gameplay", "bgm_stage2_boss_phase1", "bgm_stage2_boss_phase2",
      "bgm_stage3_gameplay", "bgm_stage3_boss_phase1", "bgm_stage3_boss_phase2"
    ]
  };

  function getEntriesForGroups(groupNames = []) {
    const seen = new Set();
    const result = [];
    for (const groupName of groupNames) {
      for (const key of groups[groupName] || []) {
        if (!entries[key] || seen.has(key)) continue;
        seen.add(key);
        result.push(entries[key]);
      }
    }
    return result;
  }

  return { entries, groups, getEntriesForGroups };
})();
