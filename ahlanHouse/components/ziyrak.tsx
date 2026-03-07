"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Mic, MicOff, Bot } from "lucide-react";
import { parseZiyrakIntent, isZiyrakWakePhrase } from "@/app/lib/ziyrak-intents";
import { getApiBaseUrl } from "@/app/lib/api";
import * as ZiyrakApi from "@/app/lib/ziyrak-api";

const AZURE_KEY =
  typeof process !== "undefined" ? process.env.NEXT_PUBLIC_AZURE_SPEECH_KEY ?? "" : "";
const AZURE_REGION =
  typeof process !== "undefined" ? process.env.NEXT_PUBLIC_AZURE_SPEECH_REGION ?? "swedencentral" : "swedencentral";
const ACTIVITY_TIMEOUT_MS = 1 * 60 * 1000; // 1 daqiqa — shu vaqt ichida Ziyrak so‘zi yoki buyruq eshitilmasa passiv bo‘ladi

const baseUrl = getApiBaseUrl;

export function Ziyrak() {
  const router = useRouter();
  const [isActive, setIsActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [statusText, setStatusText] = useState("");
  const recognizerRef = useRef<{ stop: () => Promise<void> } | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isActiveRef = useRef(false);
  const isMountedRef = useRef(true);
  const synthesizerRef = useRef<{ close: () => void } | null>(null);
  const isSpeakingRef = useRef(false);
  const isProcessingRef = useRef(false);
  const lastProcessedTextRef = useRef("");
  const lastProcessedAtRef = useRef(0);
  const lastUnknownAtRef = useRef(0);
  const DEBOUNCE_MS = 3500;
  const UNKNOWN_COOLDOWN_MS = 15000;
  const MIN_TEXT_LENGTH = 5;

  const pick = useCallback(<T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)], []);

  const sayUnknown = useCallback(() => {
    const phrases = [
      "Kechirasiz, buni tushunmadim. Qayta aytib bering.",
      "Boshqa so'zlar bilan aytib ko'ring, yordam beraman.",
      "Bu buyruqni bajarolmadim. Nima kerakligini aytib bering.",
      "Tushunmadim. Yordam deb aytsangiz, imkoniyatlarimni aytaman.",
    ];
    return pick(phrases);
  }, [pick]);

  const sayGreeting = useCallback(() => {
    const phrases = [
      "Ha, tinglayapman. Buyruq bering.",
      "Aytang, qanday yordam kerak?",
      "Ha, ayting. Sizga yordam berishga tayyorman.",
    ];
    return pick(phrases);
  }, [pick]);

  /** Vaqtga qarab salomlashuv: tong / kun / kech / tun. Har safar boshqacha, muloyim, haqiqiy kotiba kabi. */
  const sayWake = useCallback((userName: string) => {
    const now = new Date();
    const hour = now.getHours();
    const dayPart =
      hour >= 5 && hour < 12 ? "tong"
      : hour >= 12 && hour < 18 ? "kun"
      : hour >= 18 && hour < 22 ? "kech"
      : "tun";
    const timeGreeting = `Xayrli ${dayPart}`;
    const followUps = [
      "Kuningiz yaxshi boshlansin. Nima buyursangiz, tinglayapman.",
      "Charchamadingizmi? Qanday yordam bera olaman?",
      "Bugun dasturda nima ishlar qilamiz? Buyruq bering.",
      "Sizga qanday yordam kerak? Aytang, bajaraman.",
      "Buyruq bering, platformani boshqarishga tayyorman.",
      "Qanday ish bilan yordam bera olaman?",
    ];
    const follow = pick(followUps);
    return `${timeGreeting}, ${userName}. ${follow}`;
  }, [pick]);

  const sayIdle = useCallback(() => {
    const phrases = [
      "Kerak bo'lsa, Salom Ziyrak deb chaqiring. Sizni tinglashga tayyorman.",
      "Yordam kerak bo'lsa, chaqiring. Mening ismim Ziyrak.",
    ];
    return pick(phrases);
  }, [pick]);

  const sayError = useCallback(() => {
    const phrases = ["Xatolik. Qayta urinib ko'ring.", "Bir ozdan keyin qaytaning."];
    return pick(phrases);
  }, [pick]);

  const sayHelpIntro = useCallback(() => {
    const phrases = ["Ha, shuni qila olaman. ", "Mening imkoniyatlarim: "];
    return pick(phrases);
  }, [pick]);

  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  const getAuthHeaders = useCallback(() => {
    if (typeof window === "undefined") return null;
    const token = localStorage.getItem("access_token");
    if (!token) return null;
    return {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  }, []);

  const speak = useCallback(
    async (text: string) => {
      if (!AZURE_KEY || typeof window === "undefined" || !text.trim()) return;
      if (isSpeakingRef.current) return;
      isSpeakingRef.current = true;
      try {
        if (synthesizerRef.current) {
          try {
            synthesizerRef.current.close();
          } catch {}
          synthesizerRef.current = null;
        }
        const SpeechSDK = await import("microsoft-cognitiveservices-speech-sdk");
        const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(AZURE_KEY, AZURE_REGION);
        speechConfig.speechSynthesisVoiceName = "uz-UZ-MadinaNeural";
        speechConfig.speechSynthesisOutputFormat = SpeechSDK.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3;
        const audioConfig = SpeechSDK.AudioConfig.fromDefaultSpeakerOutput();
        const synthesizer = new SpeechSDK.SpeechSynthesizer(speechConfig, audioConfig);
        synthesizerRef.current = synthesizer;
        const escaped = text
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;");
        const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="uz-UZ"><voice name="uz-UZ-MadinaNeural"><prosody rate="1.15">${escaped}</prosody></voice></speak>`;
        await new Promise<void>((resolve, reject) => {
          synthesizer.speakSsmlAsync(
            ssml,
            () => {
              if (synthesizerRef.current === synthesizer) synthesizerRef.current = null;
              synthesizer.close();
              resolve();
            },
            (err: string) => {
              if (synthesizerRef.current === synthesizer) synthesizerRef.current = null;
              synthesizer.close();
              reject(new Error(err));
            }
          );
        });
      } catch (e) {
        if (String(e).includes("cancel") || String(e).includes("Canceled")) return;
        console.warn("Ziyrak TTS:", e);
      } finally {
        isSpeakingRef.current = false;
      }
    },
    []
  );

  const runQuery = useCallback(
    async (query: string, entity?: string): Promise<string> => {
      const headers = getAuthHeaders;
      if (!headers()) return "Tizimga kirish kerak.";
      try {
        switch (query) {
          case "expenses_total":
            return await ZiyrakApi.fetchExpensesTotal(baseUrl, headers);
          case "expenses_recent":
            return await ZiyrakApi.fetchExpensesRecent(baseUrl, headers);
          case "client_debt":
            return await ZiyrakApi.fetchClientDebt(baseUrl, headers, entity ?? "");
          case "client_balance":
            return await ZiyrakApi.fetchClientBalance(baseUrl, headers, entity ?? "");
          case "client_phone":
            return await ZiyrakApi.fetchClientPhone(baseUrl, headers, entity ?? "");
          case "client_address":
            return await ZiyrakApi.fetchClientAddress(baseUrl, headers, entity ?? "");
          case "clients_count":
            return await ZiyrakApi.fetchClientsCount(baseUrl, headers);
          case "client_purchased_apartment":
            return await ZiyrakApi.fetchClientPurchasedApartment(baseUrl, headers, entity ?? "");
          case "supplier_debt":
            return await ZiyrakApi.fetchSupplierDebt(baseUrl, headers, entity ?? "");
          case "suppliers_balance":
            return await ZiyrakApi.fetchSuppliersBalance(baseUrl, headers);
          case "suppliers_count":
            return await ZiyrakApi.fetchSuppliersCount(baseUrl, headers);
          case "qarzdorlar_summary":
            return await ZiyrakApi.fetchQarzdorlarSummary(baseUrl, headers);
          case "qarzdorlar_list":
            return await ZiyrakApi.fetchQarzdorlarList(baseUrl, headers);
          case "top_qarzdor":
            return await ZiyrakApi.fetchTopQarzdor(baseUrl, headers);
          case "payments_stats":
            return await ZiyrakApi.fetchPaymentsStats(baseUrl, headers);
          case "dashboard":
            return await ZiyrakApi.fetchDashboard(baseUrl, headers);
          case "apartments_count":
            return await ZiyrakApi.fetchApartmentsCount(baseUrl, headers);
          case "apartments_free":
            return await ZiyrakApi.fetchApartmentsFree(baseUrl, headers);
          case "apartments_sold_count":
            return await ZiyrakApi.fetchApartmentsSoldCount(baseUrl, headers);
          case "apartments_not_sold_count":
            return await ZiyrakApi.fetchApartmentsNotSoldCount(baseUrl, headers);
          case "object_sold_count":
            return await ZiyrakApi.fetchObjectSoldCount(baseUrl, headers, entity ?? "");
          case "object_bosh_count":
            return await ZiyrakApi.fetchObjectBoshCount(baseUrl, headers, entity ?? "");
          case "total_area":
            return await ZiyrakApi.fetchTotalArea(baseUrl, headers, false);
          case "sold_area":
            return await ZiyrakApi.fetchTotalArea(baseUrl, headers, true);
          case "bosh_apartments_by_rooms":
            return await ZiyrakApi.fetchBoshApartmentsByRooms(baseUrl, headers, parseInt(entity ?? "1", 10));
          case "apartments_by_floor":
            return await ZiyrakApi.fetchApartmentsByFloor(baseUrl, headers, parseInt(entity ?? "1", 10));
          case "apartments_by_floor_and_rooms": {
            const [f, r] = (entity ?? "1_1").split("_").map((n) => parseInt(n, 10));
            return await ZiyrakApi.fetchApartmentsByFloorAndRooms(baseUrl, headers, f || 1, r || 1);
          }
          case "objects_with_rooms_bosh":
            return await ZiyrakApi.fetchObjectsWithRoomsBosh(baseUrl, headers, parseInt(entity ?? "1", 10));
          case "objects_with_bosh_on_floor":
            return await ZiyrakApi.fetchObjectsWithBoshOnFloor(baseUrl, headers, parseInt(entity ?? "1", 10));
          case "objects_count":
            return await ZiyrakApi.fetchObjectsCount(baseUrl, headers);
          case "object_apartments":
            return await ZiyrakApi.fetchObjectApartments(baseUrl, headers, entity ?? "");
          case "apartment_price":
            return await ZiyrakApi.fetchApartmentPrice(baseUrl, headers, entity ?? "");
          case "apartment_status":
            return await ZiyrakApi.fetchApartmentStatus(baseUrl, headers, entity ?? "");
          default:
            return "Ma'lumot topilmadi.";
        }
      } catch {
        return "Ma'lumot olinmadi.";
      }
    },
    []
  );

  const handleIntent = useCallback(
    async (intent: NonNullable<ReturnType<typeof parseZiyrakIntent>>) => {
      if (intent.type === "navigate" && intent.path) {
        let url = intent.path;
        const hasApartmentFilter = intent.path === "/apartments" && (intent.filterApartmentObjectName ?? intent.filterApartmentRooms ?? intent.filterApartmentStatus);
        if (hasApartmentFilter) {
          const params = new URLSearchParams();
          if (intent.filterApartmentObjectName) {
            setStatusText("Obyekt qidirilmoqda...");
            try {
              const list = await ZiyrakApi.fetchObjects(baseUrl, getAuthHeaders);
              const obj = list.find((x) => x.name.toLowerCase().includes(intent.filterApartmentObjectName!.toLowerCase()));
              if (obj) params.set("property", String(obj.id)); else setStatusText("");
            } catch {
              setStatusText("");
            }
          }
          if (intent.filterApartmentRooms) params.set("rooms", intent.filterApartmentRooms);
          if (intent.filterApartmentStatus) params.set("status", intent.filterApartmentStatus);
          const qs = params.toString();
          if (qs) url += "?" + qs;
          const parts: string[] = [];
          if (intent.filterApartmentObjectName) parts.push(intent.filterApartmentObjectName + " obyekti");
          if (intent.filterApartmentRooms) parts.push(intent.filterApartmentRooms + " xonali");
          if (intent.filterApartmentStatus === "bosh") parts.push("bo'sh");
          if (intent.filterApartmentStatus === "band") parts.push("band");
          if (intent.filterApartmentStatus === "sotilgan") parts.push("sotilgan");
          if (intent.filterApartmentStatus === "muddatli") parts.push("muddatli");
          const filterDesc = parts.length ? parts.join(", ") + " filtri bilan" : "";
          await speak(filterDesc ? `Xonadonlar sahifasini ${filterDesc} ochdim.` : "Xonadonlar sahifasini ochdim.");
        } else if (intent.filterObjectName) {
          setStatusText("Obyekt qidirilmoqda...");
          try {
            const list = await ZiyrakApi.fetchObjects(baseUrl, getAuthHeaders);
            const obj = list.find((x) => x.name.toLowerCase().includes(intent.filterObjectName!.toLowerCase()));
            if (obj) {
              url += `?object=${obj.id}`;
              await speak(`${intent.label}, ${obj.name} bo'yicha filtrlashni ochdim.`);
            } else {
              setStatusText("");
              await speak(`${intent.filterObjectName} obyekti topilmadi. ${intent.label} sahifasini ochdim.`);
            }
          } catch {
            setStatusText("");
            await speak(`${intent.label} sahifasini ochdim.`);
          }
        } else if (intent.openAdd) {
          url += "?openAdd=1";
          const addLabels: Record<string, string> = {
            "/expenses": "xarajat qo'shish",
            "/payments": "to'lov qo'shish",
            "/clients": "mijoz qo'shish",
            "/suppliers": "yetkazib beruvchi qo'shish",
          };
          const addLabel = addLabels[intent.path] ?? "qo'shish";
          await speak(`${intent.label} sahifasini ochdim, ${addLabel} formasini oching.`);
        } else if (intent.openRemaining) {
          url += "?openRemaining=1";
          await speak("To'lovlar sahifasini ochdim, qoldiq tafsilotlari oynasi ochiladi.");
        } else if (intent.openOverdue) {
          url += "?openOverdue=1";
          await speak("To'lovlar sahifasini ochdim, muddati o'tgan tafsilotlari oynasi ochiladi.");
        } else {
          await speak(`Ochdim, ${intent.label}.`);
        }
        setStatusText("");
        router.push(url);
        return;
      }
      if (intent.type === "open") {
        setStatusText("Qidirilmoqda...");
        const headers = getAuthHeaders;
        if (!headers()) {
          setStatusText("");
          await speak("Tizimga kirish kerak.");
          return;
        }
        try {
          if (intent.page === "client") {
            const clients = await ZiyrakApi.fetchClients(baseUrl, headers);
            const client = clients.find((c) => c.fio.toLowerCase().includes(intent.entity.toLowerCase()));
            if (client) {
              router.push(`/clients/${client.id}`);
              await speak(`${client.fio} sahifasini ochdim.`);
            } else await speak(`${intent.entity} topilmadi.`);
          } else if (intent.page === "supplier") {
            const list = await ZiyrakApi.fetchSuppliers(baseUrl, headers);
            const s = list.find((x) => x.company_name.toLowerCase().includes(intent.entity.toLowerCase()));
            if (s) {
              router.push(`/suppliers/${s.id}`);
              await speak(`${s.company_name} sahifasini ochdim.`);
            } else await speak(`${intent.entity} topilmadi.`);
          } else if (intent.page === "object") {
            const list = await ZiyrakApi.fetchObjects(baseUrl, headers);
            const obj = list.find((x) => x.name.toLowerCase().includes(intent.entity.toLowerCase()));
            if (obj) {
              router.push(`/properties/${obj.id}`);
              await speak(`${obj.name} obyekt sahifasini ochdim.`);
            } else await speak(`${intent.entity} topilmadi.`);
          } else if (intent.page === "apartment") {
            const list = await ZiyrakApi.fetchApartments(baseUrl, headers);
            const apt = list.find(
              (a) =>
                `${a.object_name ?? ""} ${a.room_number}`.toLowerCase().includes(intent.entity.toLowerCase()) ||
                a.room_number.toLowerCase().includes(intent.entity.toLowerCase())
            );
            if (apt) {
              router.push(`/apartments/${apt.id}`);
              await speak(`${apt.object_name ?? ""} ${apt.room_number} sahifasini ochdim.`);
            } else await speak(`${intent.entity} topilmadi.`);
          }
        } finally {
          setStatusText("");
        }
        return;
      }
      if (intent.type === "action" && intent.action === "add_balance") {
        setStatusText("Qo'shilmoqda...");
        const ans = await ZiyrakApi.addBalanceToClient(baseUrl, getAuthHeaders, intent.entity, intent.amount);
        setStatusText("");
        await speak(ans);
        return;
      }
      if (intent.type === "action" && intent.action === "download_report") {
        setStatusText("Hisobot yuklanmoqda...");
        const ans = await ZiyrakApi.generateAndDownloadReport(baseUrl, getAuthHeaders);
        setStatusText("");
        await speak(ans);
        return;
      }
      if (intent.type === "action" && intent.action === "go_back") {
        router.back();
        await speak("Orqaga o'tdim.");
        return;
      }
      if (intent.type === "action" && intent.action === "refresh") {
        if (typeof window !== "undefined") window.location.reload();
        await speak("Sahifa yangilanmoqda.");
        return;
      }
      if (intent.type === "action" && intent.action === "logout") {
        if (typeof window !== "undefined") {
          localStorage.removeItem("access_token");
          localStorage.removeItem("user_type");
          localStorage.removeItem("user_fio");
        }
        router.push("/login");
        await speak("Tizimdan chiqildi.");
        return;
      }
      if (intent.type === "answer" && intent.query === "help") {
        const helpText =
          sayHelpIntro() +
          "Sahifalar: bosh sahifa, xarajatlar, to'lovlar, qarzdorlar, mijozlar, obyektlar, xonadonlar, yetkazib beruvchilar, hisobot, sozlamalar. " +
          "Sotuv: sotuv, sotuv obyektlar, sotuv uylar, sotuv mijozlar, sotuv shartnomalar, virtual tur. " +
          "Qo'shish: xarajat qo'sh, to'lov qo'sh, mijoz qo'sh, yetkazib beruvchi qo'sh, yangi obyekt, yangi xonadon. " +
          "Xonadonlar filtri: faqat Assalom obyekti xonadonlar, Assalom obyektidagi 2 xonali bo'sh xonadonlarni ko'rsat, bo'sh xonadonlar, 3 xonali uylar. " +
          "To'lovlar: yangi to'lov qo'sh, qoldiq tafsilotlari, muddati o'tgan tafsilotlari. " +
          "So'rovlar: eng ko'p qarzdor kim, X qaysi uyni sotib olgan, nechta sotilgan, qancha kvadrat, N etajda nechta xonadon, qaysi obyektda N xonali bosh bor va boshqalar. " +
          "Amallar: hisobot yuklab olish, orqaga, yangilash, chiqish. " +
          "Sahifa ochish: Ahmad mijoz sahifasini och, Assalom obyekti bo'yicha xarajatlarni ko'rsat.";
        await speak(helpText);
        return;
      }
      if (intent.type === "answer" && intent.query === "current_time") {
        const now = new Date();
        const options: Intl.DateTimeFormatOptions = { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" };
        const uzbek = new Intl.DateTimeFormat("uz-UZ", options).format(now);
        const intro = pick(["Hozirgi vaqt: ", "Soat va sana: "]);
        await speak(`${intro}${uzbek}.`);
        return;
      }
      if (intent.type !== "answer") return;
      if (intent.query === "greeting") {
        await speak(sayGreeting());
        return;
      }
      if (intent.query === "unknown") {
        const now = Date.now();
        if (now - lastUnknownAtRef.current < UNKNOWN_COOLDOWN_MS) return;
        lastUnknownAtRef.current = now;
        await speak(sayUnknown());
        return;
      }
      setStatusText("Hisoblanmoqda...");
      const ans = await runQuery(intent.query, intent.entity);
      setStatusText("");
      await speak(ans);
    },
    [router, speak, runQuery, sayGreeting, sayUnknown, sayHelpIntro, pick]
  );

  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      if (!isMountedRef.current) return;
      setIsActive(false);
      setStatusText("");
      speak(sayIdle()).catch(() => {});
    }, ACTIVITY_TIMEOUT_MS);
  }, [speak, sayIdle]);

  const startListening = useCallback(async () => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("access_token");
    if (!token) return;

    if (!AZURE_KEY) {
      setStatusText("Azure Speech kaliti sozlanmagan");
      return;
    }

    setStatusText("Ovoz yuklanmoqda...");
    try {
      const SpeechSDK = await import("microsoft-cognitiveservices-speech-sdk");
      const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(AZURE_KEY, AZURE_REGION);
      speechConfig.speechRecognitionLanguage = "uz-UZ";
      const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
      const rec = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);

      recognizerRef.current = rec;
      rec.recognizing = () => setIsListening(true);
      rec.recognized = (_s: unknown, e: { result: { text?: string; reason?: number }; reason?: number }) => {
        if (isSpeakingRef.current || isProcessingRef.current) return;
        const result = e.result;
        const text = (result?.text ?? "").trim();
        const reason = result?.reason ?? e.reason;
        const RecognizedSpeech = 3;
        const isWake = isZiyrakWakePhrase(text);
        const isFinalResult = reason === RecognizedSpeech;
        if (!text) return;
        if (!isWake && !isFinalResult) return;
        if (!isWake && text.length < MIN_TEXT_LENGTH) return;

        const now = Date.now();
        const sameRecently =
          lastProcessedTextRef.current.length >= MIN_TEXT_LENGTH &&
          now - lastProcessedAtRef.current < DEBOUNCE_MS &&
          (text === lastProcessedTextRef.current ||
            text.includes(lastProcessedTextRef.current) ||
            lastProcessedTextRef.current.includes(text));
        if (sameRecently && !isWake) return;

        if (!isActiveRef.current && isWake) {
          lastProcessedTextRef.current = text;
          lastProcessedAtRef.current = now;
          setIsActive(true);
          isProcessingRef.current = true;
          const rawName = (typeof window !== "undefined" && localStorage.getItem("user_fio")) || "";
          const userName = rawName
            ? rawName.trim().endsWith(" aka") || rawName.trim().endsWith(" opa")
              ? rawName.trim()
              : `${rawName.trim()} aka`
            : "siz";
          speak(sayWake(userName)).finally(() => {
            isProcessingRef.current = false;
          });
          resetIdleTimer();
          return;
        }

        if (isActiveRef.current) {
          const intent = parseZiyrakIntent(text);
          if (intent) {
            lastProcessedTextRef.current = text;
            lastProcessedAtRef.current = now;
            resetIdleTimer();
            isProcessingRef.current = true;
            handleIntent(intent).catch(() => {
              speak(sayError()).finally(() => {});
            }).finally(() => {
              isProcessingRef.current = false;
            });
          } else if (text.trim().length >= MIN_TEXT_LENGTH) {
            if (isZiyrakWakePhrase(text)) {
              lastProcessedTextRef.current = text;
              lastProcessedAtRef.current = now;
              resetIdleTimer();
            }
            const now2 = Date.now();
            if (now2 - lastUnknownAtRef.current >= UNKNOWN_COOLDOWN_MS) {
              lastUnknownAtRef.current = now2;
              speak(sayUnknown()).catch(() => {});
            }
          }
        }
      };
      rec.sessionStopped = () => setIsListening(false);
      rec.canceled = () => setIsListening(false);

      await rec.startContinuousRecognitionAsync();
      setStatusText(isActiveRef.current ? "Tinglanmoqda..." : "Salom Ziyrak deb ayting");
    } catch (err) {
      console.error("Ziyrak STT:", err);
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("Permission") || msg.includes("NotAllowed") || msg.includes("microphone")) {
        setStatusText("Microfon ruxsati kerak");
      } else if (msg.includes("401") || msg.includes("Unauthorized")) {
        setStatusText("Azure kalit xato");
      } else {
        setStatusText("Ovoz ishga tushmadi");
      }
    }
  }, [speak, resetIdleTimer, handleIntent, sayWake, sayUnknown, sayError]);

  const stopListening = useCallback(async () => {
    const rec = recognizerRef.current;
    if (rec) {
      try {
        await rec.stop();
      } catch {}
      recognizerRef.current = null;
    }
    setIsListening(false);
    setStatusText("");
  }, []);

  const [hasToken, setHasToken] = useState(false);
  const [listeningStarted, setListeningStarted] = useState(false);
  useEffect(() => {
    setHasToken(!!(typeof window !== "undefined" && localStorage.getItem("access_token")));
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      stopListening();
    };
  }, [stopListening]);

  /** Sahifada bir marta ixtiyoriy bosish (yoki boshqa harakat) — brauzer ovozni ochishi uchun. Tugma bosish shart emas. */
  useEffect(() => {
    if (typeof window === "undefined" || !hasToken || !AZURE_KEY || listeningStarted) return;
    const startOnce = () => {
      setListeningStarted(true);
      startListening();
    };
    const opts = { passive: true, capture: true };
    const onGesture = () => {
      document.removeEventListener("click", onGesture, opts);
      document.removeEventListener("touchstart", onGesture, opts);
      document.removeEventListener("keydown", onGesture, opts);
      startOnce();
    };
    document.addEventListener("click", onGesture, opts);
    document.addEventListener("touchstart", onGesture, opts);
    document.addEventListener("keydown", onGesture, opts);
    return () => {
      document.removeEventListener("click", onGesture, opts);
      document.removeEventListener("touchstart", onGesture, opts);
      document.removeEventListener("keydown", onGesture, opts);
    };
  }, [hasToken, listeningStarted, startListening]);

  const onZiyrakClick = useCallback(() => {
    if (!hasToken || !AZURE_KEY) return;
    if (!listeningStarted) {
      setListeningStarted(true);
      startListening();
    }
  }, [hasToken, listeningStarted, startListening]);

  if (!hasToken) return null;

  return (
    <div
      className="fixed bottom-20 right-4 z-40 flex flex-col items-end gap-1"
      aria-label="Ziyrak ovozli yordamchi"
    >
      {statusText && (
        <div className="rounded-lg bg-background/90 px-3 py-2 text-xs shadow-lg border backdrop-blur">
          {statusText}
        </div>
      )}
      <button
        type="button"
        onClick={onZiyrakClick}
        className={`
          flex h-12 w-12 items-center justify-center rounded-full shadow-lg border
          transition-all duration-300 cursor-pointer
          hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-400
          ${isActive ? "bg-green-500/90 text-white" : "bg-violet-500/90 text-white"}
          ${isListening ? "ring-4 ring-green-300/50 scale-110" : ""}
        `}
        title={isActive ? "Ziyrak faol" : "Salom Ziyrak deb ayting"}
      >
        {isListening ? (
          <Mic className="h-6 w-6 animate-pulse" />
        ) : (
          <Bot className="h-6 w-6" />
        )}
      </button>
      {!listeningStarted && (
        <div className="rounded-lg bg-background/90 px-2 py-1 text-[10px] shadow border backdrop-blur max-w-[160px] text-center">
          &quot;Salom Ziyrak&quot; deb ayting. Brauzer talabida sahifada bir marta bosing.
        </div>
      )}
    </div>
  );
}
