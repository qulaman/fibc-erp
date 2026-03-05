// Расчётный движок для планирования производства Биг-Бэга

export interface BigBagParams {
  // Тип продукции
  productType: 'bigbag_4strap' | 'bigbag_4strap_u' | 'bigbag_2strap';

  // Габариты
  height: number;        // см
  width: number;         // см
  bottomSize: number;    // см

  // Ткань
  mainDensity: number;   // г/м² (основная)
  auxDensity: number;    // г/м² (вспомогательная)

  // Верх
  topType: 'spout' | 'skirt' | 'open';
  topSpoutDia: number;
  topSpoutHeight: number;
  skirtHeight: number;

  // Низ (только 4х стропный)
  hasBottomSpout: boolean;
  bottomSpoutDia: number;
  bottomSpoutHeight: number;

  // Завязки
  tieWeightPerM: number;  // г/м
  tieLength: number;      // см

  // Стропы (только 4х стропный)
  strapLayer1: '1/1' | '2/3' | '1/3'; // доля высоты 1-го слоя (вверх)
  strapLayer2: '1/1' | '2/3' | '1/3'; // доля высоты 2-го слоя (вниз)
  strapWeightPerM: number; // г/м
  strapLoopHeight: number; // см

  // Нить
  threadWeightPerCm: number; // г/см шва

  // Ламинация
  laminationDensity: number; // г/м², 0 = без ламинации

  // Дополнительно
  hasPeLiner: boolean;          // ПЭ вкладыш
  peLinerLength: number;        // длина вкладыша, см
  peLinerWidth: number;         // ширина вкладыша, см
  peLinerDensity: number;       // плотность плёнки, мкм (микрон)
  hasPrinting: boolean;         // печать
  hasDocPocket: boolean;        // карман для документов
}

export interface BigBagWeightBreakdown {
  body_g: number;
  bottom_g: number;
  top_g: number;
  bottomSpout_g: number;
  ties_g: number;
  straps_g: number;
  strapSleeve_g: number;    // чехол стропы (2х стропный)
  narrowRibbon_g: number;   // узкая лента
  infoPocket_g: number;     // информационный карман
  lid_g: number;            // крышка (лам. ткань)
  thread_g: number;
  peLiner_g: number;           // ПЭ вкладыш
  lamination_g: number;        // ламинация
  total_g: number;
  total_kg: number;
  // Формулы для отображения расчёта
  formulas: {
    body: string;
    bottom: string;
    top: string;
    bottomSpout: string;
    ties: string;
    straps: string;
    strapSleeve: string;
    narrowRibbon: string;
    infoPocket: string;
    lid: string;
    thread: string;
    threadDetails: string;
    peLiner: string;
    lamination: string;
  };
}

export interface TkanSpec {
  id: number;
  nazvanie_tkani: string;
  shirina_polotna_sm: number;
  plotnost_polotna_gr_m2: number;
  osnova_denye: number;              // денье нити основы
  osnova_shirina_niti_sm: number;    // ширина нити основы (см)
  utok_denye: number;                // денье нити утка
  utok_shirina_niti_sm: number;      // ширина нити утка (см)
  osnova_itogo_kg: number;   // расход основы кг/м
  utok_itogo_kg: number;     // расход утка кг/м
  receptura_pp_kg: number;
  receptura_karbonat_kg: number;
  receptura_uf_stabilizator_kg: number;
  receptura_krasitel_kg: number;
}

export interface StropSpec {
  id?: number;
  nazvanie: string;
  shirina_mm: number;
  plotnost_gr_mp: number;
  osnova_nit_type: string;         // 'ПП' или 'МФН'
  osnova_denye: number;            // денье нити основы стропы
  osnova_itogo_kg: number;         // расход нити основы на 1м стропы, кг
  utok_itogo_kg: number;           // расход нити утка на 1м стропы, кг
  is_fully_purchased: boolean;     // true = 100% покупная (МФН основа + МФН уток)
  mfn_rashod_kg: number;           // расход покупной МФН на 1м, кг
  receptura_pp_kg: number;         // ПП на 1м (только если основа ПП)
  receptura_karbonat_kg: number;
  receptura_uf_kg: number;
  receptura_krasitel_kg: number;
}

export interface DepartmentRequirement {
  department: string;
  description: string;
  items: { name: string; quantity: number; unit: string }[];
}

export interface ProductionCalculation {
  unitWeight: BigBagWeightBreakdown | VVMRWeightBreakdown;
  quantity: number;
  departments: DepartmentRequirement[];
}

// ===== ВВМР (Вагонный Вкладыш) =====

export interface VVMRParams {
  productType: 'vvmr';
  width: number;           // ширина (короткая сторона), см
  length: number;          // длина (длинная сторона), см
  wallHeight: number;      // высота стенки, см
  lidLongHeight: number;   // высота длинной крышки, см
  lidShortHeight: number;  // высота короткой крышки, см
  densityBottom: number;     // г/м² дна
  densityLongWall: number;   // г/м² длинного торца
  densityShortWall: number;  // г/м² короткого торца
  densityLongLid: number;    // г/м² длинной крышки
  densityShortLid: number;   // г/м² короткой крышки

  // Тесьма 20мм
  tapeWeightPerCm: number; // г/см (0.05)

  // Петли (на торцах)
  loopHeight: number;   // см (15)
  loopCount: number;    // шт (92)

  // Верёвки (тесьма)
  ropeWallLength: number;   // см (105) — короткие верёвки на дно
  ropeWallCount: number;    // шт (22)
  ropeBottomLength: number; // см (305) — длинные верёвки на торцы
  ropeBottomCount: number;  // шт (34)
  ropeTopLength: number;    // см (205) — верёвки на крышки
  ropeTopCount: number;     // шт (34)

  // Нить
  threadWeightPerCm: number; // г/см (0.05)

  // Ламинация
  laminationDensity: number; // г/м², 0 = без ламинации
}

export interface VVMRWeightBreakdown {
  bottomFabric_g: number;
  longWallFabric_g: number;
  shortWallFabric_g: number;
  longLidFabric_g: number;
  shortLidFabric_g: number;
  loops_g: number;
  ropeWall_g: number;
  ropeBottom_g: number;
  ropeTop_g: number;
  thread_g: number;
  lamination_g: number;
  total_g: number;
  total_kg: number;
}

/** Расчёт веса одного Биг-Бэга (диспетчер по типу) */
export function calculateBigBagWeight(p: BigBagParams, tkanSpec?: TkanSpec): BigBagWeightBreakdown {
  if (p.productType === 'bigbag_2strap') {
    return calculate2StrapWeight(p, tkanSpec);
  }
  if (p.productType === 'bigbag_4strap_u') {
    return calculate4StrapUWeight(p);
  }
  return calculate4StrapWeight(p, tkanSpec);
}

/** Расчёт веса 4х стропного Биг-Бэга */
function calculate4StrapWeight(p: BigBagParams, tkanSpec?: TkanSpec): BigBagWeightBreakdown {
  const K_main = p.mainDensity / 10000;
  const K_aux = p.auxDensity / 10000;

  // 1. Тело (рукав): ширина × (высота + загиб) × 4 стороны × плотность
  // Загиб: 8 см без патрубков, 10 см с патрубком (те же значения что в раскрое)
  const hasSpouts = p.topType === 'spout' || p.hasBottomSpout;
  const bodyAllowance = hasSpouts ? 10 : 8;
  const bodyBlankCm = p.height + bodyAllowance;
  const body_g = p.width * bodyBlankCm * 4 * K_main;
  const bodyFormula = `${p.width}×(${p.height}+${bodyAllowance})×4 × ${K_main}`;

  // 2. Дно (отдельный кусок ткани, +5 см припуск на шов — по технологу)
  const bottomCutSize = p.bottomSize + 5;
  const bottom_g = bottomCutSize * bottomCutSize * K_main;
  const bottomFormula = `(${p.bottomSize}+5)×(${p.bottomSize}+5) × ${K_main}`;

  // 3. Верх
  // Люк — из основной ткани (K_main), Юбка — из лёгкой вспомогательной (K_aux)
  let top_g = 0;
  let topFormula = '—';
  if (p.topType === 'spout') {
    const widthFlat = (p.topSpoutDia * Math.PI) + 3;
    top_g = widthFlat * p.topSpoutHeight * K_main;
    topFormula = `((Ø${p.topSpoutDia}×π)+3)×${p.topSpoutHeight} × ${K_main}`;
  } else if (p.topType === 'skirt') {
    const perimeter = p.width * 4;
    top_g = perimeter * (p.skirtHeight + 5) * K_aux;
    topFormula = `(${p.width}×4)×(${p.skirtHeight}+5) × ${K_aux}`;
  }

  // 4. Нижний люк (из основной ткани)
  let bottomSpout_g = 0;
  let bottomSpoutFormula = '—';
  if (p.hasBottomSpout) {
    const widthFlat = (p.bottomSpoutDia * Math.PI) + 3;
    bottomSpout_g = widthFlat * p.bottomSpoutHeight * K_main;
    bottomSpoutFormula = `((Ø${p.bottomSpoutDia}×π)+3)×${p.bottomSpoutHeight} × ${K_main}`;
  }

  // 5. Завязки
  let tiesCount = 0;
  if (p.topType !== 'open') tiesCount++;
  if (p.hasBottomSpout) tiesCount++;
  const ties_g = tiesCount * (p.tieLength / 100) * p.tieWeightPerM;
  const tiesFormula = `${tiesCount}шт × ${p.tieLength}см × ${p.tieWeightPerM}г/м`;

  // 6. Стропы (4 шт)
  // Стропа: слой1 (вверх) + петля + слой2 (вниз), проходит через дно
  const strapWeightPerCm = p.strapWeightPerM / 100;
  const f1 = layerFraction(p.strapLayer1);
  const f2 = layerFraction(p.strapLayer2);
  const oneStrapLen = round2(p.height * f1) + p.strapLoopHeight + round2(p.height * f2);
  const straps_g = oneStrapLen * 4 * strapWeightPerCm;
  const strapsFormula = `(${p.height}×${p.strapLayer1}+${p.strapLoopHeight}+${p.height}×${p.strapLayer2})×4 × ${round2(strapWeightPerCm)}`;

  // 7. Крышка (при наличии люка — закрывает дно/верх, из лам. ткани)
  // По технологу: (дно+5) × (дно+5) × K_aux (лам.ткань ~95 г/м²)
  const K_lam = 0.0095; // 95 г/м² ламинированная ткань
  const hasLid = p.topType === 'spout' || p.hasBottomSpout;
  const lid_g = hasLid ? (p.bottomSize + 5) * (p.bottomSize + 5) * K_lam : 0;
  const lidFormula = hasLid
    ? `(${p.bottomSize}+5)×(${p.bottomSize}+5) × ${K_lam}`
    : '—';

  // 8. Узкая лента — только при наличии завязок (люк/юбка/нижний люк)
  const hasTies = p.topType !== 'open' || p.hasBottomSpout;
  const narrowRibbon_g = hasTies ? 13 : 0;
  const narrowRibbonFormula = hasTies ? '2см×130см×2слоя×0.05 = 13' : '—';

  // 9. Информационный карман
  const infoPocket_g = 5;
  const infoPocketFormula = 'карман А4 = 5';

  // 9. Нить (швы)
  const seamPerimeter = p.width * 4;

  let seamTop = 0;
  let seamTopDesc = '';
  if (p.topType === 'spout') {
    seamTop = seamPerimeter + p.topSpoutHeight + (p.topSpoutDia * Math.PI);
    seamTopDesc = `Верх: ${seamPerimeter}+${p.topSpoutHeight}+${round2(p.topSpoutDia * Math.PI)}`;
  } else if (p.topType === 'skirt') {
    seamTop = seamPerimeter + seamPerimeter + p.skirtHeight;
    seamTopDesc = `Верх: ${seamPerimeter}(низ)+${seamPerimeter}(верх)+${p.skirtHeight}(бок)`;
  } else {
    seamTop = seamPerimeter;
    seamTopDesc = `Верх: обмётка ${seamPerimeter}`;
  }

  let seamBot = 0;
  let seamBotDesc = '';
  if (p.hasBottomSpout) {
    seamBot = seamPerimeter + p.bottomSpoutHeight + (p.bottomSpoutDia * Math.PI);
    seamBotDesc = `Низ: ${seamPerimeter}+${p.bottomSpoutHeight}+${round2(p.bottomSpoutDia * Math.PI)}`;
  } else {
    seamBot = seamPerimeter;
    seamBotDesc = `Низ: пришив дна ${seamPerimeter}`;
  }

  // Швы строп: стропа пришивается к телу на всю высоту
  const seamStraps = p.height * 4;
  const totalSeamCm = seamTop + seamBot + seamStraps;
  const thread_g = totalSeamCm * p.threadWeightPerCm;
  const threadFormula = `${round2(totalSeamCm)} см × ${p.threadWeightPerCm} г/см`;
  const threadDetails = `${seamTopDesc}\n${seamBotDesc}\nСтропы: ${p.height}×4 = ${seamStraps}`;

  // 11. ПЭ вкладыш
  // Плотность ПЭ ≈ 0.92 г/см³, плёнка в микронах → толщина в см = мкм / 10000
  // Вес = длина_см × ширина_см × (мкм / 10000) × 0.92
  const peLiner_g = p.hasPeLiner
    ? p.peLinerLength * p.peLinerWidth * (p.peLinerDensity / 10000) * 0.92
    : 0;
  const peLinerFormula = p.hasPeLiner
    ? `${p.peLinerLength}×${p.peLinerWidth}×(${p.peLinerDensity}/10000)×0.92`
    : '—';

  // 12. Ламинация — площадь тела × плотность ламината
  const laminationAreaM2 = p.width * bodyBlankCm * 4 / 10000;
  const lamination_g = p.laminationDensity > 0 ? round2(laminationAreaM2 * p.laminationDensity) : 0;
  const laminationFormula = p.laminationDensity > 0
    ? `${p.width}×${bodyBlankCm}×4/10000×${p.laminationDensity}`
    : '—';

  const total_g = body_g + bottom_g + top_g + bottomSpout_g + ties_g + straps_g + lid_g + narrowRibbon_g + infoPocket_g + thread_g + peLiner_g + lamination_g;

  return {
    body_g: round2(body_g),
    bottom_g: round2(bottom_g),
    top_g: round2(top_g),
    bottomSpout_g: round2(bottomSpout_g),
    ties_g: round2(ties_g),
    straps_g: round2(straps_g),
    strapSleeve_g: 0,
    narrowRibbon_g,
    infoPocket_g,
    lid_g: round2(lid_g),
    thread_g: round2(thread_g),
    peLiner_g: round2(peLiner_g),
    lamination_g,
    total_g: round2(total_g),
    total_kg: round3(total_g / 1000),
    formulas: {
      body: bodyFormula,
      bottom: bottomFormula,
      top: topFormula,
      bottomSpout: bottomSpoutFormula,
      ties: tiesFormula,
      straps: strapsFormula,
      strapSleeve: '—',
      narrowRibbon: narrowRibbonFormula,
      infoPocket: infoPocketFormula,
      lid: lidFormula,
      thread: threadFormula,
      threadDetails,
      peLiner: peLinerFormula,
      lamination: laminationFormula,
    },
  };
}

/** Расчёт веса 4х стропного U-образного кроя */
function calculate4StrapUWeight(p: BigBagParams): BigBagWeightBreakdown {
  const K_main = p.mainDensity / 10000; // U-панель (полотно + дно)
  const K_aux = p.auxDensity / 10000;   // Боковинки

  // 1. U-панель (полотно): ширина × (2×высота + дно) × 2 слоя × K_main
  const uPanelLength = 2 * p.height + p.bottomSize;
  const body_g = p.width * uPanelLength * 2 * K_main;
  const bodyFormula = `${p.width}×(2×${p.height}+${p.bottomSize})×2 × ${K_main} [U-панель]`;

  // 2. Боковинки: ширина × высота × 4 шт × K_aux
  const sidePanel_g = p.width * p.height * 4 * K_aux;
  // Используем bottom_g для хранения веса боковинок (в U-крое нет отдельного дна)
  const bottom_g = sidePanel_g;
  const bottomFormula = `${p.width}×${p.height}×4 × ${K_aux} [боковинки]`;

  // 3. Верх (люк/юбка — аналогично рукаву)
  let top_g = 0;
  let topFormula = '—';
  if (p.topType === 'spout') {
    const widthFlat = (p.topSpoutDia * Math.PI) + 3;
    top_g = widthFlat * p.topSpoutHeight * K_main;
    topFormula = `((Ø${p.topSpoutDia}×π)+3)×${p.topSpoutHeight} × ${K_main}`;
  } else if (p.topType === 'skirt') {
    const perimeter = p.width * 4;
    top_g = perimeter * (p.skirtHeight + 5) * K_aux;
    topFormula = `(${p.width}×4)×(${p.skirtHeight}+5) × ${K_aux}`;
  }

  // 4. Нижний люк
  let bottomSpout_g = 0;
  let bottomSpoutFormula = '—';
  if (p.hasBottomSpout) {
    const widthFlat = (p.bottomSpoutDia * Math.PI) + 3;
    bottomSpout_g = widthFlat * p.bottomSpoutHeight * K_main;
    bottomSpoutFormula = `((Ø${p.bottomSpoutDia}×π)+3)×${p.bottomSpoutHeight} × ${K_main}`;
  }

  // 5. Завязки
  let tiesCount = 0;
  if (p.topType !== 'open') tiesCount++;
  if (p.hasBottomSpout) tiesCount++;
  const ties_g = tiesCount * (p.tieLength / 100) * p.tieWeightPerM;
  const tiesFormula = `${tiesCount}шт × ${p.tieLength}см × ${p.tieWeightPerM}г/м`;

  // 6. Стропы (4 шт) — НЕ через дно, короче
  // U-крой: слой1 + петля + слой2 + 25 (припуск)
  const strapWeightPerCm = p.strapWeightPerM / 100;
  const f1 = layerFraction(p.strapLayer1);
  const f2 = layerFraction(p.strapLayer2);
  const oneStrapLen = round2(p.height * f1) + p.strapLoopHeight + round2(p.height * f2) + 25;
  const straps_g = oneStrapLen * 4 * strapWeightPerCm;
  const strapsFormula = `(${p.height}×${p.strapLayer1}+${p.strapLoopHeight}+${p.height}×${p.strapLayer2}+25)×4 × ${round2(strapWeightPerCm)} [U-крой]`;

  // 7. Крышка
  const K_lam = 0.0095;
  const hasLid = p.topType === 'spout' || p.hasBottomSpout;
  const lid_g = hasLid ? (p.bottomSize + 5) * (p.bottomSize + 5) * K_lam : 0;
  const lidFormula = hasLid
    ? `(${p.bottomSize}+5)×(${p.bottomSize}+5) × ${K_lam}`
    : '—';

  // 8. Узкая лента — только при наличии завязок (люк/юбка/нижний люк)
  const hasTies = p.topType !== 'open' || p.hasBottomSpout;
  const narrowRibbon_g = hasTies ? 13 : 0;
  const narrowRibbonFormula = hasTies ? '2см×130см×2слоя×0.05 = 13' : '—';

  // 9. Информационный карман
  const infoPocket_g = 5;
  const infoPocketFormula = 'карман А4 = 5';

  // 10. Нить (швы)
  const seamPerimeter = p.width * 4;
  let seamTop = 0;
  let seamTopDesc = '';
  if (p.topType === 'spout') {
    seamTop = seamPerimeter + p.topSpoutHeight + (p.topSpoutDia * Math.PI);
    seamTopDesc = `Верх: ${seamPerimeter}+${p.topSpoutHeight}+${round2(p.topSpoutDia * Math.PI)}`;
  } else if (p.topType === 'skirt') {
    seamTop = seamPerimeter + seamPerimeter + p.skirtHeight;
    seamTopDesc = `Верх: ${seamPerimeter}(низ)+${seamPerimeter}(верх)+${p.skirtHeight}(бок)`;
  } else {
    seamTop = seamPerimeter;
    seamTopDesc = `Верх: обмётка ${seamPerimeter}`;
  }

  let seamBot = 0;
  let seamBotDesc = '';
  if (p.hasBottomSpout) {
    seamBot = seamPerimeter + p.bottomSpoutHeight + (p.bottomSpoutDia * Math.PI);
    seamBotDesc = `Низ: ${seamPerimeter}+${p.bottomSpoutHeight}+${round2(p.bottomSpoutDia * Math.PI)}`;
  } else {
    seamBot = seamPerimeter;
    seamBotDesc = `Низ: пришив боковинок ${seamPerimeter}`;
  }

  // Швы боковинок: 4 вертикальных шва × высота + 4 шва строп
  const seamSides = p.height * 4; // вертикальные швы боковинок
  const seamStraps = p.height * 4; // пришив строп
  const totalSeamCm = seamTop + seamBot + seamSides + seamStraps;
  const thread_g = totalSeamCm * p.threadWeightPerCm;
  const threadFormula = `${round2(totalSeamCm)} см × ${p.threadWeightPerCm} г/см`;
  const threadDetails = `${seamTopDesc}\n${seamBotDesc}\nБоковинки: ${p.height}×4 = ${seamSides}\nСтропы: ${p.height}×4 = ${seamStraps}`;

  // 11. ПЭ вкладыш
  const peLiner_g = p.hasPeLiner
    ? p.peLinerLength * p.peLinerWidth * (p.peLinerDensity / 10000) * 0.92
    : 0;
  const peLinerFormula = p.hasPeLiner
    ? `${p.peLinerLength}×${p.peLinerWidth}×(${p.peLinerDensity}/10000)×0.92`
    : '—';

  // 12. Ламинация
  const totalFabricAreaCm2 = p.width * uPanelLength * 2 + p.width * p.height * 4;
  const laminationAreaM2 = totalFabricAreaCm2 / 10000;
  const lamination_g = p.laminationDensity > 0 ? round2(laminationAreaM2 * p.laminationDensity) : 0;
  const laminationFormula = p.laminationDensity > 0
    ? `(${round2(laminationAreaM2)} м²) × ${p.laminationDensity}`
    : '—';

  const total_g = body_g + bottom_g + top_g + bottomSpout_g + ties_g + straps_g + lid_g + narrowRibbon_g + infoPocket_g + thread_g + peLiner_g + lamination_g;

  return {
    body_g: round2(body_g),
    bottom_g: round2(bottom_g),
    top_g: round2(top_g),
    bottomSpout_g: round2(bottomSpout_g),
    ties_g: round2(ties_g),
    straps_g: round2(straps_g),
    strapSleeve_g: 0,
    narrowRibbon_g,
    infoPocket_g,
    lid_g: round2(lid_g),
    thread_g: round2(thread_g),
    peLiner_g: round2(peLiner_g),
    lamination_g,
    total_g: round2(total_g),
    total_kg: round3(total_g / 1000),
    formulas: {
      body: bodyFormula,
      bottom: bottomFormula,
      top: topFormula,
      bottomSpout: bottomSpoutFormula,
      ties: tiesFormula,
      straps: strapsFormula,
      strapSleeve: '—',
      narrowRibbon: narrowRibbonFormula,
      infoPocket: infoPocketFormula,
      lid: lidFormula,
      thread: threadFormula,
      threadDetails,
      peLiner: peLinerFormula,
      lamination: laminationFormula,
    },
  };
}

/** Расчёт веса 2х стропного Биг-Бэга */
function calculate2StrapWeight(p: BigBagParams, tkanSpec?: TkanSpec): BigBagWeightBreakdown {
  // Расход нити на 1 погонный метр ткани (из спецификации)
  const yarnPerMeter = tkanSpec
    ? (tkanSpec.osnova_itogo_kg + tkanSpec.utok_itogo_kg)
    : 0;
  const K_main = p.mainDensity / 10000;
  const K_aux = p.auxDensity / 10000;

  // 1. Тело (фальц рукав)
  // 2х стропный: петля формируется из тела
  // +20 см — припуск на стропу (подворот/усиление петли, по технологу)
  // Дно звезда: запас ≈ bottomSize / √2 + 2 (геометрия диагональной складки)
  // Разгруз. люк: дно — отдельный кусок
  const strapAllowance = 20; // припуск на стропу (по технологу)
  const bottomFabricCm = p.hasBottomSpout ? 0 : Math.round(p.bottomSize / 1.55);
  const bodyLengthCm = p.height + p.strapLoopHeight + strapAllowance + bottomFabricCm;
  const bodyLengthM = bodyLengthCm / 100;
  // Вес через реальный расход нити на метр ткани (из tkan_specifications)
  const body_g = tkanSpec
    ? bodyLengthM * yarnPerMeter * 1000
    : p.width * bodyLengthCm * 4 * K_main;
  const bodyFormula = tkanSpec
    ? (p.hasBottomSpout
        ? `${round2(bodyLengthM)}м × ${round2(yarnPerMeter)}кг/м × 1000`
        : `(${p.height}+${p.strapLoopHeight}+20+${bottomFabricCm})/100 × ${round2(yarnPerMeter)}кг/м × 1000`)
    : (p.hasBottomSpout
        ? `${p.width}×(${p.height}+${p.strapLoopHeight}+20)×4 × ${K_main}`
        : `${p.width}×(${p.height}+${p.strapLoopHeight}+20+${bottomFabricCm})×4 × ${K_main}`);

  // 2. Дно — звезда: 0 (входит в тело), разгруз. люк: отдельный кусок (+5 шов)
  const bottomCutSize2 = p.bottomSize + 5;
  const bottom_g = p.hasBottomSpout
    ? bottomCutSize2 * bottomCutSize2 * K_main
    : 0;
  const bottomFormula = p.hasBottomSpout
    ? `(${p.bottomSize}+5)×(${p.bottomSize}+5) × ${K_main}`
    : '0 (входит в тело рукава)';

  // 3. Верх
  // Люк — из основной ткани (K_main), Юбка — из лёгкой вспомогательной (K_aux)
  let top_g = 0;
  let topFormula = '—';
  if (p.topType === 'spout') {
    const widthFlat = (p.topSpoutDia * Math.PI) + 3;
    top_g = widthFlat * p.topSpoutHeight * K_main;
    topFormula = `((Ø${p.topSpoutDia}×π)+3)×${p.topSpoutHeight} × ${K_main}`;
  } else if (p.topType === 'skirt') {
    const perimeter = p.width * 4;
    top_g = perimeter * (p.skirtHeight + 5) * K_aux;
    topFormula = `(${p.width}×4)×(${p.skirtHeight}+5) × ${K_aux}`;
  }

  // 4. Нижний разгрузочный люк (из основной ткани)
  let bottomSpout_g = 0;
  let bottomSpoutFormula = '—';
  if (p.hasBottomSpout) {
    const widthFlat = (p.bottomSpoutDia * Math.PI) + 3;
    bottomSpout_g = widthFlat * p.bottomSpoutHeight * K_main;
    bottomSpoutFormula = `((Ø${p.bottomSpoutDia}×π)+3)×${p.bottomSpoutHeight} × ${K_main}`;
  }

  // 5. Завязки
  let tiesCount = 0;
  if (p.topType !== 'open') tiesCount++;
  if (p.hasBottomSpout) tiesCount++;
  const ties_g = tiesCount * (p.tieLength / 100) * p.tieWeightPerM;
  const tiesFormula = tiesCount > 0
    ? `${tiesCount}шт × ${p.tieLength}см × ${p.tieWeightPerM}г/м`
    : '—';

  // 6. Стропы — нет пришивных лент у 2х стропного
  const straps_g = 0;
  const strapsFormula = '—';

  // 7. Чехол стропы (ручки): 2 шт × 27×20 см × 100 г/м² (по данным технолога)
  const sleeveW = 0.27; // м
  const sleeveH = 0.20; // м
  const sleeveDensity = 100; // г/м²
  const strapSleeve_g = 2 * sleeveW * sleeveH * sleeveDensity;
  const strapSleeveFormula = `2×(${sleeveW}×${sleeveH}×${sleeveDensity}) = ${round2(strapSleeve_g)}`;

  // 8. Узкая лента — только при наличии завязок (люк/юбка/нижний люк)
  const hasTies = p.topType !== 'open' || p.hasBottomSpout;
  const narrowRibbon_g = hasTies ? 6.5 : 0;
  const narrowRibbonFormula = hasTies ? '1см×130см×1слой×0.05 = 6.5' : '—';

  // 9. Информационный карман
  const infoPocket_g = 5;
  const infoPocketFormula = 'карман А4 = 5';

  // 10. Нить (швы) — формула для 2х стропного
  // Периметр: width × 4 (дно звезда — круговой шов)
  // + 2 шва пришива чехлов строп (0.2 м = 20 см каждый)
  const seamPerimeter = p.width * 4;
  const seamSleeves = 20 * 2; // 2 чехла × 20 см
  let seamBot = 0;
  let seamBotDesc = '';
  if (p.hasBottomSpout) {
    seamBot = seamPerimeter + p.bottomSpoutHeight + (p.bottomSpoutDia * Math.PI);
    seamBotDesc = `\nЛюк низ: ${seamPerimeter}+${p.bottomSpoutHeight}+${round2(p.bottomSpoutDia * Math.PI)}`;
  }
  const totalSeamCm = seamPerimeter + seamSleeves + seamBot;
  const thread_g = totalSeamCm * p.threadWeightPerCm;
  const threadFormula = `${round2(totalSeamCm)} см × ${p.threadWeightPerCm} г/см`;
  const threadDetails = `Периметр: ${p.width}×4 = ${seamPerimeter}\nЧехлы: 20×2 = ${seamSleeves}${seamBotDesc}`;

  // 11. ПЭ вкладыш
  const peLiner_g = p.hasPeLiner
    ? p.peLinerLength * p.peLinerWidth * (p.peLinerDensity / 10000) * 0.92
    : 0;
  const peLinerFormula = p.hasPeLiner
    ? `${p.peLinerLength}×${p.peLinerWidth}×(${p.peLinerDensity}/10000)×0.92`
    : '—';

  // 12. Ламинация — площадь тела × плотность ламината
  const laminationAreaM2 = bodyLengthCm * p.width * 4 / 10000;
  const lamination_g = p.laminationDensity > 0 ? round2(laminationAreaM2 * p.laminationDensity) : 0;
  const laminationFormula = p.laminationDensity > 0
    ? `${bodyLengthCm}×${p.width}×4/10000×${p.laminationDensity}`
    : '—';

  const total_g = body_g + bottom_g + top_g + bottomSpout_g + ties_g + straps_g
    + strapSleeve_g + narrowRibbon_g + infoPocket_g + thread_g + peLiner_g + lamination_g;

  return {
    body_g: round2(body_g),
    bottom_g: round2(bottom_g),
    top_g: round2(top_g),
    bottomSpout_g: round2(bottomSpout_g),
    ties_g: round2(ties_g),
    straps_g: 0,
    strapSleeve_g: round2(strapSleeve_g),
    narrowRibbon_g,
    infoPocket_g,
    lid_g: 0,
    thread_g: round2(thread_g),
    peLiner_g: round2(peLiner_g),
    lamination_g,
    total_g: round2(total_g),
    total_kg: round3(total_g / 1000),
    formulas: {
      body: bodyFormula,
      bottom: bottomFormula,
      top: topFormula,
      bottomSpout: bottomSpoutFormula,
      ties: tiesFormula,
      straps: strapsFormula,
      strapSleeve: strapSleeveFormula,
      narrowRibbon: narrowRibbonFormula,
      infoPocket: infoPocketFormula,
      lid: '—',
      thread: threadFormula,
      threadDetails,
      peLiner: peLinerFormula,
      lamination: laminationFormula,
    },
  };
}

/** Расчёт потребностей по цехам для N штук */
export function calculateProductionNeeds(
  p: BigBagParams,
  quantity: number,
  tkanSpec: TkanSpec,
  stropSpec?: StropSpec | null,
  tkanSpecAux?: TkanSpec | null
): ProductionCalculation {
  if (p.productType === 'bigbag_2strap') {
    return calculate2StrapNeeds(p, quantity, tkanSpec);
  }
  if (p.productType === 'bigbag_4strap_u') {
    return calculate4StrapUNeeds(p, quantity, tkanSpec, stropSpec!, tkanSpecAux!);
  }
  return calculate4StrapNeeds(p, quantity, tkanSpec, stropSpec!);
}

/** Потребности для 4х стропного */
function calculate4StrapNeeds(
  p: BigBagParams,
  quantity: number,
  tkanSpec: TkanSpec,
  stropSpec: StropSpec
): ProductionCalculation {
  const unitWeight = calculateBigBagWeight(p, tkanSpec);
  const fabricWidthCm = tkanSpec.shirina_polotna_sm;

  // --- ТКАЧЕСТВО ---
  // Заготовка тела: высота + припуск на подворот (+8 или +10 см)
  const hasSpouts = p.topType === 'spout' || p.hasBottomSpout;
  const bodyAllowance = hasSpouts ? 10 : 8;
  const bodyBlankCm = p.height + bodyAllowance;
  const bodyBlankM = round2(bodyBlankCm / 100);
  // Дно: отдельный кусок (bottomSize + 5 см припуск на шов — по технологу)
  const bottomCutSize = p.bottomSize + 5;
  const bottomBlankM = round2(bottomCutSize / 100);
  // Итого на 1 шт: тело + дно (в погонных метрах рукава)
  const fabricMetersPerUnit = round2(bodyBlankM + bottomBlankM);
  // 2% запас на отходы (по технологу)
  const totalFabricMeters = round2(fabricMetersPerUnit * quantity * 1.02);

  // --- ЭКСТРУЗИЯ ---
  const warpKg = round2(totalFabricMeters * (tkanSpec.osnova_itogo_kg || 0));
  const weftKg = round2(totalFabricMeters * (tkanSpec.utok_itogo_kg || 0));
  const totalYarnKg = round2(warpKg + weftKg);

  // --- СЫРЬЁ ---
  const ppKg = round2(totalFabricMeters * (tkanSpec.receptura_pp_kg || 0));
  const carbonateKg = round2(totalFabricMeters * (tkanSpec.receptura_karbonat_kg || 0));
  const uvKg = round2(totalFabricMeters * (tkanSpec.receptura_uf_stabilizator_kg || 0));
  const dyeKg = round2(totalFabricMeters * (tkanSpec.receptura_krasitel_kg || 0));

  // --- СТРОПЫ ---
  // Стропа: слой1 (вверх) + петля + слой2 (вниз), через дно
  const sf1 = layerFraction(p.strapLayer1);
  const sf2 = layerFraction(p.strapLayer2);
  const oneStrapCm = round2(p.height * sf1) + p.strapLoopHeight + round2(p.height * sf2);
  const totalStrapM = round2(oneStrapCm * 4 * quantity / 100);

  const strapMfnKg = round2(totalStrapM * (stropSpec.mfn_rashod_kg || 0));
  const strapPpYarnKg = stropSpec.is_fully_purchased
    ? 0
    : round2(totalStrapM * (stropSpec.osnova_itogo_kg || 0));

  const strapPpKg = round2(totalStrapM * (stropSpec.receptura_pp_kg || 0));
  const strapCarbonateKg = round2(totalStrapM * (stropSpec.receptura_karbonat_kg || 0));
  const strapUvKg = round2(totalStrapM * (stropSpec.receptura_uf_kg || 0));
  const strapDyeKg = round2(totalStrapM * (stropSpec.receptura_krasitel_kg || 0));

  // --- КРОЙ ---
  const bodyTubes = quantity;
  const bottomParts = quantity;
  let topParts = 0;
  if (p.topType !== 'open') topParts = quantity;
  const loopParts = 4 * quantity;

  // --- НИТЬ ---
  const totalThreadKg = round2(unitWeight.thread_g * quantity / 1000);

  // --- ЛАМИНАЦИЯ ---
  const laminationMeters = p.laminationDensity > 0 ? totalFabricMeters : 0;
  const laminationAreaM2Total = laminationMeters * fabricWidthCm / 100;
  const laminationKg = round2(laminationAreaM2Total * p.laminationDensity / 1000);

  // Общее сырьё: ткань + стропы
  const totalPpKg = round2(ppKg + strapPpKg);
  const totalCarbonateKg = round2(carbonateKg + strapCarbonateKg);
  const totalUvKg = round2(uvKg + strapUvKg);
  const totalDyeKg = round2(dyeKg + strapDyeKg);

  const departments: DepartmentRequirement[] = [
    {
      department: 'Сырьё',
      description: 'Закупка сырья и материалов',
      items: [
        { name: 'Полипропилен (ПП)', quantity: totalPpKg, unit: 'кг' },
        { name: 'Карбонат кальция', quantity: totalCarbonateKg, unit: 'кг' },
        { name: 'УФ-стабилизатор', quantity: totalUvKg, unit: 'кг' },
        { name: 'Краситель', quantity: totalDyeKg, unit: 'кг' },
        { name: 'МФН нить (покупная)', quantity: strapMfnKg, unit: 'кг' },
      ].filter(i => i.quantity > 0),
    },
    {
      department: 'Экструзия',
      description: 'Производство ПП нити',
      items: [
        { name: 'Итого ПП нити', quantity: round2(totalYarnKg + strapPpYarnKg), unit: 'кг' },
        { name: `Нить основа (ткань)${tkanSpec.osnova_denye ? ` ${tkanSpec.osnova_denye}den` : ''}${tkanSpec.osnova_shirina_niti_sm ? ` ${tkanSpec.osnova_shirina_niti_sm}см` : ''}`, quantity: warpKg, unit: 'кг' },
        { name: `Нить уток (ткань)${tkanSpec.utok_denye ? ` ${tkanSpec.utok_denye}den` : ''}${tkanSpec.utok_shirina_niti_sm ? ` ${tkanSpec.utok_shirina_niti_sm}см` : ''}`, quantity: weftKg, unit: 'кг' },
        ...(strapPpYarnKg > 0 ? [{ name: `Нить ПП (стропы)${stropSpec.osnova_denye ? ` ${stropSpec.osnova_denye}den` : ''}`, quantity: strapPpYarnKg, unit: 'кг' }] : []),
      ],
    },
    {
      department: 'Ткачество',
      description: `Рукав ${tkanSpec.nazvanie_tkani} (${fabricWidthCm} см)`,
      items: [
        { name: 'Ткань (рукав)', quantity: totalFabricMeters, unit: 'м' },
        { name: `Тело: (${p.height}+${bodyAllowance})/100`, quantity: bodyBlankM, unit: 'м/шт' },
        { name: `Дно: (${p.bottomSize}+5)/100`, quantity: bottomBlankM, unit: 'м/шт' },
        { name: `На 1 шт`, quantity: fabricMetersPerUnit, unit: 'м/шт' },
        { name: `Запас на отходы: 2%`, quantity: round2(fabricMetersPerUnit * quantity * 0.02), unit: 'м' },
      ],
    },
    ...(p.laminationDensity > 0 ? [{
      department: 'Ламинация',
      description: `Ламинирование ткани (${p.laminationDensity} г/м²)`,
      items: [
        { name: 'Ткань под ламинацию', quantity: laminationMeters, unit: 'м' },
        { name: 'Плотность ламината', quantity: p.laminationDensity, unit: 'г/м²' },
        { name: 'Вес ламината', quantity: laminationKg, unit: 'кг' },
      ],
    }] : []),
    {
      department: 'Стропы',
      description: `${stropSpec.nazvanie} (${stropSpec.shirina_mm}мм, ${stropSpec.osnova_nit_type === 'МФН' ? '100% МФН' : 'ПП+МФН'})`,
      items: [
        { name: 'Стропа', quantity: totalStrapM, unit: 'м' },
        { name: `4шт×(${p.height}×${p.strapLayer1}+${p.strapLoopHeight}+${p.height}×${p.strapLayer2})=${round2(oneStrapCm * 4)} см/шт`, quantity: round2(oneStrapCm * 4 / 100), unit: 'м/шт' },
        ...(strapPpYarnKg > 0 ? [{ name: 'ПП нить (основа)', quantity: strapPpYarnKg, unit: 'кг' }] : []),
        { name: 'МФН нить', quantity: strapMfnKg, unit: 'кг' },
      ],
    },
    {
      department: 'Крой',
      description: 'Раскрой деталей',
      items: [
        { name: `Тело (рукав ${bodyBlankCm} см = ${p.height}+${bodyAllowance})`, quantity: bodyTubes, unit: 'шт' },
        { name: `Донышко (${bottomCutSize}×${bottomCutSize} см = ${p.bottomSize}+5)`, quantity: bottomParts, unit: 'шт' },
        ...(topParts > 0 && p.topType === 'spout' ? [{
          name: `Люк верх (Ø${p.topSpoutDia}×${p.topSpoutHeight} см)`, quantity: topParts, unit: 'шт'
        }] : []),
        ...(topParts > 0 && p.topType === 'skirt' ? [{
          name: `Юбка (${p.width * 4}×${p.skirtHeight + 5} см)`, quantity: topParts, unit: 'шт'
        }] : []),
        ...(p.hasBottomSpout ? [{
          name: `Люк низ (Ø${p.bottomSpoutDia}×${p.bottomSpoutHeight} см)`, quantity: quantity, unit: 'шт'
        }] : []),
        { name: `Петли строп`, quantity: loopParts, unit: 'шт' },
      ],
    },
    {
      department: 'Пошив',
      description: `Сборка ${quantity} шт`,
      items: [
        { name: 'Биг-Бэг 4х стропный', quantity: quantity, unit: 'шт' },
        { name: `Нить швейная (${unitWeight.thread_g} г/шт)`, quantity: totalThreadKg, unit: 'кг' },
      ],
    },
    ...((p.hasPeLiner || p.hasPrinting || p.hasDocPocket) ? [{
      department: 'Дополнительно',
      description: 'Покупные комплектующие',
      items: [
        ...(p.hasPeLiner ? [{
          name: `ПЭ вкладыш (${p.peLinerLength}×${p.peLinerWidth} см, ${p.peLinerDensity} мкм)`,
          quantity: quantity, unit: 'шт'
        }] : []),
        ...(p.hasPrinting ? [{
          name: 'Печать', quantity: quantity, unit: 'шт'
        }] : []),
        ...(p.hasDocPocket ? [{
          name: 'Карман для документов', quantity: quantity, unit: 'шт'
        }] : []),
      ],
    }] : []),
  ];

  return { unitWeight, quantity, departments };
}

/** Потребности для 4х стропного U-образного кроя */
function calculate4StrapUNeeds(
  p: BigBagParams,
  quantity: number,
  tkanSpec: TkanSpec,       // U-панель (полотно + дно)
  stropSpec: StropSpec,
  tkanSpecAux: TkanSpec     // Боковинки
): ProductionCalculation {
  const unitWeight = calculateBigBagWeight(p);

  // --- ТКАЧЕСТВО ---
  // U-панель: (2×высота + дно) / 100 м/шт
  const uPanelBlankM = round2((2 * p.height + p.bottomSize) / 100);
  const totalUPanelMeters = round2(uPanelBlankM * quantity * 1.02);
  // Боковинки: высота / 100 м/шт (4 шт на ББ, но ткань шириной = width, кроим из рулона)
  const sideBlankM = round2(p.height / 100);
  // На 1 ББ нужно 4 боковинки × height см, из рулона шириной = width
  // Метраж: 4 × height / 100 м/шт
  const sideTotalPerUnit = round2(4 * p.height / 100);
  const totalSideMeters = round2(sideTotalPerUnit * quantity * 1.02);

  // --- ЭКСТРУЗИЯ ---
  // U-панель нити
  const warpKgMain = round2(totalUPanelMeters * (tkanSpec.osnova_itogo_kg || 0));
  const weftKgMain = round2(totalUPanelMeters * (tkanSpec.utok_itogo_kg || 0));
  // Боковинки нити
  const warpKgAux = round2(totalSideMeters * (tkanSpecAux.osnova_itogo_kg || 0));
  const weftKgAux = round2(totalSideMeters * (tkanSpecAux.utok_itogo_kg || 0));
  const totalYarnKg = round2(warpKgMain + weftKgMain + warpKgAux + weftKgAux);

  // --- СЫРЬЁ ---
  const ppKg = round2(
    totalUPanelMeters * (tkanSpec.receptura_pp_kg || 0) +
    totalSideMeters * (tkanSpecAux.receptura_pp_kg || 0)
  );
  const carbonateKg = round2(
    totalUPanelMeters * (tkanSpec.receptura_karbonat_kg || 0) +
    totalSideMeters * (tkanSpecAux.receptura_karbonat_kg || 0)
  );
  const uvKg = round2(
    totalUPanelMeters * (tkanSpec.receptura_uf_stabilizator_kg || 0) +
    totalSideMeters * (tkanSpecAux.receptura_uf_stabilizator_kg || 0)
  );
  const dyeKg = round2(
    totalUPanelMeters * (tkanSpec.receptura_krasitel_kg || 0) +
    totalSideMeters * (tkanSpecAux.receptura_krasitel_kg || 0)
  );

  // --- СТРОПЫ ---
  // U-крой: слой1 + петля + слой2 + 25 (не через дно)
  const sf1 = layerFraction(p.strapLayer1);
  const sf2 = layerFraction(p.strapLayer2);
  const oneStrapCm = round2(p.height * sf1) + p.strapLoopHeight + round2(p.height * sf2) + 25;
  const totalStrapM = round2(oneStrapCm * 4 * quantity / 100);

  const strapMfnKg = round2(totalStrapM * (stropSpec.mfn_rashod_kg || 0));
  const strapPpYarnKg = stropSpec.is_fully_purchased
    ? 0
    : round2(totalStrapM * (stropSpec.osnova_itogo_kg || 0));

  const strapPpKg = round2(totalStrapM * (stropSpec.receptura_pp_kg || 0));
  const strapCarbonateKg = round2(totalStrapM * (stropSpec.receptura_karbonat_kg || 0));
  const strapUvKg = round2(totalStrapM * (stropSpec.receptura_uf_kg || 0));
  const strapDyeKg = round2(totalStrapM * (stropSpec.receptura_krasitel_kg || 0));

  // --- КРОЙ ---
  const uPanels = quantity;   // U-панели
  const sidePanels = 4 * quantity; // боковинки
  let topParts = 0;
  if (p.topType !== 'open') topParts = quantity;
  const loopParts = 4 * quantity;

  // --- НИТЬ ---
  const totalThreadKg = round2(unitWeight.thread_g * quantity / 1000);

  // --- ЛАМИНАЦИЯ ---
  const totalFabricMetersAll = round2(totalUPanelMeters + totalSideMeters);
  const laminationMeters = p.laminationDensity > 0 ? totalFabricMetersAll : 0;
  const avgWidthCm = p.width; // ткань шириной = ширине ББ
  const laminationAreaM2Total = laminationMeters * avgWidthCm / 100;
  const laminationKg = round2(laminationAreaM2Total * p.laminationDensity / 1000);

  // Общее сырьё
  const totalPpKg = round2(ppKg + strapPpKg);
  const totalCarbonateKg = round2(carbonateKg + strapCarbonateKg);
  const totalUvKg = round2(uvKg + strapUvKg);
  const totalDyeKg = round2(dyeKg + strapDyeKg);

  const departments: DepartmentRequirement[] = [
    {
      department: 'Сырьё',
      description: 'Закупка сырья и материалов',
      items: [
        { name: 'Полипропилен (ПП)', quantity: totalPpKg, unit: 'кг' },
        { name: 'Карбонат кальция', quantity: totalCarbonateKg, unit: 'кг' },
        { name: 'УФ-стабилизатор', quantity: totalUvKg, unit: 'кг' },
        { name: 'Краситель', quantity: totalDyeKg, unit: 'кг' },
        { name: 'МФН нить (покупная)', quantity: strapMfnKg, unit: 'кг' },
      ].filter(i => i.quantity > 0),
    },
    {
      department: 'Экструзия',
      description: 'Производство ПП нити',
      items: [
        { name: 'Итого ПП нити', quantity: round2(totalYarnKg + strapPpYarnKg), unit: 'кг' },
        { name: `Нить основа U-панель${tkanSpec.osnova_denye ? ` ${tkanSpec.osnova_denye}den` : ''}${tkanSpec.osnova_shirina_niti_sm ? ` ${tkanSpec.osnova_shirina_niti_sm}см` : ''}`, quantity: warpKgMain, unit: 'кг' },
        { name: `Нить уток U-панель${tkanSpec.utok_denye ? ` ${tkanSpec.utok_denye}den` : ''}${tkanSpec.utok_shirina_niti_sm ? ` ${tkanSpec.utok_shirina_niti_sm}см` : ''}`, quantity: weftKgMain, unit: 'кг' },
        { name: `Нить основа боковинки${tkanSpecAux.osnova_denye ? ` ${tkanSpecAux.osnova_denye}den` : ''}${tkanSpecAux.osnova_shirina_niti_sm ? ` ${tkanSpecAux.osnova_shirina_niti_sm}см` : ''}`, quantity: warpKgAux, unit: 'кг' },
        { name: `Нить уток боковинки${tkanSpecAux.utok_denye ? ` ${tkanSpecAux.utok_denye}den` : ''}${tkanSpecAux.utok_shirina_niti_sm ? ` ${tkanSpecAux.utok_shirina_niti_sm}см` : ''}`, quantity: weftKgAux, unit: 'кг' },
        ...(strapPpYarnKg > 0 ? [{ name: `Нить ПП (стропы)${stropSpec.osnova_denye ? ` ${stropSpec.osnova_denye}den` : ''}`, quantity: strapPpYarnKg, unit: 'кг' }] : []),
      ],
    },
    {
      department: 'Ткачество',
      description: `U-крой: ${tkanSpec.nazvanie_tkani} + ${tkanSpecAux.nazvanie_tkani}`,
      items: [
        { name: `U-панель: ${tkanSpec.nazvanie_tkani} (${tkanSpec.shirina_polotna_sm} см)`, quantity: totalUPanelMeters, unit: 'м' },
        { name: `  Заготовка: (2×${p.height}+${p.bottomSize})/100`, quantity: uPanelBlankM, unit: 'м/шт' },
        { name: `Боковинки: ${tkanSpecAux.nazvanie_tkani} (${tkanSpecAux.shirina_polotna_sm} см)`, quantity: totalSideMeters, unit: 'м' },
        { name: `  4шт × ${p.height}/100`, quantity: sideTotalPerUnit, unit: 'м/шт' },
        { name: `Запас на отходы: 2%`, quantity: round2((uPanelBlankM + sideTotalPerUnit) * quantity * 0.02), unit: 'м' },
      ],
    },
    ...(p.laminationDensity > 0 ? [{
      department: 'Ламинация',
      description: `Ламинирование ткани (${p.laminationDensity} г/м²)`,
      items: [
        { name: 'Ткань под ламинацию', quantity: laminationMeters, unit: 'м' },
        { name: 'Плотность ламината', quantity: p.laminationDensity, unit: 'г/м²' },
        { name: 'Вес ламината', quantity: laminationKg, unit: 'кг' },
      ],
    }] : []),
    {
      department: 'Стропы',
      description: `${stropSpec.nazvanie} (${stropSpec.shirina_mm}мм, ${stropSpec.osnova_nit_type === 'МФН' ? '100% МФН' : 'ПП+МФН'})`,
      items: [
        { name: 'Стропа', quantity: totalStrapM, unit: 'м' },
        { name: `4шт×(${p.height}×${p.strapLayer1}+${p.strapLoopHeight}+${p.height}×${p.strapLayer2}+25)=${round2(oneStrapCm * 4)} см/шт`, quantity: round2(oneStrapCm * 4 / 100), unit: 'м/шт' },
        ...(strapPpYarnKg > 0 ? [{ name: 'ПП нить (основа)', quantity: strapPpYarnKg, unit: 'кг' }] : []),
        { name: 'МФН нить', quantity: strapMfnKg, unit: 'кг' },
      ],
    },
    {
      department: 'Крой',
      description: 'Раскрой U-образный',
      items: [
        { name: `U-панель (${p.width}×${2 * p.height + p.bottomSize} см)`, quantity: uPanels, unit: 'шт' },
        { name: `Боковинка (${p.width}×${p.height} см)`, quantity: sidePanels, unit: 'шт' },
        ...(topParts > 0 && p.topType === 'spout' ? [{
          name: `Люк верх (Ø${p.topSpoutDia}×${p.topSpoutHeight} см)`, quantity: topParts, unit: 'шт'
        }] : []),
        ...(topParts > 0 && p.topType === 'skirt' ? [{
          name: `Юбка (${p.width * 4}×${p.skirtHeight + 5} см)`, quantity: topParts, unit: 'шт'
        }] : []),
        ...(p.hasBottomSpout ? [{
          name: `Люк низ (Ø${p.bottomSpoutDia}×${p.bottomSpoutHeight} см)`, quantity: quantity, unit: 'шт'
        }] : []),
        { name: `Петли строп`, quantity: loopParts, unit: 'шт' },
      ],
    },
    {
      department: 'Пошив',
      description: `Сборка ${quantity} шт (U-крой)`,
      items: [
        { name: 'Биг-Бэг 4х стропный (U-крой)', quantity: quantity, unit: 'шт' },
        { name: `Нить швейная (${unitWeight.thread_g} г/шт)`, quantity: totalThreadKg, unit: 'кг' },
      ],
    },
    ...((p.hasPeLiner || p.hasPrinting || p.hasDocPocket) ? [{
      department: 'Дополнительно',
      description: 'Покупные комплектующие',
      items: [
        ...(p.hasPeLiner ? [{
          name: `ПЭ вкладыш (${p.peLinerLength}×${p.peLinerWidth} см, ${p.peLinerDensity} мкм)`,
          quantity: quantity, unit: 'шт'
        }] : []),
        ...(p.hasPrinting ? [{
          name: 'Печать', quantity: quantity, unit: 'шт'
        }] : []),
        ...(p.hasDocPocket ? [{
          name: 'Карман для документов', quantity: quantity, unit: 'шт'
        }] : []),
      ],
    }] : []),
  ];

  return { unitWeight, quantity, departments };
}

/** Потребности для 2х стропного */
function calculate2StrapNeeds(
  p: BigBagParams,
  quantity: number,
  tkanSpec: TkanSpec
): ProductionCalculation {
  const unitWeight = calculateBigBagWeight(p, tkanSpec);
  const fabricWidthCm = tkanSpec.shirina_polotna_sm;

  // --- ТКАЧЕСТВО ---
  // Фальцевый рукав — ширина полотна = ширина мешка
  // 2х стропный: петля из тела + 20 см припуск на стропу (по технологу)
  // Дно звезда: запас ≈ bottomSize / √2 + 2 (геометрия складки)
  // Разгрузочный люк: дно отдельное
  const strapAllowance = 20; // припуск на стропу (по технологу)
  const bottomFabricCm = p.hasBottomSpout ? 0 : Math.round(p.bottomSize / 1.55);
  const blankLengthM = round2((p.height + p.strapLoopHeight + strapAllowance + bottomFabricCm) / 100);
  // 2% запас на отходы (по технологу)
  const totalFabricMeters = round2(blankLengthM * quantity * 1.02);

  // --- ЭКСТРУЗИЯ ---
  const warpKg = round2(totalFabricMeters * (tkanSpec.osnova_itogo_kg || 0));
  const weftKg = round2(totalFabricMeters * (tkanSpec.utok_itogo_kg || 0));
  const totalYarnKg = round2(warpKg + weftKg);

  // --- СЫРЬЁ ---
  const ppKg = round2(totalFabricMeters * (tkanSpec.receptura_pp_kg || 0));
  const carbonateKg = round2(totalFabricMeters * (tkanSpec.receptura_karbonat_kg || 0));
  const uvKg = round2(totalFabricMeters * (tkanSpec.receptura_uf_stabilizator_kg || 0));
  const dyeKg = round2(totalFabricMeters * (tkanSpec.receptura_krasitel_kg || 0));

  // --- КРОЙ ---
  // Тело (рукав) — заготовка уже включает дно звезда
  const bodyTubes = quantity;
  // Чехлы строп — 2 шт на 1 ББ
  const sleeveParts = 2 * quantity;
  let topParts = 0;
  if (p.topType !== 'open') topParts = quantity;

  // --- НИТЬ ---
  const totalThreadKg = round2(unitWeight.thread_g * quantity / 1000);

  // --- ЛАМИНАЦИЯ ---
  const laminationMeters = p.laminationDensity > 0 ? totalFabricMeters : 0;
  const laminationAreaM2Total = laminationMeters * fabricWidthCm / 100;
  const laminationKg = round2(laminationAreaM2Total * p.laminationDensity / 1000);

  const departments: DepartmentRequirement[] = [
    {
      department: 'Сырьё',
      description: 'Закупка сырья и материалов',
      items: [
        { name: 'Полипропилен (ПП)', quantity: ppKg, unit: 'кг' },
        { name: 'Карбонат кальция', quantity: carbonateKg, unit: 'кг' },
        { name: 'УФ-стабилизатор', quantity: uvKg, unit: 'кг' },
        { name: 'Краситель', quantity: dyeKg, unit: 'кг' },
      ].filter(i => i.quantity > 0),
    },
    {
      department: 'Экструзия',
      description: 'Производство ПП нити',
      items: [
        { name: 'Итого ПП нити', quantity: totalYarnKg, unit: 'кг' },
        { name: `Нить основа (ткань)${tkanSpec.osnova_denye ? ` ${tkanSpec.osnova_denye}den` : ''}${tkanSpec.osnova_shirina_niti_sm ? ` ${tkanSpec.osnova_shirina_niti_sm}см` : ''}`, quantity: warpKg, unit: 'кг' },
        { name: `Нить уток (ткань)${tkanSpec.utok_denye ? ` ${tkanSpec.utok_denye}den` : ''}${tkanSpec.utok_shirina_niti_sm ? ` ${tkanSpec.utok_shirina_niti_sm}см` : ''}`, quantity: weftKg, unit: 'кг' },
      ],
    },
    {
      department: 'Ткачество',
      description: `Фальц рукав ${tkanSpec.nazvanie_tkani} (${fabricWidthCm} см)`,
      items: [
        { name: 'Ткань (фальц рукав)', quantity: totalFabricMeters, unit: 'м' },
        { name: p.hasBottomSpout
            ? `Заготовка: (${p.height}+${p.strapLoopHeight}+20)/100`
            : `Заготовка: (${p.height}+${p.strapLoopHeight}+20+${bottomFabricCm})/100`,
          quantity: blankLengthM, unit: 'м/шт' },
        { name: `Запас на отходы: 2%`, quantity: round2(blankLengthM * quantity * 0.02), unit: 'м' },
      ],
    },
    ...(p.laminationDensity > 0 ? [{
      department: 'Ламинация',
      description: `Ламинирование ткани (${p.laminationDensity} г/м²)`,
      items: [
        { name: 'Ткань под ламинацию', quantity: laminationMeters, unit: 'м' },
        { name: 'Плотность ламината', quantity: p.laminationDensity, unit: 'г/м²' },
        { name: 'Вес ламината', quantity: laminationKg, unit: 'кг' },
      ],
    }] : []),
    {
      department: 'Крой',
      description: p.hasBottomSpout ? 'Раскрой деталей (разгруз. люк)' : 'Раскрой деталей (дно звезда)',
      items: [
        { name: p.hasBottomSpout
            ? `Тело (рукав ${round2(blankLengthM * 100)} см)`
            : `Тело + дно звезда (рукав ${round2(blankLengthM * 100)} см)`,
          quantity: bodyTubes, unit: 'шт' },
        ...(p.hasBottomSpout ? [{
          name: `Донышко (${p.bottomSize}×${p.bottomSize} см)`, quantity: quantity, unit: 'шт'
        }] : []),
        { name: `Чехол стропы (27×20 см)`, quantity: sleeveParts, unit: 'шт' },
        ...(topParts > 0 && p.topType === 'spout' ? [{
          name: `Люк верх (Ø${p.topSpoutDia}×${p.topSpoutHeight} см)`, quantity: topParts, unit: 'шт'
        }] : []),
        ...(topParts > 0 && p.topType === 'skirt' ? [{
          name: `Юбка (${p.width * 4}×${p.skirtHeight + 5} см)`, quantity: topParts, unit: 'шт'
        }] : []),
        ...(p.hasBottomSpout ? [{
          name: `Разгруз. люк (Ø${p.bottomSpoutDia}×${p.bottomSpoutHeight} см)`, quantity: quantity, unit: 'шт'
        }] : []),
      ],
    },
    {
      department: 'Пошив',
      description: `Сборка ${quantity} шт`,
      items: [
        { name: 'Биг-Бэг 2х стропный', quantity: quantity, unit: 'шт' },
        { name: `Нить швейная (${unitWeight.thread_g} г/шт)`, quantity: totalThreadKg, unit: 'кг' },
      ],
    },
    ...((p.hasPeLiner || p.hasPrinting || p.hasDocPocket) ? [{
      department: 'Дополнительно',
      description: 'Покупные комплектующие',
      items: [
        ...(p.hasPeLiner ? [{
          name: `ПЭ вкладыш (${p.peLinerLength}×${p.peLinerWidth} см, ${p.peLinerDensity} мкм)`,
          quantity: quantity, unit: 'шт'
        }] : []),
        ...(p.hasPrinting ? [{
          name: 'Печать', quantity: quantity, unit: 'шт'
        }] : []),
        ...(p.hasDocPocket ? [{
          name: 'Карман для документов', quantity: quantity, unit: 'шт'
        }] : []),
      ],
    }] : []),
  ];

  return { unitWeight, quantity, departments };
}

// ===== ВВМР: Расчёт веса =====

export function calculateVVMRWeight(p: VVMRParams): VVMRWeightBreakdown {
  const K_bottom    = p.densityBottom    / 10000;
  const K_longWall  = p.densityLongWall  / 10000;
  const K_shortWall = p.densityShortWall / 10000;
  const K_longLid   = p.densityLongLid   / 10000;
  const K_shortLid  = p.densityShortLid  / 10000;

  // Панели (по формулам технолога, припуски на швы)
  const bottomFabric_g    = (p.width + 10) * (p.length + 10) * K_bottom;
  const longWallFabric_g  = (p.wallHeight + 30) * (p.length + 10) * 2 * K_longWall;
  const shortWallFabric_g = (p.wallHeight + 24) * (p.width + 10) * 2 * K_shortWall;
  const longLidFabric_g   = (p.lidLongHeight + 26) * (p.length + 10) * 2 * K_longLid;
  const shortLidFabric_g  = (p.lidShortHeight + 22) * (p.width + 10) * 2 * K_shortLid;

  // Петли: loopCount × (loopHeight×2+5) × tapeWeightPerCm
  const loops_g = p.loopCount * (p.loopHeight * 2 + 5) * p.tapeWeightPerCm;

  // Верёвки (тесьма 20мм)
  const ropeWall_g = p.ropeWallCount * p.ropeWallLength * p.tapeWeightPerCm;
  const ropeBottom_g = p.ropeBottomCount * p.ropeBottomLength * p.tapeWeightPerCm;
  const ropeTop_g = p.ropeTopCount * p.ropeTopLength * p.tapeWeightPerCm;

  // Нить на прошив: length*8 + 8*(width+10) + 4*(wallHeight+30)
  const threadCm = p.length * 8 + 8 * (p.width + 10) + 4 * (p.wallHeight + 30);
  const thread_g = threadCm * p.threadWeightPerCm;

  // Ламинация — суммарная площадь всех панелей × плотность ламината
  const totalFabricAreaM2 = (
    (p.width + 10) * (p.length + 10) +
    (p.wallHeight + 30) * (p.length + 10) * 2 +
    (p.wallHeight + 24) * (p.width + 10) * 2 +
    (p.lidLongHeight + 26) * (p.length + 10) * 2 +
    (p.lidShortHeight + 22) * (p.width + 10) * 2
  ) / 10000;
  const lamination_g = p.laminationDensity > 0 ? round2(totalFabricAreaM2 * p.laminationDensity) : 0;

  const total_g = bottomFabric_g + longWallFabric_g + shortWallFabric_g
    + longLidFabric_g + shortLidFabric_g
    + loops_g + ropeWall_g + ropeBottom_g + ropeTop_g + thread_g + lamination_g;

  return {
    bottomFabric_g: round2(bottomFabric_g),
    longWallFabric_g: round2(longWallFabric_g),
    shortWallFabric_g: round2(shortWallFabric_g),
    longLidFabric_g: round2(longLidFabric_g),
    shortLidFabric_g: round2(shortLidFabric_g),
    loops_g: round2(loops_g),
    ropeWall_g: round2(ropeWall_g),
    ropeBottom_g: round2(ropeBottom_g),
    ropeTop_g: round2(ropeTop_g),
    thread_g: round2(thread_g),
    lamination_g,
    total_g: round2(total_g),
    total_kg: round3(total_g / 1000),
  };
}

// ===== ВВМР: Потребности по цехам =====

export function calculateVVMRNeeds(
  p: VVMRParams,
  quantity: number,
  tkanSpecBottom: TkanSpec,
  tkanSpecLongWall: TkanSpec,
  tkanSpecShortWall: TkanSpec,
  tkanSpecLongLid: TkanSpec,
  tkanSpecShortLid: TkanSpec,
  stropSpec?: StropSpec | null
): ProductionCalculation {
  const unitWeight = calculateVVMRWeight(p);

  // --- ТКАЧЕСТВО — метры на 1 шт по каждой ткани ---
  // Дно: 1 шт, размер (width+10)×(length+10) → рулон шириной (width+10), метраж = (length+10)/100
  const bottomFabricMPerUnit = round2((p.length + 10) / 100);
  // Торец длинный: 2 шт, размер (wallHeight+30)×(length+10) → рулон шириной (length+10), метраж = (wallHeight+30)×2/100
  const longWallFabricMPerUnit = round2((p.wallHeight + 30) * 2 / 100);
  // Торец короткий: 2 шт, размер (wallHeight+24)×(width+10) → рулон шириной (width+10), метраж = (wallHeight+24)×2/100
  const shortWallFabricMPerUnit = round2((p.wallHeight + 24) * 2 / 100);
  // Крышка длинная: 2 шт, размер (lidLongHeight+26)×(length+10) → рулон шириной (length+10), метраж = (lidLongHeight+26)×2/100
  const longLidFabricMPerUnit = round2((p.lidLongHeight + 26) * 2 / 100);
  // Крышка короткая: 2 шт, размер (lidShortHeight+22)×(width+10) → рулон шириной (width+10), метраж = (lidShortHeight+22)×2/100
  const shortLidFabricMPerUnit = round2((p.lidShortHeight + 22) * 2 / 100);

  const bottomFabricM    = round2(bottomFabricMPerUnit    * quantity * 1.02);
  const longWallFabricM  = round2(longWallFabricMPerUnit  * quantity * 1.02);
  const shortWallFabricM = round2(shortWallFabricMPerUnit * quantity * 1.02);
  const longLidFabricM   = round2(longLidFabricMPerUnit   * quantity * 1.02);
  const shortLidFabricM  = round2(shortLidFabricMPerUnit  * quantity * 1.02);
  const totalFabricM = round2(bottomFabricM + longWallFabricM + shortWallFabricM + longLidFabricM + shortLidFabricM);

  // Помощник: нить и сырьё по одной ткани и объёму
  function yarnAndRaw(spec: TkanSpec, meters: number) {
    return {
      warp:      round2(meters * (spec.osnova_itogo_kg || 0)),
      weft:      round2(meters * (spec.utok_itogo_kg  || 0)),
      pp:        round2(meters * (spec.receptura_pp_kg || 0)),
      carbonate: round2(meters * (spec.receptura_karbonat_kg || 0)),
      uv:        round2(meters * (spec.receptura_uf_stabilizator_kg || 0)),
      dye:       round2(meters * (spec.receptura_krasitel_kg || 0)),
    };
  }
  const bR  = yarnAndRaw(tkanSpecBottom,    bottomFabricM);
  const lwR = yarnAndRaw(tkanSpecLongWall,  longWallFabricM);
  const swR = yarnAndRaw(tkanSpecShortWall, shortWallFabricM);
  const llR = yarnAndRaw(tkanSpecLongLid,   longLidFabricM);
  const slR = yarnAndRaw(tkanSpecShortLid,  shortLidFabricM);

  // --- ЭКСТРУЗИЯ (сумма всех тканей) ---
  const totalYarnKg = round2(bR.warp + bR.weft + lwR.warp + lwR.weft + swR.warp + swR.weft + llR.warp + llR.weft + slR.warp + slR.weft);

  // --- СЫРЬЁ (сумма всех тканей) ---
  const ppKg        = round2(bR.pp        + lwR.pp        + swR.pp        + llR.pp        + slR.pp);
  const carbonateKg = round2(bR.carbonate + lwR.carbonate + swR.carbonate + llR.carbonate + slR.carbonate);
  const uvKg        = round2(bR.uv        + lwR.uv        + swR.uv        + llR.uv        + slR.uv);
  const dyeKg       = round2(bR.dye       + lwR.dye       + swR.dye       + llR.dye       + slR.dye);

  // --- СТРОПЫ (тесьма) ---
  const tapeWeightPerCm = stropSpec ? stropSpec.plotnost_gr_mp / 100 : p.tapeWeightPerCm;
  // Метры на 1 шт по типу
  const loopCmPerUnit = p.loopCount * (p.loopHeight * 2 + 5);
  const ropeWallCmPerUnit = p.ropeWallCount * p.ropeWallLength;
  const ropeBottomCmPerUnit = p.ropeBottomCount * p.ropeBottomLength;
  const ropeTopCmPerUnit = p.ropeTopCount * p.ropeTopLength;
  const loopMPerUnit = round2(loopCmPerUnit / 100);
  const ropeWallMPerUnit = round2(ropeWallCmPerUnit / 100);
  const ropeBottomMPerUnit = round2(ropeBottomCmPerUnit / 100);
  const ropeTopMPerUnit = round2(ropeTopCmPerUnit / 100);
  const totalTapeMPerUnit = round2(loopMPerUnit + ropeWallMPerUnit + ropeBottomMPerUnit + ropeTopMPerUnit);
  const totalTapeM = round2(totalTapeMPerUnit * quantity);

  const tapeKgPerUnit = round2((loopCmPerUnit + ropeWallCmPerUnit + ropeBottomCmPerUnit + ropeTopCmPerUnit) * tapeWeightPerCm / 1000);
  const totalTapeKg = round2(tapeKgPerUnit * quantity);

  // Сырьё для строп
  const strapPpKg = stropSpec && !stropSpec.is_fully_purchased ? round2(totalTapeM * stropSpec.receptura_pp_kg) : 0;
  const strapCarbonateKg = stropSpec && !stropSpec.is_fully_purchased ? round2(totalTapeM * stropSpec.receptura_karbonat_kg) : 0;
  const strapUvKg = stropSpec && !stropSpec.is_fully_purchased ? round2(totalTapeM * stropSpec.receptura_uf_kg) : 0;
  const strapDyeKg = stropSpec && !stropSpec.is_fully_purchased ? round2(totalTapeM * stropSpec.receptura_krasitel_kg) : 0;
  const strapMfnKg = stropSpec ? round2(totalTapeM * stropSpec.mfn_rashod_kg) : 0;
  const strapPpYarnKg = stropSpec && !stropSpec.is_fully_purchased ? round2(totalTapeM * (stropSpec.osnova_itogo_kg + stropSpec.utok_itogo_kg)) : 0;

  // --- НИТЬ ---
  const totalThreadKg = round2(unitWeight.thread_g * quantity / 1000);

  // --- ЛАМИНАЦИЯ ---
  const laminationMeters = p.laminationDensity > 0 ? totalFabricM : 0;
  const laminationAreaM2PerUnit = (
    (p.width + 10) * (p.length + 10) +
    (p.wallHeight + 30) * (p.length + 10) * 2 +
    (p.wallHeight + 24) * (p.width + 10) * 2 +
    (p.lidLongHeight + 26) * (p.length + 10) * 2 +
    (p.lidShortHeight + 22) * (p.width + 10) * 2
  ) / 10000;
  const laminationTotalAreaM2 = round2(laminationAreaM2PerUnit * quantity * 1.02);
  const laminationKg = round2(laminationTotalAreaM2 * p.laminationDensity / 1000);

  const departments: DepartmentRequirement[] = [
    {
      department: 'Сырьё',
      description: 'Закупка сырья и материалов',
      items: [
        { name: 'Полипропилен (ПП)', quantity: ppKg, unit: 'кг' },
        { name: 'Карбонат кальция', quantity: carbonateKg, unit: 'кг' },
        { name: 'УФ-стабилизатор', quantity: uvKg, unit: 'кг' },
        { name: 'Краситель', quantity: dyeKg, unit: 'кг' },
      ].filter(i => i.quantity > 0),
    },
    {
      department: 'Экструзия',
      description: 'Производство ПП нити',
      items: [
        { name: 'Итого ПП нити', quantity: totalYarnKg, unit: 'кг' },
        { name: `Дно — основа${tkanSpecBottom.osnova_denye ? ` ${tkanSpecBottom.osnova_denye}den` : ''}`, quantity: bR.warp, unit: 'кг' },
        { name: `Дно — уток${tkanSpecBottom.utok_denye ? ` ${tkanSpecBottom.utok_denye}den` : ''}`, quantity: bR.weft, unit: 'кг' },
        { name: `Торец дл. — основа${tkanSpecLongWall.osnova_denye ? ` ${tkanSpecLongWall.osnova_denye}den` : ''}`, quantity: lwR.warp, unit: 'кг' },
        { name: `Торец дл. — уток${tkanSpecLongWall.utok_denye ? ` ${tkanSpecLongWall.utok_denye}den` : ''}`, quantity: lwR.weft, unit: 'кг' },
        { name: `Торец кор. — основа${tkanSpecShortWall.osnova_denye ? ` ${tkanSpecShortWall.osnova_denye}den` : ''}`, quantity: swR.warp, unit: 'кг' },
        { name: `Торец кор. — уток${tkanSpecShortWall.utok_denye ? ` ${tkanSpecShortWall.utok_denye}den` : ''}`, quantity: swR.weft, unit: 'кг' },
        { name: `Крышка дл. — основа${tkanSpecLongLid.osnova_denye ? ` ${tkanSpecLongLid.osnova_denye}den` : ''}`, quantity: llR.warp, unit: 'кг' },
        { name: `Крышка дл. — уток${tkanSpecLongLid.utok_denye ? ` ${tkanSpecLongLid.utok_denye}den` : ''}`, quantity: llR.weft, unit: 'кг' },
        { name: `Крышка кор. — основа${tkanSpecShortLid.osnova_denye ? ` ${tkanSpecShortLid.osnova_denye}den` : ''}`, quantity: slR.warp, unit: 'кг' },
        { name: `Крышка кор. — уток${tkanSpecShortLid.utok_denye ? ` ${tkanSpecShortLid.utok_denye}den` : ''}`, quantity: slR.weft, unit: 'кг' },
      ].filter(i => i.quantity > 0),
    },
    {
      department: 'Ткачество',
      description: `5 видов ткани ВВМР`,
      items: [
        { name: 'Всего ткани', quantity: totalFabricM, unit: 'м' },
        { name: `Дно [${tkanSpecBottom.nazvanie_tkani}]: (${p.length}+10)/100`, quantity: bottomFabricMPerUnit, unit: 'м/шт' },
        { name: `Торец длинный [${tkanSpecLongWall.nazvanie_tkani}]: (${p.wallHeight}+30)×2/100`, quantity: longWallFabricMPerUnit, unit: 'м/шт' },
        { name: `Торец короткий [${tkanSpecShortWall.nazvanie_tkani}]: (${p.wallHeight}+24)×2/100`, quantity: shortWallFabricMPerUnit, unit: 'м/шт' },
        { name: `Крышка длинная [${tkanSpecLongLid.nazvanie_tkani}]: (${p.lidLongHeight}+26)×2/100`, quantity: longLidFabricMPerUnit, unit: 'м/шт' },
        { name: `Крышка короткая [${tkanSpecShortLid.nazvanie_tkani}]: (${p.lidShortHeight}+22)×2/100`, quantity: shortLidFabricMPerUnit, unit: 'м/шт' },
      ],
    },
    ...(p.laminationDensity > 0 ? [{
      department: 'Ламинация',
      description: `Ламинирование ткани (${p.laminationDensity} г/м²)`,
      items: [
        { name: 'Ткань под ламинацию', quantity: laminationMeters, unit: 'м' },
        { name: 'Плотность ламината', quantity: p.laminationDensity, unit: 'г/м²' },
        { name: 'Вес ламината', quantity: laminationKg, unit: 'кг' },
      ],
    }] : []),
    {
      department: 'Стропы',
      description: `${stropSpec ? `${stropSpec.nazvanie} ${stropSpec.shirina_mm}мм` : 'Тесьма 20мм'}`,
      items: [
        { name: 'Всего стропы', quantity: totalTapeM, unit: 'м' },
        { name: `Петли: ${p.loopCount}шт × ${p.loopHeight * 2 + 5}см`, quantity: loopMPerUnit, unit: 'м/шт' },
        { name: `Стропы (дно): ${p.ropeWallCount}шт × ${p.ropeWallLength}см`, quantity: ropeWallMPerUnit, unit: 'м/шт' },
        { name: `Стропы (торцы): ${p.ropeBottomCount}шт × ${p.ropeBottomLength}см`, quantity: ropeBottomMPerUnit, unit: 'м/шт' },
        { name: `Стропы (крышки): ${p.ropeTopCount}шт × ${p.ropeTopLength}см`, quantity: ropeTopMPerUnit, unit: 'м/шт' },
        { name: 'На 1 шт', quantity: totalTapeMPerUnit, unit: 'м/шт' },
        ...(strapPpYarnKg > 0 ? [{ name: 'ПП нить (основа+уток)', quantity: strapPpYarnKg, unit: 'кг' }] : []),
        ...(strapMfnKg > 0 ? [{ name: 'МФН нить', quantity: strapMfnKg, unit: 'кг' }] : []),
        ...(stropSpec?.is_fully_purchased ? [{ name: `Покупная стропа (${stropSpec.nazvanie})`, quantity: totalTapeM, unit: 'м' }] : []),
      ],
    },
    {
      department: 'Крой',
      description: 'Раскрой панелей ВВМР и резка строп',
      items: [
        { name: `Дно (${p.width + 10}×${p.length + 10} см)`, quantity: quantity, unit: 'шт' },
        { name: `Торец длинный (${p.wallHeight + 30}×${p.length + 10} см)`, quantity: 2 * quantity, unit: 'шт' },
        { name: `Торец короткий (${p.wallHeight + 24}×${p.width + 10} см)`, quantity: 2 * quantity, unit: 'шт' },
        { name: `Крышка длинная (${p.lidLongHeight + 26}×${p.length + 10} см)`, quantity: 2 * quantity, unit: 'шт' },
        { name: `Крышка короткая (${p.lidShortHeight + 22}×${p.width + 10} см)`, quantity: 2 * quantity, unit: 'шт' },
        { name: `Резка строп — петли (${p.loopHeight * 2 + 5} см)`, quantity: p.loopCount * quantity, unit: 'шт' },
        { name: `Резка строп — дно (${p.ropeWallLength} см)`, quantity: p.ropeWallCount * quantity, unit: 'шт' },
        { name: `Резка строп — торцы (${p.ropeBottomLength} см)`, quantity: p.ropeBottomCount * quantity, unit: 'шт' },
        { name: `Резка строп — крышки (${p.ropeTopLength} см)`, quantity: p.ropeTopCount * quantity, unit: 'шт' },
      ],
    },
    {
      department: 'Пошив',
      description: `Сборка ${quantity} шт ВВМР`,
      items: [
        { name: 'ВВМР (Вагонный вкладыш)', quantity: quantity, unit: 'шт' },
        { name: `Нить швейная (${unitWeight.thread_g} г/шт)`, quantity: totalThreadKg, unit: 'кг' },
        { name: `${stropSpec ? `${stropSpec.nazvanie} ${stropSpec.shirina_mm}мм` : 'Тесьма 20мм'} (${round2(tapeKgPerUnit * 1000)} г/шт)`, quantity: totalTapeKg, unit: 'кг' },
      ],
    },
  ];

  return { unitWeight, quantity, departments };
}

function layerFraction(layer: '1/1' | '2/3' | '1/3'): number {
  if (layer === '1/1') return 1;
  if (layer === '2/3') return 2 / 3;
  return 1 / 3;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
