window.DIALOGUE_LIBRARY = (() => {
  const CONTROLLER_ID = "rhea";
  const PLAYER_ID = "player";
  const SERIN_ID = "serin";

  function line(speakerId, text) {
    return { speakerId, text };
  }

  const STAGE_DIALOGUE = {
    1: {
      intro: [
        line(CONTROLLER_ID,  "통신 연결 확인했습니다."),
        line(PLAYER_ID,      "여어, 안녕 신입."),
        line(CONTROLLER_ID,  "안녕하세요."),
        line(PLAYER_ID,      "수석 졸업했다는 그 에이스 친구, 이야기 많이 들었어."),
        line(CONTROLLER_ID,  "네."),
        line(PLAYER_ID,      "앞으로 잘 부탁해. 난 스파이크야."),
        line(CONTROLLER_ID,  "레이입니다. 브리핑 하겠습니다."),
        line(PLAYER_ID,      "신입, 무리할 거 없어. 오늘은 지켜만 봐.")
      ],
      warning: [
        line(CONTROLLER_ID, "코어 활성화… E급."),
        line(PLAYER_ID,     "가볍게 몸 풀자고.")
      ],
      clear: [
        line(CONTROLLER_ID, "코어 반응 소멸 되었습니다."),
        line(CONTROLLER_ID, "게이트 폐쇄 확인. 임무 완료입니다."),
        line(PLAYER_ID,     "이제 쉬자고.")
      ]
    },

    2: {
      intro: [
        line(PLAYER_ID,      "안녕 신입. 어제는 정신 없었지?"),
        line(CONTROLLER_ID,  "안녕하세요. 덕분에 편안했습니다"),        
        line(PLAYER_ID,      "요즘 들어 게이트가 자주 열리네."),
        line(CONTROLLER_ID,  "최근 들어 게이트 출현 빈도가 높아 졌다고 합니다"),
        line(PLAYER_ID,      "이거 참 느낌이 안좋아")
      ],
      warning: [
        line(SERIN_ID,       "이번 상대는 D급"),
        line(PLAYER_ID,      "오늘도 지켜만 보라고.")
      ],
      clear: [
        line(CONTROLLER_ID, "D급 코어 소멸. 게이트 폐쇄."),
        line(PLAYER_ID,     "오케이"),
      ]
    },

    3: {
      intro: [
        line(PLAYER_ID,      "여어 신입"),
        line(SERIN_ID,       "그동안 잘 지냈어요?"),
        line(PLAYER_ID,      "어?"),
        line(PLAYER_ID,      "레이는?"),
        line(SERIN_ID,       "다른 임무에 투입됐어요."),
        line(PLAYER_ID,      "..."),        
        line(PLAYER_ID,      "아… 그렇구만."),
        line(SERIN_ID,       "왜요, 제가 와서 실망했나요? 목소리와 표정이 별로 좋지 않네요."),
        line(PLAYER_ID,      "아니, 뭐... 그런 건 아니고."),
        line(SERIN_ID,       "임무 시작해요."),
        line(PLAYER_ID,      "...그래.")
      ],
      warning: [
        line(SERIN_ID,       "C급 개체예요."),
        line(PLAYER_ID,      "뭐? C급? 최근 게이트 상황이 이상하네"),
        line(SERIN_ID,       "지원을 요청할까요?"),
        line(PLAYER_ID,      "본부도 여력이 없을거야, 어떻게든 해볼께"),
      ],
      clear: [
        line(SERIN_ID,       "코어 소멸, 고생했어요 스파이크"),
        line(PLAYER_ID,      "오늘은 좀 피곤하네.")
      ]
    }
  };

  function getStageDialogue(stage = 1) {
    return STAGE_DIALOGUE[stage] || STAGE_DIALOGUE[3];
  }

  function stageStart(stage = 1) {
    return getStageDialogue(stage).intro;
  }

  function bossWarning(stage = 1) {
    return getStageDialogue(stage).warning;
  }

  function bossClear(stage = 1) {
    return getStageDialogue(stage).clear;
  }

  return {
    stageStart,
    bossWarning,
    bossClear
  };
})();