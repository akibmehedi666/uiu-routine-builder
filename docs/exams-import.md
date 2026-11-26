# Mid-Term Exam Schedule Import Report

- **Source file**: `mid-term-exam-schedule_sose_notice-board_263.xlsx`
- **Excel columns**: `School | Dept. | Course Code | Course Title | Section | Teacher | Exam Date | Exam Time | Room`
- **Total data rows**: 574
- **Rows kept (BSCSE + BSDS)**: 472
- **Rows dropped (other departments)**: 102 (BSCE: 22, BSEEE: 80)
- **Matched to `data/sections.json`**: 463
- **Unmatched exam rows (`sectionId: null`)**: 9
- **Exam rows for dropped sections**: 0
- **Active `theory` sections (non-lab, non-FYDP) without exam row**: 35
- **Active `single-day-theory` sections (non-lab, non-FYDP) without exam row**: 42
- **Courses with >1 exam slot**: 1
- **Student ID range anomalies**: 0
- **Teacher initials mismatches vs `data/sections.json`**: 268

## Unmatched Exam Rows (Warnings)

| Row | Program | Codes | Section | Title | Date |
|---|---|---|---|---|---|
| 85 | BSCSE | CSE 313 / CSE 3313 | M | Computer Architecture | 2026-12-05 |
| 96 | BSCSE | CSE 4889 / CSE 489 | I | Machine Learning | 2026-12-05 |
| 156 | BSCSE | MATH 1151 | X(New) | Fundamental Calculus | 2026-12-07 |
| 157 | BSCSE | MATH 1151 | Y | Fundamental Calculus | 2026-12-07 |
| 158 | BSCSE | MATH 1151 | Z (New Open) | Fundamental Calculus | 2026-12-07 |
| 232 | BSCSE | CSE 2213 | AM | Discrete Mathematics | 2026-12-08 |
| 327 | BSCSE | CSE 1111 | X (New Open) | Structured Programming Language | 2026-12-09 |
| 348 | BSCSE | CSE 1111 / CSI 121 | V | Structured Programming Language | 2026-12-09 |
| 349 | BSCSE | CSE 1111 / CSI 121 | W | Structured Programming Language | 2026-12-09 |

## Exam Rows for Dropped Sections

None.

## Active Theory Sections Without an Exam Row

| Section ID | Course Code | Title | Section |
|---|---|---|---|
| `BSCSE-BDS 1201-AE` | BDS 1201 | History of the Emergence of Bangladesh | AE |
| `BSCSE-CSE 1111-F` | CSE 1111 | Structured Programming Language | F |
| `BSCSE-CSE 2213-AK` | CSE 2213 | Discrete Mathematics | AK |
| `BSCSE-CSE 2213-AE` | CSE 2213 | Discrete Mathematics | AE |
| `BSCSE-CSE 2213-AH` | CSE 2213 | Discrete Mathematics | AH |
| `BSCSE-CSE 2213-Z` | CSE 2213 | Discrete Mathematics | Z |
| `BSCSE-CSE 4451-A` | CSE 4451 | Human Computer Interaction | A |
| `BSCSE-CSE 4451-B` | CSE 4451 | Human Computer Interaction | B |
| `BSCSE-CSE 4451-C` | CSE 4451 | Human Computer Interaction | C |
| `BSCSE-CSE 4451-D` | CSE 4451 | Human Computer Interaction | D |
| `BSCSE-CSE 4451-E` | CSE 4451 | Human Computer Interaction | E |
| `BSCSE-CSE 4495-A` | CSE 4495 | Software Testing and Quality Assurance | A |
| `BSCSE-CSE 4495-B` | CSE 4495 | Software Testing and Quality Assurance | B |
| `BSCSE-CSE 4495-C` | CSE 4495 | Software Testing and Quality Assurance | C |
| `BSCSE-CSE 4531-A` | CSE 4531 | Computer Security | A |
| `BSCSE-CSE 4531-B` | CSE 4531 | Computer Security | B |
| `BSCSE-CSE 4531-C` | CSE 4531 | Computer Security | C |
| `BSCSE-CSE 4531-D` | CSE 4531 | Computer Security | D |
| `BSCSE-CSE 4531-E` | CSE 4531 | Computer Security | E |
| `BSCSE-CSE 4531-F` | CSE 4531 | Computer Security | F |
| `BSCSE-CSE 4531-G` | CSE 4531 | Computer Security | G |
| `BSCSE-CSE 4531-H` | CSE 4531 | Computer Security | H |
| `BSCSE-CSE 4893-A` | CSE 4893 | Introduction to Bioinformatics | A |
| `BSCSE-EEE 4261-B` | EEE 4261 | Green Computing | B |
| `BSCSE-EEE 4261-C` | EEE 4261 | Green Computing | C |
| `BSCSE-EEE 4261-D` | EEE 4261 | Green Computing | D |
| `BSCSE-EEE 4261-E` | EEE 4261 | Green Computing | E |
| `BSCSE-EEE 4261-F` | EEE 4261 | Green Computing | F |
| `BSCSE-EEE 4261-G` | EEE 4261 | Green Computing | G |
| `BSCSE-EEE 4261-H` | EEE 4261 | Green Computing | H |
| `BSCSE-EEE 4261-I` | EEE 4261 | Green Computing | I |
| `BSCSE-EEE 4261-J` | EEE 4261 | Green Computing | J |
| `BSCSE-TEC 2499-A` | TEC 2499 | Technology Entrepreneurship | A |
| `BSDS-DS 1501-BB` | DS 1501 | Programming for Data Science | BB |
| `BSDS-DS 4123-BA` | DS 4123 | Human Computer Interaction | BA |

## Active Single-Day Theory Sections Without an Exam Row (Non-FYDP)

| Section ID | Course Code | Title | Section |
|---|---|---|---|
| `BSCSE-CSE 1110-A` | CSE 1110 | Introduction to Computer Systems | A |
| `BSCSE-CSE 1110-B` | CSE 1110 | Introduction to Computer Systems | B |
| `BSCSE-CSE 1110-C` | CSE 1110 | Introduction to Computer Systems | C |
| `BSCSE-CSE 1110-D` | CSE 1110 | Introduction to Computer Systems | D |
| `BSCSE-CSE 1110-E` | CSE 1110 | Introduction to Computer Systems | E |
| `BSCSE-CSE 1110-F` | CSE 1110 | Introduction to Computer Systems | F |
| `BSCSE-CSE 1110-T` | CSE 1110 | Introduction to Computer Systems | T |
| `BSCSE-CSE 1110-M` | CSE 1110 | Introduction to Computer Systems | M |
| `BSCSE-CSE 1110-N` | CSE 1110 | Introduction to Computer Systems | N |
| `BSCSE-CSE 1110-O` | CSE 1110 | Introduction to Computer Systems | O |
| `BSCSE-CSE 1110-P` | CSE 1110 | Introduction to Computer Systems | P |
| `BSCSE-CSE 1110-Q` | CSE 1110 | Introduction to Computer Systems | Q |
| `BSCSE-CSE 1110-G` | CSE 1110 | Introduction to Computer Systems | G |
| `BSCSE-CSE 1110-H` | CSE 1110 | Introduction to Computer Systems | H |
| `BSCSE-CSE 1110-I` | CSE 1110 | Introduction to Computer Systems | I |
| `BSCSE-CSE 1110-J` | CSE 1110 | Introduction to Computer Systems | J |
| `BSCSE-CSE 1110-K` | CSE 1110 | Introduction to Computer Systems | K |
| `BSCSE-CSE 1110-L` | CSE 1110 | Introduction to Computer Systems | L |
| `BSCSE-CSE 2118-A` | CSE 2118 | Advanced Object Oriented Programming L | A |
| `BSCSE-CSE 2118-B` | CSE 2118 | Advanced Object Oriented Programming L | B |
| `BSCSE-CSE 2118-C` | CSE 2118 | Advanced Object Oriented Programming L | C |
| `BSCSE-CSE 2118-D` | CSE 2118 | Advanced Object Oriented Programming L | D |
| `BSCSE-CSE 2118-G` | CSE 2118 | Advanced Object Oriented Programming L | G |
| `BSCSE-CSE 2118-H` | CSE 2118 | Advanced Object Oriented Programming L | H |
| `BSCSE-CSE 2118-I` | CSE 2118 | Advanced Object Oriented Programming L | I |
| `BSCSE-CSE 2118-J` | CSE 2118 | Advanced Object Oriented Programming L | J |
| `BSCSE-CSE 2118-K` | CSE 2118 | Advanced Object Oriented Programming L | K |
| `BSCSE-CSE 4181-B` | CSE 4181 | Mobile Application Development | B |
| `BSCSE-CSE 4587-A` | CSE 4587 | Cloud Computing | A |
| `BSCSE-CSE 4587-B` | CSE 4587 | Cloud Computing | B |
| `BSCSE-CSE 4945-A` | CSE 4945 | UI: Concepts and Design | A |
| `BSCSE-CSE 4945-B` | CSE 4945 | UI: Concepts and Design | B |
| `BSCSE-CSE 4945-C` | CSE 4945 | UI: Concepts and Design | C |
| `BSCSE-GED 1005-A` | GED 1005 | AI Literacy and Prompt Engineering | A |
| `BSCSE-GED 1005-B` | GED 1005 | AI Literacy and Prompt Engineering | B |
| `BSCSE-GED 1005-C` | GED 1005 | AI Literacy and Prompt Engineering | C |
| `BSCSE-GED 1005-E` | GED 1005 | AI Literacy and Prompt Engineering | E |
| `BSCSE-GED 1005-F` | GED 1005 | AI Literacy and Prompt Engineering | F |
| `BSCSE-GED 1005-G` | GED 1005 | AI Literacy and Prompt Engineering | G |
| `BSCSE-GED 1005-H` | GED 1005 | AI Literacy and Prompt Engineering | H |
| `BSDS-DS 3120-BA` | DS 3120 | Technical Report Writing and Presentation | BA |
| `BSDS-DS 3120-BB` | DS 3120 | Technical Report Writing and Presentation | BB |

## Courses with More Than One Exam Slot

- **BSCSE CSE 4165**: 2026-12-12 09:00 AM - 11:00 AM; 2026-12-12 11:45 AM - 01:45 PM

## Student ID Range Anomalies

None (all normalized 10-digit ranges satisfy `idFrom <= idTo` with zero within-row overlaps).

## Teacher Initials Mismatches (Report Only — Faculty Data Unchanged)

| Section ID | Excel Teacher | Faculty in `sections.json` | Generated Initials Aliases |
|---|---|---|---|
| `BSCSE-CSE 4509-A` | `MdSam` | Md. Siam | MS, S, SI |
| `BSCSE-CSE 4509-B` | `MdSam` | Md. Siam | MS, S, SI |
| `BSCSE-CSE 4509-C` | `MEHq` | Md. Enamul Haque | EH, ME, MEH |
| `BSCSE-CSE 4509-D` | `MdSam` | Md. Siam | MS, S, SI |
| `BSCSE-CSE 4509-F` | `MdSam` | Md. Siam | MS, S, SI |
| `BSCSE-CSE 4509-G` | `MSdHn` | Md. Sajjad Hossain | MS, MSH, SH |
| `BSCSE-CSE 4509-H` | `MSdHn` | Md. Sajjad Hossain | MS, MSH, SH |
| `BSCSE-CSE 4509-I` | `ARnA` | Azizur Rahman Anik | AA, AR, ARA |
| `BSCSE-ENG 1011-AC` | `SaHsn` | Sajjad Hossain | SH |
| `BSCSE-ENG 1011-AE` | `IZn` | Md. Taqi Yasir | MT, MTY, TY |
| `BSCSE-ENG 1011-AG` | `MAd` | Muntasir Ahmad | MA |
| `BSCSE-ENG 1011-AH` | `TaFz` | Md. Taqi Yasir | MT, MTY, TY |
| `BSCSE-ENG 1011-AI` | `SaIsm` | Sadia Islam | SI |
| `BSCSE-ENG 1011-AJ` | `RfNr` | Zolakha Akter Shifa | ZA, ZAS, ZS |
| `BSCSE-ENG 1011-AK` | `SaAn` | Sadia Afrin | SA |
| `BSCSE-ENG 1011-AL` | `RfNr` | Zolakha Akter Shifa | ZA, ZAS, ZS |
| `BSCSE-ENG 1011-AQ` | `KhMW` | Khandoker Makjum Wahid | KM, KMW, KW |
| `BSCSE-ENG 1011-AR` | `KhMW` | Khandoker Makjum Wahid | KM, KMW, KW |
| `BSCSE-ENG 1011-AP` | `SaIsm` | Sadia Islam | SI |
| `BSCSE-IPE 3401-A` | `JAr` | Kaspia Kabir | KK |
| `BSCSE-IPE 3401-B` | `JAr` | Kaspia Kabir | KK |
| `BSCSE-IPE 3401-C` | `ShAhn` | Shaila Ahsan | SA |
| `BSCSE-IPE 3401-D` | `ShAhn` | Shaila Ahsan | SA |
| `BSCSE-IPE 3401-E` | `ShAhn` | Shaila Ahsan | SA |
| `BSDS-DS 4491-BA` | `AsAr` | Asif Abrar | AA |
| `BSCSE-ENG 1013-AB` | `ChMR` | Christina Miti Rozario | CM, CMR, CR |
| `BSCSE-ENG 1013-AF` | `NrSM` | Muhammad Saiful Islam | MI, MS, MSI |
| `BSCSE-ENG 1013-AH` | `IZn` | Ismat Zarin | IZ |
| `BSCSE-ENG 1013-AK` | `KnGn` | Kirsten Gudgeon | KG |
| `BSCSE-ENG 1013-AL` | `AAFR` | Ahmed Abdullah Bin Farooqi Rayhan | AA, AABFR, AR |
| `BSCSE-ENG 1013-AP` | `AAFR` | Ahmed Abdullah Bin Farooqi Rayhan | AA, AABFR, AR |
| `BSCSE-ENG 1013-AR` | `UmH` | Umme Habiba | UH |
| `BSDS-DS 3885-BA` | `HHCh` | Hafijul Hoque Chowdhury | HC, HH, HHC |
| `BSDS-DS 3885-BB` | `HHCh` | Hafijul Hoque Chowdhury | HC, HH, HHC |
| `BSDS-DS 4217-BB` | `ASKP` | Al-Sakib Khan Pathan | AK, AKP, AP |
| `BSCSE-CSE 3313-A` | `TaSa` | Tasmin Sanjida | TS |
| `BSCSE-CSE 3313-C` | `TaSa` | Tasmin Sanjida | TS |
| `BSCSE-CSE 3313-I` | `SAhSh` | Shoib Ahmed Shourav | SA, SAS, SS |
| `BSCSE-CSE 3313-J` | `SAhSh` | Shoib Ahmed Shourav | SA, SAS, SS |
| `BSCSE-CSE 4813-A` | `Ojn` | Ohidujjaman | O, OH |
| `BSCSE-CSE 4889-A` | `SaIs` | Sadia Islam | SI |
| `BSCSE-CSE 4889-B` | `SaIs` | Sadia Islam | SI |
| `BSCSE-CSE 4889-C` | `AsAr` | Asif Abrar | AA |
| `BSCSE-CSE 4889-D` | `MdSu` | Md. Suzauddola | MS, S, SU |
| `BSCSE-CSE 4889-E` | `Ojn` | Ohidujjaman | O, OH |
| `BSCSE-MATH 2183-A` | `MoRhn` | Mohsina Rahman | MR |
| `BSCSE-MATH 2183-C` | `NzHn` | Nazmul Hasan | NH |
| `BSCSE-MATH 2183-E` | `MdAsn` | Md. Asadujjaman | A, AS, MA |
| `BSCSE-MATH 2183-F` | `MoRhn` | Mohsina Rahman | MR |
| `BSCSE-MATH 2183-G` | `AASr` | Alvi Ahmed Sarker | AA, AAS, AS |
| `BSCSE-MATH 2183-H` | `SIsm` | Saidul Islam | SI |
| `BSCSE-MATH 2183-I` | `JAS` | Jashodhan Saha | JS |
| `BSCSE-MATH 2183-J` | `AkAd` | Ashek Ahmed | AA |
| `BSCSE-MATH 2183-K` | `AASr` | Alvi Ahmed Sarker | AA, AAS, AS |
| `BSCSE-MATH 2183-L` | `MMHsn` | Md. Mehedi Hasan | MH, MM, MMH |
| `BSCSE-SOC 2101-A` | `NaHu` | Sadia Zaman | SZ |
| `BSCSE-SOC 2101-B` | `AJMSh` | Nazmun Nahar Showmi | NN, NNS, NS |
| `BSCSE-SOC 2101-G` | `NaSa` | Nabila Sultana | NS |
| `BSCSE-SOC 2101-I` | `MMiIm` | Md. Minhajul Islam | MI, MM, MMI |
| `BSCSE-SOC 2101-J` | `MMiIm` | Md. Minhajul Islam | MI, MM, MMI |
| `BSDS-DS 4211-BA` | `AsAr` | Asif Abrar | AA |
| `BSDS-MATH 2107-BB` | `AkAd` | Ashek Ahmed | AA |
| `BSCSE-CSE 3521-B` | `MoIsm` | Mobaswirul Islam | MI |
| `BSCSE-CSE 3521-C` | `MSTR` | Md. Shafqat Talukder | MS, MST, ST |
| `BSCSE-CSE 3521-D` | `AnHq` | Anindya Hoque | AH |
| `BSCSE-CSE 3521-G` | `ArMd` | Abrar Mahmud | AM |
| `BSCSE-CSE 3521-H` | `MSTR` | Md. Shafqat Talukder | MS, MST, ST |
| `BSCSE-CSE 3521-I` | `MSTR` | Md. Shafqat Talukder | MS, MST, ST |
| `BSCSE-CSE 3521-J` | `MSTR` | Md. Shafqat Talukder | MS, MST, ST |
| `BSCSE-CSE 3521-L` | `ArMd` | Abrar Mahmud | AM |
| `BSDS-CSE 3521-BA` | `ShAhd` | Shihab Ahmed | SA |
| `BSDS-CSE 3521-BB` | `ShAhd` | Shihab Ahmed | SA |
| `BSCSE-CSE 4325-A` | `SuMo` | Sudipto Mondal | SM |
| `BSCSE-CSE 4325-C` | `SuMo` | Sudipto Mondal | SM |
| `BSCSE-CSE 4325-D` | `ArBh` | Arnab Bhattacharjee | AB |
| `BSCSE-CSE 4325-E` | `ArBh` | Arnab Bhattacharjee | AB |
| `BSCSE-CSE 4325-F` | `MFRn` | M. Fahmin Rahman | FR, MF, MFR |
| `BSCSE-CSE 4325-G` | `MFRn` | M. Fahmin Rahman | FR, MF, MFR |
| `BSCSE-CSE 4325-I` | `ArBh` | Arnab Bhattacharjee | AB |
| `BSCSE-CSE 4325-J` | `MFRn` | M. Fahmin Rahman | FR, MF, MFR |
| `BSCSE-MATH 1151-A` | `MoRhn` | Mohsina Rahman | MR |
| `BSCSE-MATH 1151-D` | `AAHn` | Al Amin Hossain | AA, AAH, AH |
| `BSCSE-MATH 1151-G` | `TAKFm` | Tanveer Ahmed Khan Fahim | TA, TAKF, TF |
| `BSCSE-MATH 1151-I` | `MdAsn` | Md. Asadujjaman | A, AS, MA |
| `BSCSE-MATH 1151-L` | `AkAd` | Ashek Ahmed | AA |
| `BSCSE-MATH 1151-M` | `TAKFm` | Tanveer Ahmed Khan Fahim | TA, TAKF, TF |
| `BSCSE-MATH 1151-N` | `AAHn` | Al Amin Hossain | AA, AAH, AH |
| `BSCSE-MATH 1151-O` | `AAHn` | Al Amin Hossain | AA, AAH, AH |
| `BSCSE-MATH 1151-P` | `JAS` | Jashodhan Saha | JS |
| `BSCSE-MATH 1151-R` | `MFT` | Mahtab Uddin | MU |
| `BSCSE-MATH 1151-T` | `MdAsn` | Md. Asadujjaman | A, AS, MA |
| `BSCSE-MATH 1151-U` | `JGh` | Joyonty Ghosh | JG |
| `BSCSE-MATH 1151-V` | `JGh` | Joyonty Ghosh | JG |
| `BSCSE-MATH 1151-W` | `AAHn` | Al Amin Hossain | AA, AAH, AH |
| `BSCSE-ACT 2111-B` | `ShAz` | Shakila Aziz | SA |
| `BSCSE-ACT 2111-D` | `ItJn` | Israt Jabin | IJ |
| `BSCSE-ACT 2111-F` | `SBAr` | Sadia Binte Anwar | SA, SB, SBA |
| `BSCSE-ACT 2111-J` | `ItJn` | Israt Jabin | IJ |
| `BSCSE-ACT 2111-K` | `ItJn` | Israt Jabin | IJ |
| `BSCSE-MATH 2205-B` | `NzHn` | Nazmul Hasan | NH |
| `BSCSE-MATH 2205-C` | `JAS` | Jashodhan Saha | JS |
| `BSCSE-MATH 2205-D` | `MdASr` | Nazmul Hasan | NH |
| `BSCSE-MATH 2205-E` | `MUn` | Mahtab Uddin | MU |
| `BSCSE-MATH 2205-G` | `SuT` | Sumaiya Tarannum | ST |
| `BSCSE-MATH 2205-M` | `SIsm` | Saidul Islam | SI |
| `BSCSE-MATH 2205-N` | `SuT` | Sumaiya Tarannum | ST |
| `BSCSE-CSE 3811-B` | `MdSu` | Md. Suzauddola | MS, S, SU |
| `BSCSE-CSE 3811-F` | `MdSu` | Md. Suzauddola | MS, S, SU |
| `BSCSE-CSE 3811-G` | `NaFA` | Nahid Ferdous Aurna | NA, NF, NFA |
| `BSCSE-CSE 3811-I` | `NaFA` | Nahid Ferdous Aurna | NA, NF, NFA |
| `BSCSE-CSE 3811-K` | `ArBh` | Arnab Bhattacharjee | AB |
| `BSCSE-CSE 3811-L` | `RaHR` | Rakibul Hasan Rafi | RH, RHR, RR |
| `BSCSE-CSE 2213-AA` | `AsTn` | Asnuva Tanvin | AT |
| `BSCSE-CSE 2213-AB` | `SmSd` | Sayem Shahad | SS |
| `BSCSE-CSE 2213-AC` | `ShArn` | Sherajul Arifin | SA |
| `BSCSE-CSE 2213-AG` | `ShArn` | Sherajul Arifin | SA |
| `BSCSE-CSE 2213-AI` | `MdMeHn` | Md. Mehedi Hasan | MH, MM, MMH |
| `BSCSE-CSE 2213-AJ` | `RaHR` | Rakibul Hasan Rafi | RH, RHR, RR |
| `BSCSE-CSE 2213-B` | `MdShA` | Md. Shadman Aadeeb | MS, MSA, SA |
| `BSCSE-CSE 2213-C` | `RaHR` | Rakibul Hasan Rafi | RH, RHR, RR |
| `BSCSE-CSE 2213-E` | `AsTn` | Asnuva Tanvin | AT |
| `BSCSE-CSE 2213-F` | `SaKar` | Saqif Kaisar | SK |
| `BSCSE-CSE 2213-H` | `NZMa` | Nusaiba Zaman Manifa | NM, NZ, NZM |
| `BSCSE-CSE 2213-L` | `MdMeHn` | Md. Mehedi Hasan | MH, MM, MMH |
| `BSCSE-CSE 2213-N` | `SMKP` | S.M. Kausar Parvej | SK, SKP, SP |
| `BSCSE-CSE 2213-P` | `MdShA` | Md. Shadman Aadeeb | MS, MSA, SA |
| `BSCSE-CSE 2213-Q` | `AsAr` | Asif Abrar | AA |
| `BSCSE-CSE 2213-R` | `MdShA` | Md. Shadman Aadeeb | MS, MSA, SA |
| `BSCSE-CSE 2213-S` | `SSSf` | Syed Samin Sadaf | SS, SSS |
| `BSCSE-CSE 2213-T` | `NaFS` | Nahin F. Siddiqui | NF, NFS, NS |
| `BSCSE-CSE 2213-U` | `NZMa` | Nusaiba Zaman Manifa | NM, NZ, NZM |
| `BSCSE-CSE 2213-W` | `MdShA` | Md. Shadman Aadeeb | MS, MSA, SA |
| `BSCSE-PMG 4101-B` | `SSSf` | Syed Samin Sadaf | SS, SSS |
| `BSCSE-PMG 4101-F` | `NaFS` | Nahin F. Siddiqui | NF, NFS, NS |
| `BSCSE-PMG 4101-G` | `NaFS` | Nahin F. Siddiqui | NF, NFS, NS |
| `BSCSE-PMG 4101-I` | `SSSf` | Syed Samin Sadaf | SS, SSS |
| `BSCSE-PMG 4101-J` | `MdMH` | Md. Muhyminul Haque | MH, MM, MMH |
| `BSCSE-PMG 4101-K` | `SSSf` | Syed Samin Sadaf | SS, SSS |
| `BSCSE-BIO 3105-A` | `ErSh` | Erina Sharmin | ES |
| `BSCSE-BIO 3105-B` | `ErSh` | Erina Sharmin | ES |
| `BSCSE-BIO 3105-C` | `SSaSh` | Sakibul Satter Shupto | SS, SSS |
| `BSCSE-BIO 3105-D` | `MSdAm` | Md. Sanzed Alam | MS, MSA, SA |
| `BSCSE-BIO 3105-E` | `FYMo` | Fariha Yousuf Monia | FM, FY, FYM |
| `BSCSE-BIO 3105-F` | `MSdAm` | Md. Sanzed Alam | MS, MSA, SA |
| `BSCSE-BIO 3105-G` | `FYMo` | Fariha Yousuf Monia | FM, FY, FYM |
| `BSCSE-BIO 3105-H` | `AI` | M.M. Rafin Mahmud | MM, MR, MRM |
| `BSCSE-BIO 3105-I` | `MSdAm` | Md. Sanzed Alam | MS, MSA, SA |
| `BSCSE-BIO 3105-J` | `MdSZ` | M.M. Rafin Mahmud | MM, MR, MRM |
| `BSCSE-BIO 3105-K` | `MobIsm` | Mobashara Islam | MI |
| `BSCSE-BIO 3105-L` | `SSaSh` | Sakibul Satter Shupto | SS, SSS |
| `BSCSE-BIO 3105-M` | `MdSZ` | S.M. Rafiqul Islam | SI, SR, SRI |
| `BSCSE-BIO 3105-N` | `MZAm` | Md. Zahin Alam | MZ, MZA, ZA |
| `BSCSE-CSE 1325-B` | `MBAd` | Md. Benzir Ahmed | BA, MB, MBA |
| `BSCSE-CSE 1325-D` | `IHn` | Imran Hossain | IH |
| `BSCSE-CSE 1325-F` | `NtJT` | Nusrat Jahan Tithi | NJ, NJT, NT |
| `BSCSE-CSE 1325-G` | `RtAm` | Riasat Azim | RA |
| `BSCSE-CSE 4777-A` | `MShH` | Md. Shohrab Hossain | MS, MSH, SH |
| `BSDS-BIO 3107-BA` | `AI` | Md. Belal Hussain Ripon | BHR, BR, MB, MBHR |
| `BSDS-BIO 3107-BB` | `SSaSh` | S.M. Rafiqul Islam | SI, SR, SRI |
| `BSCSE-CSE 4327-A` | `SuMo` | Sudipto Mondal | SM |
| `BSCSE-CSE 4611-B` | `AnHq` | Anindya Hoque | AH |
| `BSCSE-CSE 4611-C` | `AnHq` | Anindya Hoque | AH |
| `BSCSE-CSE 4883-D` | `MdSu` | Md. Suzauddola | MS, S, SU |
| `BSCSE-CSE 4883-E` | `MdSu` | Md. Suzauddola | MS, S, SU |
| `BSDS-DS 4213-BA` | `MAnAm` | Muhammad Anwarul Azim | MA, MAA |
| `BSDS-DS 4213-BB` | `MAnAm` | Muhammad Anwarul Azim | MA, MAA |
| `BSCSE-CSE 1111-C` | `SAhSh` | Shoib Ahmed Shourav | SA, SAS, SS |
| `BSCSE-CSE 1111-D` | `SAhSh` | Shoib Ahmed Shourav | SA, SAS, SS |
| `BSCSE-CSE 1111-G` | `ShArn` | Sherajul Arifin | SA |
| `BSCSE-CSE 1111-H` | `SSSk` | Samin Sharaf Somik | SS, SSS |
| `BSCSE-CSE 1111-J` | `SMKP` | S.M. Kausar Parvej | SK, SKP, SP |
| `BSCSE-CSE 1111-L` | `MdSAd` | Md. Saiful Azad | MS, MSA, SA |
| `BSCSE-CSE 1111-N` | `MdSAd` | Md. Saiful Azad | MS, MSA, SA |
| `BSCSE-CSE 1111-P` | `SMKP` | S.M. Kausar Parvej | SK, SKP, SP |
| `BSCSE-CSE 1111-Q` | `SdACh` | Sajid Ahmed Chowdhury | SA, SAC, SC |
| `BSCSE-CSE 1111-T` | `SSSk` | Samin Sharaf Somik | SS, SSS |
| `BSCSE-CSE 1111-U` | `MSTR` | Md. Shafqat Talukder | MS, MST, ST |
| `BSCSE-CSE 2215-B` | `MdSAd` | Md. Saiful Azad | MS, MSA, SA |
| `BSCSE-CSE 2215-D` | `MdSAd` | Md. Saiful Azad | MS, MSA, SA |
| `BSCSE-CSE 2215-I` | `MZUA` | Md. Zunaid-Ul-Alam | MZ, Z, ZA |
| `BSCSE-CSE 2215-K` | `MZUA` | Md. Zunaid-Ul-Alam | MZ, Z, ZA |
| `BSDS-DS 1501-BA` | `SAMZ` | Syed Abu Ammar Muhammad Zarif | SA, SAAMZ, SZ |
| `BSDS-DS 1501-BD` | `SAMZ` | Syed Abu Ammar Muhammad Zarif | SA, SAAMZ, SZ |
| `BSDS-DS 2251-BA` | `SnRn` | Siana Rizwan | SR |
| `BSCSE-CSE 3711-B` | `SaKar` | Saqif Kaisar | SK |
| `BSDS-DS 3101-BA` | `MZUA` | Md. Zunaid-Ul-Alam | MZ, Z, ZA |
| `BSCSE-CSE 3411-A` | `SSSf` | Syed Samin Sadaf | SS, SSS |
| `BSCSE-CSE 3411-B` | `MdRIm` | Md. Romizul Islam | MR, MRI, RI |
| `BSCSE-CSE 3411-C` | `TATs` | Tasriad Ahmed Tias | TA, TAT, TT |
| `BSCSE-CSE 3411-E` | `SiMa` | Sidratul Muntaha | SM |
| `BSCSE-CSE 3411-F` | `TaSa` | Tasmin Sanjida | TS |
| `BSCSE-CSE 3411-G` | `AsTn` | Asnuva Tanvin | AT |
| `BSCSE-CSE 3411-H` | `TATs` | Tasriad Ahmed Tias | TA, TAT, TT |
| `BSCSE-CSE 3411-I` | `SiMa` | Sidratul Muntaha | SM |
| `BSCSE-CSE 3411-J` | `SiMa` | Sidratul Muntaha | SM |
| `BSCSE-CSE 3411-K` | `ShMd` | Shahriar Mahmud | SM |
| `BSCSE-CSE 3411-L` | `TaSa` | Tasmin Sanjida | TS |
| `BSCSE-CSE 3411-M` | `MTSh` | Md. Taky Shaharair | MT, MTS, TS |
| `BSCSE-MATH 2201-E` | `NzHn` | Nazmul Hasan | NH |
| `BSCSE-MATH 2201-F` | `TAKFm` | Tanveer Ahmed Khan Fahim | TA, TAKF, TF |
| `BSCSE-MATH 2201-G` | `NzHn` | Nazmul Hasan | NH |
| `BSCSE-MATH 2201-J` | `JAS` | Jashodhan Saha | JS |
| `BSCSE-MATH 2201-K` | `NzHn` | Nazmul Hasan | NH |
| `BSDS-MATH 1153-BA` | `MUn` | Mahtab Uddin | MU |
| `BSCSE-CSE 2217-A` | `FzAn` | Fairoz Anika | FA |
| `BSCSE-CSE 2217-B` | `MdTH` | Md. Tarek Hasan | MT, MTH, TH |
| `BSCSE-CSE 2217-D` | `MdTH` | Md. Tarek Hasan | MT, MTH, TH |
| `BSCSE-CSE 2217-H` | `MdTH` | Md. Tarek Hasan | MT, MTH, TH |
| `BSCSE-CSE 2217-I` | `FzAn` | Fairoz Anika | FA |
| `BSCSE-CSE 2217-J` | `MdTH` | Md. Tarek Hasan | MT, MTH, TH |
| `BSCSE-CSE 2217-K` | `FzAn` | Fairoz Anika | FA |
| `BSCSE-CSE 2217-L` | `AnHq` | Anindya Hoque | AH |
| `BSDS-DS 1101-BA` | `SSSk` | Samin Sharaf Somik | SS, SSS |
| `BSDS-DS 1101-BB` | `SSSk` | Samin Sharaf Somik | SS, SSS |
| `BSCSE-CSE 3421-A` | `SSSk` | Samin Sharaf Somik | SS, SSS |
| `BSCSE-CSE 3421-B` | `MBAd` | Md. Benzir Ahmed | BA, MB, MBA |
| `BSCSE-CSE 3421-D` | `MBAd` | Md. Benzir Ahmed | BA, MB, MBA |
| `BSCSE-CSE 3421-G` | `ShArn` | Sherajul Arifin | SA |
| `BSCSE-CSE 3421-H` | `ArMd` | Abrar Mahmud | AM |
| `BSCSE-CSE 3421-J` | `MAnAn` | Md. Anowarul Abedin | AA, MA, MAA |
| `BSCSE-CSE 3421-L` | `SdACh` | Sajid Ahmed Chowdhury | SA, SAC, SC |
| `BSCSE-EEE 2113-A` | `AbHn` | Md. Abid Hossain | AH, MA, MAH |
| `BSCSE-EEE 2113-B` | `AbHn` | Md. Abid Hossain | AH, MA, MAH |
| `BSCSE-EEE 2113-D` | `IHn` | Imran Hossain | IH |
| `BSCSE-EEE 2113-F` | `SdACh` | Sajid Ahmed Chowdhury | SA, SAC, SC |
| `BSCSE-EEE 2113-G` | `IHn` | Imran Hossain | IH |
| `BSCSE-EEE 2123-D` | `AbHn` | Md. Abid Hossain | AH, MA, MAH |
| `BSCSE-EEE 2123-G` | `StA` | Sarwat Amin | SA |
| `BSCSE-EEE 2123-I` | `StA` | Sarwat Amin | SA |
| `BSCSE-BDS 1201-AA` | `MfHn` | Mosharof Hossain | MH |
| `BSCSE-BDS 1201-AB` | `MfHn` | Mosharof Hossain | MH |
| `BSCSE-ECO 4101-B` | `TaA` | Tanzila Amir | TA |
| `BSCSE-ECO 4101-C` | `MdAkh` | Mohammad Akhtaruzzaman | A, MA |
| `BSCSE-ECO 4101-D` | `MdAkh` | Mohammad Akhtaruzzaman | A, MA |
| `BSCSE-ECO 4101-E` | `TaA` | Tanzila Amir | TA |
| `BSCSE-ECO 4101-G` | `ACh` | Antara Chowdhury | AC |
| `BSDS-DS 3521-BA` | `ShAhd` | Shihab Ahmed | SA |
| `BSDS-DS 3521-BB` | `ShAhd` | Shihab Ahmed | SA |
| `BSCSE-CSE 1115-A` | `NtJT` | Nusrat Jahan Tithi | NJ, NJT, NT |
| `BSCSE-CSE 1115-B` | `NtJT` | Nusrat Jahan Tithi | NJ, NJT, NT |
| `BSCSE-CSE 1115-G` | `NtJT` | Nusrat Jahan Tithi | NJ, NJT, NT |
| `BSDS-DS 1115-BA` | `MdRIm` | Md. Romizul Islam | MR, MRI, RI |
| `BSDS-DS 1115-BB` | `MdRIm` | Md. Romizul Islam | MR, MRI, RI |
| `BSDS-DS 1115-BC` | `RaHR` | Rakibul Hasan Rafi | RH, RHR, RR |
| `BSDS-DS 1115-BD` | `MdRIm` | Md. Romizul Islam | MR, MRI, RI |
| `BSCSE-CSE 4165-D` | `HHCh` | Hafijul Hoque Chowdhury | HC, HH, HHC |
| `BSCSE-CSE 4165-Q` | `SmSd` | Sayem Shahad | SS |
| `BSCSE-CSE 4165-R` | `SmSd` | Sayem Shahad | SS |
| `BSCSE-CSE 4891-A` | `SaIs` | Sadia Islam | SI |
| `BSCSE-CSE 4891-B` | `Ojn` | Ohidujjaman | O, OH |
| `BSCSE-CSE 4891-C` | `SmSd` | Sayem Shahad | SS |
| `BSCSE-CSE 4891-E` | `SaIs` | Sadia Islam | SI |
| `BSCSE-CSE 2233-B` | `MdMH` | Md. Muhyminul Haque | MH, MM, MMH |
| `BSCSE-CSE 2233-D` | `MdMH` | Md. Muhyminul Haque | MH, MM, MMH |
| `BSCSE-CSE 4165-H` | `MahHsn` | Mahmudul Hasan | MH |
| `BSCSE-CSE 4165-I` | `MahHsn` | Mahmudul Hasan | MH |
| `BSCSE-CSE 4165-O` | `MahHsn` | Mahmudul Hasan | MH |
| `BSDS-DS 4229-BA` | `HHCh` | Hafijul Hoque Chowdhury | HC, HH, HHC |
| `BSCSE-PHY 2105-A` | `RAfN` | Rahil Afzal Nihal | RA, RAN, RN |
| `BSCSE-PHY 2105-B` | `SaDa` | Md. Asaduzzaman | A, AS, MA |
| `BSCSE-PHY 2105-C` | `MSIs` | Md. Saiful Islam | MS, MSI, SI |
| `BSCSE-PHY 2105-D` | `MSIs` | Md. Saiful Islam | MS, MSI, SI |
| `BSCSE-PHY 2105-E` | `HaHR` | S.M. Hasibul Hassan Rizvee | SH, SHHR, SR |
| `BSCSE-PHY 2105-F` | `MAn` | Md. Asaduzzaman | A, AS, MA |
| `BSCSE-PHY 2105-I` | `HaHR` | S.M. Hasibul Hassan Rizvee | SH, SHHR, SR |
| `BSCSE-PHY 2105-N` | `SaDa` | Sagar Dutta | SD |
| `BSCSE-PHY 2105-O` | `HaHR` | S.M. Hasibul Hassan Rizvee | SH, SHHR, SR |
| `BSDS-DS 3881-BA` | `SnRn` | Siana Rizwan | SR |
