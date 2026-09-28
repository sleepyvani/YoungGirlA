// Line-level lyrics with approximate windows (song seconds), as supplied.
// Japanese text, then the romaji in parentheses. The word segmentation used for karaoke lives in
// analysis/words.py; data/lyrics.json holds the aligned word timings.
const LY = [
  [22.0, 29.0, "僕の命の価値だって 誰の命の価値だって 時々さ 不公平に 裁かれるもんなんでしょう (Boku no inochi no kachi datte dare no inochi no kachi datte tokidoki sa fukouhei ni sabakareru mon nan deshou)"],
  [29.0, 34.0, "古くさい空にやってきた 理屈を連れてやってきた 時々さ 天秤に頼り切りと化しよう (Furukusai sora ni yattekita rikutsu wo tsurete yattekita tokidoki sa tenbin ni tayorikiri to kashiyou)"],
  [34.0, 43.0, "口までの愛 口までの愛 飲み込む気に簡単に (Kuchi made no ai kuchi made no ai nomikomu ki ni kantan ni)"],
  [43.0, 51.0, "落として言葉を書く 曖昧に言葉を書く 曖昧に伝わりきらないから 君だけを信じてさ (Otoshite kotoba wo kaku aimai ni kotoba wo kaku aimai ni tsutawari kiranai kara kimi dake wo shinjite sa)"],
  [51.0, 72.0, "連れてきた夢の粒を ちょっと間違えながら パラパッパッパラパ 明日に架けるのさ (Tsuretekita yume no tsubu wo chotto machigaenagara parappapparapa asu ni kakeru no sa)"],
  [72.0, 84.0, "足りないね 軽い軽い軽い軽い軽い軽い (Tarinai ne karui karui karui karui karui karui)"],
  [84.0, 102.0, "細胞の奥の声が 追いつけないけどね でもねでもね 僕が僕であるために (Saibou no oku no koe ga oitsukenai kedo ne demo ne demo ne boku ga boku de aru tame ni)"],
  [102.0, 109.0, "ちぎれ集め持ってきた ちぎれ集め持ってきた あの日の間違いを 飲み込むのが苦しくて (Chigire atsume mottekita chigire atsume mottekita ano hi no machi gai wo nomikomu no ga kurushikute)"],
  [109.0, 117.0, "口までの愛 口までの愛 飲み込む気に簡単に 言葉の向きに変として (Kuchi made no ai kuchi made no ai nomikomu ki ni kantan ni kotoba no muki ni hen to shite)"],
  [117.0, 142.0, "心もなく響かせたから 愛を追いかけてた (Kokoro mo naku hibikase ta kara ai wo oikaketeta)"],
  [142.0, 156.0, "足りないね 早い早い早い早い早い 追いつけないよ 素っ気なく残した 思いが 憎い憎い憎い (Tarinai ne hayai hayai hayai hayai hayai oitsukenai yo sokkenaku nokoshita omoi ga nikui nikui nikui)"],
  [156.0, 173.0, "憎い憎い憎い憎い憎い 足りないの 明日も夢を見てたい 怖い怖い怖い怖い怖い (Nikui nikui nikui nikui nikui tarinai no asu mo yume wo mitetai kowai kowai kowai kowai kowai)"],
  [173.0, 188.0, "可愛い可愛い可愛い可愛い可愛い 可愛い可愛い可愛い 嘘来ないで 手に返すんだ (Kawaii kawaii kawaii kawaii kawaii kawaii kawaii kawaii uso konaide te ni kaesunda)"],
  [188.0, 200.0, "寒い寒い寒い寒い寒い寒い 寒い寒い寒い寒い寒い だからねでもねでもね 僕が僕であるために (Samui samui samui samui samui samui samui samui samui samui samui dakarane demo ne demo ne boku ga boku de aru tame ni)"]
];

if (typeof module !== 'undefined') module.exports = { LY };
