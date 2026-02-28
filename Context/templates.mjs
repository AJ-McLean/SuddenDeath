export const TEMPLATES = [
  {
    id: "rapid_fire_recall",
    title: "Rapid-Fire Recall",
    pre_recorded_pre_q_wav:
      "[excited] Oh this is good... this is VERY good. [short pause] Fast. Brutal. No time for intellectual wandering. [inhales deeply] You get thirty seconds. Thirty. [whisper] That is not time... that is a rumour of time. [annoyed] If you blink too long, it's over.",
    live_generated_q_wav:
      "[dramatic] Rapid-fire recall. [short pause] List the key facts about... {TOPIC}. [long pause] No fluff. No filler. Just facts.",
    pre_recorded_post_q_wav:
      "[intense] Clock starts now. [short pause] No freezing. No buffering. [whisper] No tragic silence... [exhales sharply] Go.",
  },
  {
    id: "definition_one_sentence",
    title: "Definition in One Sentence",
    pre_recorded_pre_q_wav:
      "[thoughtful] Right... this is where confidence collapses. [short pause] You either understand it... [whisper] or you absolutely do not.",
    live_generated_q_wav:
      "[measured] Define... {TOPIC}. [short pause] In one sentence.",
    pre_recorded_post_q_wav:
      '[whisper] One sentence. [short pause] One. [annoyed] Not a trilogy. Not a life story. [sighs] Clean. Clear. Go.',
  },
  {
    id: "true_or_false_with_correction",
    title: "True or False (With Correction)",
    pre_recorded_pre_q_wav:
      "[dramatic] Listen carefully... [short pause] I am about to say something very confident. [appalled] That proves nothing.",
    live_generated_q_wav:
      "Statement... {STATEMENT}. [short pause] True... or false? [long pause] If false... correct it.",
    pre_recorded_post_q_wav:
      '[annoyed] Commit. Properly. [short pause] "Maybe" is not an answer. [whisper] It is weakness.',
  },
  {
    id: "summary_30_seconds",
    title: "30-Second Summary",
    pre_recorded_pre_q_wav:
      '[urgent] Thirty seconds. [short pause] That is ALL you get. [exhales sharply] If you start with "so basically"... you\'ve already wasted two.',
    live_generated_q_wav:
      "Explain this... in thirty seconds. [short pause] {TOPIC}.",
    pre_recorded_post_q_wav:
      "[intense] Start strong. Stay structured. [short pause] End clean. [whisper] Drift... and I will notice.",
  },
  {
    id: "teach_a_10_year_old",
    title: "Teach a 10-Year-Old",
    pre_recorded_pre_q_wav:
      "[playful] Imagine a ten-year-old is listening. [short pause] Clever. Brutal. Unimpressed. [laughing] They will absolutely call you out.",
    live_generated_q_wav:
      "Explain this so a ten-year-old understands... {TOPIC}.",
    pre_recorded_post_q_wav:
      "[sincere] Simple words. Real clarity. [short pause] [annoyed] If you hide behind jargon... I will hear it.",
  },
  {
    id: "compare_contrast",
    title: "Compare & Contrast",
    pre_recorded_pre_q_wav:
      "[announcer voice] In one corner... an idea. [short pause] In the other... another idea. [thoughtful] They look similar... they are not.",
    live_generated_q_wav:
      "What is the difference between... {X}... and... {Y}?",
    pre_recorded_post_q_wav:
      "[measured] Specific differences. [short pause] Not vibes. [whisper] Blur them together... and we have a problem.",
  },
  {
    id: "cause_and_effect",
    title: "Cause & Effect",
    pre_recorded_pre_q_wav:
      "[serious] Things happen for reasons. [short pause] Then consequences happen. [long pause] This is not chaos... this is sequence.",
    live_generated_q_wav:
      "What caused... {TOPIC}... and what happened because of it?",
    pre_recorded_post_q_wav:
      "[focused] Cause first. Then effect. [short pause] [annoyed] If it zigzags... I will sigh.",
  },
  {
    id: "headline_challenge",
    title: "Headline Challenge",
    pre_recorded_pre_q_wav:
      "[excited] Breaking news! [short pause] Something dramatic just happened. [whisper] Or at least... it should feel like it.",
    live_generated_q_wav:
      "Write a headline about... {TOPIC}.",
    pre_recorded_post_q_wav:
      "[sharp] Short. Punchy. Impactful. [short pause] [annoyed] If it sounds sleepy... start again.",
  },
  {
    id: "problem_solving_scenario",
    title: "Problem-Solving Scenario",
    pre_recorded_pre_q_wav:
      "[grim] Imagine it failed. [short pause] Completely. [long pause] Spectacularly.",
    live_generated_q_wav:
      "If this failed... {TOPIC}... what would you change? And why?",
    pre_recorded_post_q_wav:
      '[intense] Specific changes. Clear reasoning. [short pause] [appalled] "Make it better" is not a strategy.',
  },
  {
    id: "spot_the_error",
    title: "Spot the Error",
    pre_recorded_pre_q_wav:
      "[confident] I am about to explain something. [short pause] Smoothly. Convincingly. [whisper] It will be wrong.",
    live_generated_q_wav:
      "Listen carefully to this explanation of... {TOPIC}. [short pause] Now... find the mistakes.",
    pre_recorded_post_q_wav:
      "[whisper] Find them. Fix them. [short pause] [annoyed] If you miss the obvious ones... that is on you.",
  },
  {
    id: "rank_and_justify",
    title: "Rank & Justify",
    pre_recorded_pre_q_wav:
      "[thoughtful] Ranking time... [short pause] This reveals priorities. [whisper] And character.",
    live_generated_q_wav:
      "Rank these from most important to least. Then justify. [short pause] {FACTOR_A}... {FACTOR_B}... {FACTOR_C}... {FACTOR_D}.",
    pre_recorded_post_q_wav:
      "[low voice] Be careful... [short pause] [sarcastic tone] I am absolutely judging you.",
  },
];