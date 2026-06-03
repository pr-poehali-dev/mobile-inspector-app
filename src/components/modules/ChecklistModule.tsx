import { useState, useRef, useCallback } from "react";
import Icon from "@/components/ui/icon";
import ModuleHeader from "@/components/ModuleHeader";

interface Props { onBack: () => void; }

type AnswerValue = "yes" | "no" | "na" | null;

interface CheckQuestion {
  id: number;
  text: string;
  requirement: string;
  hint: string;
}

interface ChecklistData {
  id: number;
  title: string;
  questions: CheckQuestion[];
}

interface Area {
  id: number;
  title: string;
  checklists: ChecklistData[];
}

interface Sphere {
  id: number;
  title: string;
  icon: string;
  color: string;
  areas: Area[];
}

const INITIAL_SPHERES: Sphere[] = [
  {
    id: 1, title: "Промышленная безопасность", icon: "Factory", color: "#f97316",
    areas: [
      {
        id: 1, title: "Магистральные трубопроводы", checklists: [
          {
            id: 1, title: "Проверка технического состояния", questions: [
              { id: 1, text: "Проведено ли плановое техническое обслуживание трубопровода в установленные сроки?", requirement: "Федеральные нормы и правила в области промышленной безопасности «Правила безопасности для объектов, использующих сжиженные углеводородные газы» (Приказ Ростехнадзора № 521)", hint: "Проверьте журнал технического обслуживания — запись должна быть не старше 30 дней." },
              { id: 2, text: "Наличие и исправность запорной арматуры на всех узлах трубопровода?", requirement: "ГОСТ 32569-2013. Трубопроводы технологические. Требования к устройству и эксплуатации.", hint: "Осмотрите каждый кран и задвижку — отсутствие течей, свободное открытие/закрытие." },
              { id: 3, text: "Проведена ли проверка катодной защиты в текущем квартале?", requirement: "ГОСТ Р 51164-98. Трубопроводы стальные магистральные. Защита от коррозии.", hint: "Акт измерения потенциала трубопровода должен быть в наличии." },
              { id: 4, text: "Установлены ли знаки и предупредительные таблички на трассе трубопровода?", requirement: "РД 39-132-94 «Правила по эксплуатации, ревизии, ремонту и отбраковке нефтепромысловых трубопроводов»", hint: "Знаки устанавливаются через каждые 500 м, у пересечений дорог и водоёмов." },
              { id: 5, text: "Проведён ли инструктаж персонала, обслуживающего трубопровод?", requirement: "ФЗ №116 «О промышленной безопасности опасных производственных объектов»", hint: "Отметка о проведении инструктажа — в журнале инструктажей по ОТ." },
            ]
          }
        ]
      },
      {
        id: 2, title: "Сосуды под давлением", checklists: [
          {
            id: 2, title: "Плановая проверка сосудов", questions: [
              { id: 1, text: "Имеется ли паспорт сосуда с актуальными записями о техническом освидетельствовании?", requirement: "ФНП «Правила промышленной безопасности при использовании оборудования, работающего под избыточным давлением» (Приказ Ростехнадзора № 536)", hint: "Паспорт должен храниться у ответственного за безопасную эксплуатацию." },
              { id: 2, text: "Не превышен ли допустимый срок до следующего технического освидетельствования?", requirement: "Приказ Ростехнадзора № 536, п. 401 — наружный осмотр 1 раз в 2 года, гидравлические испытания — 1 раз в 8 лет.", hint: "Дата следующего освидетельствования указана в паспорте сосуда." },
              { id: 3, text: "Исправны ли предохранительные клапаны и манометры?", requirement: "ГОСТ 12.2.085-2002. Сосуды, работающие под давлением. Предохранительные клапаны.", hint: "Манометр — класс точности не ниже 2.5, пломба или клеймо с датой поверки." },
            ]
          }
        ]
      },
      {
        id: 3, title: "Подъёмные сооружения", checklists: [
          {
            id: 3, title: "Проверка грузоподъёмных механизмов", questions: [
              { id: 1, text: "Проведено ли техническое освидетельствование крана в установленные сроки?", requirement: "ФНП «Правила безопасности опасных производственных объектов, на которых используются подъёмные сооружения» (Приказ Ростехнадзора № 461)", hint: "Частичное освидетельствование — 1 раз в год, полное — 1 раз в 3 года." },
              { id: 2, text: "Наличие удостоверения у крановщика/стропальщика?", requirement: "Приказ Ростехнадзора № 461, п. 159 — требования к квалификации персонала.", hint: "Удостоверение должно быть действующим, с актуальной отметкой о проверке знаний." },
            ]
          }
        ]
      },
    ]
  },
  {
    id: 2, title: "Охрана труда", icon: "HardHat", color: "#eab308",
    areas: [
      {
        id: 4, title: "Организация рабочих мест", checklists: [
          {
            id: 4, title: "Проверка рабочего места", questions: [
              { id: 1, text: "Обеспечены ли работники средствами индивидуальной защиты?", requirement: "Приказ Минтруда России № 767н «Об утверждении Единых типовых норм выдачи СИЗ»", hint: "СИЗ выдаются по нормам, карточки учёта хранятся в отделе охраны труда." },
              { id: 2, text: "Проведён ли специальная оценка условий труда (СОУТ)?", requirement: "Федеральный закон № 426-ФЗ «О специальной оценке условий труда»", hint: "СОУТ проводится не реже 1 раза в 5 лет. Карты СОУТ должны быть на рабочих местах." },
              { id: 3, text: "Оформлены ли инструкции по охране труда по каждой профессии?", requirement: "Приказ Минтруда России № 772н «Об утверждении основных требований к порядку разработки инструкций по охране труда»", hint: "Инструкции пересматриваются не реже 1 раза в 5 лет или при изменении условий труда." },
            ]
          }
        ]
      }
    ]
  },
  {
    id: 3, title: "Пожарная безопасность", icon: "Flame", color: "#ef4444",
    areas: [
      {
        id: 5, title: "Первичные средства пожаротушения", checklists: [
          {
            id: 5, title: "Проверка огнетушителей", questions: [
              { id: 1, text: "Проведена ли своевременная перезарядка огнетушителей?", requirement: "ППР в РФ (Постановление Правительства № 1479), п. 60 — проверка огнетушителей не реже 1 раза в год.", hint: "На огнетушителе должна быть бирка с датой последней проверки и перезарядки." },
              { id: 2, text: "Установлены ли огнетушители на видных и доступных местах?", requirement: "СП 9.13130.2009. Техника пожарная. Огнетушители. Требования к эксплуатации.", hint: "Огнетушители вешаются на высоте не более 1.5 м от уровня пола, знаки — по ГОСТ 12.4.026." },
              { id: 3, text: "Обозначены ли пути эвакуации и аварийные выходы?", requirement: "ГОСТ 12.2.143-2009. Системы фотолюминесцентные эвакуационные.", hint: "Знаки на путях эвакуации должны быть освещены или фотолюминесцентными." },
            ]
          }
        ]
      }
    ]
  },
  {
    id: 4, title: "Экологическая безопасность", icon: "Leaf", color: "#22c55e",
    areas: [
      {
        id: 6, title: "Обращение с отходами", checklists: [
          {
            id: 6, title: "Учёт и хранение отходов", questions: [
              { id: 1, text: "Ведётся ли журнал учёта отходов производства и потребления?", requirement: "Федеральный закон № 89-ФЗ «Об отходах производства и потребления», Приказ Минприроды № 1028", hint: "Журнал заполняется ежеквартально. Форма утверждена Приказом Минприроды № 1028." },
              { id: 2, text: "Заключён ли договор со специализированной организацией на вывоз отходов?", requirement: "ФЗ № 89-ФЗ, ст. 13 — требования к обращению с отходами.", hint: "Договор и лицензия исполнителя должны храниться в отделе экологии." },
            ]
          }
        ]
      }
    ]
  },
  {
    id: 5, title: "Транспортная безопасность", icon: "Truck", color: "#3b82f6",
    areas: [
      {
        id: 7, title: "Транспортные средства", checklists: [
          {
            id: 7, title: "Техническое состояние ТС", questions: [
              { id: 1, text: "Пройден ли технический осмотр транспортного средства?", requirement: "Федеральный закон № 170-ФЗ «О техническом осмотре транспортных средств»", hint: "Диагностическая карта должна быть действующей. Срок ТО зависит от категории ТС." },
              { id: 2, text: "Проведён ли предрейсовый медицинский осмотр водителя?", requirement: "Приказ Минздрава России № 834н «О медицинских осмотрах водителей»", hint: "Отметка о прохождении медосмотра — в путевом листе." },
            ]
          }
        ]
      }
    ]
  },
  {
    id: 6, title: "Санитарно-эпидемиологическая безопасность", icon: "Stethoscope", color: "#a78bfa",
    areas: [
      {
        id: 8, title: "Производственный контроль", checklists: [
          {
            id: 8, title: "Санитарный контроль объекта", questions: [
              { id: 1, text: "Разработана ли программа производственного контроля?", requirement: "Федеральный закон № 52-ФЗ «О санитарно-эпидемиологическом благополучии населения», ст. 32", hint: "Программа ПК разрабатывается юридическим лицом самостоятельно и согласуется с Роспотребнадзором." },
              { id: 2, text: "Проведены ли лабораторные исследования в рамках ПК?", requirement: "СП 1.1.1058-01. Организация и проведение производственного контроля.", hint: "Протоколы испытаний должны быть в наличии за текущий период." },
            ]
          }
        ]
      }
    ]
  },
  {
    id: 7, title: "Антитеррористическая защищённость", icon: "ShieldAlert", color: "#ec4899",
    areas: [
      {
        id: 9, title: "Система охраны объекта", checklists: [
          {
            id: 9, title: "Проверка антитеррористической защищённости", questions: [
              { id: 1, text: "Разработан ли паспорт безопасности объекта?", requirement: "Постановление Правительства РФ № 1995 «Об утверждении требований к антитеррористической защищённости объектов»", hint: "Паспорт безопасности разрабатывается и согласуется с Росгвардией и ФСБ." },
              { id: 2, text: "Проведён ли инструктаж персонала по действиям при угрозе теракта?", requirement: "Постановление Правительства РФ № 1438, раздел о подготовке персонала.", hint: "Инструктаж проводится не реже 1 раза в год, записи — в журнале инструктажей." },
            ]
          }
        ]
      }
    ]
  },
  {
    id: 8, title: "Бухгалтерское дело", icon: "Calculator", color: "#f59e0b",
    areas: [
      {
        id: 10, title: "Первичная документация", checklists: [
          {
            id: 10, title: "Проверка первичных документов", questions: [
              { id: 1, text: "Все ли первичные документы оформлены по установленным формам?", requirement: "Федеральный закон № 402-ФЗ «О бухгалтерском учёте», ст. 9 — требования к первичным документам.", hint: "Обязательные реквизиты: наименование, дата, организация, содержание, подписи." },
              { id: 2, text: "Соблюдаются ли сроки сдачи первичных документов в бухгалтерию?", requirement: "Учётная политика организации — график документооборота.", hint: "График документооборота утверждается приказом руководителя." },
            ]
          }
        ]
      }
    ]
  },
  {
    id: 9, title: "Информационная безопасность", icon: "Lock", color: "#06b6d4",
    areas: [
      {
        id: 11, title: "Защита персональных данных", checklists: [
          {
            id: 11, title: "Проверка защиты ПД", questions: [
              { id: 1, text: "Назначен ли ответственный за обработку персональных данных?", requirement: "Федеральный закон № 152-ФЗ «О персональных данных», ст. 22.1", hint: "Приказ о назначении ответственного должен быть в наличии." },
              { id: 2, text: "Получены ли согласия субъектов ПД на их обработку?", requirement: "ФЗ № 152-ФЗ, ст. 9 — требования к согласию субъекта ПД.", hint: "Форма согласия должна содержать все обязательные элементы по ст. 9 ФЗ-152." },
              { id: 3, text: "Проведена ли оценка уровня защищённости информационной системы ПД?", requirement: "Постановление Правительства РФ № 1119, ФЗ № 152-ФЗ", hint: "Акт классификации ИСПДн и технический паспорт должны быть в наличии." },
            ]
          }
        ]
      }
    ]
  },
  {
    id: 10, title: "Иное", icon: "MoreHorizontal", color: "#64748b",
    areas: []
  },
];

type ViewMode = "spheres" | "areas" | "checklists" | "survey" | "admin";

interface QuestionState {
  answer: AnswerValue;
  note: string;
  photos: string[];
}

export default function ChecklistModule({ onBack }: Props) {
  const [view, setView] = useState<ViewMode>("spheres");
  const [spheres, setSpheres] = useState<Sphere[]>(INITIAL_SPHERES);
  const [selectedSphere, setSelectedSphere] = useState<Sphere | null>(null);
  const [selectedArea, setSelectedArea] = useState<Area | null>(null);
  const [selectedChecklist, setSelectedChecklist] = useState<ChecklistData | null>(null);
  const [questionStates, setQuestionStates] = useState<Record<number, QuestionState>>({});
  const [activeModal, setActiveModal] = useState<{ type: "req" | "hint" | "note" | "photo" | "result"; qId?: number } | null>(null);
  const [noteInput, setNoteInput] = useState("");
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [emailInput, setEmailInput] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);

  // Admin state
  const [adminView, setAdminView] = useState<"main" | "add-sphere" | "add-area" | "add-checklist">("main");
  const [adminSphereId, setAdminSphereId] = useState<number | null>(null);
  const [adminAreaId, setAdminAreaId] = useState<number | null>(null);
  const [newSphereTitle, setNewSphereTitle] = useState("");
  const [newAreaTitle, setNewAreaTitle] = useState("");
  const [newChecklistTitle, setNewChecklistTitle] = useState("");

  const getQState = (qId: number): QuestionState =>
    questionStates[qId] || { answer: null, note: "", photos: [] };

  const setAnswer = (qId: number, val: AnswerValue) => {
    setQuestionStates(prev => ({ ...prev, [qId]: { ...getQState(qId), answer: val } }));
  };

  const saveNote = (qId: number, text: string) => {
    setQuestionStates(prev => ({ ...prev, [qId]: { ...getQState(qId), note: text } }));
  };

  const addPhoto = (qId: number, url: string) => {
    setQuestionStates(prev => {
      const cur = getQState(qId);
      return { ...prev, [qId]: { ...cur, photos: [...cur.photos, url] } };
    });
  };

  const openSurvey = (cl: ChecklistData) => {
    setSelectedChecklist(cl);
    setCurrentQIndex(0);
    setQuestionStates({});
    setEmailSent(false);
    setShowEmailForm(false);
    setEmailInput("");
    setView("survey");
  };

  const generateAndPrintReport = useCallback(() => {
    if (!selectedChecklist) return;
    const now = new Date();
    const dateStr = now.toLocaleDateString("ru-RU", { day: "2-digit", month: "long", year: "numeric" });
    const timeStr = now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

    const ANSWER_LABELS: Record<string, string> = { yes: "✅ Да", no: "❌ Нет", na: "➖ Не требуется" };
    const ANSWER_COLORS: Record<string, string> = { yes: "#16a34a", no: "#dc2626", na: "#ca8a04" };

    const yesCount = selectedChecklist.questions.filter(q => getQState(q.id).answer === "yes").length;
    const noCount = selectedChecklist.questions.filter(q => getQState(q.id).answer === "no").length;
    const naCount = selectedChecklist.questions.filter(q => getQState(q.id).answer === "na").length;
    const totalQ = selectedChecklist.questions.length;

    const rows = selectedChecklist.questions.map((q, i) => {
      const st = getQState(q.id);
      const ans = st.answer || "na";
      const color = ANSWER_COLORS[ans] || "#94a3b8";
      return `
        <tr style="border-bottom:1px solid #e2e8f0; ${ans === "no" ? "background:#fff5f5;" : ""}">
          <td style="padding:10px 12px; color:#64748b; font-size:13px; width:32px; text-align:center;">${i + 1}</td>
          <td style="padding:10px 12px; font-size:13px; line-height:1.5;">${q.text}</td>
          <td style="padding:10px 12px; text-align:center; font-weight:600; font-size:13px; white-space:nowrap;" width="110">
            <span style="color:${color}; background:${color}18; padding:3px 10px; border-radius:6px; border:1px solid ${color}44;">${ANSWER_LABELS[ans]}</span>
          </td>
          <td style="padding:10px 12px; color:#64748b; font-size:12px; font-style:italic;">${st.note || "—"}</td>
        </tr>`;
    }).join("");

    const html = `<!DOCTYPE html><html lang="ru">
<head><meta charset="UTF-8"/><title>Отчёт по чек-листу</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Arial', sans-serif; margin: 0; padding: 32px; color: #1e293b; background: #fff; }
  .header { border-bottom: 3px solid #0891b2; padding-bottom: 20px; margin-bottom: 24px; }
  .logo { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
  h1 { font-size: 22px; color: #0f172a; margin: 0 0 4px; }
  .subtitle { font-size: 13px; color: #64748b; }
  .meta { display: flex; gap: 24px; margin-bottom: 24px; flex-wrap: wrap; }
  .meta-item { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 16px; }
  .meta-label { font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; }
  .meta-value { font-size: 14px; font-weight: 600; color: #1e293b; margin-top: 2px; }
  .stats { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; margin-bottom: 24px; }
  .stat { border-radius: 12px; padding: 16px; text-align: center; border: 1px solid; }
  .stat-num { font-size: 28px; font-weight: 700; }
  .stat-label { font-size: 12px; margin-top: 4px; }
  .stat-yes { background: #f0fdf4; border-color: #bbf7d0; color: #15803d; }
  .stat-no { background: #fef2f2; border-color: #fecaca; color: #dc2626; }
  .stat-na { background: #fefce8; border-color: #fef08a; color: #ca8a04; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  thead tr { background: #f1f5f9; }
  th { padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; font-weight: 600; }
  .footer { margin-top: 28px; padding-top: 16px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 11px; color: #94a3b8; }
  @media print {
    body { padding: 16px; }
    .no-print { display: none !important; }
  }
</style>
</head>
<body>
  <div class="header">
    <div class="logo">Мобильный инспектор · Отчёт по проверке</div>
    <h1>${selectedChecklist.title}</h1>
    <div class="subtitle">${selectedSphere?.title || ""}${selectedArea ? " → " + selectedArea.title : ""}</div>
  </div>
  <div class="meta">
    <div class="meta-item"><div class="meta-label">Дата проверки</div><div class="meta-value">${dateStr}</div></div>
    <div class="meta-item"><div class="meta-label">Время</div><div class="meta-value">${timeStr}</div></div>
    <div class="meta-item"><div class="meta-label">Всего вопросов</div><div class="meta-value">${totalQ}</div></div>
  </div>
  <div class="stats">
    <div class="stat stat-yes"><div class="stat-num">${yesCount}</div><div class="stat-label">✅ Да / Выполнено</div></div>
    <div class="stat stat-no"><div class="stat-num">${noCount}</div><div class="stat-label">❌ Нет / Нарушение</div></div>
    <div class="stat stat-na"><div class="stat-num">${naCount}</div><div class="stat-label">➖ Не применимо</div></div>
  </div>
  <table>
    <thead>
      <tr><th>#</th><th>Вопрос</th><th>Ответ</th><th>Примечание</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer">
    <span>Сформировано: ${dateStr} в ${timeStr}</span>
    <span>Мобильный инспектор · mobile-inspector.ru</span>
  </div>
</body></html>`;

    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  }, [selectedChecklist, selectedSphere, selectedArea, questionStates]);

  const handleSendEmail = () => {
    if (!emailInput.trim()) return;
    setSendingEmail(true);
    setTimeout(() => {
      setSendingEmail(false);
      setEmailSent(true);
      setShowEmailForm(false);
    }, 1500);
  };

  const answered = selectedChecklist ? selectedChecklist.questions.filter(q => getQState(q.id).answer !== null).length : 0;
  const total = selectedChecklist?.questions.length || 0;
  const progress = total > 0 ? Math.round((answered / total) * 100) : 0;

  const currentQ = selectedChecklist?.questions[currentQIndex];

  // Admin helpers
  const addSphere = () => {
    if (!newSphereTitle.trim()) return;
    setSpheres(prev => [...prev, { id: Date.now(), title: newSphereTitle, icon: "MoreHorizontal", color: "#64748b", areas: [] }]);
    setNewSphereTitle("");
    setAdminView("main");
  };

  const addArea = () => {
    if (!newAreaTitle.trim() || !adminSphereId) return;
    setSpheres(prev => prev.map(s => s.id !== adminSphereId ? s : { ...s, areas: [...s.areas, { id: Date.now(), title: newAreaTitle, checklists: [] }] }));
    setNewAreaTitle("");
    setAdminView("main");
  };

  const addChecklist = () => {
    if (!newChecklistTitle.trim() || !adminSphereId || !adminAreaId) return;
    setSpheres(prev => prev.map(s => s.id !== adminSphereId ? s : {
      ...s,
      areas: s.areas.map(a => a.id !== adminAreaId ? a : {
        ...a, checklists: [...a.checklists, { id: Date.now(), title: newChecklistTitle, questions: [] }]
      })
    }));
    setNewChecklistTitle("");
    setAdminView("main");
  };

  // ── ADMIN VIEW ──────────────────────────────────────────────────────────────
  if (view === "admin") {
    return (
      <div className="min-h-screen relative z-10 animate-fade-in">
        <ModuleHeader title="Администрирование чек-листов" onBack={() => setView("spheres")} icon="Settings" iconColor="#06b6d4" />
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-8 space-y-4">
          {adminView === "main" && (
            <>
              {/* Upload Excel */}
              <div className="glass-strong rounded-2xl p-5 animate-fade-up opacity-0" style={{ animationFillMode: 'forwards' }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.2)' }}>
                    <Icon name="FileSpreadsheet" size={20} color="#10b981" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Загрузить чек-листы из Excel</p>
                    <p className="text-xs text-white/40">Формат: .xlsx, .xls</p>
                  </div>
                </div>
                <div
                  className="border-2 border-dashed border-white/15 rounded-xl p-6 flex flex-col items-center gap-2 cursor-pointer hover:border-cyan-500/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Icon name="Upload" size={28} color="rgba(255,255,255,0.3)" />
                  <p className="text-sm text-white/50 text-center">Нажмите для выбора файла<br /><span className="text-xs">или перетащите сюда</span></p>
                  <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" />
                </div>
                <p className="text-xs text-white/30 mt-3 text-center">Файл должен содержать листы: Вопросы, Требования, Подсказки</p>
              </div>

              {/* Spheres list */}
              <div className="animate-fade-up opacity-0 delay-100" style={{ animationFillMode: 'forwards' }}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Сферы деятельности ({spheres.length})</p>
                  <button onClick={() => setAdminView("add-sphere")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-cyan-400 transition-colors" style={{ background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.3)' }}>
                    <Icon name="Plus" size={13} color="#06b6d4" />Добавить сферу
                  </button>
                </div>
                <div className="space-y-2">
                  {spheres.map(s => (
                    <div key={s.id} className="glass rounded-2xl overflow-hidden">
                      <div className="flex items-center gap-3 px-4 py-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${s.color}20` }}>
                          <Icon name={s.icon} size={16} color={s.color} />
                        </div>
                        <span className="text-sm font-medium text-white flex-1">{s.title}</span>
                        <span className="text-xs text-white/30">{s.areas.length} областей</span>
                        <button
                          onClick={() => { setAdminSphereId(s.id); setAdminView("add-area"); }}
                          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors ml-1"
                        >
                          <Icon name="Plus" size={14} color="rgba(255,255,255,0.5)" />
                        </button>
                      </div>
                      {s.areas.length > 0 && (
                        <div className="border-t border-white/5 px-4 py-2 space-y-1">
                          {s.areas.map(a => (
                            <div key={a.id} className="flex items-center gap-2 py-1.5">
                              <Icon name="ChevronRight" size={12} color="rgba(255,255,255,0.25)" />
                              <span className="text-xs text-white/60 flex-1">{a.title}</span>
                              <span className="text-xs text-white/25">{a.checklists.length} чек-листов</span>
                              <button
                                onClick={() => { setAdminSphereId(s.id); setAdminAreaId(a.id); setAdminView("add-checklist"); }}
                                className="p-1 rounded-lg hover:bg-white/10 transition-colors"
                              >
                                <Icon name="Plus" size={13} color="rgba(255,255,255,0.4)" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {adminView === "add-sphere" && (
            <div className="glass-strong rounded-2xl p-5 animate-scale-in space-y-4">
              <h3 className="text-base font-bold text-white">Новая сфера деятельности</h3>
              <input className="input-field" placeholder="Название сферы..." value={newSphereTitle} onChange={e => setNewSphereTitle(e.target.value)} autoFocus />
              <div className="flex gap-3">
                <button onClick={() => setAdminView("main")} className="btn-ghost flex-1 text-sm">Отмена</button>
                <button onClick={addSphere} className="btn-primary flex-1 text-sm flex items-center justify-center gap-1"><Icon name="Plus" size={15} />Создать</button>
              </div>
            </div>
          )}

          {adminView === "add-area" && (
            <div className="glass-strong rounded-2xl p-5 animate-scale-in space-y-4">
              <h3 className="text-base font-bold text-white">Новая область</h3>
              <p className="text-xs text-white/40">Сфера: {spheres.find(s => s.id === adminSphereId)?.title}</p>
              <input className="input-field" placeholder="Название области..." value={newAreaTitle} onChange={e => setNewAreaTitle(e.target.value)} autoFocus />
              <div className="flex gap-3">
                <button onClick={() => setAdminView("main")} className="btn-ghost flex-1 text-sm">Отмена</button>
                <button onClick={addArea} className="btn-primary flex-1 text-sm flex items-center justify-center gap-1"><Icon name="Plus" size={15} />Создать</button>
              </div>
            </div>
          )}

          {adminView === "add-checklist" && (
            <div className="glass-strong rounded-2xl p-5 animate-scale-in space-y-4">
              <h3 className="text-base font-bold text-white">Новый чек-лист</h3>
              <p className="text-xs text-white/40">
                {spheres.find(s => s.id === adminSphereId)?.title} → {spheres.find(s => s.id === adminSphereId)?.areas.find(a => a.id === adminAreaId)?.title}
              </p>
              <input className="input-field" placeholder="Название чек-листа..." value={newChecklistTitle} onChange={e => setNewChecklistTitle(e.target.value)} autoFocus />
              <div className="glass rounded-2xl p-3 flex items-center gap-3 cursor-pointer hover:bg-white/5 transition-colors" onClick={() => fileInputRef.current?.click()}>
                <Icon name="FileSpreadsheet" size={18} color="#10b981" />
                <span className="text-sm text-white/60">Загрузить вопросы из Excel</span>
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setAdminView("main")} className="btn-ghost flex-1 text-sm">Отмена</button>
                <button onClick={addChecklist} className="btn-primary flex-1 text-sm flex items-center justify-center gap-1"><Icon name="Plus" size={15} />Создать</button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── SURVEY VIEW ─────────────────────────────────────────────────────────────
  if (view === "survey" && selectedChecklist && currentQ) {
    const qState = getQState(currentQ.id);
    const isLast = currentQIndex === selectedChecklist.questions.length - 1;

    const goNext = () => {
      if (isLast) {
        setActiveModal({ type: "result" });
      } else {
        setCurrentQIndex(i => i + 1);
      }
    };

    const goPrev = () => {
      if (currentQIndex > 0) setCurrentQIndex(i => i - 1);
    };

    return (
      <div className="min-h-screen relative z-10 animate-fade-in flex flex-col">
        {/* Modal overlay */}
        {activeModal && (
          <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }} onClick={() => setActiveModal(null)}>
            <div className="w-full max-w-2xl animate-fade-up opacity-0" style={{ animationFillMode: 'forwards' }} onClick={e => e.stopPropagation()}>
              <div className="glass-strong rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto">
                {activeModal.type === "req" && (
                  <>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.2)' }}><Icon name="BookOpen" size={16} color="#ef4444" /></div>
                      <h3 className="text-base font-bold text-white">Нормативное требование</h3>
                    </div>
                    <p className="text-sm text-white/70 leading-relaxed">{currentQ.requirement}</p>
                  </>
                )}
                {activeModal.type === "hint" && (
                  <>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.2)' }}><Icon name="Lightbulb" size={16} color="#f59e0b" /></div>
                      <h3 className="text-base font-bold text-white">Подсказка</h3>
                    </div>
                    <p className="text-sm text-white/70 leading-relaxed">{currentQ.hint}</p>
                  </>
                )}
                {activeModal.type === "note" && activeModal.qId !== undefined && (
                  <>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(6,182,212,0.2)' }}><Icon name="StickyNote" size={16} color="#06b6d4" /></div>
                      <h3 className="text-base font-bold text-white">Примечание</h3>
                    </div>
                    <textarea
                      className="input-field resize-none mb-4"
                      rows={4}
                      placeholder="Введите примечание к данному вопросу..."
                      defaultValue={getQState(activeModal.qId).note}
                      onChange={e => setNoteInput(e.target.value)}
                      onFocus={() => setNoteInput(getQState(activeModal.qId!).note)}
                    />
                    <button className="btn-primary text-sm py-3 flex items-center justify-center gap-2" onClick={() => {
                      saveNote(activeModal.qId!, noteInput || getQState(activeModal.qId!).note);
                      setActiveModal(null);
                    }}>
                      <Icon name="Check" size={16} />Сохранить примечание
                    </button>
                  </>
                )}
                {activeModal.type === "photo" && activeModal.qId !== undefined && (
                  <>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.2)' }}><Icon name="Camera" size={16} color="#8b5cf6" /></div>
                      <h3 className="text-base font-bold text-white">Фотоотчёт</h3>
                    </div>
                    {getQState(activeModal.qId).photos.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 mb-4">
                        {getQState(activeModal.qId).photos.map((p, i) => (
                          <div key={i} className="aspect-square rounded-xl flex items-center justify-center text-xs text-white/40" style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)' }}>
                            <Icon name="ImageIcon" size={20} color="rgba(139,92,246,0.6)" />
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      <button className="flex flex-col items-center gap-2 py-5 rounded-2xl transition-colors hover:bg-white/10" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                        onClick={() => { addPhoto(activeModal.qId!, `photo_${Date.now()}`); }}>
                        <Icon name="Camera" size={24} color="rgba(255,255,255,0.6)" />
                        <span className="text-xs text-white/60">Сфотографировать</span>
                      </button>
                      <button className="flex flex-col items-center gap-2 py-5 rounded-2xl transition-colors hover:bg-white/10" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                        onClick={() => { addPhoto(activeModal.qId!, `file_${Date.now()}`); }}>
                        <Icon name="Upload" size={24} color="rgba(255,255,255,0.6)" />
                        <span className="text-xs text-white/60">Загрузить файл</span>
                      </button>
                    </div>
                  </>
                )}
                {activeModal.type === "result" && (
                  <>
                    {/* Header */}
                    <div className="text-center mb-5">
                      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3 glow" style={{ background: 'linear-gradient(135deg, #06b6d4, #0891b2)' }}>
                        <Icon name="CheckCircle" size={32} color="white" />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-1">Чек-лист завершён!</h3>
                      <p className="text-white/50 text-sm">{selectedChecklist.title}</p>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-3 mb-5">
                      {([
                        { v: "yes" as AnswerValue, label: "Да", icon: "Check", color: "#22c55e" },
                        { v: "no" as AnswerValue, label: "Нет", icon: "X", color: "#ef4444" },
                        { v: "na" as AnswerValue, label: "Не прим.", icon: "Minus", color: "#f59e0b" },
                      ]).map(({ v, label, icon, color }) => {
                        const count = selectedChecklist.questions.filter(q => getQState(q.id).answer === v).length;
                        return (
                          <div key={v!} className="text-center py-4 rounded-2xl" style={{ background: `${color}12`, border: `1px solid ${color}30` }}>
                            <div className="text-2xl font-bold mb-0.5" style={{ color }}>{count}</div>
                            <div className="text-xs" style={{ color }}>{label}</div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Violations alert */}
                    {selectedChecklist.questions.filter(q => getQState(q.id).answer === "no").length > 0 && (
                      <div className="flex items-start gap-2 p-3 rounded-xl mb-4" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}>
                        <Icon name="AlertTriangle" size={15} color="#ef4444" className="flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-red-300 leading-relaxed">
                          Обнаружено <strong>{selectedChecklist.questions.filter(q => getQState(q.id).answer === "no").length}</strong> нарушений. Рекомендуется принять корректирующие меры и провести повторную проверку.
                        </p>
                      </div>
                    )}

                    {/* Email form */}
                    {showEmailForm ? (
                      <div className="space-y-3 mb-4 animate-scale-in">
                        <div>
                          <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Email получателя</label>
                          <input
                            className="input-field text-sm"
                            placeholder="example@company.ru"
                            type="email"
                            value={emailInput}
                            onChange={e => setEmailInput(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && handleSendEmail()}
                            autoFocus
                          />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setShowEmailForm(false)} className="btn-ghost flex-1 text-sm">Отмена</button>
                          <button onClick={handleSendEmail} disabled={!emailInput.trim() || sendingEmail} className="btn-primary flex-1 text-sm flex items-center justify-center gap-2 disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #06b6d4, #0891b2)' }}>
                            {sendingEmail
                              ? <><Icon name="Loader2" size={15} className="animate-spin" />Отправка...</>
                              : <><Icon name="Send" size={15} />Отправить</>
                            }
                          </button>
                        </div>
                      </div>
                    ) : emailSent ? (
                      <div className="flex items-center gap-2 p-3 rounded-xl mb-4" style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.3)' }}>
                        <Icon name="CheckCircle" size={15} color="#06b6d4" />
                        <p className="text-xs text-cyan-300">Отчёт отправлен на <strong>{emailInput}</strong></p>
                      </div>
                    ) : null}

                    {/* Action buttons */}
                    <div className="space-y-2">
                      <button
                        onClick={generateAndPrintReport}
                        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold text-white transition-all active:scale-98"
                        style={{ background: 'linear-gradient(135deg, #06b6d4, #0891b2)', boxShadow: '0 4px 20px rgba(6,182,212,0.35)' }}
                      >
                        <Icon name="FileText" size={17} />Сформировать PDF-отчёт
                      </button>
                      {!showEmailForm && !emailSent && (
                        <button
                          onClick={() => setShowEmailForm(true)}
                          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold transition-all"
                          style={{ background: 'rgba(6,182,212,0.12)', border: '1px solid rgba(6,182,212,0.3)', color: '#06b6d4' }}
                        >
                          <Icon name="Mail" size={17} color="#06b6d4" />Отправить отчёт на почту
                        </button>
                      )}
                      {emailSent && (
                        <button
                          onClick={() => { setEmailSent(false); setShowEmailForm(true); setEmailInput(""); }}
                          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-medium text-white/50 transition-all hover:text-white/70"
                        >
                          <Icon name="RefreshCw" size={14} />Отправить на другой адрес
                        </button>
                      )}
                      <button
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-medium text-white/50 transition-all hover:text-white/70"
                        onClick={() => setActiveModal(null)}
                      >
                        <Icon name="ArrowLeft" size={15} />Вернуться к чек-листу
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Survey Header */}
        <div className="glass border-b border-white/10 px-4 py-4 sticky top-0 z-20">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-3 mb-3">
              <button onClick={() => { setView("checklists"); setSelectedChecklist(null); }} className="p-2 rounded-xl hover:bg-white/10 transition-colors">
                <Icon name="ArrowLeft" size={20} color="white" />
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white/40 truncate">{selectedArea?.title}</p>
                <p className="text-sm font-semibold text-white truncate">{selectedChecklist.title}</p>
              </div>
              <span className="text-sm font-bold text-cyan-400 flex-shrink-0">{currentQIndex + 1}/{total}</span>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #06b6d4, #3b82f6)' }} />
            </div>
          </div>
        </div>

        {/* Question */}
        <div className="flex-1 max-w-2xl mx-auto w-full px-4 pt-5 pb-8 flex flex-col gap-4">
          <div className="glass-strong rounded-2xl p-5 animate-fade-up opacity-0" style={{ animationFillMode: 'forwards' }}>
            <div className="flex items-start gap-3 mb-4">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: 'rgba(6,182,212,0.2)' }}>
                <span className="text-xs font-bold text-cyan-400">{currentQIndex + 1}</span>
              </div>
              <p className="text-sm font-medium text-white leading-relaxed">{currentQ.text}</p>
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-4 gap-2 mb-5">
              {[
                { type: "req", label: "Требования", icon: "BookOpen", color: "#ef4444" },
                { type: "hint", label: "Подсказка", icon: "Lightbulb", color: "#f59e0b" },
                { type: "note", label: "Примечание", icon: "StickyNote", color: "#06b6d4" },
                { type: "photo", label: "Фото", icon: "Camera", color: "#8b5cf6" },
              ].map(btn => {
                const hasNote = btn.type === "note" && qState.note;
                const hasPhoto = btn.type === "photo" && qState.photos.length > 0;
                return (
                  <button
                    key={btn.type}
                    onClick={() => setActiveModal({ type: btn.type as "req" | "hint" | "note" | "photo", qId: currentQ.id })}
                    className="flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all hover:scale-105 relative"
                    style={{ background: `${btn.color}12`, border: `1px solid ${btn.color}25` }}
                  >
                    <Icon name={btn.icon} size={18} color={btn.color} />
                    <span className="text-xs leading-none" style={{ color: btn.color }}>{btn.label}</span>
                    {(hasNote || hasPhoto) && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{ background: btn.color }} />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Answer buttons */}
            <div className="grid grid-cols-3 gap-3">
              {([
                { val: "yes", label: "Да", icon: "Check", color: "#22c55e", bg: "rgba(34,197,94," },
                { val: "no", label: "Нет", icon: "X", color: "#ef4444", bg: "rgba(239,68,68," },
                { val: "na", label: "Не требуется", icon: "Minus", color: "#f59e0b", bg: "rgba(245,158,11," },
              ] as const).map(opt => {
                const active = qState.answer === opt.val;
                return (
                  <button
                    key={opt.val}
                    onClick={() => setAnswer(currentQ.id, opt.val)}
                    className="flex flex-col items-center gap-2 py-4 rounded-2xl transition-all"
                    style={{
                      background: active ? `${opt.bg}0.2)` : 'rgba(255,255,255,0.04)',
                      border: `2px solid ${active ? opt.color : 'rgba(255,255,255,0.08)'}`,
                      transform: active ? 'scale(1.03)' : 'scale(1)',
                      boxShadow: active ? `0 0 20px ${opt.bg}0.3)` : 'none',
                    }}
                  >
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: active ? `${opt.bg}0.25)` : 'rgba(255,255,255,0.06)' }}>
                      <Icon name={opt.icon} size={18} color={active ? opt.color : "rgba(255,255,255,0.4)"} />
                    </div>
                    <span className="text-xs font-semibold leading-tight text-center" style={{ color: active ? opt.color : "rgba(255,255,255,0.5)" }}>
                      {opt.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Note preview */}
          {qState.note && (
            <div className="flex items-start gap-2 px-4 py-3 rounded-xl animate-fade-in" style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)' }}>
              <Icon name="StickyNote" size={14} color="#06b6d4" className="flex-shrink-0 mt-0.5" />
              <p className="text-xs text-cyan-300/80">{qState.note}</p>
            </div>
          )}

          {/* Photos preview */}
          {qState.photos.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl animate-fade-in" style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)' }}>
              <Icon name="ImageIcon" size={14} color="#8b5cf6" />
              <p className="text-xs text-purple-300/80">{qState.photos.length} фото прикреплено</p>
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-3 mt-auto">
            <button onClick={goPrev} disabled={currentQIndex === 0} className="btn-ghost flex-shrink-0 px-5 flex items-center gap-2 disabled:opacity-30">
              <Icon name="ArrowLeft" size={16} />Назад
            </button>
            <button
              onClick={goNext}
              disabled={qState.answer === null}
              className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-40"
            >
              {isLast ? <><Icon name="CheckCircle" size={18} />Завершить</> : <><Icon name="ArrowRight" size={18} />Далее</>}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── CHECKLISTS VIEW ──────────────────────────────────────────────────────────
  if (view === "checklists" && selectedArea) {
    return (
      <div className="min-h-screen relative z-10 animate-fade-in">
        <ModuleHeader title={selectedArea.title} onBack={() => setView("areas")} subtitle={selectedSphere?.title} icon="ClipboardList" iconColor="#06b6d4" />
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-8 space-y-3">
          {selectedArea.checklists.length === 0 ? (
            <div className="text-center py-16 text-white/30">
              <Icon name="ClipboardList" size={36} color="rgba(255,255,255,0.15)" className="mx-auto mb-3" />
              <p className="text-sm">Чек-листы не добавлены</p>
              <p className="text-xs mt-1">Администратор добавит их через панель управления</p>
            </div>
          ) : (
            selectedArea.checklists.map((cl, i) => (
              <button
                key={cl.id}
                onClick={() => openSurvey(cl)}
                className={`w-full text-left card-module animate-fade-up opacity-0`}
                style={{ animationDelay: `${i * 0.06}s`, animationFillMode: 'forwards' }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.25)' }}>
                    <Icon name="ClipboardCheck" size={20} color="#06b6d4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">{cl.title}</p>
                    <p className="text-xs text-white/40 mt-0.5">{cl.questions.length} вопросов</p>
                  </div>
                  <Icon name="ChevronRight" size={16} color="rgba(255,255,255,0.25)" />
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    );
  }

  // ── AREAS VIEW ───────────────────────────────────────────────────────────────
  if (view === "areas" && selectedSphere) {
    return (
      <div className="min-h-screen relative z-10 animate-fade-in">
        <ModuleHeader
          title={selectedSphere.title}
          onBack={() => setView("spheres")}
          icon={selectedSphere.icon}
          iconColor={selectedSphere.color}
          subtitle="Выберите область"
        />
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-8 space-y-3">
          {selectedSphere.areas.length === 0 ? (
            <div className="text-center py-16 text-white/30">
              <Icon name="FolderOpen" size={36} color="rgba(255,255,255,0.15)" className="mx-auto mb-3" />
              <p className="text-sm">Области не добавлены</p>
            </div>
          ) : (
            selectedSphere.areas.map((area, i) => (
              <button
                key={area.id}
                onClick={() => { setSelectedArea(area); setView("checklists"); }}
                className={`w-full text-left card-module animate-fade-up opacity-0`}
                style={{ animationDelay: `${i * 0.06}s`, animationFillMode: 'forwards' }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${selectedSphere.color}15`, border: `1px solid ${selectedSphere.color}25` }}>
                    <Icon name="Layers" size={20} color={selectedSphere.color} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">{area.title}</p>
                    <p className="text-xs text-white/40 mt-0.5">{area.checklists.length} чек-листов</p>
                  </div>
                  <Icon name="ChevronRight" size={16} color="rgba(255,255,255,0.25)" />
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    );
  }

  // ── SPHERES LIST ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen relative z-10 animate-fade-in">
      <div className="glass border-b border-white/10 px-4 py-4 sticky top-0 z-20">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 rounded-xl hover:bg-white/10 transition-colors">
              <Icon name="ArrowLeft" size={20} color="white" />
            </button>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(6,182,212,0.2)', border: '1px solid rgba(6,182,212,0.3)' }}>
              <Icon name="CheckSquare" size={18} color="#06b6d4" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white">Чек-листы</h1>
              <p className="text-xs text-white/40">Выберите сферу деятельности</p>
            </div>
          </div>
          <button
            onClick={() => { setView("admin"); setAdminView("main"); }}
            className="p-2 rounded-xl hover:bg-white/10 transition-colors"
            title="Администрирование"
          >
            <Icon name="Settings" size={18} color="rgba(255,255,255,0.5)" />
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4 pb-8">
        <div className="grid grid-cols-2 gap-3">
          {spheres.map((sphere, i) => (
            <button
              key={sphere.id}
              onClick={() => { setSelectedSphere(sphere); setView("areas"); }}
              className={`card-module text-left animate-fade-up opacity-0`}
              style={{ animationDelay: `${i * 0.05}s`, animationFillMode: 'forwards' }}
            >
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-3" style={{ background: `${sphere.color}15`, border: `1px solid ${sphere.color}25` }}>
                <Icon name={sphere.icon} size={22} color={sphere.color} />
              </div>
              <p className="text-sm font-semibold text-white leading-snug mb-1">{sphere.title}</p>
              <p className="text-xs" style={{ color: sphere.color + "99" }}>
                {sphere.areas.length > 0
                  ? `${sphere.areas.length} ${sphere.areas.length === 1 ? "область" : sphere.areas.length < 5 ? "области" : "областей"}`
                  : "Нет областей"}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}