import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  // Initialize Gemini Client
  const getGeminiClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is missing.");
    }
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  };

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // AI Diagnostic Endpoint for 7 Kebiasaan Anak Indonesia Hebat
  app.post("/api/ai/diagnose-character", async (req, res) => {
    try {
      const { studentName, startDate, endDate, habitsData, records, teacherName, className, schoolName } = req.body;
      const dataToProcess = habitsData || records || [];

      if (!studentName) {
        return res.status(400).json({ error: "Nama siswa wajib diisi." });
      }

      const ai = getGeminiClient();

      const prompt = `
Anda adalah seorang wali kelas di ${schoolName || "Madrasah Ibtidaiyah"} yang ramah, santun, bijaksana, dan penuh perhatian.
Tugas Anda adalah membuat laporan analisis perkembangan karakter "7 Kebiasaan Anak Indonesia Hebat" yang LENGKAP dan DETAIL untuk disajikan dalam bentuk pesan WhatsApp kepada Orang Tua/Wali Murid dari siswa bernama: ${studentName}.

Detail Informasi:
- Nama Siswa: ${studentName}
- Kelas: ${className || "Kelas 1A"}
- Wali Kelas: ${teacherName || "Guru Pengampu"}
- Periode Pemantauan: ${startDate || "Awal Bulan"} s/d ${endDate || "Akhir Bulan"}

Data Catatan Kebiasaan Harian Siswa selama periode tersebut:
${JSON.stringify(dataToProcess, null, 2)}

7 Kebiasaan Anak Indonesia Hebat yang dipantau meliputi:
1. Bangun Pagi
2. Beribadah (Shalat 5 Waktu)
3. Berolahraga
4. Makan Sehat & Bergizi
5. Gemar Belajar
6. Bermasyarakat
7. Tidur Cepat

INSTRUKSI LAYOUT & KONTEN LAPORAN (SANGAT PENTING):
1. *Judul*: Cukup *LAPORAN ANALISIS DIAGNOSTIK 7 KEBIASAAN ANAK INDONESIA HEBAT* (HAPUS dan JANGAN tampilkan baris nama sekolah/kelas di bawah judul).
2. *Pembuka*: Salam hangat islami, menyapa Orang Tua/Wali Murid ananda ${studentName} dengan ramah.
2. *Kesimpulan Masing-Masing 7 Kebiasaan* (Harus mencakup evaluasi riil untuk setiap kebiasaan di bawah ini, gunakan format *bold* untuk judul kebiasaan):
   - *1. Bangun Pagi*: Berikan kesimpulan kedisiplinan dan keteraturan bangun pagi ananda.
   - *2. Beribadah (Sholat 5 Waktu)*: Berikan kesimpulan kelengkapan dan kekhusyukan ibadah sholat 5 waktu (Subuh, Dhuhur, Ashar, Maghrib, Isya).
   - *3. Berolahraga*: Berikan kesimpulan keaktifan olah tubuh dan kebugaran fisik ananda.
   - *4. Makan Sehat & Bergizi*: Berikan kesimpulan kebiasaan makan makanan bergizi (pagi, siang, malam).
   - *5. Gemar Belajar*: Berikan kesimpulan semangat belajar mandiri, membaca, dan penyelesaian tugas.
   - *6. Bermasyarakat*: Berikan kesimpulan interaksi sosial, kebaikan, dan kepedulian terhadap lingkungan/teman.
   - *7. Tidur Cepat*: Berikan kesimpulan keteraturan jam tidur malam yang cukup dan tepat waktu.
3. *Rekomendasi & Saran untuk Orang Tua*:
   - Tuliskan 3-4 rekomendasi/saran konkret dan praktis yang dapat dilakukan Bapak/Ibu di rumah untuk mempertahankan atau meningkatkan kebiasaan baik ananda.
4. *Penutup*: Ungkapan apresiasi atas kerjasama orang tua, doa kebaikan untuk ananda dan keluarga, serta salam penutup.

Format teks disesuaikan dengan gaya pesan WhatsApp (gunakan penekanan *teks tebal* pada poin penting agar rapi dan mudah dibaca).`;

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          temperature: 0.7,
        },
      });

      const reportText = response.text || "Gagal menghasilkan laporan diagnostik.";

      return res.json({ success: true, report: reportText });
    } catch (err: any) {
      console.warn("Gemini API not available or failed, returning calculated report:", err.message);
      
      const { studentName, startDate, endDate, className, teacherName, schoolName, habitsData, records } = req.body;
      const recs = habitsData || records || [];
      
      // Calculate total days in selected period
      const dateList: string[] = [];
      if (startDate && endDate) {
        let curr = new Date(startDate);
        const last = new Date(endDate);
        if (!isNaN(curr.getTime()) && !isNaN(last.getTime()) && curr <= last) {
          while (curr <= last) {
            dateList.push(curr.toISOString().split('T')[0]);
            curr.setDate(curr.getDate() + 1);
          }
        }
      }
      const totalDays = Math.max(dateList.length, recs.length, 1);

      const wakeUpCount = recs.filter((r: any) => r.wakeUpEarly).length;
      let totalPrayers = 0;
      recs.forEach((r: any) => {
        if (r.prayers) {
          if (r.prayers.subuh) totalPrayers++;
          if (r.prayers.dhuhur) totalPrayers++;
          if (r.prayers.ashar) totalPrayers++;
          if (r.prayers.maghrib) totalPrayers++;
          if (r.prayers.isya) totalPrayers++;
        }
      });
      const prayerPct = Math.round((totalPrayers / (totalDays * 5)) * 100);

      const exerciseCount = recs.filter((r: any) => r.exercise).length;
      let totalMeals = 0;
      recs.forEach((r: any) => {
        if (r.healthyMeals) {
          if (r.healthyMeals.pagi) totalMeals++;
          if (r.healthyMeals.siang) totalMeals++;
          if (r.healthyMeals.malam) totalMeals++;
        }
      });
      const mealsPct = Math.round((totalMeals / (totalDays * 3)) * 100);

      const learnCount = recs.filter((r: any) => r.loveLearning).length;
      const socialCount = recs.filter((r: any) => r.socializing).length;
      const sleepCount = recs.filter((r: any) => r.sleepEarly).length;

      const wakeUpPct = Math.round((wakeUpCount / totalDays) * 100);
      const exercisePct = Math.round((exerciseCount / totalDays) * 100);
      const learnPct = Math.round((learnCount / totalDays) * 100);
      const socialPct = Math.round((socialCount / totalDays) * 100);
      const sleepPct = Math.round((sleepCount / totalDays) * 100);

      const reportText = `*LAPORAN ANALISIS DIAGNOSTIK 7 KEBIASAAN ANAK INDONESIA HEBAT*

Assalamu'alaikum Wr. Wb.
Bapak/Ibu/Wali Murid dari ananda *${studentName || "Siswa"}*,

Berikut hasil evaluasi diagnostik & analisis perkembangan *7 Kebiasaan Anak Indonesia Hebat* ananda periode *${startDate || "Awal Bulan"} s/d ${endDate || "Akhir Bulan"}* (${totalDays} Hari Pemantauan):

📌 *KESIMPULAN EVALUASI PER KEBIASAAN:*

*1. Bangun Pagi (${wakeUpPct}%)*
${wakeUpPct >= 80 ? "Ananda sangat konsisten dan disiplin bangun pagi sebelum Subuh dengan kondisi segar dan bersemangat." : "Ananda sudah menunjukkan kemajuan bangun pagi, mohon terus didampingi keteraturannya terutama di hari libur."}

*2. Beribadah / Sholat 5 Waktu (${prayerPct}%)*
${prayerPct >= 80 ? "Alhamdulillah, pelaksanaan ibadah sholat 5 waktu (Subuh, Dhuhur, Ashar, Maghrib, Isya) tergolong sangat tertib dan rajin." : "Pelaksanaan sholat 5 waktu cukup teratur. Perlu dorongan santun terutama untuk kebiasaan sholat Subuh dan Isya."}

*3. Berolahraga (${exercisePct}%)*
${exercisePct >= 75 ? "Ananda aktif bergerak dan rutin berolahraga untuk menjaga kebugaran jasmani." : "Ananda disarankan untuk diajak aktif berolahraga ringan atau olah tubuh minimal 15-30 menit sehari."}

*4. Makan Sehat & Bergizi (${mealsPct}%)*
${mealsPct >= 80 ? "Pola makan ananda terpantau teratur (Pagi, Siang, Malam) dengan gizi yang baik dan seimbang." : "Pola makan cukup teratur, mohon ditingkatkan konsumsi sayur, buah, serta air putih di rumah."}

*5. Gemar Belajar (${learnPct}%)*
${learnPct >= 80 ? "Ananda memiliki motivasi belajar yang tinggi, rajin membaca, dan disiplin mengerjakan tugas sekolah." : "Ananda sudah mau belajar, disarankan membuat jadwal belajar yang rutin dan bebas dari gangguan media."}

*6. Bermasyarakat (${socialPct}%)*
${socialPct >= 80 ? "Sangat ramah, santun, peduli kepada teman, dan memiliki jiwa kepedulian sosial yang amat baik." : "Sikap sosial ananda baik, terus latih sikap berbagi, empati, dan tolong-menolong di lingkungan rumah."}

*7. Tidur Cepat (${sleepPct}%)*
${sleepPct >= 80 ? "Disiplin mengakhiri aktivitas malam dan tidur tepat waktu sehingga kesegaran fisik selalu terjaga." : "Jam tidur malam ananda terkadang masih larut. Mohon batasi penggunaan HP/TV setelah pukul 20.00 WIB."}

💡 *REKOMENDASI & SARAN KEBIASAAN UNTUK ORANG TUA:*
1. *Apresiasi Berkelanjutan*: Berikan pujian hangat atau *reward* imaterial setiap kali ananda berhasil menjalankan kebiasaan baik secara mandiri.
2. *Keteladanan Ibadah & Pembiasaan*: Ajak ananda sholat berjamaah serta membaca Al-Qur'an/buku bersama untuk membangun karakter religius & gemar membaca.
3. *Manajemen Screen-Time*: Terapkan aturan pembatasan gawai (HP) dan televisi maksimal pukul 20.00 agar waktu istirahat malam ananda optimal.
4. *Komunikasi Efektif*: Buat sesi bincang santai 10 menit sebelum tidur untuk mendengarkan cerita dan perasaan ananda sepanjang hari.

Terima kasih banyak atas partisipasi aktif, bimbingan, dan kerjasama luar biasa Bapak/Ibu di rumah demi tumbuh kembang terbaik ananda.

Wassalamu'alaikum Wr. Wb.
*Wali Kelas ${className || "1A"}*
_${teacherName || "Guru Pengampu"}_`;

      return res.json({
        success: true,
        fallback: true,
        report: reportText,
      });
    }
  });

  // Vite Middleware Setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server KAGUM running on http://localhost:${PORT}`);
  });
}

startServer();
