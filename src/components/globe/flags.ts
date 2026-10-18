/**
 * The flag file for each country a city is in, as a URL. Each is its own file, fetched only when
 * the flag shows, so the stylesheet and the scripts stay small. A city in a new country needs a
 * line here; flags.test.ts fails until it has one.
 */
import flag_ae from "flag-icons/flags/4x3/ae.svg?no-inline";
import flag_ar from "flag-icons/flags/4x3/ar.svg?no-inline";
import flag_at from "flag-icons/flags/4x3/at.svg?no-inline";
import flag_au from "flag-icons/flags/4x3/au.svg?no-inline";
import flag_bd from "flag-icons/flags/4x3/bd.svg?no-inline";
import flag_bo from "flag-icons/flags/4x3/bo.svg?no-inline";
import flag_br from "flag-icons/flags/4x3/br.svg?no-inline";
import flag_ca from "flag-icons/flags/4x3/ca.svg?no-inline";
import flag_cl from "flag-icons/flags/4x3/cl.svg?no-inline";
import flag_cn from "flag-icons/flags/4x3/cn.svg?no-inline";
import flag_co from "flag-icons/flags/4x3/co.svg?no-inline";
import flag_cr from "flag-icons/flags/4x3/cr.svg?no-inline";
import flag_cu from "flag-icons/flags/4x3/cu.svg?no-inline";
import flag_cz from "flag-icons/flags/4x3/cz.svg?no-inline";
import flag_de from "flag-icons/flags/4x3/de.svg?no-inline";
import flag_dk from "flag-icons/flags/4x3/dk.svg?no-inline";
import flag_ec from "flag-icons/flags/4x3/ec.svg?no-inline";
import flag_eg from "flag-icons/flags/4x3/eg.svg?no-inline";
import flag_es from "flag-icons/flags/4x3/es.svg?no-inline";
import flag_et from "flag-icons/flags/4x3/et.svg?no-inline";
import flag_fi from "flag-icons/flags/4x3/fi.svg?no-inline";
import flag_fr from "flag-icons/flags/4x3/fr.svg?no-inline";
import flag_gb from "flag-icons/flags/4x3/gb.svg?no-inline";
import flag_gh from "flag-icons/flags/4x3/gh.svg?no-inline";
import flag_gr from "flag-icons/flags/4x3/gr.svg?no-inline";
import flag_gt from "flag-icons/flags/4x3/gt.svg?no-inline";
import flag_hk from "flag-icons/flags/4x3/hk.svg?no-inline";
import flag_hu from "flag-icons/flags/4x3/hu.svg?no-inline";
import flag_id from "flag-icons/flags/4x3/id.svg?no-inline";
import flag_ie from "flag-icons/flags/4x3/ie.svg?no-inline";
import flag_in from "flag-icons/flags/4x3/in.svg?no-inline";
import flag_ir from "flag-icons/flags/4x3/ir.svg?no-inline";
import flag_it from "flag-icons/flags/4x3/it.svg?no-inline";
import flag_jp from "flag-icons/flags/4x3/jp.svg?no-inline";
import flag_ke from "flag-icons/flags/4x3/ke.svg?no-inline";
import flag_kr from "flag-icons/flags/4x3/kr.svg?no-inline";
import flag_kz from "flag-icons/flags/4x3/kz.svg?no-inline";
import flag_ma from "flag-icons/flags/4x3/ma.svg?no-inline";
import flag_mx from "flag-icons/flags/4x3/mx.svg?no-inline";
import flag_my from "flag-icons/flags/4x3/my.svg?no-inline";
import flag_ng from "flag-icons/flags/4x3/ng.svg?no-inline";
import flag_nl from "flag-icons/flags/4x3/nl.svg?no-inline";
import flag_no from "flag-icons/flags/4x3/no.svg?no-inline";
import flag_np from "flag-icons/flags/4x3/np.svg?no-inline";
import flag_nz from "flag-icons/flags/4x3/nz.svg?no-inline";
import flag_pa from "flag-icons/flags/4x3/pa.svg?no-inline";
import flag_pe from "flag-icons/flags/4x3/pe.svg?no-inline";
import flag_ph from "flag-icons/flags/4x3/ph.svg?no-inline";
import flag_pk from "flag-icons/flags/4x3/pk.svg?no-inline";
import flag_pl from "flag-icons/flags/4x3/pl.svg?no-inline";
import flag_pt from "flag-icons/flags/4x3/pt.svg?no-inline";
import flag_qa from "flag-icons/flags/4x3/qa.svg?no-inline";
import flag_ru from "flag-icons/flags/4x3/ru.svg?no-inline";
import flag_sa from "flag-icons/flags/4x3/sa.svg?no-inline";
import flag_se from "flag-icons/flags/4x3/se.svg?no-inline";
import flag_sg from "flag-icons/flags/4x3/sg.svg?no-inline";
import flag_th from "flag-icons/flags/4x3/th.svg?no-inline";
import flag_tn from "flag-icons/flags/4x3/tn.svg?no-inline";
import flag_tr from "flag-icons/flags/4x3/tr.svg?no-inline";
import flag_tw from "flag-icons/flags/4x3/tw.svg?no-inline";
import flag_ua from "flag-icons/flags/4x3/ua.svg?no-inline";
import flag_ug from "flag-icons/flags/4x3/ug.svg?no-inline";
import flag_us from "flag-icons/flags/4x3/us.svg?no-inline";
import flag_uy from "flag-icons/flags/4x3/uy.svg?no-inline";
import flag_ve from "flag-icons/flags/4x3/ve.svg?no-inline";
import flag_vn from "flag-icons/flags/4x3/vn.svg?no-inline";
import flag_za from "flag-icons/flags/4x3/za.svg?no-inline";

export const FLAG_URLS: Readonly<Record<string, string>> = {
  AE: flag_ae,
  AR: flag_ar,
  AT: flag_at,
  AU: flag_au,
  BD: flag_bd,
  BO: flag_bo,
  BR: flag_br,
  CA: flag_ca,
  CL: flag_cl,
  CN: flag_cn,
  CO: flag_co,
  CR: flag_cr,
  CU: flag_cu,
  CZ: flag_cz,
  DE: flag_de,
  DK: flag_dk,
  EC: flag_ec,
  EG: flag_eg,
  ES: flag_es,
  ET: flag_et,
  FI: flag_fi,
  FR: flag_fr,
  GB: flag_gb,
  GH: flag_gh,
  GR: flag_gr,
  GT: flag_gt,
  HK: flag_hk,
  HU: flag_hu,
  ID: flag_id,
  IE: flag_ie,
  IN: flag_in,
  IR: flag_ir,
  IT: flag_it,
  JP: flag_jp,
  KE: flag_ke,
  KR: flag_kr,
  KZ: flag_kz,
  MA: flag_ma,
  MX: flag_mx,
  MY: flag_my,
  NG: flag_ng,
  NL: flag_nl,
  NO: flag_no,
  NP: flag_np,
  NZ: flag_nz,
  PA: flag_pa,
  PE: flag_pe,
  PH: flag_ph,
  PK: flag_pk,
  PL: flag_pl,
  PT: flag_pt,
  QA: flag_qa,
  RU: flag_ru,
  SA: flag_sa,
  SE: flag_se,
  SG: flag_sg,
  TH: flag_th,
  TN: flag_tn,
  TR: flag_tr,
  TW: flag_tw,
  UA: flag_ua,
  UG: flag_ug,
  US: flag_us,
  UY: flag_uy,
  VE: flag_ve,
  VN: flag_vn,
  ZA: flag_za,
};
