import { useMemo, useState } from "react";

type Lang = "en" | "zh" | "ja";
type Mode = "pairing" | "flavor";
type Food = "meat" | "seafood" | "fried" | "light";
type Flavor = "crisp" | "fruity" | "rich" | "sparkling";
type Temp = "chilled" | "warm" | "any";
type Serve = "cold" | "room" | "hot"; // 注文画面での飲み方（未選択 = おまかせ）

const SERVE: Record<Serve, { ja: string; en: string; btn: string; need: Temp | null }> = {
  cold: { ja: "冷や（冷酒）", en: "chilled", btn: "冷酒 Cold", need: "chilled" },
  room: { ja: "常温", en: "at room temperature", btn: "常温 Room", need: null },
  hot: { ja: "熱燗", en: "hot (atsukan)", btn: "熱燗 Hot", need: "warm" },
};
const fromTemp = (t: Temp | null): Serve | null => (t === "chilled" ? "cold" : t === "warm" ? "hot" : null);

interface Sake {
  id: string;
  name_ja: string;
  name_en: string;
  brewery: string;
  flavor: Flavor;
  chart: { dry: number; aroma: number; body: number }; // 0-100
  chart_label: { sweet_dry: string; body: string; aroma: string };
  chart_label_ja: { sweet_dry: string; body: string; aroma: string };
  wine: string; // 洋酒の例え（EN / 繁中モード用）
  description_en: string;
  description_ja: string; // 日本語モード用の一言解説
  foods: Food[];
  temps: Temp[];
  is_available: boolean; // 在庫なし・提供終了なら false → 推薦から除外
  is_push?: boolean; // 店側のプッシュ銘柄 → 推薦で優先
  trivia_ja?: string;
  trivia_en?: string;
}

// ⚠ 公開前に各銘柄の正式名称・スペックを蔵元の公式情報で要確認
const SAKES: Sake[] = [
  {
    id: "harushika-dry",
    name_ja: "春鹿 純米 超辛口",
    name_en: "Harushika Junmai Extra Dry",
    brewery: "今西清兵衛商店（奈良）",
    flavor: "crisp",
    chart: { dry: 92, aroma: 30, body: 25 },
    chart_label: { sweet_dry: "Very Dry (+12)", body: "Light", aroma: "Clean" },
    chart_label_ja: { sweet_dry: "超辛口（+12）", body: "軽快", aroma: "すっきり" },
    wine: "Crisp, dry white wine like Sauvignon Blanc or Pinot Grigio",
    description_en: "Clean and sharp. Cuts through oily food like a squeeze of lemon.",
    description_ja: "すっきりキレのある超辛口。魚や揚げ物の脂をさっぱり流してくれます",
    foods: ["seafood", "light", "fried"],
    temps: ["chilled", "any"],
    is_available: true,
    trivia_ja: "名前の由来は、春日大社の神様の使いとされる鹿。「春日の神様が鹿に乗ってやってきた」という伝説から生まれました。蔵があるのは「日本清酒発祥の地」といわれる奈良です。",
    trivia_en: "Named after the sacred deer of Kasuga Taisha shrine, from a legend that the gods arrived riding a deer. The brewery has stood in Nara, known as the birthplace of Japanese sake, since 1884.",
  },
  {
    id: "kazenomori",
    name_ja: "風の森 秋津穂657 純米",
    name_en: "Kazenomori Akitsuho 657 Junmai",
    brewery: "油長酒造（奈良・御所）",
    flavor: "sparkling",
    chart: { dry: 45, aroma: 70, body: 50 },
    chart_label: { sweet_dry: "Balanced, lively", body: "Medium", aroma: "Fresh & fruity" },
    chart_label_ja: { sweet_dry: "バランス型・活発", body: "中程度", aroma: "フレッシュ＆フルーティ" },
    wine: "Lively, slightly fizzy white like Prosecco or a young Vinho Verde",
    description_en: "Fresh and playful with a light fizz. Great as a first drink.",
    description_ja: "シュワッと爽やかな微発泡感。スパークリングワインが好きな方に",
    foods: ["fried", "seafood", "light"],
    temps: ["chilled"],
    is_available: true,
    trivia_ja: "名前は蔵の近くにある「風の森峠」から。搾ったままの味わいにこだわる無濾過・無加水・生酒で、発酵で生まれた炭酸ガスがシュワッとした微発泡感になります。",
    trivia_en: "Named after Kazenomori Pass, a breezy mountain pass near the brewery. It is bottled just as pressed - unfiltered and unpasteurized - so natural CO₂ from fermentation gives it a gentle fizz.",
  },
  {
    id: "mimurosugi-ginjo",
    name_ja: "みむろ杉 純米吟醸",
    name_en: "Mimurosugi Junmai Ginjo",
    brewery: "今西酒造（奈良・三輪）",
    flavor: "fruity",
    chart: { dry: 40, aroma: 88, body: 45 },
    chart_label: { sweet_dry: "Softly Sweet", body: "Medium-Light", aroma: "Fruity & Floral" },
    chart_label_ja: { sweet_dry: "やや甘口", body: "やや軽め", aroma: "フルーティ＆華やか" },
    wine: "Aromatic white wine like Riesling or Viognier",
    description_en: "Floral, fruity and easy to love. Perfect if you're new to sake.",
    description_ja: "白ワインのように華やかでフルーティー。日本酒が初めてでも飲みやすい一本",
    foods: ["light", "seafood", "meat"],
    temps: ["chilled", "any"],
    is_available: true,
    is_push: true,
    trivia_ja: "「酒造りの神様」をまつる大神神社（日本最古の神社のひとつ）のすぐ近く。神の山・三輪山の伏流水で仕込まれる、神聖な地酒です。",
    trivia_en: "Brewed with groundwater from sacred Mt. Miwa, right beside Omiwa Shrine - one of Japan's oldest shrines, dedicated to the god of sake brewing.",
  },
  {
    id: "hanatomoe",
    name_ja: "花巴 山廃純米",
    name_en: "Hanatomoe Yamahai Junmai",
    brewery: "美吉野醸造（奈良・吉野）",
    flavor: "rich",
    chart: { dry: 60, aroma: 45, body: 85 },
    chart_label: { sweet_dry: "Dry with tangy depth", body: "Full", aroma: "Savory & earthy" },
    chart_label_ja: { sweet_dry: "辛口でコクのある酸味", body: "しっかり", aroma: "旨み・香ばしさ" },
    wine: "Rich, structured wine like an oaked Chardonnay or a light Pinot Noir",
    description_en: "Deep, savory and a little tangy. Opens up when served warm.",
    description_ja: "コクと旨みのしっかり系。ほどよい酸味があり、燗にすると味がふくらみます",
    foods: ["meat", "fried"],
    temps: ["warm", "any"],
    is_available: true,
    trivia_ja: "桜の名所・吉野で造られるお酒。昔ながらの「山廃」や、さらに古い製法とされる「水もと」にも取り組み、ほどよい酸味とコクが個性です。温めると旨みが広がります。",
    trivia_en: "Made in Yoshino, Nara - Japan's famous cherry blossom mountain. The brewery works with old-style yamahai and 'mizumoto' methods, giving a tangy, savory depth that opens up when served warm.",
  },
];

const T = {
  en: {
    sub: "Find your sake in a few taps",
    tabPair: "🍽 Match my food", tabFlavor: "👅 Pick a taste",
    hintPair: "Choose what you're eating", hintFlavor: "Choose the taste you like",
    food: { meat: "Meat", seafood: "Seafood", fried: "Fried food", light: "Light snacks" },
    flavor: { crisp: "Crisp & Dry", fruity: "Fruity & Aromatic", rich: "Rich & Deep", sparkling: "Sparkling" },
    temp: { chilled: "Chilled", warm: "Warm", any: "Any" },
    tempQ: "How do you drink it? (optional)",
    best: "Best match", also: "Also try", pick: "★ Staff pick", today: "★ TODAY'S PICK", trivia: "Fun Fact", like: "Tastes like",
    dry: "Sweet ↔ Dry", aroma: "Aroma", body: "Body",
    order: "Order This Sake (show staff)", pleaseShow: "Show this screen to the staff",
  },
  zh: {
    sub: "幾步驟找到你的日本酒",
    tabPair: "🍽 配合料理", tabFlavor: "👅 選喜歡的口味",
    hintPair: "請選擇今天要吃的料理", hintFlavor: "請選擇喜歡的口感",
    food: { meat: "肉類", seafood: "海鮮", fried: "炸物", light: "輕食小點" },
    flavor: { crisp: "清爽辛口", fruity: "果香華麗", rich: "濃郁醇厚", sparkling: "氣泡感" },
    temp: { chilled: "冰涼", warm: "溫熱", any: "都可以" },
    tempQ: "想怎麼喝？（可略過）",
    best: "最推薦", also: "也推薦", pick: "★ 店家推薦", today: "★ 今日推薦", trivia: "小知識 Fun Fact", like: "口感近似",
    dry: "甜 ↔ 辛", aroma: "香氣", body: "酒體",
    order: "點這支酒（出示給店員）", pleaseShow: "請將此畫面出示給店員",
  },
  ja: {
    sub: "タップするだけで、あなたの一杯が見つかる",
    tabPair: "🍽 料理から探す", tabFlavor: "👅 好みから探す",
    hintPair: "今日食べる料理を選んでください", hintFlavor: "好きな口当たりを選んでください",
    food: { meat: "肉料理", seafood: "魚介", fried: "揚げ物", light: "軽いおつまみ" },
    flavor: { crisp: "キレのある辛口", fruity: "フルーティ＆華やか", rich: "濃醇・コク", sparkling: "微発泡" },
    temp: { chilled: "冷やして", warm: "燗で", any: "おまかせ" },
    tempQ: "飲み方（お好みで）",
    best: "いちばんのおすすめ", also: "こちらもおすすめ", pick: "★ お店のイチオシ", today: "★ 本日のおすすめ", trivia: "豆知識（Fun Fact）", like: "味わい",
    dry: "甘口 ↔ 辛口", aroma: "香り", body: "ボディ",
    order: "この酒を注文する（店員に見せる）", pleaseShow: "この画面を店員さんに見せてください",
  },
} as const;

/** 1つ選ぶだけで結果を返す。取扱中のみ対象、「おすすめ」は常に最上位、上位2本 */
function recommend(list: Sake[], mode: Mode, food: Food | null, flavor: Flavor | null, temp: Temp | null): Sake[] | null {
  const picked = mode === "pairing" ? food : flavor;
  if (!picked) return null;
  const score = (s: Sake) =>
    (mode === "flavor" && s.flavor === flavor ? 6 : 0) +
    (mode === "pairing" && food && s.foods.includes(food) ? 6 - s.foods.indexOf(food) : 0) +
    (temp && temp !== "any" && s.temps.includes(temp) ? 2 : 0) -
    (temp && temp !== "any" && !s.temps.includes(temp) ? 1 : 0);
  return list
    .filter((s) => s.is_available)
    .sort((a, b) => Number(!!b.is_push) - Number(!!a.is_push) || score(b) - score(a))
    .slice(0, 2);
}

function Chips<K extends string>({ value, options, labels, onChange, cols = 2 }: {
  value: K | null; options: K[]; labels: Record<K, string>; onChange: (v: K) => void; cols?: number;
}) {
  return (
    <div className={`grid gap-2 ${cols === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={`rounded-xl border-2 px-3 py-3 text-sm font-semibold transition ${
            value === o ? "border-rose-600 bg-rose-600 text-white" : "border-stone-200 bg-white text-stone-800 active:bg-stone-100"
          }`}
        >
          {labels[o]}
        </button>
      ))}
    </div>
  );
}

function Bar({ label, value, note }: { label: string; value: number; note: string }) {
  return (
    <div className="mb-3">
      <div className="mb-1 flex justify-between text-xs text-stone-600">
        <span>{label}</span><span className="font-semibold">{note}</span>
      </div>
      <div className="h-2.5 rounded-full bg-stone-200">
        <div className="h-2.5 rounded-full bg-rose-600" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function SakeCard({ sake, lang, primary, onOrder }: { sake: Sake; lang: Lang; primary: boolean; onOrder: () => void }) {
  const t = T[lang];
  const label = lang === "ja" ? sake.chart_label_ja : sake.chart_label;
  return (
    <article className={`rounded-2xl bg-white p-4 shadow-sm ${sake.is_push ? "ring-2 ring-amber-400" : primary ? "ring-2 ring-rose-600" : ""}`}>
      {sake.is_push ? (
        <p className="-mx-4 -mt-4 mb-3 rounded-t-2xl bg-amber-400 px-4 py-2 text-sm font-black tracking-wide text-stone-900">{t.today}</p>
      ) : (
        <p className={`text-xs font-bold uppercase tracking-widest ${primary ? "text-rose-600" : "text-stone-400"}`}>
          {primary ? t.best : t.also}
        </p>
      )}
      <h2 className="mt-1 text-xl font-black leading-tight">{lang === "ja" ? sake.name_ja : sake.name_en}</h2>
      <p className="text-base font-bold text-stone-700">{lang === "ja" ? sake.name_en : sake.name_ja}</p>
      <p className="mb-3 text-xs text-stone-500">{sake.brewery}</p>

      <div className="mb-3 rounded-xl bg-stone-50 p-3">
        <p className="text-xs font-bold text-stone-500">{t.like}</p>
        {lang === "ja" ? (
          <p className="font-semibold">{sake.description_ja}</p>
        ) : (
          <>
            {sake.wine && <p className="font-semibold">“{sake.wine}”</p>}
            <p className="mt-1 text-sm text-stone-600">{sake.description_en}</p>
          </>
        )}
      </div>

      {(lang === "ja" ? sake.trivia_ja : sake.trivia_en) && (
        <div className="mb-3 rounded-xl bg-amber-50 p-3 text-sm text-stone-700">
          <p className="mb-1 text-xs font-bold text-amber-700">💡 {t.trivia}</p>
          {lang === "ja" ? sake.trivia_ja : sake.trivia_en}
        </div>
      )}

      <Bar label={t.dry} value={sake.chart.dry} note={label.sweet_dry} />
      <Bar label={t.aroma} value={sake.chart.aroma} note={label.aroma} />
      <Bar label={t.body} value={sake.chart.body} note={label.body} />

      <button onClick={onOrder} className="mt-1 w-full rounded-2xl bg-stone-900 py-3.5 text-base font-black text-white shadow">
        {t.order}
      </button>
    </article>
  );
}

const ADMIN_PIN = "0000"; // 店舗ごとに変更。※クライアント側のみの簡易ロック（セキュリティ用途ではない）
const STORE_KEY = "sakematch:config:v1";
const MAX_PUSH = 1; // 「★おすすめ」の同時選択上限（1〜2を想定）。超えると古い方が自動で外れる
type Config = Record<string, { is_available: boolean; is_push: boolean; push_at?: number }>;

function loadConfig(): Config {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
  } catch {
    return {};
  }
}

const CUSTOM_KEY = "sakematch:custom:v1";
function loadCustom(): Sake[] {
  try {
    return JSON.parse(localStorage.getItem(CUSTOM_KEY) || "[]");
  } catch {
    return [];
  }
}

// 簡易追加時の初期値（味わいタイプから自動設定。詳細は将来の編集画面で）
const DEFAULTS: Record<Flavor, { chart: Sake["chart"]; ja: string; en: string }> = {
  crisp: { chart: { dry: 85, aroma: 30, body: 30 }, ja: "すっきりキレのある味わい", en: "Crisp and clean." },
  fruity: { chart: { dry: 40, aroma: 85, body: 45 }, ja: "華やかでフルーティーな香り", en: "Fruity and aromatic." },
  rich: { chart: { dry: 55, aroma: 45, body: 85 }, ja: "コクと旨みのしっかりした味わい", en: "Rich and deep." },
  sparkling: { chart: { dry: 45, aroma: 70, body: 50 }, ja: "シュワッと爽やかな微発泡", en: "Light and sparkling." },
};
const EMPTY_FORM = { name_ja: "", name_en: "", brewery: "", flavor: "crisp" as Flavor, foods: [] as Food[] };

function Switch({ on, onChange, label }: { on: boolean; onChange: () => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onChange}
      className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${on ? "bg-emerald-500" : "bg-stone-300"}`}
    >
      <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${on ? "left-7" : "left-1"}`} />
    </button>
  );
}

export default function SakeMatch() {
  const [lang, setLang] = useState<Lang>("en");
  const [mode, setMode] = useState<Mode>("pairing");
  const [food, setFood] = useState<Food | null>(null);
  const [flavor, setFlavor] = useState<Flavor | null>(null);
  const [temp, setTemp] = useState<Temp | null>(null);
  const [ordering, setOrdering] = useState<Sake | null>(null);
  const [serve, setServe] = useState<Serve | null>(null);
  const [config, setConfig] = useState<Config>(loadConfig);
  const [custom, setCustom] = useState<Sake[]>(loadCustom);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [adminOpen, setAdminOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const t = T[lang];

  // マスターデータに店舗側の設定（取扱中・おすすめ）を上書き
  const list = useMemo(
    () => [...SAKES, ...custom].map((s) => ({ ...s, ...(config[s.id] ?? {}) })),
    [config, custom]
  );
  const results = useMemo(() => recommend(list, mode, food, flavor, temp), [list, mode, food, flavor, temp]);

  const commit = (next: Config) => {
    setConfig(next);
    try { localStorage.setItem(STORE_KEY, JSON.stringify(next)); } catch { /* 保存不可の環境では画面内のみ反映 */ }
  };
  const mk = (x: Sake, patch: Partial<Config[string]> = {}): Config[string] => ({
    is_available: x.is_available,
    is_push: !!x.is_push,
    push_at: config[x.id]?.push_at ?? 0,
    ...patch,
  });
  const update = (id: string, patch: Partial<Config[string]>) =>
    commit({ ...config, [id]: mk(list.find((x) => x.id === id)!, patch) });

  // ★おすすめ：上限を超える場合は、ONにした時期が古いものから自動でOFF
  const togglePush = (id: string) => {
    const target = list.find((x) => x.id === id)!;
    if (target.is_push) return update(id, { is_push: false });
    const pushed = list
      .filter((x) => x.is_available && x.is_push)
      .sort((p, q) => (config[p.id]?.push_at ?? 0) - (config[q.id]?.push_at ?? 0));
    const next: Config = { ...config };
    pushed.slice(0, Math.max(0, pushed.length - (MAX_PUSH - 1))).forEach((x) => { next[x.id] = mk(x, { is_push: false }); });
    next[id] = mk(target, { is_push: true, push_at: Date.now() });
    commit(next);
  };
  const allAvailable = () => commit(Object.fromEntries(list.map((x) => [x.id, mk(x, { is_available: true })])));
  const clearPush = () => commit(Object.fromEntries(list.map((x) => [x.id, mk(x, { is_push: false })])));
  const saveCustom = (next: Sake[]) => {
    setCustom(next);
    try { localStorage.setItem(CUSTOM_KEY, JSON.stringify(next)); } catch { /* 保存不可の環境では画面内のみ */ }
  };
  const addSake = () => {
    if (!form.name_ja.trim()) return;
    const d = DEFAULTS[form.flavor];
    const dash = { sweet_dry: "-", body: "-", aroma: "-" };
    saveCustom([
      ...custom,
      {
        id: `custom-${Date.now()}`,
        name_ja: form.name_ja.trim(),
        name_en: form.name_en.trim() || form.name_ja.trim(),
        brewery: form.brewery.trim(),
        flavor: form.flavor,
        chart: d.chart,
        chart_label: dash,
        chart_label_ja: dash,
        wine: "",
        description_en: d.en,
        description_ja: d.ja,
        foods: form.foods.length ? form.foods : ["meat", "seafood", "fried", "light"],
        temps: ["chilled", "any"],
        is_available: true,
      },
    ]);
    setForm(EMPTY_FORM);
    setAdding(false);
  };
  const removeCustom = (id: string) => {
    if (window.confirm("この銘柄を削除しますか？")) saveCustom(custom.filter((c) => c.id !== id));
  };
  const closeAdmin = () => { setAdminOpen(false); setUnlocked(false); setPin(""); setAdding(false); };

  return (
    <div className="mx-auto min-h-screen max-w-md bg-stone-50 px-4 pb-10 pt-3 text-stone-900">
      <header className="mb-4 flex items-start justify-between">
        <div className="pt-4">
          <h1 className="text-2xl font-black tracking-tight">SAKE<span className="text-rose-600">MATCH</span></h1>
          <p className="text-xs text-stone-500">{t.sub}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <button onClick={() => setAdminOpen(true)} className="rounded-md px-2 py-0.5 text-[11px] font-semibold text-stone-400 ring-1 ring-stone-300">
            管理
          </button>
          <div className="flex overflow-hidden rounded-lg border border-stone-300 text-xs font-bold">
            {(["en", "zh", "ja"] as Lang[]).map((l) => (
              <button key={l} onClick={() => setLang(l)} className={`px-2.5 py-1.5 ${lang === l ? "bg-stone-900 text-white" : "bg-white"}`}>
                {l === "en" ? "EN" : l === "zh" ? "繁中" : "JA"}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div role="tablist" className="mb-4 grid grid-cols-2 rounded-xl bg-stone-200 p-1 text-sm font-bold">
        {(["pairing", "flavor"] as Mode[]).map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={`rounded-lg py-2.5 ${mode === m ? "bg-white shadow text-rose-600" : "text-stone-600"}`}
          >
            {m === "pairing" ? t.tabPair : t.tabFlavor}
          </button>
        ))}
      </div>

      <section className="mb-4">
        <h2 className="mb-2 font-bold">{mode === "pairing" ? t.hintPair : t.hintFlavor}</h2>
        {mode === "pairing" ? (
          <Chips value={food} options={["meat", "seafood", "fried", "light"]} labels={t.food} onChange={setFood} />
        ) : (
          <Chips value={flavor} options={["crisp", "fruity", "rich", "sparkling"]} labels={t.flavor} onChange={setFlavor} />
        )}
      </section>

      <section className="mb-5">
        <h3 className="mb-2 text-sm font-semibold text-stone-600">{t.tempQ}</h3>
        <Chips value={temp} options={["chilled", "warm", "any"]} labels={t.temp} onChange={setTemp} cols={3} />
      </section>

      {results && (
        <div className="space-y-4">
          {results.map((s, i) => (
            <SakeCard key={s.id} sake={s} lang={lang} primary={i === 0} onOrder={() => openOrder(s)} />
          ))}
        </div>
      )}

      {/* 指差し注文モーダル */}
      {ordering && (() => {
        const sv = serve ? SERVE[serve] : null;
        const mismatch =
          sv?.need && !ordering.temps.includes(sv.need) && !ordering.temps.includes("any");
        const best = ordering.temps[0] === "chilled" ? ["冷酒", "chilled"] : ["燗", "warm"];
        return (
          <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 overflow-y-auto bg-white text-black">
            <button onClick={() => setOrdering(null)} aria-label="Close" className="fixed right-4 top-4 z-10 h-12 w-12 rounded-full bg-stone-100 text-3xl font-bold">
              ×
            </button>
            <div className="mx-auto flex min-h-full max-w-md flex-col items-center justify-center p-6 text-center">
              <p className="mb-4 text-xl font-bold">店員さんへ</p>
              <p className="text-4xl font-black leading-snug sm:text-5xl">
                【{ordering.name_ja}】
                <br />を{sv ? ` ${sv.ja}で` : ""}1杯ください
              </p>
              <p className="mt-5 text-sm text-stone-500">
                Please give me one glass of {ordering.name_en}
                {sv ? `, served ${sv.en}` : ""}.
              </p>

              {/* 飲み方切り替え（タップで文章も連動、もう一度押すと指定なし） */}
              <div className="mt-6 w-full">
                <p className="mb-2 text-xs font-bold text-stone-500">飲み方 / Serving</p>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(SERVE) as Serve[]).map((k) => (
                    <button
                      key={k}
                      onClick={() => setServe(serve === k ? null : k)}
                      aria-pressed={serve === k}
                      className={`rounded-xl border-2 py-3 text-sm font-black ${
                        serve === k ? "border-black bg-black text-white" : "border-stone-300 bg-white text-stone-800"
                      }`}
                    >
                      {SERVE[k].btn}
                    </button>
                  ))}
                </div>
                {mismatch && (
                  <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    ※この銘柄は{best[0]}向きです / Best served {best[1]}
                  </p>
                )}
              </div>

              {/* タブレット・モバイルオーダー利用時の案内（システム連携なし） */}
              <div className="mt-6 w-full rounded-2xl border-2 border-dashed border-stone-300 p-4 text-left">
                <p className="mb-2 text-sm font-black">📱 タブレット・スマホ注文をご利用の場合 / Ordering by tablet or phone?</p>
                <p className="text-sm leading-relaxed">
                  タブレットで注文する場合は、<b>ドリンク ＞ 日本酒</b> メニューから <b>【{ordering.name_ja}】</b> を探して注文してください。
                </p>
                <p className="mt-2 text-sm leading-relaxed text-stone-600">
                  If your table has a tablet or QR ordering, go to <b>Drinks &gt; Sake</b> and look for <b>【{ordering.name_ja}】</b>.
                </p>
              </div>

              <p className="mt-6 text-xs text-stone-400">{t.pleaseShow}</p>
            </div>
          </div>
        );
      })()}

      {/* 店舗用 管理パネル（PIN → 取扱・おすすめ・銘柄追加） */}
      {adminOpen && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
          <div className="flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-stone-50 sm:rounded-3xl">
            <div className="flex items-center justify-between border-b border-stone-200 bg-white px-5 py-3">
              <div>
                <h2 className="text-lg font-black">店舗設定</h2>
                {unlocked && (
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <p className="text-xs text-stone-500">
                      提供中 {list.filter((x) => x.is_available).length}/{list.length}　★おすすめ {list.filter((x) => x.is_available && x.is_push).length}/{MAX_PUSH}
                    </p>
                    <button onClick={allAvailable} className="rounded-full border border-stone-300 px-2 py-0.5 text-[11px] font-semibold text-stone-600 active:bg-stone-100">
                      すべて提供中
                    </button>
                    <button onClick={clearPush} className="rounded-full border border-stone-300 px-2 py-0.5 text-[11px] font-semibold text-stone-600 active:bg-stone-100">
                      おすすめ解除
                    </button>
                  </div>
                )}
              </div>
              <button onClick={closeAdmin} aria-label="閉じる" className="h-10 w-10 rounded-full bg-stone-100 text-2xl font-bold">×</button>
            </div>

            {!unlocked ? (
              <div className="p-5">
                <p className="mb-2 text-sm text-stone-600">暗証番号を入力してください</p>
                <input
                  type="password"
                  inputMode="numeric"
                  value={pin}
                  onChange={(e) => { setPin(e.target.value); if (e.target.value === ADMIN_PIN) setUnlocked(true); }}
                  className="w-full rounded-xl border-2 border-stone-200 bg-white px-3 py-3 text-center text-xl tracking-[0.5em]"
                  placeholder="••••"
                  autoFocus
                />
              </div>
            ) : (
              <>
                <div className="flex-1 space-y-3 overflow-y-auto p-4">
                  <ul className="space-y-3">
                    {list.map((x) => (
                      <li key={x.id} className={`rounded-2xl border bg-white p-3 ${x.is_available ? "border-stone-200" : "border-stone-200 opacity-70"}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate font-bold">{x.name_ja}</p>
                            <p className="truncate text-xs text-stone-500">{x.brewery || "蔵元未入力"}</p>
                          </div>
                          {x.id.startsWith("custom-") && (
                            <button onClick={() => removeCustom(x.id)} className="shrink-0 text-xs font-semibold text-rose-600 underline">削除</button>
                          )}
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-3">
                          <label className="flex items-center gap-2 text-sm font-bold">
                            <Switch
                              on={x.is_available}
                              label={`${x.name_ja} 取扱ステータス`}
                              onChange={() => update(x.id, { is_available: !x.is_available, ...(x.is_available ? { is_push: false } : {}) })}
                            />
                            <span className={x.is_available ? "text-emerald-700" : "text-stone-500"}>{x.is_available ? "提供中" : "売り切れ"}</span>
                          </label>
                          <button
                            disabled={!x.is_available}
                            aria-pressed={!!x.is_push}
                            onClick={() => togglePush(x.id)}
                            className={`shrink-0 whitespace-nowrap rounded-full border-2 px-2 py-1.5 text-xs font-black transition disabled:opacity-40 ${
                              x.is_push ? "border-amber-400 bg-amber-400 text-stone-900" : "border-stone-300 bg-white text-stone-500"
                            }`}
                          >
                            ★ おすすめ
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>

                  {/* 簡易追加フォーム（将来は編集・OCR登録へ拡張） */}
                  {!adding ? (
                    <button onClick={() => setAdding(true)} className="w-full rounded-2xl border-2 border-dashed border-stone-300 py-3 text-sm font-bold text-stone-600">
                      ＋ 新しい銘柄を追加
                    </button>
                  ) : (
                    <div className="space-y-3 rounded-2xl border-2 border-stone-300 bg-white p-4">
                      <p className="text-sm font-black">新しい銘柄</p>
                      {([
                        ["name_ja", "銘柄名（必須）", "例：花巴 山廃純米"],
                        ["name_en", "英語名（任意）", "Hanatomoe Yamahai Junmai"],
                        ["brewery", "蔵元", "例：美吉野醸造（奈良）"],
                      ] as const).map(([key, label, ph]) => (
                        <label key={key} className="block text-xs font-bold text-stone-600">
                          {label}
                          <input
                            value={form[key]}
                            onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                            placeholder={ph}
                            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-base font-normal text-stone-900"
                          />
                        </label>
                      ))}
                      <div>
                        <p className="mb-1 text-xs font-bold text-stone-600">味わいタイプ</p>
                        <Chips value={form.flavor} options={["crisp", "fruity", "rich", "sparkling"]} labels={T.ja.flavor} onChange={(v) => setForm({ ...form, flavor: v })} />
                      </div>
                      <div>
                        <p className="mb-1 text-xs font-bold text-stone-600">おすすめ料理（複数可・未選択は全て）</p>
                        <div className="grid grid-cols-2 gap-2">
                          {(["meat", "seafood", "fried", "light"] as Food[]).map((f) => {
                            const on = form.foods.includes(f);
                            return (
                              <button
                                key={f}
                                aria-pressed={on}
                                onClick={() => setForm({ ...form, foods: on ? form.foods.filter((x) => x !== f) : [...form.foods, f] })}
                                className={`rounded-xl border-2 px-3 py-2 text-sm font-semibold ${on ? "border-rose-600 bg-rose-600 text-white" : "border-stone-200 bg-white"}`}
                              >
                                {T.ja.food[f]}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => { setAdding(false); setForm(EMPTY_FORM); }} className="rounded-xl bg-stone-200 py-3 text-sm font-bold">キャンセル</button>
                        <button onClick={addSake} disabled={!form.name_ja.trim()} className="rounded-xl bg-stone-900 py-3 text-sm font-black text-white disabled:opacity-40">追加する</button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t border-stone-200 bg-white p-4">
                  <button onClick={closeAdmin} className="w-full rounded-2xl bg-rose-600 py-4 text-lg font-black text-white shadow">
                    完了（診断画面に戻る）
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
