# Ziyrak — platformadagi barcha funksiyalar (100+)

Har bir qator Ziyrak orqali boshqariladigan yoki so‘rov qilinadigan funksiya.

## Navigatsiya (sahifa ochish)
1. Bosh sahifa
2. Qarzdorlar sahifasi
3. Obyektlar sahifasi
4. Xonadonlar sahifasi
5. Mijozlar sahifasi
6. Hujjatlar sahifasi
7. To'lovlar sahifasi
8. Yetkazib beruvchilar sahifasi
9. Xarajatlar sahifasi
10. Hisobot yuklab olish sahifasi
11. Sozlamalar sahifasi
12. Yangi obyekt qo'shish sahifasi (properties/add)
13. Yangi xonadon qo'shish sahifasi (apartments/add)
14. Sotuv bo'limi (sotuv)
15. Sotuv obyektlar
16. Sotuv uylar
17. Sotuv mijozlar
18. Sotuv shartnomalar
19. Sotuv virtual tur
20. Xonadon band qilish (reserve)

## Filtrlash (obyekt bo'yicha)
21. Xarajatlar X obyekti bo'yicha
22. To'lovlar X obyekti bo'yicha

## Qo'shish / Ochish (modal yoki sahifa)
23. Xarajat qo'sh (expenses + openAdd)
24. To'lov qo'sh (payments + openAdd)
25. Mijoz qo'sh (clients + openAdd)
26. Yetkazib beruvchi qo'sh (suppliers + openAdd)
27. Hisobot yuklab olish (download report)

## Ochish by name (sahifaga yo'naltirish)
28. X mijoz sahifasini och
29. X yetkazib beruvchi sahifasini och
30. X obyekt sahifasini och
31. X xonadon sahifasini och

## Amallar
32. Orqaga
33. Sahifani yangilash
34. Tizimdan chiqish
35. Mijoz balansiga summa qo'sh (add_balance)

## So'rovlar — Mijozlar
36. X ning qarzi qancha
37. X ning balansi
38. X ning telefoni
39. X ning manzili
40. Mijozlar nechta
41. X qaysi uyni sotib olgan
42. X mijoz sahifasini och

## So'rovlar — Yetkazib beruvchilar
43. X dan qancha qarz
44. Yetkazib beruvchilarga jami qarz
45. Yetkazib beruvchilar nechta

## So'rovlar — Xarajatlar
46. Jami xarajatlar qancha
47. So'nggi xarajatlar
48. Xarajatlar sahifasini och
49. X obyekti bo'yicha xarajatlar

## So'rovlar — Qarzdorlar
50. Qarzdorlar jami qancha
51. Qarzdorlar ro'yxati
52. Eng ko'p qarzdor kim
53. Qarzdorlar sahifasini och

## So'rovlar — To'lovlar va statistika
54. To'lovlar statistikasi
55. Umumiy statistika / dashboard
56. Bosh sahifa raqamlari

## So'rovlar — Xonadonlar va obyektlar
57. Xonadonlar nechta
58. Bo'sh xonadonlar nechta
59. Obyektlar nechta
60. X obyektda nechta xonadon
61. X xonadon narxi
62. X xonadon holati
63. X obyektda nechta sotilgan uy
64. X obyektda nechta bosh uy
65. Nechta sotilgan uy
66. Nechta sotilmagan uy
67. Qancha kvadrat (barcha/sotilgan)
68. Nechta 1 xonali bosh uy
69. N etajda nechta xonadon
70. N etajda nechta M xonali
71. Qaysi obyektda N xonali bosh bor
72. Qaysi obyektning N etajida bosh bor

## To'lovlar sahifasi — modallar
73. Yangi to'lov qo'shish (openAdd)
74. Jami qoldiq tafsilotlari (openRemaining)
75. Muddati o'tgan tafsilotlari (openOverdue)

## Hujjatlar
76. Hujjatlar sahifasini och
77. Hujjatlar ro'yxati

## Sozlamalar
78. Sozlamalar sahifasi
79. Sozlamalarni och

## Yordam va tizim
80. Yordam / Nima qila olaman
81. Vaqt / Sana
82. Salom Ziyrak (wake)

## Qo'shimcha iboralar (har bir funksiya uchun bir nechta variant)
83–100. Har bir yuqoridagi funksiya uchun 2–5 ta tabiiy ibora (masalan: "bosh sahifa", "asosiy", "home", "bosh menyu" — bitta funksiya uchun).

### Todolar jadvali (har bir tugma/funksiya)
| # | Todo | Intent/NAV |
|---|------|------------|
| 1–11 | Bosh, Qarzdorlar, Obyektlar, Xonadonlar, Mijozlar, Hujjatlar, To'lovlar, Yetkazib beruvchilar, Xarajatlar, Hisobot, Sozlamalar | NAV |
| 12–13 | Yangi obyekt / yangi xonadon sahifasi | NAV |
| 14–19 | Sotuv, Sotuv obyektlar/uylar/mijozlar/shartnomalar, Virtual tur | NAV |
| 20–24 | Xarajat/To'lov/Mijoz/Yetkazib beruvchi qo'sh, Hisobot yuklab olish | openAdd / download_report |
| 25–26 | Qoldiq tafsilotlari, Muddati o'tgan tafsilotlari | openRemaining / openOverdue |
| 27–28 | X obyekti bo'yicha xarajatlar/to'lovlar | filterObjectName |
| 29–32 | X mijoz/yetkazib beruvchi/obyekt/xonadon sahifasini och | open by name |
| 33–36 | Orqaga, Yangilash, Chiqish, X ga summa qo'sh | action |
| 37–48 | Barcha so'rovlar (eng ko'p qarzdor, qaysi uy, nechta sotilgan, kvadrat, etaj, xonali va h.k.) | answer + API |
| 49–50 | Yordam, Vaqt | help / current_time |

---
**Jami:** 100+ funksiya. Ziyrak intents va NAV da har biri uchun kerakli patternlar qo‘shilgan.
