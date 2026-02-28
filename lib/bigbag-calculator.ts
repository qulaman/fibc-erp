// Расчётный движок для планирования производства Биг-Бэга

export interface BigBagParams {
  // Тип продукции
  productType: 'bigbag_4strap' | 'bigbag_2strap';

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
  strapRatioType: '1/3' | '2/3';
  strapWeightPerM: number; // г/м
  strapLoopHeight: number; // см

  // Нить
  threadWeightPerCm: number; // г/см шва

  // Ламинация
  needsLamination: boolean;

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
  thread_g: number;
  peLiner_g: number;           // ПЭ вкладыш
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
    thread: string;
    threadDetails: string;
    peLiner: string;
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
  unitWeight: BigBagWeightBreakdown;
  quantity: number;
  departments: DepartmentRequirement[];
}

/** Расчёт веса одного Биг-Бэга (диспетчер по типу) */
export function calculateBigBagWeight(p: BigBagParams, tkanSpec?: TkanSpec): BigBagWeightBreakdown {
  if (p.productType === 'bigbag_2strap') {
    return calculate2StrapWeight(p, tkanSpec);
  }
  return calculate4StrapWeight(p, tkanSpec);
}

/** Расчёт веса 4х стропного Биг-Бэга */
function calculate4StrapWeight(p: BigBagParams, tkanSpec?: TkanSpec): BigBagWeightBreakdown {
  // Расход нити на 1 погонный метр ткани (из спецификации)
  const yarnPerMeter = tkanSpec
    ? (tkanSpec.osnova_itogo_kg + tkanSpec.utok_itogo_kg)
    : 0;
  const K_main = p.mainDensity / 10000;
  const K_aux = p.auxDensity / 10000;

  // 1. Тело (рукав)
  // Припуск на подворот: +8 см (открытый/юбка) или +10 см (с люками)
  const hasSpouts = p.topType === 'spout' || p.hasBottomSpout;
  const bodyAllowance = hasSpouts ? 10 : 8;
  const bodyLengthCm = p.height + bodyAllowance;
  const bodyLengthM = bodyLengthCm / 100;
  // Вес через реальный расход нити на метр ткани (из tkan_specifications)
  const body_g = tkanSpec
    ? bodyLengthM * yarnPerMeter * 1000
    : p.width * bodyLengthCm * 4 * K_main;
  const bodyFormula = tkanSpec
    ? `(${p.height}+${bodyAllowance})/100 = ${round2(bodyLengthM)}м × ${round2(yarnPerMeter)}кг/м × 1000`
    : `${p.width}×(${p.height}+${bodyAllowance})×4 × ${K_main}`;

  // 2. Дно (отдельный кусок ткани, +10 см припуск на шов)
  const bottomCutSize = p.bottomSize + 10; // см, с припуском
  const bottomLengthM = bottomCutSize / 100;
  const bottom_g = tkanSpec
    ? bottomLengthM * yarnPerMeter * 1000
    : bottomCutSize * bottomCutSize * K_main;
  const bottomFormula = tkanSpec
    ? `(${p.bottomSize}+10)/100 = ${round2(bottomLengthM)}м × ${round2(yarnPerMeter)}кг/м × 1000`
    : `(${p.bottomSize}+10)×(${p.bottomSize}+10) × ${K_main}`;

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
  const strapWeightPerCm = p.strapWeightPerM / 100;
  const sewnLength = p.strapRatioType === '2/3'
    ? p.height * (2 / 3)
    : p.height * (1 / 3);
  const oneStrapLen = (sewnLength * 2) + (p.strapLoopHeight * 2);
  const straps_g = oneStrapLen * 4 * strapWeightPerCm;
  const strapsFormula = `((${p.height}×${p.strapRatioType}×2)+${p.strapLoopHeight}×2)×4 × ${round2(strapWeightPerCm)}`;

  // 7. Узкая лента (4х стропный: 2 шт)
  const narrowRibbon_g = 13;
  const narrowRibbonFormula = '2см×130см×2слоя×0.05 = 13';

  // 8. Информационный карман
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

  const seamStraps = sewnLength * 4;
  const totalSeamCm = seamTop + seamBot + seamStraps;
  const thread_g = totalSeamCm * p.threadWeightPerCm;
  const threadFormula = `${round2(totalSeamCm)} см × ${p.threadWeightPerCm} г/см`;
  const threadDetails = `${seamTopDesc}\n${seamBotDesc}\nСтропы: ${round2(sewnLength)}×4 = ${round2(seamStraps)}`;

  // 10. ПЭ вкладыш
  // Плотность ПЭ ≈ 0.92 г/см³, плёнка в микронах → толщина в см = мкм / 10000
  // Вес = длина_см × ширина_см × (мкм / 10000) × 0.92
  const peLiner_g = p.hasPeLiner
    ? p.peLinerLength * p.peLinerWidth * (p.peLinerDensity / 10000) * 0.92
    : 0;
  const peLinerFormula = p.hasPeLiner
    ? `${p.peLinerLength}×${p.peLinerWidth}×(${p.peLinerDensity}/10000)×0.92`
    : '—';

  const total_g = body_g + bottom_g + top_g + bottomSpout_g + ties_g + straps_g + narrowRibbon_g + infoPocket_g + thread_g + peLiner_g;

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
    thread_g: round2(thread_g),
    peLiner_g: round2(peLiner_g),
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
      thread: threadFormula,
      threadDetails,
      peLiner: peLinerFormula,
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
  // 2х стропный: петля формируется из тела, подворот не нужен
  // Дно звезда: заготовка = height + петля + bottom/1.55
  // Разгруз. люк: тело = height + петля (дно — отдельный кусок)
  const bottomFabricCm = p.hasBottomSpout ? 0 : p.bottomSize / 1.55;
  const bodyLengthCm = p.height + p.strapLoopHeight + bottomFabricCm;
  const bodyLengthM = bodyLengthCm / 100;
  // Вес через реальный расход нити на метр ткани (из tkan_specifications)
  const body_g = tkanSpec
    ? bodyLengthM * yarnPerMeter * 1000
    : p.width * bodyLengthCm * 4 * K_main;
  const bodyFormula = tkanSpec
    ? (p.hasBottomSpout
        ? `${round2(bodyLengthM)}м × ${round2(yarnPerMeter)}кг/м × 1000`
        : `(${p.height}+${p.strapLoopHeight}+${p.bottomSize}/1.55)/100 × ${round2(yarnPerMeter)}кг/м × 1000`)
    : (p.hasBottomSpout
        ? `${p.width}×(${p.height}+${p.strapLoopHeight})×4 × ${K_main}`
        : `${p.width}×(${p.height}+${p.strapLoopHeight}+${p.bottomSize}/1.55)×4 × ${K_main}`);

  // 2. Дно — звезда: 0 (входит в тело), разгруз. люк: отдельный кусок
  const bottomLengthM = p.bottomSize / 100;
  const bottom_g = p.hasBottomSpout
    ? (tkanSpec ? bottomLengthM * yarnPerMeter * 1000 : p.bottomSize * p.bottomSize * K_main)
    : 0;
  const bottomFormula = p.hasBottomSpout
    ? (tkanSpec
        ? `${round2(bottomLengthM)}м × ${round2(yarnPerMeter)}кг/м × 1000`
        : `${p.bottomSize}×${p.bottomSize} × ${K_main}`)
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

  // 8. Узкая лента (2х стропный: 1 шт)
  const narrowRibbon_g = 6.5;
  const narrowRibbonFormula = '1см×130см×1слой×0.05 = 6.5';

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

  const total_g = body_g + bottom_g + top_g + bottomSpout_g + ties_g + straps_g
    + strapSleeve_g + narrowRibbon_g + infoPocket_g + thread_g + peLiner_g;

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
    thread_g: round2(thread_g),
    peLiner_g: round2(peLiner_g),
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
      thread: threadFormula,
      threadDetails,
      peLiner: peLinerFormula,
    },
  };
}

/** Расчёт потребностей по цехам для N штук */
export function calculateProductionNeeds(
  p: BigBagParams,
  quantity: number,
  tkanSpec: TkanSpec,
  stropSpec?: StropSpec | null
): ProductionCalculation {
  if (p.productType === 'bigbag_2strap') {
    return calculate2StrapNeeds(p, quantity, tkanSpec);
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
  // Дно: отдельный кусок (bottomSize + 10 см припуск на шов)
  const bottomCutSize = p.bottomSize + 10;
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
  const sewnLength = p.strapRatioType === '2/3'
    ? p.height * (2 / 3)
    : p.height * (1 / 3);
  const oneStrapCm = (sewnLength * 2) + (p.strapLoopHeight * 2);
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
  const laminationMeters = p.needsLamination ? totalFabricMeters : 0;

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
        { name: `Дно: (${p.bottomSize}+10)/100`, quantity: bottomBlankM, unit: 'м/шт' },
        { name: `На 1 шт`, quantity: fabricMetersPerUnit, unit: 'м/шт' },
        { name: `Запас на отходы: 2%`, quantity: round2(fabricMetersPerUnit * quantity * 0.02), unit: 'м' },
      ],
    },
    ...(p.needsLamination ? [{
      department: 'Ламинация',
      description: 'Ламинирование ткани',
      items: [
        { name: 'Ламинация ткани', quantity: laminationMeters, unit: 'м' },
      ],
    }] : []),
    {
      department: 'Стропы',
      description: `${stropSpec.nazvanie} (${stropSpec.shirina_mm}мм, ${stropSpec.osnova_nit_type === 'МФН' ? '100% МФН' : 'ПП+МФН'})`,
      items: [
        { name: 'Стропа', quantity: totalStrapM, unit: 'м' },
        { name: `4шт×(${round2(sewnLength)}×2+${p.strapLoopHeight}×2)=${round2(oneStrapCm * 4)} см/шт`, quantity: round2(oneStrapCm * 4 / 100), unit: 'м/шт' },
        ...(strapPpYarnKg > 0 ? [{ name: 'ПП нить (основа)', quantity: strapPpYarnKg, unit: 'кг' }] : []),
        { name: 'МФН нить', quantity: strapMfnKg, unit: 'кг' },
      ],
    },
    {
      department: 'Крой',
      description: 'Раскрой деталей',
      items: [
        { name: `Тело (рукав ${bodyBlankCm} см = ${p.height}+${bodyAllowance})`, quantity: bodyTubes, unit: 'шт' },
        { name: `Донышко (${bottomCutSize}×${bottomCutSize} см = ${p.bottomSize}+10)`, quantity: bottomParts, unit: 'шт' },
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
  // 2х стропный: петля из тела (подворот не нужен, ткань уходит в стропу)
  // Дно звезда: заготовка = (высота + петля + дно/1.55) / 100 м/шт
  // Разгрузочный люк: дно отдельное, заготовка = (высота + петля) / 100 м/шт
  const bottomFabricCm = p.hasBottomSpout ? 0 : p.bottomSize / 1.55;
  const blankLengthM = round2((p.height + p.strapLoopHeight + bottomFabricCm) / 100);
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
  const laminationMeters = p.needsLamination ? totalFabricMeters : 0;

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
            ? `Заготовка: (${p.height}+${p.strapLoopHeight})/100`
            : `Заготовка: (${p.height}+${p.strapLoopHeight}+${p.bottomSize}/1.55)/100`,
          quantity: blankLengthM, unit: 'м/шт' },
        { name: `Запас на отходы: 2%`, quantity: round2(blankLengthM * quantity * 0.02), unit: 'м' },
      ],
    },
    ...(p.needsLamination ? [{
      department: 'Ламинация',
      description: 'Ламинирование ткани',
      items: [
        { name: 'Ламинация ткани', quantity: laminationMeters, unit: 'м' },
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

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
