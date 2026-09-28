var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_child_process = require("child_process");
var import_vite = require("vite");
var import_genai = require("@google/genai");

// src/utils/habitReportGenerator.ts
var REPORT_TONE_OPTIONS = [
  {
    id: "islami_hangat",
    label: "Penuh Doa & Sangat Hangat",
    badge: "\u{1F31F} Islami & Teduh",
    description: "Bahasa santun bernuansa doa tulus, apresiatif terhadap keteladanan ibadah keluarga di rumah.",
    icon: "Sparkles"
  },
  {
    id: "ceria_motivasi",
    label: "Ceria & Memotivasi",
    badge: "\u{1F60A} Positif & Ceria",
    description: "Gaya bahasa yang ceria, penuh energi positif, membakar semangat dan rasa percaya diri ananda.",
    icon: "Smile"
  },
  {
    id: "santun_solutif",
    label: "Santun & Kemitraan Keluarga",
    badge: "\u{1F91D} Santun & Solutif",
    description: "Menekankan sinergi harmonis antara guru dan orang tua dengan solusi praktis yang santun.",
    icon: "HeartHandshake"
  },
  {
    id: "ringkas_manis",
    label: "Ringkas, Hangat & Padat",
    badge: "\u26A1 Ringkas & Manis",
    description: "Poin-poin evaluasi yang padat, to the point, namun tetap ramah dan nyaman dibaca di layar HP.",
    icon: "MessageSquare"
  },
  {
    id: "acak",
    label: "Acak / Variasi Baru",
    badge: "\u{1F3B2} Acak Segar",
    description: "Secara otomatis mengombinasikan gaya bahasa baru setiap kali tombol ditekan.",
    icon: "Shuffle"
  }
];
function pickFromList(list, seedValue, offset = 0) {
  if (!list || list.length === 0) return "";
  const idx = Math.abs(Math.floor(seedValue + offset * 17)) % list.length;
  return list[idx];
}
function calculateHabitStats(records, startDate, endDate) {
  const recs = records || [];
  const dateList = [];
  if (startDate && endDate) {
    const curr = new Date(startDate);
    const last = new Date(endDate);
    if (!isNaN(curr.getTime()) && !isNaN(last.getTime()) && curr <= last) {
      const walker = new Date(curr);
      while (walker <= last) {
        dateList.push(walker.toISOString().split("T")[0]);
        walker.setDate(walker.getDate() + 1);
      }
    }
  }
  const totalDays = Math.max(dateList.length, recs.length, 1);
  const wakeUpCount = recs.filter((r) => r.wakeUpEarly).length;
  let totalPrayers = 0;
  recs.forEach((r) => {
    if (r.prayers) {
      if (r.prayers.subuh) totalPrayers++;
      if (r.prayers.dhuhur) totalPrayers++;
      if (r.prayers.ashar) totalPrayers++;
      if (r.prayers.maghrib) totalPrayers++;
      if (r.prayers.isya) totalPrayers++;
    }
  });
  const prayerPct = Math.min(100, Math.round(totalPrayers / (totalDays * 5) * 100));
  const exerciseCount = recs.filter((r) => r.exercise).length;
  let totalMeals = 0;
  recs.forEach((r) => {
    if (r.healthyMeals) {
      if (r.healthyMeals.pagi) totalMeals++;
      if (r.healthyMeals.siang) totalMeals++;
      if (r.healthyMeals.malam) totalMeals++;
    }
  });
  const mealsPct = Math.min(100, Math.round(totalMeals / (totalDays * 3) * 100));
  const learnCount = recs.filter((r) => r.loveLearning).length;
  const socialCount = recs.filter((r) => r.socializing).length;
  const sleepCount = recs.filter((r) => r.sleepEarly).length;
  return {
    totalDays,
    wakeUpPct: Math.min(100, Math.round(wakeUpCount / totalDays * 100)),
    prayerPct,
    exercisePct: Math.min(100, Math.round(exerciseCount / totalDays * 100)),
    mealsPct,
    learnPct: Math.min(100, Math.round(learnCount / totalDays * 100)),
    socialPct: Math.min(100, Math.round(socialCount / totalDays * 100)),
    sleepPct: Math.min(100, Math.round(sleepCount / totalDays * 100))
  };
}
function formatIndonesianDateLabel(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}
function generateVaried7HabitsReport(options) {
  const {
    studentName = "Siswa",
    className = "Kelas",
    teacherName = "Wali Kelas",
    startDate,
    endDate,
    records = []
  } = options;
  let chosenTone = options.tone || "islami_hangat";
  const rawSeed = options.seed !== void 0 ? options.seed : Math.floor(Math.random() * 1e5);
  if (chosenTone === "acak") {
    const tones = ["islami_hangat", "ceria_motivasi", "santun_solutif", "ringkas_manis"];
    chosenTone = pickFromList(tones, rawSeed, 1);
  }
  const toneConfig = REPORT_TONE_OPTIONS.find((t) => t.id === chosenTone) || REPORT_TONE_OPTIONS[0];
  const stats = calculateHabitStats(records, startDate, endDate);
  const startFormatted = startDate ? formatIndonesianDateLabel(startDate) : "Awal Periode";
  const endFormatted = endDate ? formatIndonesianDateLabel(endDate) : "Akhir Periode";
  const greetings = {
    islami_hangat: [
      `Assalamu'alaikum Warahmatullahi Wabarakatuh.
Semoga limpahan taufiq, rahmat, dan kesehatan dari Allah senantiasa tercurah untuk Ayah & Bunda tercinta dari ananda *${studentName}*,

Alhamdulillah, puji syukur ke hadirat Ilahi Robbi. Menemani tumbuh kembang ananda adalah anugerah terindah bagi kami di madrasah. Berikut kami sampaikan catatan berkah perkembangan *7 Kebiasaan Anak Indonesia Hebat* ananda periode *${startFormatted} s/d ${endFormatted}* (${stats.totalDays} hari kebersamaan):`,
      `Assalamu'alaikum Wr. Wb.
Bismillah... Salam takzim teriring doa keselamatan untuk keluarga besar ananda *${studentName}*,

Terima kasih tak terhingga atas doa, keteladanan ibadah, dan bimbingan penuh kasih yang terus Ayah/Bunda hadirkan di rumah. Berikut hasil pemantauan kebiasaan baik ananda periode *${startFormatted} s/d ${endFormatted}* (${stats.totalDays} hari pemantauan):`,
      `Assalamu'alaikum Warahmatullahi Wabarakatuh.
Ayah dan Bunda yang dirahmati Allah, orang tua dari ananda *${studentName}*,

Semoga hari-hari keluarga senantiasa dipenuhi keberkahan dan kebahagiaan. Melalui pesan hangat ini, kami ingin berbagi kabar gembira mengenai capaian *7 Kebiasaan Anak Indonesia Hebat* ananda periode *${startFormatted} s/d ${endFormatted}* (${stats.totalDays} hari):`
    ],
    ceria_motivasi: [
      `Halo Ayah & Bunda yang hebat! Salam ceria dan penuh semangat untuk keluarga ananda *${studentName}*! \u{1F60A}

Senang sekali bisa menyapa Bapak/Ibu hari ini. Di sekolah, ananda terus tumbuh menjadi pribadi yang bersemangat dan membanggakan. Yuk, kita intip bersama rangkuman seru *7 Kebiasaan Anak Indonesia Hebat* ananda periode *${startFormatted} s/d ${endFormatted}* (${stats.totalDays} hari pemantauan):`,
      `Assalamu'alaikum Ayah/Bunda! Salam bahagia dari kami untuk Ayah & Bunda tersayang dari ananda *${studentName}* \u2728

Senyum dan energi positif ananda di kelas selalu menularkan kebahagiaan. Berikut catatan perkembangan kebiasaan hebat ananda selama periode *${startFormatted} s/d ${endFormatted}* (${stats.totalDays} hari):`,
      `Selamat pagi/siang Ayah dan Bunda ananda *${studentName}* yang selalu bersemangat! \u{1F44B}

Terima kasih banyak sudah menjadi *support system* terbaik ananda di rumah. Inilah kilasan prestasi karakter *7 Kebiasaan Anak Indonesia Hebat* ananda periode *${startFormatted} s/d ${endFormatted}* (${stats.totalDays} hari):`
    ],
    santun_solutif: [
      `Assalamu'alaikum Wr. Wb.
Salam silaturahmi dan rasa hormat kami haturkan kepada Bapak/Ibu orang tua/wali dari ananda *${studentName}*,

Keberhasilan pembentukan karakter anak adalah buah dari kemitraan yang selaras antara madrasah dan rumah. Berikut kami sajikan rangkuman evaluasi perkembangan *7 Kebiasaan Anak Indonesia Hebat* ananda periode *${startFormatted} s/d ${endFormatted}* (${stats.totalDays} hari pemantauan):`,
      `Selamat pagi/siang Bapak/Ibu wali murid dari ananda *${studentName}* yang kami hormati,

Semoga Bapak/Ibu sekeluarga selalu dalam keadaan sehat walafiat. Sebagai wujud sinergi bersama dalam memantau kebiasaan harian ananda, berikut laporan kemajuan 7 Kebiasaan Karakter periode *${startFormatted} s/d ${endFormatted}* (${stats.totalDays} hari):`,
      `Assalamu'alaikum Warahmatullahi Wabarakatuh.
Yth. Bapak/Ibu orang tua ananda *${studentName}*,

Teriring rasa terima kasih atas kerja sama yang terjalin erat selama ini. Kami lampirkan hasil evaluasi kebiasaan positif ananda periode *${startFormatted} s/d ${endFormatted}* (${stats.totalDays} hari observasi):`
    ],
    ringkas_manis: [
      `Assalamu'alaikum Ayah/Bunda ananda *${studentName}* terkasih,

Berikut ringkasan singkat & hangat perkembangan *7 Kebiasaan Anak Indonesia Hebat* ananda periode *${startFormatted} s/d ${endFormatted}* (${stats.totalDays} Hari):`,
      `Salam hangat Ayah & Bunda ananda *${studentName}*,

Berikut intisari evaluasi kebiasaan harian ananda di madrasah dan rumah untuk periode *${startFormatted} s/d ${endFormatted}* (${stats.totalDays} Hari):`
    ],
    acak: []
  };
  const selectedGreeting = pickFromList(greetings[chosenTone] || greetings.islami_hangat, rawSeed, 2);
  const wakeUpLines = {
    high: [
      `Alhamdulillah, ananda sangat disiplin bangun pagi sebelum fajar menyingsing dengan wajah cerah dan tubuh bugar.`,
      `Masya Allah, kebiasaan bangun pagi ananda patut diacungi jempol! Selalu terjaga lebih awal tanpa perlu dibangunkan berulang kali.`,
      `Luar biasa! Ritme bangun fajar ananda sangat konsisten, membuktikan kemandirian dan kesiapan menyambut hari penuh berkah.`,
      `Kebiasaan fajar ananda sungguh membanggakan, selalu bangun segar dan ceria menyambut aktivitas pagi.`
    ],
    mid: [
      `Ananda sudah mulai terbiasa bangun pagi, yuk Ayah/Bunda terus kita dampingi keteraturannya agar semakin konsisten setiap hari.`,
      `Keteraturan bangun pagi ananda sudah berkembang baik. Sapaan hangat dan senyum di pagi hari akan membuatnya makin bersemangat.`,
      `Alhamdulillah ananda menunjukkan kemajuan bangun pagi. Terus jaga ritmenya terutama di akhir pekan ya Ayah/Bunda.`
    ],
    low: [
      `Ananda masih membutuhkan sedikit bimbingan untuk bangun pagi. Sentuhan lembut dan tidur malam lebih awal akan sangat membantunya terbangun riang.`,
      `Yuk kita dukung ananda agar lebih mudah bangun pagi dengan membatasi aktivitas larut malam dan menciptakan suasana pagi yang menyenangkan.`
    ]
  };
  const prayerLines = {
    high: [
      `Alhamdulillah wa syukurillah, ketertiban sholat 5 waktu ananda sangat istiqomah dan menyejukkan hati.`,
      `Masya Allah, ananda menjaga sholat 5 waktu dengan penuh kerelaan hati. Buah dari teladan indah yang Ayah/Bunda hadirkan di rumah.`,
      `Luar biasa, kesadaran ibadah sholat ananda tergolong sangat tinggi dan rajin. Semoga menjadi ladang pahala jariyah keluarga.`,
      `Alhamdulillah, kewajiban sholat 5 waktu ditunaikan dengan tertib. Ananda senantiasa bergegas saat waktu sholat tiba.`
    ],
    mid: [
      `Pelaksanaan sholat ananda sudah cukup baik. Mari kita terus kuatkan terutama sholat Subuh dan Isya dengan ajakan sholat berjamaah di rumah.`,
      `Alhamdulillah ananda rajin sholat, terus dampingi dengan penuh kasih sayang agar ibadah ini terasa makin indah di hatinya.`,
      `Ketertiban sholat ananda berprogres positif. Terus berikan pujian tulus setiap kali ananda bergegas mengambil wudhu.`
    ],
    low: [
      `Ananda sedang dalam tahap belajar membiasakan sholat. Mari Ayah/Bunda kita ajak secara bertahap melalui kisah teladan dan sholat bersama tanpa paksaan.`,
      `Ibadah sholat ananda perlu terus kita pupuk bersama dengan kesabaran dan keteladanan di rumah agar tumbuh kecintaan dari dalam hatinya.`
    ]
  };
  const exerciseLines = {
    high: [
      `Ananda sangat gemar bergerak aktif, bugar, dan ceria saat berolahraga maupun aktivitas fisik bersama teman.`,
      `Kebugaran jasmani ananda sangat prima! Semangat olahraganya tinggi sehingga tubuhnya selalu berenergi dan lincah.`,
      `Alhamdulillah, ananda rutin berolahraga dan menjaga kebugaran tubuhnya dengan riang gembira.`,
      `Hebat! Ananda memiliki stamina dan koordinasi gerak yang sangat baik berkat kebiasaan berolahraga teratur.`
    ],
    mid: [
      `Ananda sudah cukup aktif bergerak. Yuk sesekali ajak jalan santai atau bersepeda bersama di akhir pekan agar semakin bugar.`,
      `Aktivitas fisik ananda terpantau baik. Menyelipkan permainan gerak 15-20 menit sehari akan membuatnya semakin bersemangat.`
    ],
    low: [
      `Ananda disarankan untuk diajak lebih aktif bergerak fisik ringan di rumah, agar tubuh tidak kaku dan stamina belajarnya makin optimal.`,
      `Yuk ajak ananda berolahraga santai sambil bermain di halaman minimal 15 menit sehari agar fisiknya tetap prima dan ceria.`
    ]
  };
  const mealsLines = {
    high: [
      `Pola makan ananda sangat teratur dengan menu gizi seimbang, gemar mengonsumsi makanan halal-thayyib yang menyehatkan.`,
      `Masya Allah, ananda makan dengan lahap, tertib waktu (pagi, siang, malam), dan tidak pilih-pilih makanan bergizi.`,
      `Alhamdulillah, asupan makanan ananda terpantau sangat baik dan sehat, modal berharga bagi konsentrasi belajarnya.`,
      `Kebiasaan makan sehat ananda sangat tertib. Pilihan menu bergizi di rumah sangat mendukung pertumbuhan ananda yang optimal.`
    ],
    mid: [
      `Pola makan ananda sudah teratur, mohon terus didorong dan divariasikan konsumsi sayuran hijau, buah-buahan segar, serta cukup air putih.`,
      `Ananda makan cukup teratur, sesekali ajak berkreasi membuat bekal sehat favorit agar ananda makin suka sayur dan buah.`
    ],
    low: [
      `Perlu perhatian bersama agar ananda makan lebih teratur serta membatasi jajan atau camilan manis sebelum jam makan utama.`,
      `Yuk dampingi ananda untuk lebih gemar makan sayur dan buah dengan penyajian yang menarik dan suasana makan yang menyenangkan.`
    ]
  };
  const learnLines = {
    high: [
      `Rasa ingin tahu dan motivasi belajar ananda sangat mengagumkan! Rajin membaca buku serta tertib menuntaskan tugas mandiri.`,
      `Masya Allah, ananda memiliki kegemaran belajar yang tinggi. Selalu antusias saat menemukan wawasan dan pengetahuan baru.`,
      `Ananda sangat mandiri dalam belajar dan gemar membaca. Semangat menuntut ilmunya sungguh membanggakan kita semua.`,
      `Daya fokus dan kecintaan ananda terhadap literasi sangat menonjol. Terus asah potensi kecerdasannya ya Ayah/Bunda!`
    ],
    mid: [
      `Semangat belajar ananda baik. Menemani ananda membaca buku atau mengulang pelajaran 15-20 menit di malam hari akan melejitkan prestasinya.`,
      `Ananda mau belajar dengan baik saat didampingi. Ciptakan pojok belajar yang nyaman dan bebas dari suara bising atau HP.`
    ],
    low: [
      `Ananda perlu dibantu menumbuhkan kebiasaan belajar yang rutin. Mulailah dari durasi pendek (10-15 menit) dengan materi menarik agar tidak bosan.`,
      `Yuk ciptakan suasana belajar yang santai dan penuh pujian di rumah agar ananda merasakan belajar sebagai petualangan yang menyenangkan.`
    ]
  };
  const socialLines = {
    high: [
      `Ananda berhati lembut, sangat santun, suka menolong teman, dan menjadi pribadi yang disenangi dalam pergaulan kelas.`,
      `Masya Allah, empati dan kepedulian sosial ananda luar biasa. Selalu siap berbagi, bertutur kata ramah, dan menghormati sesama.`,
      `Sikap gotong royong dan kesantunan ananda sangat memikat. Menjadi teladan sahabat yang baik di lingkungan madrasah maupun rumah.`,
      `Alhamdulillah, ananda mudah bergaul, menghargai sesama, dan selalu menebarkan senyum serta keramahan kepada teman-temannya.`
    ],
    mid: [
      `Hubungan sosial ananda terjalin baik. Terus ajak dan latih kebiasaan berbagi serta saling memaafkan di lingkungan sekitar.`,
      `Ananda cukup ramah dan santun. Terus pupuk rasa empati dan kepedulian melalui kegiatan sosial kecil bersama keluarga.`
    ],
    low: [
      `Ananda perlu bimbingan untuk lebih percaya diri saat berinteraksi dengan teman serta belajar mengelola emosi dengan tenang.`,
      `Yuk dampingi ananda dalam berkomunikasi santun dan menyelesaikan perbedaan dengan teman lewat pembicaraan yang damai.`
    ]
  };
  const sleepLines = {
    high: [
      `Kedisiplinan tidur malam tepat waktu sangat terjaga (sebelum pukul 21.00), sehingga fisik dan pikiran ananda selalu bugar saat fajar tiba.`,
      `Alhamdulillah, ananda teratur mengakhiri kegiatan malam dan tidur tepat waktu, sangat baik untuk regenerasi tubuh dan daya ingatnya.`,
      `Pola istirahat malam ananda sangat baik dan tertib. Kesadaran untuk tidur cepat membuat wajahnya selalu cerah dan ceria di sekolah.`
    ],
    mid: [
      `Jam tidur ananda cukup teratur, namun sesekali masih lewat waktu. Mohon bantu ananda meredupkan lampu dan menjauhkan gadget 1 jam sebelum tidur.`,
      `Waktu tidur malam ananda sudah baik. Membiasakan rutinitas relaksasi seperti berwudhu dan berdoa sebelum tidur akan membuat tidurnya makin nyenyak.`
    ],
    low: [
      `Ananda terkadang masih tidur terlalu larut malam. Mohon batasi penggunaan gawai/televisi setelah pukul 20.00 WIB agar tidurnya tidak terganggu.`,
      `Yuk kita bantu ananda memiliki jam tidur yang pasti dan cukup agar di pagi hari tidak merasa lemas atau mengantuk di kelas.`
    ]
  };
  const getHabitSentence = (bank, pct, offset) => {
    if (pct >= 80) return pickFromList(bank.high, rawSeed, offset);
    if (pct >= 50) return pickFromList(bank.mid, rawSeed, offset);
    return pickFromList(bank.low, rawSeed, offset);
  };
  const recommendationsBank = [
    {
      title: "Apresiasi Kasih & Pujian Tulus",
      desc: "Berikan pelukan hangat dan kalimat apresiasi spesifik setiap kali ananda berhasil menjalankan kebiasaan baik tanpa disuruh."
    },
    {
      title: "Keteladanan Ibadah Bersama",
      desc: "Luangkan waktu untuk sholat berjamaah dan membaca Al-Qur'an bersama ananda di rumah agar terbangun kedekatan ruhiyah keluarga."
    },
    {
      title: "Manajemen Layar (Screen-Time) Bijak",
      desc: "Tetapkan batasan gawai (HP) dan televisi maksimal pukul 20.00 WIB demi menjaga kualitas tidur malam dan kesehatan mata ananda."
    },
    {
      title: "Bincang Hati 10 Menit Sebelum Tidur",
      desc: "Gunakan waktu sejenak sebelum tidur untuk mendengarkan cerita kegembiraan, tantangan, dan perasaan ananda sepanjang hari."
    },
    {
      title: "Pojok Literasi & Membaca Nyaman",
      desc: "Hadirkan sudut baca kecil dengan buku-buku bergambar atau kisah inspiratif untuk memupuk kecintaan membaca yang mendalam."
    },
    {
      title: "Aktivitas Gerak & Jalan Santai Akhir Pekan",
      desc: "Ajak ananda jalan pagi atau bersepeda santai 20-30 menit di akhir pekan untuk menyegarkan stamina fisik dan mengikat keakraban keluarga."
    },
    {
      title: "Kreativitas Bekal & Sayur Warna-Warni",
      desc: "Libatkan ananda dalam memilih atau menyiapkan buah dan sayur favorit agar ananda semakin berselera menikmati makanan bergizi seimbang."
    },
    {
      title: "Jadwal Rutin yang Menyenangkan",
      desc: "Tempel jadwal harian bergambar di kamar ananda sebagai panduan visual agar ananda merasa mandiri dan bangga saat menuntaskan rutinitas."
    }
  ];
  const rec1 = pickFromList(recommendationsBank, rawSeed, 10);
  const remainingRecs = recommendationsBank.filter((r) => r.title !== rec1.title);
  const rec2 = pickFromList(remainingRecs, rawSeed, 11);
  const remainingRecs2 = remainingRecs.filter((r) => r.title !== rec2.title);
  const rec3 = pickFromList(remainingRecs2, rawSeed, 12);
  const closings = {
    islami_hangat: [
      `Jazakumullah khairan katsiran atas dedikasi dan cinta luar biasa Ayah & Bunda di rumah. Semoga Allah SWT senantiasa menganugerahkan keberkahan, kemudahan rezeki, dan menjadikan ananda *${studentName}* sebagai permata hati yang sholeh/sholehah, berbakti kepada orang tua, serta bermanfaat bagi agama, nusa, dan bangsa. Aamiin ya Rabbal 'Alamin.

Wassalamu'alaikum Warahmatullahi Wabarakatuh.
*Wali Kelas ${className}*
_${teacherName}_`,
      `Terima kasih setulus hati atas kebersamaan dan kerja sama indah ini. Semoga ananda tumbuh dalam lindungan dan ridho Allah, menjadi penyejuk pandangan mata (*qurrata a'yun*) bagi keluarga di dunia dan akhirat. Aamiin.

Wassalamu'alaikum Wr. Wb.
*Wali Kelas ${className}*
_${teacherName}_`
    ],
    ceria_motivasi: [
      `Terima kasih banyak Ayah dan Bunda atas dukungannya yang tak pernah henti! Kami sangat yakin ananda *${studentName}* akan terus mengukir banyak hal hebat ke depan. Mari terus kita semangati bersama dengan senyum dan cinta! Semangat selalu untuk keluarga! \u{1F31F}

Wassalamu'alaikum Wr. Wb.
*Wali Kelas ${className}*
_${teacherName}_`,
      `Keren sekali pencapaian ananda! Sinergi kita adalah kunci utama keceriaan dan keberhasilan ananda. Sampai jumpa di sekolah besok ya Ananda hebat! Salam hormat untuk seluruh keluarga di rumah.

Wassalamu'alaikum Wr. Wb.
*Wali Kelas ${className}*
_${teacherName}_`
    ],
    santun_solutif: [
      `Demikian laporan evaluasi kebiasaan ini kami sampaikan. Kami senantiasa membuka pintu komunikasi apabila Bapak/Ibu ingin berdiskusi lebih lanjut mengenai perkembangan ananda. Terima kasih atas kerja sama yang terjalin dengan sangat baik.

Wassalamu'alaikum Warahmatullahi Wabarakatuh.
*Wali Kelas ${className}*
_${teacherName}_`,
      `Besar harapan kami, sinergi antara madrasah dan keluarga senantiasa kokoh demi mengantarkan ananda meraih potensi terbaiknya. Salam hormat kami untuk seluruh keluarga di rumah.

Wassalamu'alaikum Wr. Wb.
*Wali Kelas ${className}*
_${teacherName}_`
    ],
    ringkas_manis: [
      `Terima kasih banyak atas perhatian dan kerja sama baik Ayah/Bunda. Semoga ananda sehat dan berprestasi selalu!

Wassalamu'alaikum Wr. Wb.
*Wali Kelas ${className}* - _${teacherName}_`,
      `Terima kasih atas sinergi hangat Ayah & Bunda di rumah demi masa depan gemilang ananda *${studentName}*.

Wassalamu'alaikum Wr. Wb.
*Wali Kelas ${className}* - _${teacherName}_`
    ],
    acak: []
  };
  const selectedClosing = pickFromList(closings[chosenTone] || closings.islami_hangat, rawSeed, 15);
  const reportText = `*LAPORAN ANALISIS DIAGNOSTIK 7 KEBIASAAN ANAK INDONESIA HEBAT*

${selectedGreeting}

\u{1F4CC} *KESIMPULAN EVALUASI PER KEBIASAAN:*

*1. Bangun Pagi (${stats.wakeUpPct}%)*
${getHabitSentence(wakeUpLines, stats.wakeUpPct, 3)}

*2. Beribadah / Sholat 5 Waktu (${stats.prayerPct}%)*
${getHabitSentence(prayerLines, stats.prayerPct, 4)}

*3. Berolahraga (${stats.exercisePct}%)*
${getHabitSentence(exerciseLines, stats.exercisePct, 5)}

*4. Makan Sehat & Bergizi (${stats.mealsPct}%)*
${getHabitSentence(mealsLines, stats.mealsPct, 6)}

*5. Gemar Belajar (${stats.learnPct}%)*
${getHabitSentence(learnLines, stats.learnPct, 7)}

*6. Bermasyarakat (${stats.socialPct}%)*
${getHabitSentence(socialLines, stats.socialPct, 8)}

*7. Tidur Cepat (${stats.sleepPct}%)*
${getHabitSentence(sleepLines, stats.sleepPct, 9)}

\u{1F4A1} *REKOMENDASI & SARAN KASIH UNTUK ORANG TUA:*
1. *${rec1.title}*: ${rec1.desc}
2. *${rec2.title}*: ${rec2.desc}
3. *${rec3.title}*: ${rec3.desc}

${selectedClosing}`;
  return {
    reportText,
    appliedTone: chosenTone,
    toneLabel: toneConfig.label
  };
}

// server.ts
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use(import_express.default.json({ limit: "10mb" }));
  app.all(["/cpanel-siap-upload.zip", "/api/download-zip"], (req, res) => {
    const zipPublic = import_path.default.join(process.cwd(), "public", "cpanel-siap-upload.zip");
    const zipDist = import_path.default.join(process.cwd(), "dist", "cpanel-siap-upload.zip");
    let targetFile = "";
    if (import_fs.default.existsSync(zipPublic) && import_fs.default.statSync(zipPublic).size > 1e5) {
      targetFile = zipPublic;
    } else if (import_fs.default.existsSync(zipDist) && import_fs.default.statSync(zipDist).size > 1e5) {
      targetFile = zipDist;
    }
    if (!targetFile) {
      try {
        console.log("Generating ZIP on demand...");
        (0, import_child_process.execSync)("node scripts/make-zip.js", { stdio: "inherit" });
        if (import_fs.default.existsSync(zipPublic) && import_fs.default.statSync(zipPublic).size > 1e5) targetFile = zipPublic;
        else if (import_fs.default.existsSync(zipDist) && import_fs.default.statSync(zipDist).size > 1e5) targetFile = zipDist;
      } catch (err) {
        console.error("On-demand ZIP generation failed:", err);
      }
    }
    if (targetFile && import_fs.default.existsSync(targetFile)) {
      const stat = import_fs.default.statSync(targetFile);
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Length", stat.size.toString());
      res.setHeader("Content-Disposition", 'attachment; filename="cpanel-siap-upload.zip"');
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      return res.sendFile(targetFile);
    }
    return res.status(404).json({ error: "File cpanel-siap-upload.zip tidak ditemukan." });
  });
  app.all("/api.php", (req, res) => {
    const action = req.query.action || req.body?.action || "status";
    if (action === "download_zip") {
      return res.redirect("/cpanel-siap-upload.zip");
    }
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    return res.status(200).json({
      status: "error",
      code: "PREVIEW_ENVIRONMENT",
      is_preview: true,
      php_version: null,
      message: "Anda saat ini membuka aplikasi di Link Preview AI Studio (Node.js/Cloud Run)",
      detail: "Server preview di AI Studio menggunakan Node.js sehingga kode PHP tidak diproses oleh PHP engine cPanel hosting Anda.",
      hint: "Perubahan versi PHP 8.1 / 8.2 yang Anda lakukan di cPanel hanya berlaku di server cPanel Anda. Silakan masukkan URL website cPanel Anda di menu 'Panduan Deploy MySQL' untuk menghubungkan & menguji koneksi langsung ke server cPanel."
    });
  });
  app.use(import_express.default.static(import_path.default.join(process.cwd(), "public")));
  const getGeminiClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return null;
    }
    return new import_genai.GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  };
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });
  app.post("/api/ai/diagnose-character", async (req, res) => {
    const {
      studentName,
      startDate,
      endDate,
      habitsData,
      records,
      teacherName,
      className,
      schoolName,
      tone = "islami_hangat",
      seed
    } = req.body;
    const dataToProcess = habitsData || records || [];
    if (!studentName) {
      return res.status(400).json({ error: "Nama siswa wajib diisi." });
    }
    let reportText = null;
    const currentSeed = seed !== void 0 ? Number(seed) : Math.floor(Math.random() * 1e5);
    try {
      const ai = getGeminiClient();
      if (ai) {
        let toneGuidance = "Gaya Bahasa: Penuh doa tulus, sangat hangat, islami, dan mengapresiasi keteladanan ibadah orang tua di rumah.";
        if (tone === "ceria_motivasi") {
          toneGuidance = "Gaya Bahasa: Ceria, optimis, penuh senyum, memotivasi, dan menghadirkan rasa bangga mendalam bagi orang tua atas keceriaan ananda.";
        } else if (tone === "santun_solutif") {
          toneGuidance = "Gaya Bahasa: Santun, bijaksana, menekankan kemitraan madrasah-keluarga dengan saran praktis yang menenangkan.";
        } else if (tone === "ringkas_manis") {
          toneGuidance = "Gaya Bahasa: Ringkas, hangat, to the point, padat, dan nyaman dibaca cepat di layar ponsel.";
        }
        const prompt = `
Anda adalah seorang wali kelas di ${schoolName || "Madrasah Ibtidaiyah"} yang berhati hangat, ramah, dan penuh kasih sayang terhadap siswa dan orang tua.
Tugas Anda adalah menyusun laporan perkembangan karakter "7 Kebiasaan Anak Indonesia Hebat" dalam format pesan WhatsApp yang PERSONAL, RAMAH, dan TIDAK KAKU.

${toneGuidance}

Detail Informasi:
- Nama Siswa: ${studentName}
- Kelas: ${className || "Kelas 1A"}
- Wali Kelas: ${teacherName || "Guru Pengampu"}
- Periode Pemantauan: ${startDate || "Awal Periode"} s/d ${endDate || "Akhir Periode"}

Data Catatan Harian Kebiasaan Siswa:
${JSON.stringify(dataToProcess, null, 2)}

7 Kebiasaan yang dievaluasi:
1. Bangun Pagi
2. Beribadah (Sholat 5 Waktu)
3. Berolahraga
4. Makan Sehat & Bergizi
5. Gemar Belajar
6. Bermasyarakat
7. Tidur Cepat

ATURAN REDAKSI (SANGAT PENTING AGAR TIDAK MONOTON/BERULANG):
1. *Judul*: Cukup *LAPORAN ANALISIS DIAGNOSTIK 7 KEBIASAAN ANAK INDONESIA HEBAT* (HAPUS baris nama sekolah/kelas di bawah judul).
2. *Sapaan Pembuka*: Sapaan yang hangat, akrab, dan tulus kepada Ayah/Bunda dari ananda *${studentName}*. Variasikan pilihan kata agar terasa segar, luwes, dan menyentuh hati.
3. *Kesimpulan 7 Kebiasaan*:
   - Tuliskan ulasan satu per satu untuk ke-7 kebiasaan di atas (gunakan format *bold* untuk nomor dan nama kebiasaan).
   - Tuliskan persentase ketercapaian secara akurat sesuai data.
   - Ulas setiap poin dengan kalimat yang bervariasi, penuh penghargaan, dan mendorong kebaikan (hindari kalimat klise berulang).
4. *Rekomendasi & Saran Kasih*:
   - Tuliskan 3 tips pendampingan praktis dan hangat di rumah yang relevan bagi ananda.
5. *Penutup*: Ungkapan terima kasih tulus atas sinergi orang tua, doa kebaikan untuk keluarga, dan salam penutup santun.

Gunakan format teks WhatsApp dengan tanda bintang (*) untuk penekanan teks penting.`;
        const response = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: prompt,
          config: {
            temperature: 0.85
          }
        });
        if (response && response.text) {
          reportText = response.text;
        }
      }
    } catch {
    }
    if (reportText) {
      return res.json({ success: true, report: reportText, toneUsed: tone });
    }
    try {
      const generated = generateVaried7HabitsReport({
        studentName,
        className,
        teacherName,
        schoolName,
        startDate,
        endDate,
        records: dataToProcess,
        tone,
        seed: currentSeed
      });
      return res.json({
        success: true,
        fallback: true,
        report: generated.reportText,
        appliedTone: generated.appliedTone,
        toneLabel: generated.toneLabel
      });
    } catch (err) {
      return res.status(500).json({ error: "Gagal menyusun laporan diagnostik." });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server KAGUM running on http://localhost:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
