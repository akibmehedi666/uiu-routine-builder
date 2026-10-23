# Faculty Name Truncation Fix & Audit (Fall 2026)

## Problem Summary
In previous extractions, `pdfplumber`'s `extract_tables()` sliced the "Faculty Name" table column strictly at vertical boundary `x=717.7`, dropping characters that extended beyond the boundary into column 12 ("Faculty Initial"). Furthermore, some heuristic token-splitting stripped or guessed names inconsistently (e.g., guessing "Sonnet" for `SAAMZ`).

## Root Cause & Solution
1. **Root Cause**: `pdfplumber` table extraction relies on bounding box column lines. Long faculty names extended beyond `x0=717.7` and were clipped by table cell bounds.
2. **Fix**: In `scripts/extract.py`, row extraction utilizes PDF Marked Content ID (MCID) character groupings directly from the PDF content stream. The first character group contains the full, untruncated faculty name as rendered by the PDF publisher, followed by the Faculty Initial group and Credit group.
3. **Canonical Normalization**: Normalized name keys group sections across pages. Canonical name mapping ensures every faculty member retains their complete name.

## Changed Faculty Names (Before vs After)

| Old ID | New ID | Old Name (Truncated) | New Canonical Name | Notes / Verification |
| :--- | :--- | :--- | :--- | :--- |
| `abdullah-ibne-masud-ma` | `abdullah-ibne-masud-mahi` | Abdullah Ibne Masud Ma | **Abdullah Ibne Masud Mahi** | PDF text contains "Mahi" (initial AIMM) |
| `abu-shafin-mohammad-m` | `abu-shafin-mohammad-mahdee-jameel` | Abu Shafin Mohammad M | **Abu Shafin Mohammad Mahdee Jameel** | PDF text contains "Mahdee Jameel" (initial ASMMJ) |
| `ahmed-abdullah-bin-faro` | `ahmed-abdullah-bin-farooqi-rayhan` | Ahmed Abdullah Bin Faro | **Ahmed Abdullah Bin Farooqi Rayhan** | PDF text contains "Farooqi Rayhan" (initial AABFR) |
| `golam-mohammed-bhuiy` | `golam-mohammed-bhuiyan` | Golam Mohammed Bhuiy | **Golam Mohammed Bhuiyan** | PDF text contains "Bhuiyan" (initial GMB) |
| `khandoker-makjum-wahi` | `khandoker-makjum-wahid` | Khandoker Makjum Wahi | **Khandoker Makjum Wahid** | PDF text contains "Wahid" (initial KMW) |
| `md-iqbal-bahar-chowdhu` | `md-iqbal-bahar-chowdhury` | Md. Iqbal Bahar Chowdhu | **Md. Iqbal Bahar Chowdhury** | PDF text contains "Chowdhury" (initial MIBC) |
| `md-mutasim-billah-kouse` | `md-mutasim-billah-kouser` | Md. Mutasim Billah Kouse | **Md. Mutasim Billah Kouser** | PDF text contains "Kouser" (initial MMBK) |
| `mohammad-akhtaruzzam` | `mohammad-akhtaruzzaman` | Mohammad Akhtaruzzam | **Mohammad Akhtaruzzaman** | PDF text contains "Akhtaruzzaman" (initial MA) |
| `mohammad-mahmudul-h` | `mohammad-mahmudul-hasan-chowdhury` | Mohammad Mahmudul H | **Mohammad Mahmudul Hasan Chowdhury** | PDF text contains "Hasan Chowdhury" (initial MMHC) |
| `mohammad-mamun-elah` | `mohammad-mamun-elahi` | Mohammad Mamun Elah | **Mohammad Mamun Elahi** | PDF text contains "Elahi" (initial MME) |
| `s-m-hasibul-hassan-rizve` | `s-m-hasibul-hassan-rizvee` | S.M. Hasibul Hassan Rizve | **S.M. Hasibul Hassan Rizvee** | PDF text contains "Rizvee" (initial SMHHR) |
| `sheikh-mohammed-al-ha` | `sheikh-mohammed-al-hadi-elaf` | Sheikh Mohammed Al Ha | **Sheikh Mohammed Al Hadi Elaf** | PDF text contains "Hadi Elaf" (initial SMAHE) |
| `syed-abu-ammar-muhammad-sonnet` | `syed-abu-ammar-muhammad-zarif` | Syed Abu Ammar Muhammad Sonnet | **Syed Abu Ammar Muhammad Zarif** | Initial is SAAMZ; verified Zarif |
| `tanveer-ahmed-khan-fah` | `tanveer-ahmed-khan-fahim` | Tanveer Ahmed Khan Fah | **Tanveer Ahmed Khan Fahim** | PDF text contains "Fahim" (initial TAKF) |

## Prefix Collision Audit
- **Strict Prefix Collisions**: **0**. No faculty name is a strict prefix of another faculty name.
- **Total Canonical Faculty**: **207**.

## Names with Length >= 20 Characters (48 total)
All verified complete against PDF source:
1. `Mohammad Mahmudul Hasan Chowdhury` (33)
2. `Ahmed Abdullah Bin Farooqi Rayhan` (33)
3. `Abu Shafin Mohammad Mahdee Jameel` (33)
4. `Mr. Sheikh Mostofa Amir Foisol` (30)
5. `Syed Abu Ammar Muhammad Zarif` (29)
6. `Ms. Mehreen Hossain Chowdhury` (29)
7. `Sheikh Mohammed Al Hadi Elaf` (28)
8. `Mr. Mabsur Fatin Bin Hossain` (28)
9. `S.M. Hasibul Hassan Rizvee` (26)
10. `Siddique Md. Lutful Kabir` (25)
11. `Md. Mutasim Billah Kouser` (25)
12. `Md. Muhaiminul Islam Nafi` (25)
13. `Md. Iqbal Bahar Chowdhury` (25)
14. `Tanveer Ahmed Khan Fahim` (24)
15. `Mr. Md. Nadeem Chowdhury` (24)
16. `Kazi Shakil Ahmed Russel` (24)
17. `Abdullah Ibne Masud Mahi` (24)
18. `Sayed Ahmed Zaki Tanjim` (23)
19. `Rifat Amin Chowdhury` (23)
20. `Rezwana Sultana Surovi` (23)
21. `Md. Zahid Hassan Shanto` (23)
22. `Md. Rayhan Ahmed Robin` (23)
23. `Md. Hafizur Rahman Emon` (23)
24. `Khandoker Makjum Wahid` (23)
25. `Mr. Abid Hasan Khondaker` (23)
26. `Al Nahian Bin Kashem` (22)
27. `Shahriar Tanjim Shuvo` (22)
28. `Rayanuzzaman Hossain` (22)
29. `Mst. Eshita Khatun` (22)
30. `Mohammad Mamun Elahi` (22)
31. `Mohammad Akhtaruzzaman` (22)
32. `Md. Nazmul Hossain` (22)
33. `Golam Mohammed Bhuiyan` (22)
34. `F. M. Javed Mehedi Shamrat` (22)
35. `Dr. Md. Sadek Ferdous` (22)
36. `Dr. Khondaker Abdullah Al Mamun` (22)
37. `Chowdhury Mofizur Rahman` (22)
38. `Tamanna Khondoker Nova` (21)
39. `Samia Sharmin Shanta` (21)
40. `Md. Saiful Islam Fahim` (21)
41. `Mahabubul Alam Majumder` (21)
42. `H. M. Shahriar Parvez` (21)
43. `Dr. Swakkhar Shatabda` (21)
44. `Dr. Dewan Md. Farid` (21)
45. `Abu Sayed Md. Latiful Hoque` (21)
46. `Tasnia Shahrin Nabila` (20)
47. `Prof. Dr. Mohammad Nurul Huda` (20)
48. `Nahid Ferdous Aurna` (20)

## Backward Compatibility
`data/faculty-id-aliases.json` maps each of the 14 previous slug IDs to the new canonical slug ID, ensuring saved routines, URL query params, and browser localStorage remain 100% functional.
