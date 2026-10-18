/**
 * The flag file for each country a city is in, as a URL. Each is its own file, fetched only when
 * the flag shows, so the stylesheet and the scripts stay small. A city in a new country needs a
 * line here; flags.test.ts fails until it has one.
 */
import flagAe from "flag-icons/flags/4x3/ae.svg?no-inline"
import flagAr from "flag-icons/flags/4x3/ar.svg?no-inline"
import flagAt from "flag-icons/flags/4x3/at.svg?no-inline"
import flagAu from "flag-icons/flags/4x3/au.svg?no-inline"
import flagBd from "flag-icons/flags/4x3/bd.svg?no-inline"
import flagBo from "flag-icons/flags/4x3/bo.svg?no-inline"
import flagBr from "flag-icons/flags/4x3/br.svg?no-inline"
import flagCa from "flag-icons/flags/4x3/ca.svg?no-inline"
import flagCl from "flag-icons/flags/4x3/cl.svg?no-inline"
import flagCn from "flag-icons/flags/4x3/cn.svg?no-inline"
import flagCo from "flag-icons/flags/4x3/co.svg?no-inline"
import flagCr from "flag-icons/flags/4x3/cr.svg?no-inline"
import flagCu from "flag-icons/flags/4x3/cu.svg?no-inline"
import flagCz from "flag-icons/flags/4x3/cz.svg?no-inline"
import flagDe from "flag-icons/flags/4x3/de.svg?no-inline"
import flagDk from "flag-icons/flags/4x3/dk.svg?no-inline"
import flagEc from "flag-icons/flags/4x3/ec.svg?no-inline"
import flagEg from "flag-icons/flags/4x3/eg.svg?no-inline"
import flagEs from "flag-icons/flags/4x3/es.svg?no-inline"
import flagEt from "flag-icons/flags/4x3/et.svg?no-inline"
import flagFi from "flag-icons/flags/4x3/fi.svg?no-inline"
import flagFr from "flag-icons/flags/4x3/fr.svg?no-inline"
import flagGb from "flag-icons/flags/4x3/gb.svg?no-inline"
import flagGh from "flag-icons/flags/4x3/gh.svg?no-inline"
import flagGr from "flag-icons/flags/4x3/gr.svg?no-inline"
import flagGt from "flag-icons/flags/4x3/gt.svg?no-inline"
import flagHk from "flag-icons/flags/4x3/hk.svg?no-inline"
import flagHu from "flag-icons/flags/4x3/hu.svg?no-inline"
import flagId from "flag-icons/flags/4x3/id.svg?no-inline"
import flagIe from "flag-icons/flags/4x3/ie.svg?no-inline"
import flagIn from "flag-icons/flags/4x3/in.svg?no-inline"
import flagIr from "flag-icons/flags/4x3/ir.svg?no-inline"
import flagIt from "flag-icons/flags/4x3/it.svg?no-inline"
import flagJp from "flag-icons/flags/4x3/jp.svg?no-inline"
import flagKe from "flag-icons/flags/4x3/ke.svg?no-inline"
import flagKr from "flag-icons/flags/4x3/kr.svg?no-inline"
import flagKz from "flag-icons/flags/4x3/kz.svg?no-inline"
import flagMa from "flag-icons/flags/4x3/ma.svg?no-inline"
import flagMx from "flag-icons/flags/4x3/mx.svg?no-inline"
import flagMy from "flag-icons/flags/4x3/my.svg?no-inline"
import flagNg from "flag-icons/flags/4x3/ng.svg?no-inline"
import flagNl from "flag-icons/flags/4x3/nl.svg?no-inline"
import flagNo from "flag-icons/flags/4x3/no.svg?no-inline"
import flagNp from "flag-icons/flags/4x3/np.svg?no-inline"
import flagNz from "flag-icons/flags/4x3/nz.svg?no-inline"
import flagPa from "flag-icons/flags/4x3/pa.svg?no-inline"
import flagPe from "flag-icons/flags/4x3/pe.svg?no-inline"
import flagPh from "flag-icons/flags/4x3/ph.svg?no-inline"
import flagPk from "flag-icons/flags/4x3/pk.svg?no-inline"
import flagPl from "flag-icons/flags/4x3/pl.svg?no-inline"
import flagPt from "flag-icons/flags/4x3/pt.svg?no-inline"
import flagQa from "flag-icons/flags/4x3/qa.svg?no-inline"
import flagRu from "flag-icons/flags/4x3/ru.svg?no-inline"
import flagSa from "flag-icons/flags/4x3/sa.svg?no-inline"
import flagSe from "flag-icons/flags/4x3/se.svg?no-inline"
import flagSg from "flag-icons/flags/4x3/sg.svg?no-inline"
import flagTh from "flag-icons/flags/4x3/th.svg?no-inline"
import flagTn from "flag-icons/flags/4x3/tn.svg?no-inline"
import flagTr from "flag-icons/flags/4x3/tr.svg?no-inline"
import flagTw from "flag-icons/flags/4x3/tw.svg?no-inline"
import flagUa from "flag-icons/flags/4x3/ua.svg?no-inline"
import flagUg from "flag-icons/flags/4x3/ug.svg?no-inline"
import flagUs from "flag-icons/flags/4x3/us.svg?no-inline"
import flagUy from "flag-icons/flags/4x3/uy.svg?no-inline"
import flagVe from "flag-icons/flags/4x3/ve.svg?no-inline"
import flagVn from "flag-icons/flags/4x3/vn.svg?no-inline"
import flagZa from "flag-icons/flags/4x3/za.svg?no-inline"

export const FLAG_URLS: Readonly<Record<string, string>> = {
  AE: flagAe,
  AR: flagAr,
  AT: flagAt,
  AU: flagAu,
  BD: flagBd,
  BO: flagBo,
  BR: flagBr,
  CA: flagCa,
  CL: flagCl,
  CN: flagCn,
  CO: flagCo,
  CR: flagCr,
  CU: flagCu,
  CZ: flagCz,
  DE: flagDe,
  DK: flagDk,
  EC: flagEc,
  EG: flagEg,
  ES: flagEs,
  ET: flagEt,
  FI: flagFi,
  FR: flagFr,
  GB: flagGb,
  GH: flagGh,
  GR: flagGr,
  GT: flagGt,
  HK: flagHk,
  HU: flagHu,
  ID: flagId,
  IE: flagIe,
  IN: flagIn,
  IR: flagIr,
  IT: flagIt,
  JP: flagJp,
  KE: flagKe,
  KR: flagKr,
  KZ: flagKz,
  MA: flagMa,
  MX: flagMx,
  MY: flagMy,
  NG: flagNg,
  NL: flagNl,
  NO: flagNo,
  NP: flagNp,
  NZ: flagNz,
  PA: flagPa,
  PE: flagPe,
  PH: flagPh,
  PK: flagPk,
  PL: flagPl,
  PT: flagPt,
  QA: flagQa,
  RU: flagRu,
  SA: flagSa,
  SE: flagSe,
  SG: flagSg,
  TH: flagTh,
  TN: flagTn,
  TR: flagTr,
  TW: flagTw,
  UA: flagUa,
  UG: flagUg,
  US: flagUs,
  UY: flagUy,
  VE: flagVe,
  VN: flagVn,
  ZA: flagZa,
}
