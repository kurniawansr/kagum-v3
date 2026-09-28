import express from "express";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { generateVaried7HabitsReport, ReportTone } from "./src/utils/habitReportGenerator";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  // Download Route for cPanel ZIP (Defined before static middleware to ensure full zip download)
  app.all(["/cpanel-siap-upload.zip", "/api/download-zip"], (req, res) => {
    const zipPublic = path.join(process.cwd(), "public", "cpanel-siap-upload.zip");
    const zipDist = path.join(process.cwd(), "dist", "cpanel-siap-upload.zip");

    let targetFile = "";
    if (fs.existsSync(zipPublic) && fs.statSync(zipPublic).size > 100000) {
      targetFile = zipPublic;
    } else if (fs.existsSync(zipDist) && fs.statSync(zipDist).size > 100000) {
      targetFile = zipDist;
    }

    // If zip does not exist or is corrupted, generate it on demand
    if (!targetFile) {
      try {
        console.log("Generating ZIP on demand...");
        execSync("node scripts/make-zip.js", { stdio: "inherit" });
        if (fs.existsSync(zipPublic) && fs.statSync(zipPublic).size > 100000) targetFile = zipPublic;
        else if (fs.existsSync(zipDist) && fs.statSync(zipDist).size > 100000) targetFile = zipDist;
      } catch (err) {
        console.error("On-demand ZIP generation failed:", err);
      }
    }

    if (targetFile && fs.existsSync(targetFile)) {
      const stat = fs.statSync(targetFile);
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

  // Handle /api.php on Node.js Dev/Preview server (before static middleware)
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

  // Serve static assets from public
  app.use(express.static(path.join(process.cwd(), "public")));

  // Initialize Gemini Client
  const getGeminiClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return null;
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
      seed,
    } = req.body;
    const dataToProcess = habitsData || records || [];

    if (!studentName) {
      return res.status(400).json({ error: "Nama siswa wajib diisi." });
    }

    let reportText: string | null = null;
    const currentSeed = seed !== undefined ? Number(seed) : Math.floor(Math.random() * 100000);

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
            temperature: 0.85,
          },
        });

        if (response && response.text) {
          reportText = response.text;
        }
      }
    } catch {
      // Graceful fallback without throwing console warnings
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
        tone: tone as ReportTone,
        seed: currentSeed,
      });

      return res.json({
        success: true,
        fallback: true,
        report: generated.reportText,
        appliedTone: generated.appliedTone,
        toneLabel: generated.toneLabel,
      });
    } catch (err: any) {
      return res.status(500).json({ error: "Gagal menyusun laporan diagnostik." });
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
