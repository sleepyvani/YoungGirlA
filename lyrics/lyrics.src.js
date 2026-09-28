// Lyrics, one line per sung phrase, in order. The romaji is as supplied; the Japanese is transcribed
// from it (kanji only for unambiguous words, kana elsewhere). The two numbers are a generous search
// window (song seconds) for the section the line belongs to, not its timing: analysis/align.py finds
// the actual word times in the recording. The word segmentation lives in analysis/words.py.
const V1 = [21, 54], PRE1 = [50, 68], CH1 = [64, 98], POST1 = [93, 104], V2 = [102, 120], PRE2 = [116, 134],
  CH2 = [130, 164], OUT1 = [162, 182], OUT2 = [175, 195], OUT3 = [190, 203];
const S = (w, s) => [w[0], w[1], s];

const LY = [
  // [Verse 1]
  S(V1, "僕の命 つったって 誰の命 つったって (Boku no inochi tsuttatte dare no inochi tsuttatte)"),
  S(V1, "時々 どき 公平に 裁かれる もんなんでしょ (Tokidoki doki kouhei ni sabakareru mon nan desho)"),
  S(V1, "暗い空に やってきた 鬱を連れて やってきた (Kurai sora ni yattekita utsu wo tsurete yattekita)"),
  S(V1, "時々 雨 そうけいに 頼りぎりだ どうしよう (Tokidoki ame soukei ni tayorigiri da dou shiyou)"),
  S(V1, "朽ちるまでの愛憎を 朽ちるまでの愛憎を (Kuchiru made no aizou wo kuchiru made no aizou wo)"),
  S(V1, "飲み込む君 簡単に 微笑む君 どうして (Nomikomu kimi kantan ni hohoemu kimi dou shite)"),
  S(V1, "言葉を書く 曖昧に 言葉を書く 曖昧に (Kotoba wo kaku aimai ni kotoba wo kaku aimai ni)"),
  S(V1, "伝わりきらんないから 君だけをさ 信じて (Tsutawari kirannai kara kimi dake wo sa shinjite)"),
  // [Pre-Chorus]
  S(PRE1, "捨ててきた夢を集めて (Sutete kita yume wo atsumete)"),
  S(PRE1, "ちょっと ちょっと 間違えたから (Chotto chotto machigaeta kara)"),
  // [Chorus]
  S(CH1, "ああ 時に 時に つまずいたって (Aa toki ni toki ni tsumazuita tte)"),
  S(CH1, "寒い寒い寒い寒い寒い (Samui samui samui samui samui)"),
  S(CH1, "寒い寒い寒い寒い寒い (Samui samui samui samui samui)"),
  S(CH1, "寒い寒い寒い寒い いい 寄らないで (Samui samui samui samui ii yoranaide)"),
  S(CH1, "ああ 君の 君の 君の 声が (Aa kimi no kimi no kimi no koe ga)"),
  S(CH1, "遠い遠い遠い遠い遠い (Tooi tooi tooi tooi tooi)"),
  S(CH1, "遠い遠い遠い遠い遠い (Tooi tooi tooi tooi tooi)"),
  S(CH1, "遠い遠い遠い遠い 傷つけないで (Tooi tooi tooi tooi kizutsuke naide)"),
  // [Post-Chorus]
  S(POST1, "何番目でも 何番目でも (Nanbanme demo nanbanme demo)"),
  S(POST1, "僕が僕であるために (Boku ga boku de aru tame ni)"),
  // [Verse 2]
  S(V2, "ちぎり集め持ってきた ちぎり集め持ってきた (Chigiri atsume mottekita chigiri atsume motte kita)"),
  S(V2, "あの日の間違いを 飲み込むのが 苦しくて (Ano hi no machigai wo nomikomu no ga kuru shikute)"),
  S(V2, "朽ちるまでの愛憎を 朽ちるまでの愛憎を (Kuchiru made no aizou wo kuchiru made no aizou wo)"),
  S(V2, "飲み込む君 簡単に 微笑む君 どうして (Nomikomu kimi kantan ni hohoemu kimi dou shite)"),
  // [Pre-Chorus]
  S(PRE2, "子供騙しの花 二つ (Kodomo damashi no hana futatsu)"),
  S(PRE2, "きっと きっと 諦めたから (Kitto kitto akirameta kara)"),
  // [Chorus]
  S(CH2, "ああ 遠い夢を 追いかけてさ (Aa tooi yume wo oikakete sa)"),
  S(CH2, "早い早い早い早い早い (Hayai hayai hayai hayai hayai)"),
  S(CH2, "早い早い早い早い早い (Hayai hayai hayai hayai hayai)"),
  S(CH2, "早い早い早い早い 追いつけないよ (Hayai hayai hayai hayai oitsukenai yo)"),
  S(CH2, "すてきれず 残した 思いが (Sutekirezu nokoshita omoi ga)"),
  S(CH2, "憎い憎い憎い憎い憎い (Nikui nikui nikui nikui nikui)"),
  S(CH2, "憎い憎い憎い憎い憎い (Nikui nikui nikui nikui nikui)"),
  S(CH2, "憎い憎い憎い憎い 許されないの (Nikui nikui nikui nikui yurusare nai no)"),
  // [Outro]
  S(OUT1, "ああ 夢を 夢を 見てたはずが (Aa yume wo yume wo miteta hazu ga)"),
  S(OUT1, "怖い怖い怖い怖い怖い (Kowai kowai kowai kowai kowai)"),
  S(OUT1, "怖い怖い怖い怖い怖い (Kowai kowai kowai kowai kowai)"),
  S(OUT1, "怖い怖い怖い怖い 近づかないで (Kowai kowai kowai kowai chikazuka nai de)"),
  S(OUT2, "愛 言葉を 繰り返すだけ (Ai kotoba o kuri kaesu dake)"),
  S(OUT2, "寒い寒い寒い寒い寒い (Samui samui samui samui samui)"),
  S(OUT2, "寒い寒い寒い寒い寒い (Samui samui samui samui samui)"),
  S(OUT2, "寒い寒い寒い寒い お願いだから (Samui samui samui samui onegai dakara)"),
  S(OUT3, "何番目でも 何番目でも (Nanbanme demo nanbanme demo)"),
  S(OUT3, "僕が僕であるために (Boku ga boku de aru tame ni)"),
];

if (typeof module !== 'undefined') module.exports = { LY };
