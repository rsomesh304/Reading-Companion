import { useEffect, useState } from "react";

const LINES_KEY = "reading_companion_mascot_recent";
const REMEMBER = 40;

const GENERIC = [
  "Mujhe bachcha mat samajhna. Mere paas common sense hai, aur aapke streak ka poora hisaab.",
  "Maine dekha, aapne kal bhi nahi padha. Main kisi ko batane wala nahi... abhi.",
  "Main chhota hoon, par pata hai ki book ke bina dimaag bhi dhool khaata hai.",
  "Phone scroll karne se vocabulary nahi badhti. Paanch minute padh ke dekho.",
  "Aaj ka goal: ek naya word, ek gem. Chhota target, pakka result.",
  "Netflix ka 'next episode' tumse jaldi decide karta hai. Book ko bhi ek chance do.",
  "Mushkil word mile toh ghabrao mat. Bas bolo, 'iska matlab?'",
  "Chai thandi ho gayi? Chapter khatam hone tak garam rakhna.",
  "Reels 90 second ki, chapter 10 minute ka. Sauda sasta hai.",
  "Camera book par rakho, phir dekho main kitna smart hoon.",
  "Kal padhne ka plan? Kal bhi yahi bologe. Aaj hi shuru karo.",
  "Padhna gym jaisa hai: pehla din mushkil, phir aadat.",
  "Roz 5 words matlab mahine mein 150. Maths simple hai.",
  "Bookmark lagane se padhai nahi hoti, page palatne se hoti hai.",
  "Chapter khatam ho toh 'chapter close karo' bolna mat bhoolna.",
  "Kuch yaad rakhwana hai? Session mein bas bolo, 'yaad rakhna'.",
  "Word ka matlab context se pakdo, sirf dictionary se nahi.",
  "Achhi line dikhe toh bolo 'save this quote'. Gems tumhara khazana hai.",
  "Ek page padhna bhi padhna hi hota hai. Zero se toh behtar.",
  "Instagram par 200 reels dekhi, ek page bhi padh lo. Barabari ho jayegi.",
  "Achha reader woh jo mushkil word ko ignore nahi karta, pooch leta hai.",
  "Bol ke padho, yaad zyada rehta hai. Main sunne ke liye hi hoon.",
  "Ek chapter, ek chai, ek gem. Aaj ka combo ready hai.",
  "Kitaab ka kona mod ke rakhne se yaad nahi rehta. Gem save karo.",
  "Chhote steps bhi race jeetate hain. Aaj sirf do page.",
  "Jo word aaj samajh aaya, kal dost par rob jamane ke kaam aayega.",
  "Bhaari English se dar nahi lagta, bas pehla word pooch lo.",
  "Notification se pehle ek page. Notifications wait kar lenge.",
  "Kitaab wifi nahi maangti, battery nahi khaati. Kitni shareef hai.",
  "Padhne ka mood nahi? Mood ka intezaar mat karo, page kholo.",
  "Streak ek habit hai, sazaa nahi. Bas roz thoda.",
  "Naye word ko teen jagah use karo, phir woh tumhara ho jaata hai.",
  "Camera se page dikhao, main line dhoondh lunga. Ankhein bachao apni.",  
];
const TIME = {
  night: ["Itni raat ko padh rahe ho? Salute, par neend bhi ek achhi habit hai.", "Raat ke teen baje kitaab? Ya toh topper ho ya neend naraaz hai.", "Raat ki padhai mein dimaag shaant rehta hai. Bas aankh mat band karna."],
  morning: ["Subah ka dimaag sabse tez hota hai. Ek chapter abhi nipta do.", "Subah subah kitaab? Aaj ka din already jeet gaye.", "Chai aur ek page. Subah ki best shuruaat."],
  afternoon: ["Dopahar ki sustee bhagao. Do page padho, chai ka bahana milega.", "Lunch ke baad neend aayegi. Kitaab usse bhi zyada shaant karti hai.", "Break mein reels ya ek page? Aaj page chuno."],
  evening: ["Shaam ka time padhai ke liye best hai. Phone side mein rakho.", "Shaam ki chai aur ek chapter. Isse achha combo nahi.", "Din bhar ki thakaan ke baad ek page. Dimaag halka hoga."],
  late: ["Sone se pehle ek chhota chapter. Neend achhi aayegi.", "Screen band karne se pehle ek gem save kar lo.", "Raat ko padha hua dimaag raat bhar dohrata hai. Free revision hai."],
};
const BY_CONTEXT = {
  noBooks: ["Shelf khaali hai. Pehli kitaab jodo, main yahin hoon.", "Bina kitaab ke main bhi bore ho raha hoon. Add book dabao.", "Ek book add karo, baaki main sambhal lunga.", "Khaali shelf par sirf dhool jamti hai. Ek kitaab rakh do.", "Pehli kitaab sabse mushkil hoti hai. Phir aadat lag jaati hai.", "Kitaab ka naam likhna bhi shuruaat hai. Add book dabao.", "Library khaali aur main free. Dono ka ilaaj ek kitaab hai.", "Purani padhne wali kitaab yaad hai? Wahi add kar do."],
  noGems: ["Gems khaali hain. Session mein bolo, 'save this quote'.", "Koi achhi line mile toh pakad lena, yahan sajayenge.", "Abhi ek bhi gem nahi. Pehli line ka intezaar hai.", "Gem sirf woh jo dil ko lage. Tab tak main yahin baitha hoon.", "Line ko sirf highlight mat karo, gem banao. Saath mein use karne ka tareeka bhi milega.", "Khazana khaali hai. Padhte raho, kuch na kuch chamakega.", "Ek gem ban jaaye toh yahan card jaisa dikhega. Bas bol dena."],
  noMemory: ["Kuch yaad rakhwana ho toh session mein bolo, 'yaad rakhna'.", "Memory khaali hai. Apni pasand bata do, main yaad rakhunga.", "Yahan sirf wahi aata hai jo tum kehte ho. Main chupke se note nahi karta.", "Kaise bolna hai: 'yaad rakhna, mujhe short explanations pasand hain'.", "Meri yaaddaasht tumhare kehne par chalti hai. Bolo, kya likhun?", "Khaali memory, saaf slate. Jo chahiye woh bata do."],
  newBook: ["Naya chapter, nayi kahani. Title likho aur shuru karo.", "Kitaab ka naam likho, baaki main sambhal lunga.", "Achhi kitaab, achha safar. Chalo shuru karein.", "Sahi title likhna, warna author bhi confuse ho jayega.", "Pehle title, phir author, phir chapters. Main sab poochh lunga.", "Nayi kitaab? Ab toh streak bhi khush hogi."],
};

function getRecent() { try { return JSON.parse(localStorage.getItem(LINES_KEY) || "[]"); } catch { return []; } }
function rememberLine(line) {
  try { localStorage.setItem(LINES_KEY, JSON.stringify([...getRecent(), line].slice(-REMEMBER))); } catch { /* ignore */ }
}
function timeLines() {
  const h = new Date().getHours();
  return h < 5 ? TIME.night : h < 12 ? TIME.morning : h < 17 ? TIME.afternoon : h < 21 ? TIME.evening : TIME.late;
}
function dataLines(f) {
  const out = [];
  if (f.streak >= 90) out.push("Ninety din poore! Ab mujhe tap karo, main bolunga.");
  else out.push(`Bolne ke liye 90 din ki streak chahiye. ${f.streak} ho gaye, ${90 - f.streak} baaki.`, `Main 90 din baad bolna seekhunga. Abhi ${90 - f.streak} din aur.`);
  if (f.streak >= 7) out.push(`${f.streak} din ki streak? Kitaabein ab tumhe fan mail bhejti hongi.`);
  else if (f.streak >= 3) out.push(`${f.streak} din ki streak. Aaj ka page padh liya toh streak safe.`, `${f.streak} din se lagatar. Sat din poore karo, phir party.`);
  else if (f.streak > 0) out.push("Streak abhi nayi hai, jaise nayi diet. Aaj bhi nibhao.");
  else out.push("Streak zero hai. Aaj se ginti shuru karte hain.", "Streak ka flame bujha hua hai. Ek page se dobara jalta hai.");
  if (f.words >= 50) out.push(`${f.words} words seekh chuke ho. Dictionary ab tumse ghabrati hai.`);
  else if (f.words > 0) out.push(`${f.words} words ho gaye. Chhoti shuruaat, badi kahani.`, `${f.words} words seekhe. Ek aur seekho toh ginti badhe.`);
  else out.push("Abhi tak zero words. Pehla word aaj pakdo, baaki khud aayenge.");
  if (f.weekWords > 0) out.push(`Is hafte ${f.weekWords} naye words. Aise hi chalte raho.`);
  else out.push("Is hafte koi naya word nahi. Chart ke khaali bars udaas hain.", "Weekly chart khaali hai. Ek word bhi usse khush kar dega.");
  if (f.gems === 0) out.push("Gems khaali hain. Ek achhi line save karke bharo.");
  else out.push(`${f.gems} gems jama ho gaye. Khazana ban raha hai.`, `${f.gems} gems hain. Kabhi unhe dobara padh ke dekho, achha lagega.`);
  if (f.books > 1) out.push(`${f.books} kitabein shelf par hain. Ek toh aaj khatam karo.`, `${f.books} kitabein aur ek tum. Baari-baari se nipta do.`);
  return out;
}

export function makeLocalLine(f = {}, context = "") {
  const c = String(context).toLowerCase();
  let pool;
  if (c.includes("no books") || c.includes("library is empty")) pool = BY_CONTEXT.noBooks;
  else if (c.includes("no gems")) pool = BY_CONTEXT.noGems;
  else if (c.includes("no memories")) pool = BY_CONTEXT.noMemory;
  else if (c.includes("new book")) pool = BY_CONTEXT.newBook;
  else pool = [...GENERIC, ...dataLines(f), ...dataLines(f), ...timeLines(), ...timeLines()];
  const recent = getRecent();
  const fresh = pool.filter((l) => !recent.includes(l));
  const list = fresh.length ? fresh : pool;
  const line = list[Math.floor(Math.random() * list.length)];
  rememberLine(line);
  return line;
}

// Used by the Home screen: a line that rotates every few seconds. No network.
export function useMascotLine(facts, holdMs = 9000) {
  const key = JSON.stringify(facts || {});
  const [line, setLine] = useState(() => makeLocalLine(facts || {}));
  useEffect(() => {
    const id = setInterval(() => setLine(makeLocalLine(JSON.parse(key))), holdMs);
    return () => clearInterval(id);
  }, [key, holdMs]);
  return { line, next: () => setLine(makeLocalLine(JSON.parse(key))) };
}