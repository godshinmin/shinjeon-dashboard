import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from "recharts";

// ═══════════════════════════════════════════════════
//  Supabase
// ═══════════════════════════════════════════════════
const SB_URL = "https://yigtucvlikxeddqghtqw.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpZ3R1Y3ZsaWt4ZWRkcWdodHF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyOTcwNjgsImV4cCI6MjA5Nzg3MzA2OH0.MoTdu9sYMOLIaLhCNY9Ivs3hg32MbiHoqlOMcbRpIwY";
const H = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` };

const sb = {
  async getAll() {
    const r = await fetch(`${SB_URL}/rest/v1/students?select=*&order=updated_at.asc`, { headers: H });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async upsert(id, data) {
    const r = await fetch(`${SB_URL}/rest/v1/students`, {
      method: "POST",
      headers: { ...H, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify({ id, data, updated_at: new Date().toISOString() })
    });
    if (!r.ok) throw new Error(await r.text());
  },
  async del(id) {
    await fetch(`${SB_URL}/rest/v1/students?id=eq.${id}`, { method: "DELETE", headers: H });
  },
  async uploadImage(file, path) {
    const r = await fetch(`${SB_URL}/storage/v1/object/drawings/${path}`, {
      method: "POST",
      headers: { ...H, "Content-Type": file.type, "x-upsert": "true" },
      body: file,
    });
    if (!r.ok) throw new Error(await r.text());
    return `${SB_URL}/storage/v1/object/public/drawings/${path}`;
  },
  async getStudent(id) {
    const r = await fetch(`${SB_URL}/rest/v1/students?id=eq.${id}`, { headers: H });
    const rows = await r.json();
    return rows.length ? { ...rows[0].data, id: rows[0].id } : null;
  }
};

// ═══════════════════════════════════════════════════
//  디자인 토큰
// ═══════════════════════════════════════════════════
const C = {
  navy:"#1A2A45", navyMid:"#243355", blue:"#2B58B8", blueLight:"#3B6FD4",
  accent:"#C8A655", accentSoft:"#F0E4C0", bg:"#F2F5FB", card:"#FFFFFF",
  border:"#DAE0EF", text:"#1A2A45", textMid:"#475070", textLight:"#8290B0",
  success:"#1E9E6B", warn:"#D97706", danger:"#DC2626", passed:"#059669",
  purple:"#7C3AED", pink:"#DB2777",
};

// ═══════════════════════════════════════════════════
//  상수
// ═══════════════════════════════════════════════════
const SESSIONS = [
  { id:"s1", label:"1교시", subjects:[{ id:"분석조닝", name:"분석조닝문제" },{ id:"배치", name:"배치문제" }]},
  { id:"s2", label:"2교시", subjects:[{ id:"평면", name:"평면문제" }]},
  { id:"s3", label:"3교시", subjects:[{ id:"구조", name:"구조문제" },{ id:"단면", name:"단면문제" }]},
];
const HW_TYPES = [
  { id:"이해", name:"이해문제",    count:10 },
  { id:"기초", name:"기초문제",    count:4  },
  { id:"집중", name:"집중문제",    count:6  },
  { id:"기출", name:"과년도 기출", count:13 }, // 2020~2026 연도별
  { id:"심화", name:"심화문제",    count:8  },
];
const HW_TOTAL = HW_TYPES.reduce((s,t)=>s+t.count, 0); // 41
// 기출 연도별 회차 (2020 1회~2026 1회)
const GICHUL_ITEMS = [
  "2020년 1회","2020년 2회",
  "2021년 1회","2021년 2회",
  "2022년 1회","2022년 2회",
  "2023년 1회","2023년 2회",
  "2024년 1회","2024년 2회",
  "2025년 1회","2025년 2회",
  "2026년 1회",
];
const GRADES = ["A","B","C","D","F"];
const GS = { A:5, B:4, C:3, D:2, F:1 };
const WEEKS = Array.from({length:20},(_,i)=>i+1);
const CLASSES = Array.from({length:26},(_,i)=>String.fromCharCode(65+i)+"반");
const MOCK_TYPES = ["1차 모의고사","2차 모의고사","3차 모의고사","최종 모의고사"];

// ═══════════════════════════════════════════════════
//  반별 수강생 초기 목록 (이름옆 숫자 = 남은교시)
//  13남음→s2합격 / 23남음→s1합격 / 12남음→s3합격
//  1남음→s2+s3합격 / 3남음→s1+s2합격
// ═══════════════════════════════════════════════════
const SEED_STUDENTS = [
  // ── A반 (신민철, 토 9시) ─────────────────────
  {name:"최영주",cls:"A반",p:[]},{name:"김주찬",cls:"A반",p:[]},
  {name:"강우정",cls:"A반",p:[]},{name:"이주현",cls:"A반",p:[]},
  {name:"배민건",cls:"A반",p:[]},{name:"이도경",cls:"A반",p:[]},
  {name:"김수혜",cls:"A반",p:[]},{name:"임범호",cls:"A반",p:[]},
  {name:"권이설",cls:"A반",p:[]},{name:"신희선",cls:"A반",p:[]},
  // ── B반 (이서연, 토 9시) ─────────────────────
  {name:"이유상",cls:"B반",p:[]},{name:"박난송",cls:"B반",p:[]},
  {name:"권혁범",cls:"B반",p:[]},{name:"이대원",cls:"B반",p:[]},
  {name:"안용석",cls:"B반",p:[]},
  // ── C반 (전재환, 토 14시) ────────────────────
  {name:"진실환",cls:"C반",p:[]},{name:"정연모",cls:"C반",p:[]},
  {name:"조상희",cls:"C반",p:[]},{name:"이연우",cls:"C반",p:[]},
  {name:"심동혁",cls:"C반",p:[]},{name:"나기주",cls:"C반",p:[]},
  {name:"안영홍",cls:"C반",p:[]},{name:"김석영",cls:"C반",p:[]},
  {name:"허다운",cls:"C반",p:[]},
  // ── D반 (이유정, 토 14시) ────────────────────
  {name:"이한결",cls:"D반",p:[]},{name:"박상국",cls:"D반",p:[]},
  {name:"이현석",cls:"D반",p:[]},{name:"안종원",cls:"D반",p:[]},
  {name:"박주원",cls:"D반",p:[]},{name:"송형창",cls:"D반",p:[]},
  {name:"김민선",cls:"D반",p:[]},{name:"김성경",cls:"D반",p:[]},
  {name:"문범호",cls:"D반",p:[]},{name:"노유진",cls:"D반",p:[]},
  // ── E반 (전재환, 토 19시) ────────────────────
  {name:"문현빈",cls:"E반",p:[]},{name:"김도은",cls:"E반",p:[]},
  {name:"정진호",cls:"E반",p:["s1"]},  // 23남음→s1합격
  {name:"김지나",cls:"E반",p:[]},{name:"김현경",cls:"E반",p:[]},
  {name:"이은총",cls:"E반",p:[]},{name:"이종필",cls:"E반",p:[]},
  {name:"김성록",cls:"E반",p:[]},{name:"이성섭",cls:"E반",p:[]},
  // ── F반 (최유정, 토 19시) 1·3교시 남음 ──────
  {name:"이호준",cls:"F반",p:["s2"]},{name:"박다임",cls:"F반",p:["s2"]},
  {name:"지영선",cls:"F반",p:["s2"]},{name:"유촌호",cls:"F반",p:["s2"]},
  {name:"양기정",cls:"F반",p:["s2"]},{name:"정득화",cls:"F반",p:["s2"]},
  {name:"사명석",cls:"F반",p:["s2"]},{name:"김향환",cls:"F반",p:["s2"]},
  // ── G반 (전재환, 일 9시) ─────────────────────
  {name:"박희은",cls:"G반",p:[]},{name:"장현수",cls:"G반",p:[]},
  {name:"홍보라",cls:"G반",p:[]},{name:"박정은",cls:"G반",p:[]},
  {name:"김종석",cls:"G반",p:[]},
  {name:"배주현",cls:"G반",p:["s2"]},  // 13남음→s2합격
  {name:"권승혁",cls:"G반",p:[]},{name:"이숙경",cls:"G반",p:[]},
  {name:"박관호",cls:"G반",p:[]},
  // ── H반 (이영미, 일 9시) ─────────────────────
  {name:"서강우",cls:"H반",p:["s1","s3"]},  // 2남음→s1,s3합격
  {name:"박주석",cls:"H반",p:["s1","s3"]},
  {name:"정소연",cls:"H반",p:["s3"]},       // 12남음→s3합격
  {name:"이재진",cls:"H반",p:["s3"]},
  {name:"정상형",cls:"H반",p:["s3"]},
  {name:"윤종경",cls:"H반",p:["s1","s3"]},  // 2남음
  {name:"김경환",cls:"H반",p:["s2","s3"]},  // 1남음→s2,s3합격
  // ── I반 (전재환, 일 14시) ────────────────────
  {name:"손준혁",cls:"I반",p:[]},{name:"이재명",cls:"I반",p:[]},
  {name:"강유라",cls:"I반",p:[]},{name:"전형록",cls:"I반",p:[]},
  {name:"조준영",cls:"I반",p:[]},{name:"김대민",cls:"I반",p:[]},
  {name:"신재",cls:"I반",p:[]},{name:"김고은",cls:"I반",p:[]},
  {name:"임승유",cls:"I반",p:[]},
  // ── J반 (이서연, 일 14시) ────────────────────
  {name:"최호영",cls:"J반",p:[]},{name:"박태우",cls:"J반",p:[]},
  {name:"홍유진",cls:"J반",p:[]},{name:"박상진",cls:"J반",p:[]},
  {name:"배연주",cls:"J반",p:[]},{name:"이성준",cls:"J반",p:[]},
  {name:"김성민",cls:"J반",p:[]},{name:"김동희",cls:"J반",p:[]},
  // ── K반 (이서연, 일 19시) 2·3교시 남음 ──────
  {name:"홍성주",cls:"K반",p:["s1"]},{name:"엄희용",cls:"K반",p:["s1"]},
  {name:"허동호",cls:"K반",p:["s1"]},{name:"김현준",cls:"K반",p:["s1"]},
  {name:"박준례",cls:"K반",p:["s1"]},{name:"한혜림",cls:"K반",p:["s1"]},
  {name:"홍기",cls:"K반",p:["s1"]},{name:"곽준걸",cls:"K반",p:["s1"]},
  {name:"배은경",cls:"K반",p:["s1","s2"]},  // 3남음→s1,s2합격
  {name:"김규현",cls:"K반",p:["s1"]},
  // ── L반 (이영미, 일 19시) ────────────────────
  {name:"조고문이",cls:"L반",p:[]},{name:"심경환",cls:"L반",p:[]},
  {name:"심원보",cls:"L반",p:[]},{name:"이영복",cls:"L반",p:[]},
  {name:"권순태",cls:"L반",p:[]},{name:"유재인",cls:"L반",p:[]},
  {name:"박성준",cls:"L반",p:["s1"]},{name:"박준태",cls:"L반",p:[]},
  {name:"정아영",cls:"L반",p:["s1"]},{name:"김소원",cls:"L반",p:["s1"]},
  // ── M반 (전재환, 월 14시) ────────────────────
  {name:"김경특",cls:"M반",p:["s1"]},{name:"박정은",cls:"M반",p:[]},
  {name:"배병언",cls:"M반",p:[]},{name:"안희라",cls:"M반",p:[]},
  {name:"김중운",cls:"M반",p:["s1"]},{name:"강현일",cls:"M반",p:[]},
  {name:"권익모",cls:"M반",p:[]},{name:"신나라",cls:"M반",p:[]},
  // ── N반 (신민철, 월 14시) ────────────────────
  {name:"정지혜",cls:"N반",p:[]},{name:"한해정",cls:"N반",p:[]},
  {name:"신혜윤",cls:"N반",p:[]},{name:"조중원",cls:"N반",p:["s1"]},
  {name:"김수정",cls:"N반",p:[]},{name:"황유정",cls:"N반",p:[]},
  {name:"권준호",cls:"N반",p:[]},{name:"이정희",cls:"N반",p:[]},
  {name:"박아름",cls:"N반",p:[]},{name:"김종문",cls:"N반",p:["s1"]},
  // ── O반 (신민철, 월 19시) ────────────────────
  {name:"임은지",cls:"O반",p:[]},{name:"김민준",cls:"O반",p:[]},
  {name:"김해리",cls:"O반",p:[]},{name:"이시원",cls:"O반",p:[]},
  {name:"정유정",cls:"O반",p:[]},{name:"진평화",cls:"O반",p:[]},
  {name:"이승현",cls:"O반",p:[]},{name:"이영훈",cls:"O반",p:[]},
  {name:"강우석",cls:"O반",p:[]},{name:"최성관",cls:"O반",p:[]},
  // ── P반 (이서연, 월 19시) ────────────────────
  {name:"서보혁",cls:"P반",p:[]},{name:"이준성",cls:"P반",p:[]},
  {name:"박재희",cls:"P반",p:[]},{name:"김지은",cls:"P반",p:[]},
  {name:"김찬",cls:"P반",p:[]},{name:"김태경",cls:"P반",p:[]},
  {name:"최순민",cls:"P반",p:[]},{name:"송승후",cls:"P반",p:[]},
  {name:"한현직",cls:"P반",p:[]},{name:"김진홍",cls:"P반",p:[]},
  // ── Q반 (최유정, 화 19시) ────────────────────
  {name:"손용훈",cls:"Q반",p:[]},{name:"임재형",cls:"Q반",p:[]},
  {name:"조한슬",cls:"Q반",p:[]},{name:"박용범",cls:"Q반",p:[]},
  {name:"최문기",cls:"Q반",p:[]},{name:"정유라",cls:"Q반",p:[]},
  {name:"심상호",cls:"Q반",p:[]},{name:"한종",cls:"Q반",p:[]},
  {name:"류주희",cls:"Q반",p:[]},{name:"강효상",cls:"Q반",p:["s1"]},
  // ── R반 (이서연, 일 9시) ─────────────────────
  {name:"이용재",cls:"R반",p:[]},{name:"최원재",cls:"R반",p:[]},
  {name:"연대광",cls:"R반",p:[]},{name:"류재일",cls:"R반",p:[]},
  {name:"서석량",cls:"R반",p:[]},{name:"윤연철",cls:"R반",p:[]},
  {name:"이승현",cls:"R반",p:[]},{name:"김병찬",cls:"R반",p:[]},
  {name:"김충호",cls:"R반",p:[]},
  // ── S반 (이영미, 일 14시) ────────────────────
  {name:"권혁만",cls:"S반",p:["s2"]},    // 13남음→s2합격
  {name:"김태형",cls:"S반",p:["s1","s2"]}, // 3남음→s1,s2합격
  {name:"권수연",cls:"S반",p:["s2"]},
  {name:"김태로",cls:"S반",p:["s2","s3"]}, // 1남음→s2,s3합격
  {name:"현진",cls:"S반",p:["s2"]},
  {name:"안세은",cls:"S반",p:["s2","s3"]},
  {name:"이종문",cls:"S반",p:["s1","s2"]},
  // ── U반 (이서연, 화 19시) ────────────────────
  {name:"임은주",cls:"U반",p:[]},{name:"김민지",cls:"U반",p:[]},
  {name:"최나혹",cls:"U반",p:[]},{name:"김도연",cls:"U반",p:[]},
  {name:"황현",cls:"U반",p:["s1"]},{name:"김미진",cls:"U반",p:["s2","s3"]},
  {name:"윤민속",cls:"U반",p:[]},{name:"강용구",cls:"U반",p:[]},
  // ── V반 (신민철, 수 9시) ─────────────────────
  {name:"정용국",cls:"V반",p:[]},{name:"최준우",cls:"V반",p:[]},
  {name:"김선재",cls:"V반",p:[]},{name:"윤다희",cls:"V반",p:[]},
  {name:"송원길",cls:"V반",p:[]},{name:"정윤환",cls:"V반",p:[]},
  {name:"김재완",cls:"V반",p:[]},{name:"고연진",cls:"V반",p:[]},
  {name:"이다연",cls:"V반",p:[]},{name:"이지홍",cls:"V반",p:[]},
  // ── 개인과외 (월) ─────────────────────────────
  {name:"고자경",cls:"개인과외",p:[]},{name:"고금영",cls:"개인과외",p:[]},
  {name:"주혜림",cls:"개인과외",p:[]},{name:"이상민",cls:"개인과외",p:[]},
  {name:"양수지",cls:"개인과외",p:[]},{name:"곽은정",cls:"개인과외",p:[]},
  {name:"유현준",cls:"개인과외",p:[]},{name:"윤서희",cls:"개인과외",p:[]},
  {name:"김성준",cls:"개인과외",p:[]},
]


// ── 담당 건축사 기본 매핑 ─────────────────────────────
const DEFAULT_TEACHERS = {
  "A반":"신민철","B반":"이서연","C반":"전재환","D반":"이유정",
  "E반":"전재환","F반":"최유정","G반":"전재환","H반":"이영미",
  "I반":"전재환","J반":"이서연","K반":"이서연","L반":"이영미",
  "M반":"전재환","N반":"신민철","O반":"신민철","P반":"이서연",
  "Q반":"최유정","R반":"이서연","S반":"이영미","U반":"이서연",
  "V반":"신민철","개인과외":"조소민/배기태/신민철",
};

const getAllSubIds = () => SESSIONS.flatMap(s=>s.subjects.map(sub=>sub.id));

// ═══════════════════════════════════════════════════
//  데이터 팩토리
// ═══════════════════════════════════════════════════
const makeSubData = () => ({
  hw:{},
  mid:{ plan:"", work:"", rank:"" },
  final:{ plan:"", work:"", rank:"" },
  mocks:[], // [{type, plan, work, rank, drawingUrl, memo, date}]
  comment:"",
});

const makeStudent = (id, name="새 수강생") => ({
  id: String(id),
  info:{ className:"A반", name, birthYear:"", isPreArch:false, isWorking:false, passedSessions:[], goal:"", memo:"" },
  attend: {}, // 출석은 수강생 전체 공통 (과목 무관)
  subjects: Object.fromEntries(getAllSubIds().map(sid=>[sid, makeSubData()])),
});

// ═══════════════════════════════════════════════════
//  유틸
// ═══════════════════════════════════════════════════
const pct = (v,t) => t===0?0:Math.round((v/t)*100);
const gCol = g => ({A:C.success,B:C.blue,C:C.warn,D:C.warn,F:C.danger}[g]||C.textLight);
const calcHw = sd => { let n=0; HW_TYPES.forEach(t=>{ for(let i=0;i<t.count;i++) if(sd?.hw?.[t.id]?.[i]) n++; }); return n; };
const calcAttend = sd => {
  let out=0,absent=0,late=0;
  WEEKS.forEach(w=>{ const s=sd?.attend?.[w]; if(s==="출석")out++; else if(s==="결석")absent++; else if(s==="지각")late++; });
  return {out,absent,late,total:WEEKS.length};
};
const isPassed = (subId, info) =>
  SESSIONS.some(sess=>(info?.passedSessions||[]).includes(sess.id)&&sess.subjects.some(s=>s.id===subId));
const countExaminees = (students, sessId) =>
  students.filter(s=>!(s.info.passedSessions||[]).includes(sessId)).length;
const subName = sid => SESSIONS.flatMap(s=>s.subjects).find(s=>s.id===sid)?.name||sid;
const sessOfSub = sid => SESSIONS.find(s=>s.subjects.some(sub=>sub.id===sid));

// 수강생 종합 점수 (석차 산정용)
const calcTotalScore = (student, sessId) => {
  const subIds = SESSIONS.find(s=>s.id===sessId)?.subjects.map(s=>s.id)||[];
  let score = 0;
  subIds.forEach(sid => {
    const sd = student.subjects[sid];
    score += (GS[sd?.final?.plan]||0) + (GS[sd?.final?.work]||0);
    score += (GS[sd?.mid?.plan]||0)*0.5 + (GS[sd?.mid?.work]||0)*0.5;
  });
  return score;
};

// ═══════════════════════════════════════════════════
//  소형 컴포넌트
// ═══════════════════════════════════════════════════
const ProgressBar = ({value,color=C.blue,height=8,label}) => (
  <div>
    {label&&<div style={{display:"flex",justifyContent:"space-between",marginBottom:4,fontSize:12,color:C.textMid}}>
      <span>{label}</span><span style={{fontWeight:700,color}}>{value}%</span>
    </div>}
    <div style={{background:C.border,borderRadius:99,height,overflow:"hidden"}}>
      <div style={{width:`${value}%`,height:"100%",background:color,borderRadius:99,transition:"width .4s ease"}}/>
    </div>
  </div>
);

const DonutChart = ({value,total,color=C.blue,size=120,label}) => {
  const pv=pct(value,total);
  return (
    <div style={{textAlign:"center"}}>
      <div style={{position:"relative",width:size,height:size,margin:"0 auto"}}>
        <PieChart width={size} height={size}>
          <Pie data={[{v:pv},{v:100-pv}]} dataKey="v" innerRadius={size*.35} outerRadius={size*.47} startAngle={90} endAngle={-270} strokeWidth={0}>
            <Cell fill={color}/><Cell fill={C.border}/>
          </Pie>
        </PieChart>
        <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
          <span style={{fontSize:size*.19,fontWeight:800,color}}>{pv}%</span>
          <span style={{fontSize:size*.1,color:C.textLight}}>완료</span>
        </div>
      </div>
      {label&&<div style={{marginTop:6,fontSize:12,fontWeight:600,color:C.textMid}}>{label}</div>}
    </div>
  );
};

const SecTitle = ({children}) => (
  <div style={{fontSize:15,fontWeight:800,color:C.navy,marginBottom:18,display:"flex",alignItems:"center",gap:8}}>
    {children}<div style={{flex:1,height:1,background:C.border,marginLeft:8}}/>
  </div>
);

const Badge = ({children,color=C.blue,bg}) => (
  <span style={{display:"inline-flex",alignItems:"center",background:bg||color+"18",color,borderRadius:6,padding:"2px 7px",fontSize:10,fontWeight:700}}>{children}</span>
);

const Toggle = ({value,onChange,label}) => (
  <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}}>
    <div onClick={()=>onChange(!value)} style={{width:40,height:22,borderRadius:11,background:value?C.blue:C.border,position:"relative",transition:"background .2s",cursor:"pointer",flexShrink:0}}>
      <div style={{position:"absolute",top:3,left:value?20:3,width:16,height:16,borderRadius:"50%",background:"#fff",transition:"left .2s"}}/>
    </div>
    <span style={{fontSize:13,color:value?C.blue:C.textMid,fontWeight:value?700:400}}>{label}</span>
  </label>
);

const GradeSelect = ({value,onChange,label}) => (
  <div style={{display:"flex",flexDirection:"column",gap:4}}>
    <label style={{fontSize:11,fontWeight:600,color:C.textMid}}>{label}</label>
    <select value={value} onChange={e=>onChange(e.target.value)} style={{padding:"7px 10px",borderRadius:8,border:`1.5px solid ${value?gCol(value):C.border}`,fontSize:14,fontWeight:700,color:value?gCol(value):C.textLight,background:value?gCol(value)+"12":C.card,cursor:"pointer",outline:"none"}}>
      <option value="">등급</option>
      {GRADES.map(g=><option key={g} value={g}>{g}</option>)}
    </select>
  </div>
);

// ═══════════════════════════════════════════════════
//  도면 업로드 컴포넌트
// ═══════════════════════════════════════════════════
const DrawingUpload = ({studentId, subjectId, examKey, url, onUpload}) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(url||"");
  const [lightbox, setLightbox] = useState(false);

  const handle = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // 로컬 미리보기
    const reader = new FileReader();
    reader.onload = ev => setPreview(ev.target.result);
    reader.readAsDataURL(file);
    // Supabase Storage 업로드
    setUploading(true);
    try {
      const path = `${studentId}/${subjectId}/${examKey}_${Date.now()}.${file.name.split('.').pop()}`;
      const uploadedUrl = await sb.uploadImage(file, path);
      onUpload(uploadedUrl);
    } catch(err) {
      console.warn("Storage 업로드 실패 (로컬 미리보기로 대체):", err.message);
      onUpload(preview); // fallback: base64로 저장
    }
    setUploading(false);
  };

  return (
    <div>
      <div style={{fontSize:11,fontWeight:600,color:C.textMid,marginBottom:6}}>📐 도면 업로드</div>
      {preview ? (
        <div style={{position:"relative",display:"inline-block"}}>
          <img src={preview} alt="도면" onClick={()=>setLightbox(true)}
            style={{width:"100%",maxWidth:240,borderRadius:8,border:`2px solid ${C.border}`,cursor:"zoom-in",objectFit:"cover",height:140}}/>
          <div style={{position:"absolute",top:4,right:4,display:"flex",gap:4}}>
            <label style={{background:C.blue,color:"#fff",borderRadius:6,padding:"4px 8px",fontSize:10,fontWeight:700,cursor:"pointer"}}>
              교체<input type="file" accept="image/*,application/pdf" onChange={handle} style={{display:"none"}}/>
            </label>
            <button onClick={()=>{setPreview("");onUpload("");}}
              style={{background:C.danger,color:"#fff",border:"none",borderRadius:6,padding:"4px 8px",fontSize:10,fontWeight:700,cursor:"pointer"}}>삭제</button>
          </div>
          {uploading && <div style={{position:"absolute",inset:0,background:"#00000066",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:12}}>업로드 중…</div>}
        </div>
      ) : (
        <label style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:6,
          width:"100%",height:90,border:`2px dashed ${C.border}`,borderRadius:10,cursor:"pointer",
          background:C.bg,transition:"border-color .15s"}}
          onMouseEnter={e=>e.currentTarget.style.borderColor=C.blue}
          onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
          <span style={{fontSize:24}}>📐</span>
          <span style={{fontSize:11,color:C.textMid}}>{uploading?"업로드 중…":"클릭하여 도면 업로드"}</span>
          <input type="file" accept="image/*" onChange={handle} style={{display:"none"}}/>
        </label>
      )}
      {/* 라이트박스 */}
      {lightbox && (
        <div onClick={()=>setLightbox(false)}
          style={{position:"fixed",inset:0,background:"#000000CC",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <img src={preview} alt="도면 확대" style={{maxWidth:"95vw",maxHeight:"90vh",borderRadius:12,objectFit:"contain"}}/>
          <button onClick={()=>setLightbox(false)}
            style={{position:"absolute",top:20,right:20,background:"#fff",border:"none",borderRadius:"50%",width:36,height:36,fontSize:20,cursor:"pointer"}}>×</button>
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════
//  인적사항 폼
// ═══════════════════════════════════════════════════
const InfoForm = ({info,onChange,customClasses=[]}) => {
  const upd=(k,v)=>onChange({...info,[k]:v});
  const toggleSess=sid=>{
    const cur=info.passedSessions||[];
    upd("passedSessions",cur.includes(sid)?cur.filter(s=>s!==sid):[...cur,sid]);
  };
  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:12}}>
        {[["반","className"],["이름","name"],["년생","birthYear"]].map(([lbl,key])=>(
          <div key={key}>
            <label style={{fontSize:11,fontWeight:600,color:C.textMid,display:"block",marginBottom:5}}>{lbl}</label>
            {key==="className"
              ? <select value={info[key]} onChange={e=>upd(key,e.target.value)}
                  style={{width:"100%",padding:"9px 12px",borderRadius:9,border:`1.5px solid ${C.border}`,fontSize:13,outline:"none"}}>
                  {[...CLASSES,...customClasses.filter(c=>!CLASSES.includes(c))].map(c=><option key={c}>{c}</option>)}
                </select>
              : <input value={info[key]||""} onChange={e=>upd(key,e.target.value)} placeholder={lbl==="년생"?"예: 92년생":lbl}
                  style={{width:"100%",padding:"9px 12px",borderRadius:9,border:`1.5px solid ${C.border}`,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
            }
          </div>
        ))}
      </div>
      <div style={{display:"flex",gap:24,flexWrap:"wrap"}}>
        <Toggle value={info.isPreArch||false} onChange={v=>upd("isPreArch",v)} label="예비건축사"/>
        <Toggle value={info.isWorking||false} onChange={v=>upd("isWorking",v)} label="재직 중"/>
      </div>
      <div>
        <label style={{fontSize:11,fontWeight:600,color:C.textMid,display:"block",marginBottom:5}}>합격 목표</label>
        <input value={info.goal||""} onChange={e=>upd("goal",e.target.value)} placeholder="예: 2026년 건축사 합격"
          style={{width:"100%",padding:"9px 12px",borderRadius:9,border:`1.5px solid ${C.border}`,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
      </div>
      <div>
        <div style={{fontSize:11,fontWeight:600,color:C.textMid,marginBottom:8}}>기존 합격 과목 (해당 교시 평가 자동 제외)</div>
        <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
          {SESSIONS.map(sess=>{
            const passed=(info.passedSessions||[]).includes(sess.id);
            return (
              <button key={sess.id} onClick={()=>toggleSess(sess.id)} style={{
                padding:"8px 18px",borderRadius:10,border:`2px solid ${passed?C.passed:C.border}`,
                background:passed?C.passed+"18":C.card,color:passed?C.passed:C.textMid,
                fontWeight:700,cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",gap:6}}>
                {passed&&"✓ "}{sess.label}{passed&&<Badge color={C.passed}>합격</Badge>}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <label style={{fontSize:11,fontWeight:600,color:C.textMid,display:"block",marginBottom:5}}>담당 선생님 메모</label>
        <textarea value={info.memo||""} onChange={e=>upd("memo",e.target.value)} rows={2} placeholder="수강생 특이사항, 주의사항 등..."
          style={{width:"100%",padding:"9px 12px",borderRadius:9,border:`1.5px solid ${C.border}`,fontSize:13,outline:"none",resize:"vertical",fontFamily:"inherit",boxSizing:"border-box"}}/>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════
//  숙제 아코디언
// ═══════════════════════════════════════════════════
const HwAccordion = ({subjectId,subjectData,onToggle}) => {
  const [open,setOpen]=useState({});
  return (
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      {HW_TYPES.map(type=>{
        const done=Array.from({length:type.count},(_,i)=>subjectData?.hw?.[type.id]?.[i]).filter(Boolean).length;
        const isOpen=open[type.id];
        return (
          <div key={type.id} style={{border:`1px solid ${C.border}`,borderRadius:10,overflow:"hidden"}}>
            <button onClick={()=>setOpen(p=>({...p,[type.id]:!p[type.id]}))} style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",background:isOpen?C.navy:C.card,border:"none",cursor:"pointer"}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{background:isOpen?C.accent:C.bg,color:isOpen?C.navy:C.blue,borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:700}}>{type.count}문제</span>
                <span style={{fontWeight:700,color:isOpen?"#fff":C.text,fontSize:14}}>{type.name}</span>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <span style={{fontSize:12,color:isOpen?C.accentSoft:C.textLight}}>{done}/{type.count}</span>
                <span style={{color:isOpen?C.accent:C.textLight,fontSize:18,transform:isOpen?"rotate(180deg)":"none",transition:"transform .2s"}}>▾</span>
              </div>
            </button>
            {isOpen&&(
              <div style={{padding:"12px 14px",background:"#FAFBFE",
                display:"grid",
                gridTemplateColumns: type.id==="기출"
                  ? "repeat(auto-fill,minmax(110px,1fr))"
                  : "repeat(auto-fill,minmax(76px,1fr))",
                gap:8}}>
                {Array.from({length:type.count},(_,i)=>{
                  const checked=!!subjectData?.hw?.[type.id]?.[i];
                  const label = type.id==="기출"
                    ? GICHUL_ITEMS[i]
                    : `${i+1}번`;
                  // 기출: 연도 그룹 (2개씩 묶기 위한 구분선)
                  const isYearStart = type.id==="기출" && i<12 && i%2===0;
                  return (
                    <div key={i} style={{display:"contents"}}>
                      {isYearStart && i>0 && (
                        <div style={{gridColumn:"1/-1",height:1,background:C.border,margin:"2px 0"}}/>
                      )}
                      <button onClick={()=>onToggle(subjectId,type.id,i)} style={{
                        padding:"9px 6px",borderRadius:8,
                        border:`2px solid ${checked?C.blue:C.border}`,
                        background:checked?C.blue:C.card,
                        cursor:"pointer",
                        display:"flex",flexDirection:"column",alignItems:"center",gap:2,
                        transition:"all .15s"}}>
                        <span style={{fontSize:14}}>{checked?"✓":"○"}</span>
                        <span style={{fontSize:type.id==="기출"?10:10,fontWeight:600,
                          color:checked?"#fff":C.textMid,
                          whiteSpace:"nowrap",textAlign:"center",lineHeight:1.3}}>
                          {label}
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ═══════════════════════════════════════════════════
//  출석
// ═══════════════════════════════════════════════════
const AttendSection = ({subjectData,onChange}) => {
  const sCol=s=>s==="출석"?C.success:s==="지각"?C.warn:s==="결석"?C.danger:C.border;
  const next=s=>s==="출석"?"결석":s==="결석"?"지각":"출석";
  // student 레벨 attend 사용 (subjectData = student 객체)
  const attendData = subjectData?.attend || subjectData || {};
  const a=calcAttend(attendData);
  return (
    <div>
      <div style={{display:"flex",gap:12,marginBottom:14,flexWrap:"wrap"}}>
        {[["출석",a.out,C.success],["결석",a.absent,C.danger],["지각",a.late,C.warn]].map(([lbl,cnt,col])=>(
          <div key={lbl} style={{background:col+"12",borderRadius:8,padding:"6px 14px",border:`1px solid ${col}44`}}>
            <span style={{fontSize:11,color:col,fontWeight:700}}>{lbl} {cnt}회</span>
          </div>
        ))}
        <div style={{background:C.bg,borderRadius:8,padding:"6px 14px",border:`1px solid ${C.border}`}}>
          <span style={{fontSize:11,color:C.blue,fontWeight:700}}>출석률 {pct(a.out,20)}%</span>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(68px,1fr))",gap:6}}>
        {WEEKS.map(w=>{
          const s=attendData?.[w]||"";
          return (
            <button key={w} onClick={()=>onChange(w,next(s))} style={{padding:"8px 4px",borderRadius:8,border:`2px solid ${sCol(s)}`,background:s?sCol(s)+"18":C.bg,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
              <span style={{fontSize:10,color:C.textLight}}>{w}주</span>
              <span style={{fontSize:11,fontWeight:700,color:s?sCol(s):C.textLight}}>{s||"—"}</span>
            </button>
          );
        })}
      </div>
      <div style={{display:"flex",gap:16,marginTop:10,fontSize:12,color:C.textMid,flexWrap:"wrap"}}>
        {["출석","결석","지각"].map(s=>(
          <span key={s} style={{display:"flex",alignItems:"center",gap:4}}>
            <span style={{width:8,height:8,borderRadius:"50%",background:sCol(s),display:"inline-block"}}/>{s}
          </span>
        ))}<span style={{color:C.textLight}}>※ 클릭 시 순환</span>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════
//  시험 + 석차 + 도면
// ═══════════════════════════════════════════════════
const ExamSection = ({studentId,subjectId,subjectData,sessionId,students,onChange}) => {
  const total=countExaminees(students,sessionId);
  const upd=(exam,field,val)=>onChange({...subjectData,[exam]:{...(subjectData?.[exam]||{}),[field]:val}});

  const Block=({exam,label})=>{
    const d=subjectData?.[exam]||{};
    const rankNum=parseInt(d.rank)||0;
    return (
      <div style={{background:C.bg,borderRadius:12,padding:16}}>
        <div style={{fontSize:13,fontWeight:700,color:C.navy,marginBottom:12}}>{exam==="mid"?"📋":"🏆"} {label}</div>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <GradeSelect label="계획 점수" value={d.plan||""} onChange={v=>upd(exam,"plan",v)}/>
          <GradeSelect label="작도 점수" value={d.work||""} onChange={v=>upd(exam,"work",v)}/>
          <div>
            <label style={{fontSize:11,fontWeight:600,color:C.textMid,display:"block",marginBottom:5}}>전체 석차</label>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <input type="number" min="1" value={d.rank||""} onChange={e=>upd(exam,"rank",e.target.value)}
                placeholder="등" style={{width:60,padding:"7px 10px",borderRadius:8,border:`1.5px solid ${C.border}`,fontSize:14,fontWeight:700,color:C.navy,textAlign:"center",outline:"none"}}/>
              <span style={{fontSize:13,color:C.textMid}}>등 / <strong style={{color:C.blue}}>{total}</strong>명</span>
            </div>
            {rankNum>0&&(
              <div style={{marginTop:5,fontSize:11,color:C.textLight,display:"flex",alignItems:"center",gap:6}}>
                상위 {pct(rankNum,total)}%
                {rankNum<=Math.ceil(total*.1)&&<Badge color={C.accent} bg={C.accentSoft}>🏅 상위 10%</Badge>}
                {rankNum===1&&<Badge color={C.success}>🥇 1등!</Badge>}
              </div>
            )}
          </div>
          <DrawingUpload
            studentId={studentId} subjectId={subjectId} examKey={exam}
            url={d.drawingUrl||""}
            onUpload={url=>upd(exam,"drawingUrl",url)}
          />
        </div>
      </div>
    );
  };
  return (
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:16}}>
      <Block exam="mid" label="중간고사"/>
      <Block exam="final" label="기말고사"/>
    </div>
  );
};

// ═══════════════════════════════════════════════════
//  모의고사 섹션
// ═══════════════════════════════════════════════════
const MockSection = ({studentId,subjectId,subjectData,sessionId,students,onChange}) => {
  const mocks = subjectData?.mocks||[];
  const total = countExaminees(students, sessionId);

  const addMock = () => {
    const newMock = { id:Date.now(), type:MOCK_TYPES[mocks.length%MOCK_TYPES.length], plan:"", work:"", rank:"", drawingUrl:"", memo:"", date:new Date().toLocaleDateString("ko-KR") };
    onChange({...subjectData, mocks:[...mocks, newMock]});
  };

  const updMock = (idx,field,val) => {
    const updated = mocks.map((m,i)=>i===idx?{...m,[field]:val}:m);
    onChange({...subjectData, mocks:updated});
  };

  const delMock = (idx) => {
    onChange({...subjectData, mocks:mocks.filter((_,i)=>i!==idx)});
  };

  return (
    <div>
      <div style={{display:"flex",gap:12,marginBottom:16,flexWrap:"wrap"}}>
        {mocks.map((m,idx)=>(
          <div key={m.id||idx} style={{background:C.card,borderRadius:12,padding:16,border:`1.5px solid ${C.border}`,minWidth:200,flex:"1 1 200px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <select value={m.type} onChange={e=>updMock(idx,"type",e.target.value)}
                style={{fontSize:13,fontWeight:700,color:C.navy,border:"none",background:"transparent",cursor:"pointer",outline:"none"}}>
                {MOCK_TYPES.map(t=><option key={t}>{t}</option>)}
              </select>
              <button onClick={()=>delMock(idx)} style={{background:"none",border:"none",cursor:"pointer",color:C.textLight,fontSize:16}}>×</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
              <GradeSelect label="계획" value={m.plan||""} onChange={v=>updMock(idx,"plan",v)}/>
              <GradeSelect label="작도" value={m.work||""} onChange={v=>updMock(idx,"work",v)}/>
            </div>
            <div style={{marginBottom:8}}>
              <label style={{fontSize:11,fontWeight:600,color:C.textMid,display:"block",marginBottom:4}}>석차</label>
              <div style={{display:"flex",alignItems:"center",gap:4}}>
                <input type="number" value={m.rank||""} onChange={e=>updMock(idx,"rank",e.target.value)}
                  placeholder="등" style={{width:55,padding:"6px 8px",borderRadius:7,border:`1.5px solid ${C.border}`,fontSize:13,textAlign:"center",outline:"none"}}/>
                <span style={{fontSize:12,color:C.textMid}}>/ {total}명</span>
              </div>
            </div>
            <DrawingUpload
              studentId={studentId} subjectId={subjectId} examKey={`mock_${idx}`}
              url={m.drawingUrl||""}
              onUpload={url=>updMock(idx,"drawingUrl",url)}
            />
            <textarea value={m.memo||""} onChange={e=>updMock(idx,"memo",e.target.value)}
              placeholder="피드백 메모..." rows={2}
              style={{width:"100%",marginTop:8,padding:"7px 10px",borderRadius:8,border:`1.5px solid ${C.border}`,fontSize:12,resize:"vertical",fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}/>
            <div style={{fontSize:10,color:C.textLight,marginTop:4}}>{m.date}</div>
          </div>
        ))}
      </div>
      <button onClick={addMock} style={{background:C.card,border:`2px dashed ${C.blue}`,borderRadius:10,padding:"10px 20px",color:C.blue,fontWeight:700,cursor:"pointer",fontSize:13}}>
        + 모의고사 추가
      </button>
    </div>
  );
};

// ═══════════════════════════════════════════════════
//  전체 석차 뷰
// ═══════════════════════════════════════════════════
const RankingsView = ({students, onClose}) => {
  const [activeSess, setActiveSess] = useState("s1");
  const [sortBy, setSortBy] = useState("final");

  const sess = SESSIONS.find(s=>s.id===activeSess);
  const subIds = sess?.subjects.map(s=>s.id)||[];

  const ranked = students
    .filter(s=>!(s.info.passedSessions||[]).includes(activeSess))
    .map(s=>{
      const finalScore = subIds.reduce((acc,sid)=>{
        return acc + (GS[s.subjects[sid]?.final?.plan]||0) + (GS[s.subjects[sid]?.final?.work]||0);
      },0);
      const midScore = subIds.reduce((acc,sid)=>{
        return acc + (GS[s.subjects[sid]?.mid?.plan]||0) + (GS[s.subjects[sid]?.mid?.work]||0);
      },0);
      const hwPct = pct(
        subIds.reduce((acc,sid)=>acc+calcHw(s.subjects[sid]),0),
        HW_TOTAL*subIds.length
      );
      const attendPct = pct(
        subIds.reduce((acc,sid)=>acc+calcAttend(s.subjects[sid]).out,0),
        20*subIds.length
      );
      return { student:s, finalScore, midScore, hwPct, attendPct };
    })
    .sort((a,b)=>sortBy==="final"?b.finalScore-a.finalScore:sortBy==="mid"?b.midScore-a.midScore:sortBy==="hw"?b.hwPct-a.hwPct:b.attendPct-a.attendPct);

  const maxFinal = Math.max(...ranked.map(r=>r.finalScore), 1);

  return (
    <div style={{position:"fixed",inset:0,background:"#000000AA",zIndex:998,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:C.card,borderRadius:16,width:"100%",maxWidth:760,maxHeight:"90vh",overflow:"auto",boxShadow:"0 20px 60px #0008"}}>
        {/* 헤더 */}
        <div style={{background:C.navy,borderRadius:"16px 16px 0 0",padding:"20px 24px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <div style={{fontSize:18,fontWeight:900,color:"#fff"}}>🏆 전체 석차</div>
            <div style={{fontSize:12,color:C.accent,marginTop:2}}>응시자 {ranked.length}명</div>
          </div>
          <button onClick={onClose} style={{background:"#ffffff22",border:"none",borderRadius:8,color:"#fff",padding:"6px 14px",cursor:"pointer",fontWeight:700}}>닫기</button>
        </div>

        <div style={{padding:24}}>
          {/* 교시 탭 */}
          <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
            {SESSIONS.map(s=>(
              <button key={s.id} onClick={()=>setActiveSess(s.id)} style={{padding:"7px 16px",borderRadius:9,border:`1.5px solid ${activeSess===s.id?C.blue:C.border}`,background:activeSess===s.id?C.blue:C.card,color:activeSess===s.id?"#fff":C.textMid,fontWeight:700,cursor:"pointer",fontSize:13}}>
                {s.label}
              </button>
            ))}
          </div>

          {/* 정렬 */}
          <div style={{display:"flex",gap:8,marginBottom:20,flexWrap:"wrap"}}>
            {[["final","기말 성적"],["mid","중간 성적"],["hw","숙제"],["attend","출석"]].map(([k,lbl])=>(
              <button key={k} onClick={()=>setSortBy(k)} style={{padding:"5px 12px",borderRadius:7,border:`1.5px solid ${sortBy===k?C.accent:C.border}`,background:sortBy===k?C.accentSoft:C.bg,color:sortBy===k?C.navy:C.textMid,fontWeight:sortBy===k?700:400,cursor:"pointer",fontSize:12}}>
                {lbl} 순
              </button>
            ))}
          </div>

          {/* 석차 리스트 */}
          {ranked.length === 0 ? (
            <div style={{textAlign:"center",padding:"40px 0",color:C.textLight}}>응시 수강생이 없습니다</div>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {ranked.map((r,i)=>{
                const s = r.student;
                const medal = i===0?"🥇":i===1?"🥈":i===2?"🥉":"";
                const rankColor = i===0?C.accent:i===1?"#94A3B8":i===2?"#CD7C2F":C.textMid;
                return (
                  <div key={s.id} style={{background:i<3?rankColor+"10":C.bg,borderRadius:12,padding:"14px 16px",border:`1.5px solid ${i<3?rankColor+"44":C.border}`,display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
                    {/* 순위 */}
                    <div style={{width:36,height:36,borderRadius:"50%",background:i<3?rankColor:C.border,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      {medal ? <span style={{fontSize:18}}>{medal}</span>
                        : <span style={{fontSize:14,fontWeight:900,color:"#fff"}}>{i+1}</span>}
                    </div>
                    {/* 이름 */}
                    <div style={{minWidth:80}}>
                      <div style={{fontWeight:800,fontSize:14,color:C.navy}}><span style={{fontSize:11,color:C.textLight,marginRight:4}}>{s.info.className}</span>{s.info.name}</div>
                      {s.info.birthYear&&<div style={{fontSize:10,color:C.textLight}}>{s.info.birthYear}</div>}
                    </div>
                    {/* 성적 바 */}
                    <div style={{flex:1,minWidth:120}}>
                      <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:C.textMid,marginBottom:3}}>
                        <span>기말 {r.finalScore}/{subIds.length*10}점</span>
                        <span>중간 {r.midScore}점</span>
                      </div>
                      <div style={{background:C.border,borderRadius:99,height:6,overflow:"hidden"}}>
                        <div style={{width:`${pct(r.finalScore,maxFinal)}%`,height:"100%",background:i<3?rankColor:C.blue,borderRadius:99}}/>
                      </div>
                    </div>
                    {/* 숙제/출석 */}
                    <div style={{display:"flex",gap:8}}>
                      <Badge color={r.hwPct>=80?C.success:r.hwPct>=50?C.warn:C.danger}>숙제 {r.hwPct}%</Badge>
                      <Badge color={r.attendPct>=80?C.success:C.warn}>출석 {r.attendPct}%</Badge>
                    </div>
                    {/* 과목별 등급 */}
                    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                      {subIds.map(sid=>{
                        const sd=s.subjects[sid];
                        return sd?.final?.plan&&(
                          <div key={sid} style={{fontSize:10,color:C.textMid,textAlign:"center"}}>
                            <div style={{fontSize:9,color:C.textLight}}>{subName(sid).replace("문제","")}</div>
                            <span style={{color:gCol(sd.final.plan),fontWeight:700}}>{sd.final.plan}</span>
                            <span style={{color:C.textLight}}>/</span>
                            <span style={{color:gCol(sd.final.work),fontWeight:700}}>{sd.final.work}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════
//  결과서
// ═══════════════════════════════════════════════════
const ReportView = ({student,students,onBack,onShare}) => {
  const info=student.info;
  const allSubIds=getAllSubIds().filter(sid=>!isPassed(sid,info));

  const hwStats=allSubIds.map(sid=>({ sid, name:subName(sid), done:calcHw(student.subjects[sid]), p:pct(calcHw(student.subjects[sid]),HW_TOTAL) }));
  const totalDone=hwStats.reduce((s,h)=>s+h.done,0);
  const totalPoss=HW_TOTAL*allSubIds.length;

  const attendA = calcAttend(student.attend||{});
  const attendPctVal = pct(attendA.out, attendA.total);

  const barData=allSubIds.map(sid=>{
    const sd=student.subjects[sid];
    return { name:subName(sid).replace("문제",""), "중간(계획)":GS[sd.mid?.plan]||0,"중간(작도)":GS[sd.mid?.work]||0,"기말(계획)":GS[sd.final?.plan]||0,"기말(작도)":GS[sd.final?.work]||0 };
  });

  // 모의고사 추이
  const mockTrend = allSubIds.flatMap(sid=>{
    const mocks=student.subjects[sid]?.mocks||[];
    return mocks.map((m,i)=>({ name:`${subName(sid).replace("문제","")} ${m.type}`, 계획:GS[m.plan]||0, 작도:GS[m.work]||0 }));
  });

  return (
    <div className="report-root" style={{maxWidth:920,margin:"0 auto",fontFamily:"'Noto Sans KR',sans-serif"}}>
      <style>{`@media print{.no-print{display:none!important}body{background:white!important}}`}</style>

      <div className="no-print" style={{display:"flex",gap:10,marginBottom:20,flexWrap:"wrap"}}>
        <button onClick={onBack} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 18px",cursor:"pointer",fontWeight:600,color:C.navy,fontSize:13}}>← 입력 화면</button>
        <button onClick={onShare} style={{background:C.blue,color:"#fff",border:"none",borderRadius:8,padding:"8px 18px",fontWeight:700,cursor:"pointer",fontSize:13}}>📤 공유</button>
        <button onClick={()=>window.print()} style={{background:C.navy,color:"#fff",border:"none",borderRadius:8,padding:"8px 18px",fontWeight:700,cursor:"pointer",fontSize:13}}>🖨️ 인쇄/PDF</button>
      </div>

      {/* 헤더 */}
      <div style={{background:C.navy,borderRadius:16,padding:"30px 36px",marginBottom:20,color:"#fff",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",right:30,top:20,width:130,height:130,borderRadius:"50%",background:C.accent+"20",border:`2px solid ${C.accent}40`}}/>
        <div style={{fontSize:10,letterSpacing:4,color:C.accent,marginBottom:6,fontWeight:700}}>SHINJEON SQUARE · 신전스퀘어</div>
        <div style={{fontSize:20,fontWeight:800,marginBottom:2}}>건축사 자격시험 수강생</div>
        <div style={{fontSize:26,fontWeight:900,color:C.accent}}>학업 성취 결과서</div>
        <div style={{marginTop:22,display:"flex",flexWrap:"wrap",gap:16}}>
          <div style={{background:"#ffffff12",borderRadius:12,padding:"14px 20px",minWidth:200}}>
            <div style={{fontSize:20,fontWeight:900}}>{info.className} {info.name}</div>
            {info.birthYear&&<div style={{fontSize:13,color:"#b0bcd4",marginTop:2}}>{info.birthYear}</div>}
            {info.goal&&<div style={{fontSize:12,color:C.accent,marginTop:4}}>🎯 {info.goal}</div>}
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:8}}>
              {info.isPreArch&&<Badge color={C.accent} bg={C.accent+"30"}>예비건축사</Badge>}
              {info.isWorking&&<Badge color="#60A5FA" bg="#60A5FA30">재직 중</Badge>}
              {(info.passedSessions||[]).map(sid=>{ const n=SESSIONS.find(s=>s.id===sid)?.label||sid; return <Badge key={sid} color={C.passed} bg={C.passed+"30"}>{n} 합격</Badge>; })}
            </div>
          </div>
          <div style={{fontSize:12,color:"#6880a0",marginTop:"auto"}}>출력일: {new Date().toLocaleDateString("ko-KR")}</div>
        </div>
      </div>

      {/* 숙제 */}
      <div style={{background:C.card,borderRadius:16,padding:28,marginBottom:20,border:`1px solid ${C.border}`}}>
        <SecTitle>📚 숙제 이행률</SecTitle>
        <div style={{display:"flex",flexWrap:"wrap",gap:24,alignItems:"center",marginBottom:20}}>
          <DonutChart value={totalDone} total={totalPoss} color={C.blue} size={130} label="전체 달성률"/>
          <div style={{flex:1,minWidth:180,display:"flex",flexDirection:"column",gap:10}}>
            {hwStats.map(h=><ProgressBar key={h.sid} label={h.name} value={h.p} color={h.p>=80?C.success:h.p>=50?C.warn:C.danger}/>)}
          </div>
        </div>
        <div style={{background:C.bg,borderRadius:10,padding:"10px 16px",fontSize:13,color:C.textMid}}>
          전체 <strong>{totalPoss}</strong>문제 중 <strong style={{color:C.blue}}>{totalDone}문제</strong> 완료 ({pct(totalDone,totalPoss)}%)
        </div>
      </div>

      {/* 출석 - 전체 공통 */}
      <div style={{background:C.card,borderRadius:16,padding:28,marginBottom:20,border:`1px solid ${C.border}`}}>
        <SecTitle>📅 출석률 (전체 공통)</SecTitle>
        <div style={{display:"flex",alignItems:"center",gap:28,flexWrap:"wrap"}}>
          <DonutChart value={attendA.out} total={attendA.total} color={attendPctVal>=80?C.success:C.warn} size={130} label="출석률"/>
          <div style={{flex:1,minWidth:180}}>
            <ProgressBar value={attendPctVal} color={attendPctVal>=80?C.success:attendPctVal>=70?C.warn:C.danger} height={12} label="출석률"/>
            <div style={{display:"flex",gap:16,marginTop:14,flexWrap:"wrap"}}>
              {[["출석",attendA.out,C.success],["결석",attendA.absent,C.danger],["지각",attendA.late,C.warn]].map(([lbl,cnt,col])=>(
                <div key={lbl} style={{background:col+"12",borderRadius:8,padding:"8px 16px",border:`1px solid ${col}44`,textAlign:"center"}}>
                  <div style={{fontSize:18,fontWeight:900,color:col}}>{cnt}</div>
                  <div style={{fontSize:11,color:col}}>{lbl}</div>
                </div>
              ))}
            </div>
            {attendPctVal<70&&<div style={{marginTop:12,fontSize:12,color:C.danger,fontWeight:700}}>⚠️ 출석률 70% 미만 — 관리 필요</div>}
          </div>
        </div>
      </div>

      {/* 시험 성적 */}
      {barData.length>0&&(
        <div style={{background:C.card,borderRadius:16,padding:28,marginBottom:20,border:`1px solid ${C.border}`}}>
          <SecTitle>📊 시험 성적 분석 (중간 vs 기말)</SecTitle>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={barData} margin={{top:10,right:10,left:-10,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
              <XAxis dataKey="name" tick={{fontSize:11,fill:C.textMid}}/>
              <YAxis domain={[0,5]} tickFormatter={v=>["","F","D","C","B","A"][v]||""} tick={{fontSize:11}}/>
              <Tooltip formatter={(v,n)=>[["","F","D","C","B","A"][v]||"-",n]}/>
              <Legend wrapperStyle={{fontSize:11}}/>
              <Bar dataKey="중간(계획)" fill={C.navyMid} radius={[4,4,0,0]}/>
              <Bar dataKey="중간(작도)" fill={C.blue} radius={[4,4,0,0]}/>
              <Bar dataKey="기말(계획)" fill={C.accent} radius={[4,4,0,0]}/>
              <Bar dataKey="기말(작도)" fill={C.success} radius={[4,4,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
          {/* 석차 */}
          {allSubIds.map(sid=>{
            const sd=student.subjects[sid];
            const sessId=sessOfSub(sid)?.id;
            const total=countExaminees(students,sessId);
            if(!sd?.mid?.rank&&!sd?.final?.rank) return null;
            return (
              <div key={sid} style={{display:"flex",gap:16,flexWrap:"wrap",marginTop:12,background:C.bg,borderRadius:10,padding:"10px 16px"}}>
                <span style={{fontWeight:700,fontSize:13,color:C.navy}}>{subName(sid)}</span>
                {sd.mid?.rank&&<span style={{fontSize:13,color:C.textMid}}>중간: <strong style={{color:C.blue}}>{sd.mid.rank}등</strong>/{total}명 <span style={{fontSize:11,color:C.textLight}}>(상위 {pct(+sd.mid.rank,total)}%)</span></span>}
                {sd.final?.rank&&<span style={{fontSize:13,color:C.textMid}}>기말: <strong style={{color:C.success}}>{sd.final.rank}등</strong>/{total}명 <span style={{fontSize:11,color:C.textLight}}>(상위 {pct(+sd.final.rank,total)}%)</span></span>}
              </div>
            );
          })}
        </div>
      )}

      {/* 모의고사 추이 */}
      {mockTrend.length>0&&(
        <div style={{background:C.card,borderRadius:16,padding:28,marginBottom:20,border:`1px solid ${C.border}`}}>
          <SecTitle>📈 모의고사 성적 추이</SecTitle>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={mockTrend} margin={{top:10,right:10,left:-10,bottom:40}}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
              <XAxis dataKey="name" tick={{fontSize:9,fill:C.textMid}} angle={-30} textAnchor="end"/>
              <YAxis domain={[0,5]} tickFormatter={v=>["","F","D","C","B","A"][v]||""} tick={{fontSize:11}}/>
              <Tooltip formatter={(v,n)=>[["","F","D","C","B","A"][v]||"-",n]}/>
              <Bar dataKey="계획" fill={C.purple} radius={[4,4,0,0]}/>
              <Bar dataKey="작도" fill={C.pink} radius={[4,4,0,0]}/>
            </BarChart>
          </ResponsiveContainer>

          {/* 도면 갤러리 */}
          {allSubIds.map(sid=>{
            const mocks=(student.subjects[sid]?.mocks||[]).filter(m=>m.drawingUrl);
            if(!mocks.length) return null;
            return (
              <div key={sid} style={{marginTop:16}}>
                <div style={{fontSize:13,fontWeight:700,color:C.blue,marginBottom:8}}>{subName(sid)} 도면</div>
                <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                  {mocks.map((m,i)=>(
                    <div key={i} style={{textAlign:"center"}}>
                      <img src={m.drawingUrl} alt={m.type} style={{width:120,height:90,objectFit:"cover",borderRadius:8,border:`1px solid ${C.border}`}}/>
                      <div style={{fontSize:10,color:C.textMid,marginTop:4}}>{m.type}</div>
                      {m.plan&&<div style={{fontSize:10,color:gCol(m.plan),fontWeight:700}}>계획:{m.plan} / 작도:{m.work}</div>}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 담당 건축사 평가 */}
      {allSubIds.some(sid=>student.subjects[sid]?.comment)&&(
        <div style={{background:C.card,borderRadius:16,padding:28,marginBottom:20,border:`1px solid ${C.border}`}}>
          <SecTitle>✍️ 담당 건축사 종합평가</SecTitle>
          {allSubIds.map(sid=>{
            const comment=student.subjects[sid]?.comment;
            if(!comment) return null;
            return (
              <div key={sid} style={{marginBottom:14}}>
                <div style={{fontSize:13,fontWeight:700,color:C.blue,marginBottom:6}}>{subName(sid)}</div>
                <div style={{background:C.bg,borderRadius:10,padding:14,fontSize:14,color:C.text,lineHeight:1.7,whiteSpace:"pre-wrap"}}>{comment}</div>
              </div>
            );
          })}
        </div>
      )}

      {info.memo&&(
        <div style={{background:"#FFF8E8",borderRadius:16,padding:20,marginBottom:20,border:`1px solid ${C.accent}44`}}>
          <div style={{fontSize:13,fontWeight:700,color:C.accent,marginBottom:6}}>📌 담당 선생님 메모</div>
          <div style={{fontSize:13,color:C.text,lineHeight:1.7,whiteSpace:"pre-wrap"}}>{info.memo}</div>
        </div>
      )}
    </div>
  );
};


// ═══════════════════════════════════════════════════
//  로그인 화면 (선생님 전용)
// ═══════════════════════════════════════════════════
const DEFAULT_PW = "0000"; // 초기 비밀번호

const LoginScreen = ({ onLogin, defaultPw }) => {
  const [pw, setPw] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const tryLogin = async () => {
    if (!pw) return;
    setLoading(true);
    let correctPw = defaultPw || DEFAULT_PW;
    try {
      const r = await fetch(`${SB_URL}/rest/v1/settings?key=eq.teacher_password&select=value`, { headers: H });
      const rows = await r.json();
      if (Array.isArray(rows) && rows.length) correctPw = rows[0].value;
    } catch(e) { /* fallback */ }

    if (pw === correctPw) {
      try { sessionStorage.setItem("sj_auth","1"); } catch(e){}
      onLogin("full");
    } else {
      setError(true);
      setTimeout(()=>setError(false), 2500);
    }
    setLoading(false);
  };

  return (
    <div style={{minHeight:"100vh",background:`linear-gradient(135deg,${C.navy} 0%,#0D1B30 100%)`,
      display:"flex",alignItems:"center",justifyContent:"center",padding:20,fontFamily:"'Noto Sans KR',sans-serif"}}>
      <div style={{background:C.card,borderRadius:24,padding:"44px 40px",maxWidth:400,width:"100%",
        boxShadow:"0 24px 80px #00000066"}}>

        {/* 로고 */}
        <div style={{textAlign:"center",marginBottom:36}}>
          <div style={{width:72,height:72,borderRadius:20,background:C.navy,
            margin:"0 auto 16px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:36}}>🏛</div>
          <div style={{fontSize:24,fontWeight:900,color:C.navy,letterSpacing:-.5}}>신전스퀘어</div>
          <div style={{fontSize:12,color:C.textLight,marginTop:6,letterSpacing:2}}>SHINJEON SQUARE</div>
          <div style={{display:"inline-block",marginTop:10,background:C.navy+"12",borderRadius:20,
            padding:"4px 14px",fontSize:11,color:C.navy,fontWeight:700}}>🔒 건축사 선생님 전용</div>
        </div>

        {/* 비밀번호 */}
        <div style={{marginBottom:20}}>
          <label style={{fontSize:12,fontWeight:700,color:C.textMid,display:"block",marginBottom:8}}>비밀번호</label>
          <div style={{position:"relative"}}>
            <input
              type={showPw?"text":"password"}
              value={pw}
              onChange={e=>setPw(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&tryLogin()}
              placeholder="비밀번호 입력"
              autoFocus
              style={{width:"100%",padding:"13px 44px 13px 16px",borderRadius:12,
                border:`2px solid ${error?C.danger:pw?C.blue:C.border}`,
                fontSize:16,outline:"none",boxSizing:"border-box",
                background:error?"#FEF2F2":"#fff",transition:"border-color .2s"}}
            />
            <button onClick={()=>setShowPw(p=>!p)}
              style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",
                background:"none",border:"none",cursor:"pointer",fontSize:18,color:C.textLight}}>
              {showPw?"🙈":"👁"}
            </button>
          </div>
          {error&&<div style={{fontSize:12,color:C.danger,marginTop:6,fontWeight:600}}>❌ 비밀번호가 틀렸습니다</div>}
        </div>

        <button onClick={tryLogin} disabled={loading||!pw}
          style={{width:"100%",background:(!pw||loading)?C.border:`linear-gradient(135deg,${C.navy},${C.blue})`,
            color:"#fff",border:"none",borderRadius:12,padding:"14px",
            fontWeight:800,fontSize:16,cursor:(!pw||loading)?"not-allowed":"pointer",
            transition:"background .2s",marginBottom:20}}>
          {loading?"확인 중…":"로그인"}
        </button>

        <div style={{borderTop:`1px solid ${C.border}`,paddingTop:18,textAlign:"center"}}>
          <div style={{fontSize:11,color:C.textLight,marginBottom:8}}>수강생 결과서를 공유받으셨나요?</div>
          <button onClick={()=>onLogin("readonly")}
            style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:9,
              padding:"8px 20px",color:C.textMid,cursor:"pointer",fontSize:12,fontWeight:600}}>
            📄 결과서만 보기
          </button>
        </div>
      </div>
    </div>
  );
};

// ── 비밀번호 변경 모달 ──────────────────────────────
const ChangePwModal = ({ onClose }) => {
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(false);

  const change = async () => {
    if (next.length < 4) { setMsg("비밀번호는 4자 이상이어야 해요"); return; }
    if (next !== confirm) { setMsg("새 비밀번호가 일치하지 않아요"); return; }

    let correctPw = defaultPw || DEFAULT_PW;
    try {
      const r = await fetch(`${SB_URL}/rest/v1/settings?key=eq.teacher_password&select=value`, { headers: H });
      const rows = await r.json();
      if (Array.isArray(rows) && rows.length) correctPw = rows[0].value;
    } catch(e){}

    if (cur !== correctPw) { setMsg("현재 비밀번호가 틀렸어요"); return; }

    try {
      await fetch(`${SB_URL}/rest/v1/settings`, {
        method:"POST",
        headers:{...H,"Content-Type":"application/json",Prefer:"resolution=merge-duplicates"},
        body: JSON.stringify({key:"teacher_password", value:next})
      });
      setMsg("✅ 비밀번호가 변경됐어요!");
      setOk(true);
      setTimeout(onClose, 2000);
    } catch(e) { setMsg("저장 실패: " + e.message); }
  };

  return (
    <div style={{position:"fixed",inset:0,background:"#00000088",zIndex:999,
      display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:C.card,borderRadius:16,padding:28,maxWidth:360,width:"100%"}}>
        <div style={{fontSize:16,fontWeight:800,color:C.navy,marginBottom:20}}>🔑 비밀번호 변경</div>
        {[["현재 비밀번호",cur,setCur],["새 비밀번호",next,setNext],["새 비밀번호 확인",confirm,setConfirm]].map(([lbl,val,set])=>(
          <div key={lbl} style={{marginBottom:12}}>
            <label style={{fontSize:11,fontWeight:600,color:C.textMid,display:"block",marginBottom:5}}>{lbl}</label>
            <input type="password" value={val} onChange={e=>set(e.target.value)}
              style={{width:"100%",padding:"10px 14px",borderRadius:9,border:`1.5px solid ${C.border}`,
                fontSize:14,outline:"none",boxSizing:"border-box"}}/>
          </div>
        ))}
        {msg&&<div style={{fontSize:12,color:ok?C.success:C.danger,marginBottom:12,fontWeight:600}}>{msg}</div>}
        <div style={{display:"flex",gap:10}}>
          <button onClick={change} style={{flex:1,background:C.navy,color:"#fff",border:"none",
            borderRadius:9,padding:"11px",fontWeight:700,cursor:"pointer",fontSize:13}}>변경</button>
          <button onClick={onClose} style={{background:C.bg,border:`1px solid ${C.border}`,
            borderRadius:9,padding:"11px 16px",cursor:"pointer",color:C.textMid,fontSize:13}}>취소</button>
        </div>
      </div>
    </div>
  );
};


// ═══════════════════════════════════════════════════
//  설정 모달 (비밀번호 변경 + 반 관리 + 담당 건축사)
// ═══════════════════════════════════════════════════
const SettingsModal = ({ students, setStudents, pw, onPwChange, customClasses, setCustomClasses, classTeachers, setClassTeachers, onClose }) => {
  const [tab, setTab] = useState("class");

  // ── 비밀번호 ────────────────────────────────────
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [conPw, setConPw] = useState("");
  const [pwMsg, setPwMsg] = useState("");

  const savePw = async () => {
    if (curPw !== pw)      { setPwMsg("현재 비밀번호가 틀렸어요"); return; }
    if (newPw.length < 4)  { setPwMsg("새 비밀번호는 4자 이상이에요"); return; }
    if (newPw !== conPw)   { setPwMsg("새 비밀번호가 일치하지 않아요"); return; }
    try { localStorage.setItem("sj_teacher_pw", newPw); } catch {}
    try {
      await fetch(`${SB_URL}/rest/v1/settings`, {
        method:"POST",
        headers:{...H,"Content-Type":"application/json",Prefer:"resolution=merge-duplicates"},
        body:JSON.stringify({key:"teacher_password",value:newPw}),
      });
    } catch {}
    onPwChange(newPw);
    setPwMsg("✅ 비밀번호가 변경됐어요!");
    setTimeout(()=>{ setCurPw(""); setNewPw(""); setConPw(""); setPwMsg(""); }, 2000);
  };

  // ── 반 관리 ──────────────────────────────────────
  const [newCls,   setNewCls]   = useState("");
  const [renaming, setRenaming] = useState(null);
  const [clsMsg,   setClsMsg]   = useState("");

  const allCls = useMemo(()=>[...new Set([
    ...students.map(s=>s.info.className),
    ...customClasses,
  ])].sort((a,b)=>a.localeCompare(b,"ko")), [students, customClasses]);

  const addCls = () => {
    const name = newCls.trim();
    if (!name) return;
    if (allCls.includes(name)) { setClsMsg("이미 있는 반 이름이에요"); return; }
    const updated = [...customClasses, name];
    setCustomClasses(updated);
    try { localStorage.setItem("sj_custom_classes", JSON.stringify(updated)); } catch {}
    setNewCls(""); setClsMsg("✅ 추가됐어요!"); setTimeout(()=>setClsMsg(""), 2000);
  };

  const doRename = () => {
    if (!renaming) return;
    const { old: oldName, next } = renaming;
    if (!next.trim() || next.trim() === oldName) { setRenaming(null); return; }
    setStudents(prev => prev.map(s =>
      s.info.className === oldName ? {...s, info:{...s.info, className:next.trim()}} : s
    ));
    const updCls = customClasses.map(c=>c===oldName?next.trim():c);
    setCustomClasses(updCls);
    const updTeacher = {...classTeachers};
    if (updTeacher[oldName]) { updTeacher[next.trim()] = updTeacher[oldName]; delete updTeacher[oldName]; }
    setClassTeachers(updTeacher);
    try { localStorage.setItem("sj_custom_classes", JSON.stringify(updCls)); } catch {}
    try { localStorage.setItem("sj_class_teachers", JSON.stringify(updTeacher)); } catch {}
    setRenaming(null); setClsMsg(`✅ "${oldName}" → "${next.trim()}"`); setTimeout(()=>setClsMsg(""), 2000);
  };

  const deleteCls = (cls) => {
    const cnt = students.filter(s=>s.info.className===cls).length;
    if (cnt > 0) { setClsMsg(`수강생 ${cnt}명이 있어 삭제 불가`); setTimeout(()=>setClsMsg(""), 2000); return; }
    const updCls = customClasses.filter(c=>c!==cls);
    setCustomClasses(updCls);
    try { localStorage.setItem("sj_custom_classes", JSON.stringify(updCls)); } catch {}
    setClsMsg("삭제됐어요"); setTimeout(()=>setClsMsg(""), 2000);
  };

  return (
    <div style={{position:"fixed",inset:0,background:"#00000088",zIndex:999,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:C.card,borderRadius:20,width:"100%",maxWidth:460,maxHeight:"88vh",overflow:"auto",boxShadow:"0 24px 80px #0008"}}>
        <div style={{background:C.navy,borderRadius:"20px 20px 0 0",padding:"18px 24px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{fontSize:16,fontWeight:900,color:"#fff"}}>⚙️ 설정</div>
          <button onClick={onClose} style={{background:"#ffffff22",border:"none",borderRadius:8,color:"#fff",padding:"5px 12px",cursor:"pointer",fontWeight:700}}>닫기</button>
        </div>
        <div style={{display:"flex",borderBottom:`1px solid ${C.border}`}}>
          {[["class","🏛 반 관리"],["teacher","👨‍🏫 담당 건축사"],["pw","🔑 비밀번호"]].map(([k,l])=>(
            <button key={k} onClick={()=>setTab(k)} style={{flex:1,padding:"12px",border:"none",background:"none",cursor:"pointer",fontWeight:tab===k?800:400,color:tab===k?C.blue:C.textLight,borderBottom:`2.5px solid ${tab===k?C.blue:"transparent"}`,fontSize:12}}>
              {l}
            </button>
          ))}
        </div>

        <div style={{padding:24}}>

          {/* 반 관리 */}
          {tab==="class" && (<>
            {clsMsg&&<div style={{background:clsMsg.startsWith("✅")?"#ECFDF5":"#FEF2F2",borderRadius:10,padding:"9px 14px",fontSize:12,color:clsMsg.startsWith("✅")?C.success:C.danger,marginBottom:14}}>{clsMsg}</div>}
            <div style={{marginBottom:18}}>
              <div style={{fontSize:13,fontWeight:700,color:C.navy,marginBottom:8}}>새 반 추가</div>
              <div style={{display:"flex",gap:8}}>
                <input value={newCls} onChange={e=>setNewCls(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addCls()} placeholder="예: W반, 특별반, 주말반..."
                  style={{flex:1,padding:"10px 12px",borderRadius:9,border:`1.5px solid ${C.border}`,fontSize:13,outline:"none"}}/>
                <button onClick={addCls} style={{background:C.blue,color:"#fff",border:"none",borderRadius:9,padding:"10px 16px",fontWeight:700,cursor:"pointer",fontSize:13}}>추가</button>
              </div>
            </div>
            <div style={{fontSize:13,fontWeight:700,color:C.navy,marginBottom:8}}>반 목록</div>
            <div style={{display:"flex",flexDirection:"column",gap:6,maxHeight:320,overflowY:"auto"}}>
              {allCls.map(cls=>{
                const cnt=students.filter(s=>s.info.className===cls).length;
                const isRen=renaming?.old===cls;
                return (
                  <div key={cls} style={{display:"flex",alignItems:"center",gap:8,background:C.bg,borderRadius:9,padding:"9px 12px",border:`1px solid ${C.border}`}}>
                    {isRen ? (<>
                      <input value={renaming.next} onChange={e=>setRenaming(r=>({...r,next:e.target.value}))}
                        onKeyDown={e=>{if(e.key==="Enter")doRename();if(e.key==="Escape")setRenaming(null);}} autoFocus
                        style={{flex:1,padding:"6px 10px",borderRadius:7,border:`1.5px solid ${C.blue}`,fontSize:13,outline:"none"}}/>
                      <button onClick={doRename} style={{background:C.success,color:"#fff",border:"none",borderRadius:7,padding:"6px 12px",fontWeight:700,cursor:"pointer",fontSize:12}}>저장</button>
                      <button onClick={()=>setRenaming(null)} style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:7,padding:"6px 10px",cursor:"pointer",fontSize:12,color:C.textMid}}>취소</button>
                    </>) : (<>
                      <div style={{flex:1}}>
                        <span style={{fontWeight:700,fontSize:13,color:C.text}}>{cls}</span>
                        <span style={{fontSize:11,color:C.textLight,marginLeft:8}}>{cnt}명</span>
                        {classTeachers[cls]&&<span style={{fontSize:10,color:C.textMid,marginLeft:8}}>👨‍🏫 {classTeachers[cls]}</span>}
                      </div>
                      <button onClick={()=>setRenaming({old:cls,next:cls})} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:7,padding:"5px 10px",cursor:"pointer",fontSize:11,color:C.textMid}}>✏️ 변경</button>
                      {cnt===0&&<button onClick={()=>deleteCls(cls)} style={{background:"none",border:`1px solid ${C.danger}44`,borderRadius:7,padding:"5px 10px",cursor:"pointer",fontSize:11,color:C.danger}}>삭제</button>}
                    </>)}
                  </div>
                );
              })}
            </div>
          </>)}

          {/* 담당 건축사 */}
          {tab==="teacher" && (<>
            <div style={{fontSize:12,color:C.textMid,marginBottom:14}}>각 반의 담당 건축사를 입력하세요</div>
            <div style={{display:"flex",flexDirection:"column",gap:8,maxHeight:400,overflowY:"auto"}}>
              {allCls.map(cls=>(
                <div key={cls} style={{display:"flex",alignItems:"center",gap:10,background:C.bg,borderRadius:9,padding:"9px 12px",border:`1px solid ${C.border}`}}>
                  <span style={{fontWeight:700,fontSize:13,color:C.text,width:72,flexShrink:0}}>{cls}</span>
                  <input value={classTeachers[cls]||""} onChange={e=>{
                    const updated={...classTeachers,[cls]:e.target.value};
                    setClassTeachers(updated);
                    try{localStorage.setItem("sj_class_teachers",JSON.stringify(updated));}catch{}
                  }} placeholder="건축사 이름"
                    style={{flex:1,padding:"7px 10px",borderRadius:7,border:`1.5px solid ${C.border}`,fontSize:13,outline:"none"}}/>
                  <span style={{fontSize:11,color:C.textLight,flexShrink:0}}>{students.filter(s=>s.info.className===cls).length}명</span>
                </div>
              ))}
            </div>
          </>)}

          {/* 비밀번호 */}
          {tab==="pw" && (<>
            {pwMsg&&<div style={{background:pwMsg.startsWith("✅")?"#ECFDF5":"#FEF2F2",borderRadius:10,padding:"9px 14px",fontSize:12,color:pwMsg.startsWith("✅")?C.success:C.danger,marginBottom:14}}>{pwMsg}</div>}
            <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:20}}>
              {[["현재 비밀번호",curPw,setCurPw],["새 비밀번호",newPw,setNewPw],["새 비밀번호 확인",conPw,setConPw]].map(([lbl,val,set])=>(
                <div key={lbl}>
                  <label style={{fontSize:12,fontWeight:700,color:C.textMid,display:"block",marginBottom:5}}>{lbl}</label>
                  <input type="password" value={val} onChange={e=>set(e.target.value)} onKeyDown={e=>e.key==="Enter"&&savePw()}
                    style={{width:"100%",padding:"11px 14px",borderRadius:10,border:`1.5px solid ${C.border}`,fontSize:14,outline:"none",boxSizing:"border-box"}}/>
                </div>
              ))}
            </div>
            <button onClick={savePw} style={{width:"100%",background:C.navy,color:"#fff",border:"none",borderRadius:11,padding:13,fontWeight:800,cursor:"pointer",fontSize:14}}>비밀번호 변경</button>
          </>)}

        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════
//  공유 모달
// ═══════════════════════════════════════════════════
const ShareModal = ({studentId, studentName, onClose}) => (
  <div style={{position:"fixed",inset:0,background:"#00000099",zIndex:999,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
    <div style={{background:C.card,borderRadius:16,padding:24,maxWidth:400,width:"100%",boxShadow:"0 20px 60px #0006"}}>
      <div style={{fontSize:16,fontWeight:800,color:C.navy,marginBottom:4}}>📤 결과서 공유</div>
      <div style={{fontSize:12,color:C.textMid,marginBottom:16}}>수강생: <strong>{studentName}</strong></div>
      <div style={{background:C.bg,borderRadius:12,padding:16,marginBottom:12}}>
        <div style={{fontSize:12,fontWeight:700,color:C.blue,marginBottom:8}}>① 아래 ID를 길게 눌러 복사</div>
        <div style={{background:"#fff",borderRadius:8,padding:"12px 14px",border:"2px dashed #2B58B8",cursor:"text"}}>
          <div style={{fontSize:11,color:C.textLight,marginBottom:4}}>수강생 ID</div>
          <div style={{fontSize:18,fontWeight:900,color:C.navy,wordBreak:"break-all",userSelect:"all",WebkitUserSelect:"all"}}>{studentId}</div>
        </div>
        <div style={{fontSize:11,color:C.textLight,marginTop:8}}>👆 길게 누르면 선택 → 복사 가능</div>
      </div>
      <div style={{background:C.bg,borderRadius:12,padding:14,marginBottom:16,fontSize:12,color:C.textMid,lineHeight:1.8}}>
        ② 받는 분은 앱 상단 입력칸에 ID 붙여넣기 → <strong>불러오기</strong>
      </div>
      <button onClick={onClose} style={{width:"100%",background:C.navy,color:"#fff",border:"none",borderRadius:10,padding:"12px",fontWeight:700,cursor:"pointer",fontSize:14}}>확인</button>
    </div>
  </div>
);

// ═══════════════════════════════════════════════════
//  메인 앱
// ═══════════════════════════════════════════════════
export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(()=>{ try{return sessionStorage.getItem("sj_auth")==="1";}catch(e){return false;} });
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [showChangePw, setShowChangePw] = useState(false);
  const [students,setStudents]     = useState([]);
  const [selectedId,setSelectedId] = useState(null);
  const [view,setView]             = useState("dashboard"); // dashboard|detail|report
  const [activeSess,setActiveSess] = useState(SESSIONS[0].id);
  const [activeSub, setActiveSub]  = useState(SESSIONS[0].subjects[0].id);
  const [showInfo,  setShowInfo]   = useState(false);
  const [saveStatus,setSaveStatus] = useState("idle");
  const [loadStatus,setLoadStatus] = useState("loading");
  const [shareModal,setShareModal] = useState(null);
  const [showRankings,setShowRankings] = useState(false);
  const [importId,  setImportId]   = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [showBulkDone, setShowBulkDone] = useState(false);
  const [classFilter, setClassFilter] = useState("전체");
  const [searchQuery, setSearchQuery] = useState("");
  const saveTimers = useRef({});

  // ── 커스텀 반 + 비밀번호 로드 ─────────────────────
  useEffect(()=>{
    // 커스텀 반 로드
    try {
      const saved = localStorage.getItem("sj_custom_classes");
      if (saved) setCustomClasses(JSON.parse(saved));
    } catch {}
    // 담당 건축사 매핑 로드
    try {
      const saved = localStorage.getItem("sj_class_teachers");
      if (saved) setClassTeachers({...DEFAULT_TEACHERS,...JSON.parse(saved)});
    } catch {}
    // 비밀번호 로드
    try {
      const saved = localStorage.getItem("sj_teacher_pw");
      if (saved) setCurrentPw(saved);
    } catch {}
    // Supabase에서 비밀번호 로드
    (async()=>{
      try {
        const r = await fetch(`${SB_URL}/rest/v1/settings?key=eq.teacher_password&select=value`,{headers:H});
        const d = await r.json();
        if(d?.length&&d[0].value){ setCurrentPw(d[0].value); localStorage.setItem("sj_teacher_pw",d[0].value); }
      } catch {}
    })();
  },[]);

  // ── 초기 로드 ────────────────────────────────────
  useEffect(()=>{
    (async()=>{
      try {
        const rows = await sb.getAll();
        setStudents(rows.map(r=>({...r.data,id:r.id})));
        setLoadStatus("ok");
      } catch(e) {
        console.error(e);
        setLoadStatus("error");
      }
    })();
  },[]);

  const student = students.find(s=>s.id===selectedId);

  // ── 자동저장 ──────────────────────────────────────
  const saveStudent = (s) => {
    if(saveTimers.current[s.id]) clearTimeout(saveTimers.current[s.id]);
    setSaveStatus("saving");
    saveTimers.current[s.id] = setTimeout(async()=>{
      try {
        await sb.upsert(s.id, s);
        setSaveStatus("saved");
        setTimeout(()=>setSaveStatus("idle"),2000);
      } catch(e) {
        console.error(e);
        setSaveStatus("error");
      }
    }, 800);
  };

  // ── 업데이트 헬퍼 ────────────────────────────────
  const updSt = (id,fn) => setStudents(prev=>prev.map(s=>{ if(s.id!==id) return s; const ns=fn(s); saveStudent(ns); return ns; }));
  const updSub = (subId,fn) => updSt(selectedId,s=>({...s,subjects:{...s.subjects,[subId]:fn(s.subjects[subId]||makeSubData())}}));

  const toggleHw  = (subId,typeId,idx) => updSub(subId,sd=>({...sd,hw:{...sd.hw,[typeId]:{...sd.hw?.[typeId],[idx]:!sd.hw?.[typeId]?.[idx]}}}));
  const setAttend = (week,state) => updSt(selectedId, s=>({...s, attend:{...s.attend,[week]:state}}));
  const setSubData= (subId,data)       => updSt(selectedId,s=>({...s,subjects:{...s.subjects,[subId]:data}}));
  const setComment= (subId,val)        => updSub(subId,sd=>({...sd,comment:val}));
  const updInfo   = (info)             => updSt(selectedId,s=>({...s,info}));

  const addStudent = async() => {
    const id=String(Date.now());
    const ns=makeStudent(id);
    setStudents(prev=>[...prev,ns]);
    try { await sb.upsert(id,ns); } catch(e){ console.error(e); }
    setSelectedId(id); setView("detail"); setShowInfo(true);
  };

  const delStudent = async(id) => {
    if(!window.confirm("삭제하시겠어요?")) return;
    setStudents(prev=>prev.filter(s=>s.id!==id));
    try { await sb.del(id); } catch(e){ console.error(e); }
    if(selectedId===id){ setSelectedId(null); setView("dashboard"); }
  };

  // ── 로그인/로그아웃 ────────────────────────────────
  const handleLogin = (mode) => {
    setIsLoggedIn(true);
    setIsReadOnly(mode === "readonly");
  };
  const handleLogout = () => {
    try { sessionStorage.removeItem("sj_auth"); } catch(e){}
    setIsLoggedIn(false);
    setIsReadOnly(false);
    setSelectedId(null);
    setView("dashboard");
  };

  // ── 공유 불러오기 ─────────────────────────────────
  const importById = async() => {
    const id=importId.trim();
    if(!id) return;
    try {
      const s = await sb.getStudent(id);
      if(!s){ alert("❌ 해당 ID의 수강생을 찾을 수 없어요."); return; }
      setStudents(prev=>{ const ex=prev.find(x=>x.id===s.id); return ex?prev.map(x=>x.id===s.id?s:x):[...prev,s]; });
      setSelectedId(s.id); setView("report");
      setImportId("");
    } catch(e){ alert("❌ 불러오기 실패: "+e.message); }
  };

  // ── 수강생 일괄 등록 ─────────────────────────────
  const bulkImportStudents = () => {
    const existing = students.map(s=>s.info.name);
    const toAdd = SEED_STUDENTS.filter(s=>!existing.includes(s.name));
    if(toAdd.length===0){ setShowBulkDone(true); return; }
    // 1) 즉시 화면에 표시
    const added = toAdd.map(seed=>{
      const id = String(Date.now()+Math.floor(Math.random()*999999));
      const ns = makeStudent(id, seed.name);
      ns.info.className = seed.cls;
      ns.info.passedSessions = seed.p;
      return ns;
    });
    setStudents(prev=>[...prev,...added]);
    setBulkLoading(true);
    // 2) 백그라운드로 DB 저장
    (async()=>{
      for(const ns of added){
        try { await sb.upsert(ns.id, ns); } catch(e){ console.error(e); }
        await new Promise(r=>setTimeout(r,40));
      }
      setBulkLoading(false);
      setSaveStatus("saved");
      setTimeout(()=>setSaveStatus("idle"),3000);
    })();
  };

  const visibleSess = student ? SESSIONS.filter(s=>!s.subjects.every(sub=>isPassed(sub.id,student.info))) : SESSIONS;
  const curSubData  = student?.subjects?.[activeSub] || makeSubData();
  const hwDone      = calcHw(curSubData);
  // 담당 건축사 목록 (동적)
  const teacherList = useMemo(()=>{
    const teachers = new Set(["전체"]);
    students.forEach(s=>{
      const t = classTeachers[s.info.className];
      if(t) teachers.add(t);
    });
    return [...teachers];
  },[students,classTeachers]);

  // 담당 건축사 필터 적용
  const filteredByTeacher = useMemo(()=>{
    if(teacherFilter==="전체") return students;
    return students.filter(s=>classTeachers[s.info.className]===teacherFilter);
  },[students,classTeachers,teacherFilter]);

  const sessSummary = s => {
    const ids=getAllSubIds().filter(sid=>!isPassed(sid,s.info));
    if(!ids.length) return 100;
    return pct(ids.reduce((acc,sid)=>acc+calcHw(s.subjects[sid]||makeSubData()),0), HW_TOTAL*ids.length);
  };
  const studentAttend = student?.attend || {};

  // ── 로그인 체크 ──────────────────────────────────
  if(!isLoggedIn) return <LoginScreen onLogin={handleLogin} defaultPw={currentPw}/>;

  // ── 결과서 뷰 ────────────────────────────────────
  if(view==="report"&&student) return (
    <div style={{minHeight:"100vh",background:C.bg,padding:"24px 16px"}}>
      {showSettings&&(
        <SettingsModal
          students={students}
          setStudents={setStudents}
          pw={currentPw}
          onPwChange={pw=>setCurrentPw(pw)}
          customClasses={customClasses}
          setCustomClasses={setCustomClasses}
          classTeachers={classTeachers}
          setClassTeachers={t=>{setClassTeachers(t);try{localStorage.setItem("sj_class_teachers",JSON.stringify(t));}catch{}}}
          onClose={()=>setShowSettings(false)}
        />
      )}
      {shareModal&&<ShareModal studentId={shareModal.id} studentName={shareModal.name} onClose={()=>setShareModal(null)}/>}
      <ReportView student={student} students={students} onBack={()=>setView("detail")} onShare={()=>setShareModal({id:student.id,name:student.info.name})}/>
    </div>
  );

  // ── 로딩 ─────────────────────────────────────────
  if(loadStatus==="loading") return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{width:40,height:40,borderRadius:"50%",border:`4px solid ${C.border}`,borderTopColor:C.blue,animation:"spin 1s linear infinite"}}/>
      <div style={{color:C.textMid,fontSize:14}}>Supabase에서 데이터 불러오는 중…</div>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'Noto Sans KR',sans-serif"}}>
      {showSettings&&(
        <SettingsModal
          students={students}
          setStudents={setStudents}
          pw={currentPw}
          onPwChange={pw=>setCurrentPw(pw)}
          customClasses={customClasses}
          setCustomClasses={setCustomClasses}
          classTeachers={classTeachers}
          setClassTeachers={t=>{setClassTeachers(t);try{localStorage.setItem("sj_class_teachers",JSON.stringify(t));}catch{}}}
          onClose={()=>setShowSettings(false)}
        />
      )}
      {shareModal&&<ShareModal studentId={shareModal.id} studentName={shareModal.name} onClose={()=>setShareModal(null)}/>}
      {showChangePw&&<ChangePwModal onClose={()=>setShowChangePw(false)}/>}
      {showRankings&&<RankingsView students={students} onClose={()=>setShowRankings(false)}/>}

      {/* 읽기전용 배너 */}
      {isReadOnly && (
        <div style={{background:C.warn,padding:"8px 16px",textAlign:"center",fontSize:12,fontWeight:700,color:"#fff"}}>
          👁 결과서 보기 전용 모드 — 수정 불가 &nbsp;
          <button onClick={handleLogout} style={{background:"#ffffff33",border:"none",borderRadius:6,padding:"2px 10px",color:"#fff",cursor:"pointer",fontSize:11,fontWeight:700}}>선생님 로그인</button>
        </div>
      )}
      {/* 헤더 */}
      <header style={{background:C.navy,padding:"10px 16px",position:"sticky",top:0,zIndex:100,borderBottom:`2px solid ${C.accent}40`}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
          <button onClick={()=>setView("dashboard")} style={{display:"flex",alignItems:"center",gap:8,background:"none",border:"none",cursor:"pointer",padding:0}}>
            <div style={{width:28,height:28,borderRadius:7,background:C.accent,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>🏛</div>
            <div style={{textAlign:"left"}}>
              <div style={{color:"#fff",fontWeight:900,fontSize:14,lineHeight:1.1}}>신전스퀘어</div>
              <div style={{color:C.accent,fontSize:8,letterSpacing:1}}>SUPABASE 연동 · 자동저장</div>
            </div>
          </button>
          <div style={{flex:1}}/>
          <div style={{fontSize:11,fontWeight:600,color:saveStatus==="saved"?C.success:saveStatus==="saving"?"#7ab0e8":saveStatus==="error"?C.danger:"transparent",whiteSpace:"nowrap"}}>
            {saveStatus==="saved"?"✓ 저장됨":saveStatus==="saving"?"저장 중…":saveStatus==="error"?"⚠️ 오류":""}
          </div>
          {!isReadOnly && (
            <button onClick={()=>setShowRankings(true)} style={{background:C.accent+"22",border:`1px solid ${C.accent}44`,borderRadius:8,padding:"5px 12px",color:C.accent,cursor:"pointer",fontSize:11,fontWeight:700,whiteSpace:"nowrap"}}>
              🏆 전체 석차
            </button>
          )}
          {!isReadOnly && (
            <button onClick={()=>setShowChangePw(true)} style={{background:"transparent",border:`1px solid #344060`,borderRadius:8,padding:"5px 10px",color:"#a0b0cc",cursor:"pointer",fontSize:11}}>
              🔑
            </button>
          )}
          <button onClick={handleLogout} style={{background:"transparent",border:`1px solid #344060`,borderRadius:8,padding:"5px 12px",color:"#a0b0cc",cursor:"pointer",fontSize:11,whiteSpace:"nowrap"}}>
            {isReadOnly ? "선생님 로그인":"로그아웃"}
          </button>
          {view==="detail"&&student&&(
            <button onClick={()=>setView("report")} style={{background:C.accent,border:"none",borderRadius:8,padding:"6px 14px",color:C.navy,cursor:"pointer",fontSize:12,fontWeight:800,whiteSpace:"nowrap"}}>
              결과서 📄
            </button>
          )}
        </div>
        {/* 공유 불러오기 바 */}
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <input value={importId} onChange={e=>setImportId(e.target.value)} onKeyDown={e=>e.key==="Enter"&&importById()}
            placeholder="📥 공유받은 수강생 ID 붙여넣기..."
            style={{flex:1,padding:"7px 12px",borderRadius:8,border:`1px solid #344060`,fontSize:12,outline:"none",background:"#1a2a45",color:"#fff"}}/>
          <button onClick={importById} style={{background:C.blue,color:"#fff",border:"none",borderRadius:8,padding:"7px 14px",fontWeight:700,cursor:"pointer",fontSize:12,whiteSpace:"nowrap"}}>불러오기</button>
        </div>
      </header>

      <main style={{maxWidth:1100,margin:"0 auto",padding:"24px 16px"}}>

        {/* ══ 대시보드 ══ */}
        {view==="dashboard"&&(
          <>
            <div style={{marginBottom:24}}>
              <div style={{fontSize:22,fontWeight:900,color:C.navy}}>수강생 관리</div>
              <div style={{fontSize:14,color:C.textMid,marginTop:2}}>Supabase 자동저장 · 어디서든 접속 가능</div>
            </div>
            {loadStatus==="error"&&(
              <div style={{background:"#FEF2F2",border:`1px solid ${C.danger}`,borderRadius:10,padding:"12px 16px",marginBottom:20,fontSize:13,color:C.danger}}>
                ⚠️ DB 연결 오류. Supabase SQL Editor에서 테이블 생성을 확인해주세요.
              </div>
            )}
            {!isReadOnly && <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap",alignItems:"center"}}>
              <button onClick={addStudent} style={{background:C.blue,color:"#fff",border:"none",borderRadius:10,padding:"10px 18px",fontWeight:700,cursor:"pointer",fontSize:13,display:"inline-flex",alignItems:"center",gap:6}}>
                + 수강생 추가
              </button>
              <button onClick={bulkImportStudents} style={{
                background: bulkLoading ? C.warn : C.success,
                color:"#fff",border:"none",borderRadius:10,padding:"10px 18px",
                fontWeight:700,cursor:"pointer",fontSize:13,
                display:"inline-flex",alignItems:"center",gap:6}}>
                {bulkLoading ? "☁️ DB 저장 중…" : `📋 전체 반 수강생 일괄 등록 (${SEED_STUDENTS.length}명)`}
              </button>
              {showBulkDone && (
                <div style={{fontSize:12,color:C.success,fontWeight:700,display:"flex",alignItems:"center",gap:6}}>
                  ✅ 이미 모두 등록됨!
                  <button onClick={()=>setShowBulkDone(false)} style={{background:"none",border:"none",cursor:"pointer",color:C.textLight,fontSize:14}}>×</button>
                </div>
              )}
            </div>}
            {/* 담당 건축사 필터 */}
            <div style={{marginBottom:12}}>
              <div style={{fontSize:11,fontWeight:700,color:C.textMid,marginBottom:6,letterSpacing:.5}}>담당 건축사</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {teacherList.map(t=>(
                  <button key={t} onClick={()=>{setTeacherFilter(t);setClassFilter("전체");}}
                    style={{padding:"5px 13px",borderRadius:20,
                      border:`1.5px solid ${teacherFilter===t?C.accent:C.border}`,
                      background:teacherFilter===t?C.accent:C.card,
                      color:teacherFilter===t?C.navy:C.textMid,
                      fontWeight:teacherFilter===t?800:400,cursor:"pointer",fontSize:12}}>
                    {t}{t!=="전체"&&<span style={{fontSize:10,opacity:.7,marginLeft:4}}>
                      {students.filter(s=>classTeachers[s.info.className]===t).length}명
                    </span>}
                  </button>
                ))}
              </div>
            </div>

            {/* 검색 + 반 필터 */}
            <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap",alignItems:"center"}}>
              <input value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="🔍 이름 검색..."
                style={{padding:"8px 14px",borderRadius:9,border:`1.5px solid ${C.border}`,fontSize:13,outline:"none",minWidth:150}}/>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {(["전체",...[...new Set([...students.map(s=>s.info.className),...customClasses])].sort((a,b)=>a.localeCompare(b,"ko"))]).map(cls=>{
                  const cnt = cls==="전체" ? students.length : students.filter(s=>s.info.className===cls).length;
                  return (
                    <button key={cls} onClick={()=>setClassFilter(cls)} style={{
                      padding:"5px 11px",borderRadius:7,
                      border:`1.5px solid ${classFilter===cls?C.blue:C.border}`,
                      background:classFilter===cls?C.blue:C.card,
                      color:classFilter===cls?"#fff":C.textMid,
                      fontWeight:classFilter===cls?700:400,
                      cursor:"pointer",fontSize:11,whiteSpace:"nowrap",
                      display:"flex",alignItems:"center",gap:4}}>
                      {cls}
                      {cnt>0&&<span style={{background:classFilter===cls?"#ffffff33":C.border,borderRadius:99,padding:"0 5px",fontSize:10,fontWeight:700}}>{cnt}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
            {students.length===0&&loadStatus==="ok"&&(
              <div style={{textAlign:"center",padding:"60px 0",color:C.textLight}}>
                <div style={{fontSize:48,marginBottom:12}}>👥</div>
                <div style={{fontSize:18,fontWeight:700,color:C.navy}}>수강생이 없습니다</div>
                <div style={{fontSize:13,marginTop:8,color:C.textMid}}>위 <strong style={{color:C.success}}>📋 전체 반 수강생 일괄 등록</strong> 버튼을 눌러주세요</div>
                <div style={{fontSize:12,marginTop:4,color:C.textLight}}>클릭 즉시 {SEED_STUDENTS.length}명이 화면에 표시됩니다</div>
              </div>
            )}
            {(()=>{
              const filtered = filteredByTeacher
                .filter(s => classFilter==="전체" || s.info.className===classFilter)
                .filter(s => !searchQuery || s.info.name.includes(searchQuery))
                .sort((a,b)=>a.info.className.localeCompare(b.info.className)||a.info.name.localeCompare(b.info.name,"ko"));
              return (
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(230px,1fr))",gap:16}}>
              {filtered.map(s=>{
                const overall=sessSummary(s);
                const passed=s.info.passedSessions||[];
                const aData = calcAttend(s.attend||{});
                const attendPct = pct(aData.out, 20);
                return (
                  <div key={s.id} style={{background:C.card,border:`1.5px solid ${C.border}`,borderRadius:14,padding:20,position:"relative",cursor:"pointer",transition:"all .2s"}}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor=C.blue;e.currentTarget.style.boxShadow=`0 4px 18px ${C.blue}22`;}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.boxShadow="none";}}
                    onClick={()=>{
                      setSelectedId(s.id);
                      if(isReadOnly){ setView("report"); return; }
                      setView("detail"); setShowInfo(false);
                      const fv=SESSIONS.find(sess=>!sess.subjects.every(sub=>isPassed(sub.id,s.info)));
                      if(fv){setActiveSess(fv.id);setActiveSub(fv.subjects[0].id);}
                    }}>
                    <button onClick={e=>{e.stopPropagation();delStudent(s.id);}} style={{position:"absolute",top:10,right:10,background:"none",border:"none",cursor:"pointer",fontSize:16,color:C.textLight}}>×</button>
                    <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
                      <div style={{width:42,height:42,borderRadius:12,background:C.navy,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>👤</div>
                      <div>
                        <div style={{fontWeight:800,fontSize:15,color:C.text}}>
                          <span style={{background:C.navy,color:C.accent,borderRadius:5,padding:"1px 6px",fontSize:10,fontWeight:700,marginRight:6}}>{s.info.className}</span>
                          {s.info.name}
                        </div>
                        {classTeachers[s.info.className]&&(
                          <div style={{fontSize:10,color:C.textLight,marginTop:2}}>👨‍🏫 {classTeachers[s.info.className]}</div>
                        )}
                        {s.info.birthYear&&<div style={{fontSize:11,color:C.textLight}}>{s.info.birthYear}</div>}
                        {s.info.goal&&<div style={{fontSize:10,color:C.accent}}>🎯 {s.info.goal}</div>}
                      </div>
                    </div>
                    {passed.length>0&&(
                      <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:10}}>
                        {passed.map(sid=><Badge key={sid} color={C.passed}>{SESSIONS.find(s=>s.id===sid)?.label} 합격 ✓</Badge>)}
                      </div>
                    )}
                    {attendPct>0&&attendPct<70&&(
                      <div style={{background:C.danger+"12",borderRadius:6,padding:"4px 8px",fontSize:10,color:C.danger,fontWeight:700,marginBottom:8}}>⚠️ 출석률 {attendPct}% 주의</div>
                    )}
                    <div style={{fontSize:11,color:C.textMid,marginBottom:5}}>숙제 달성률</div>
                    <ProgressBar value={overall} height={6} color={overall>=80?C.success:overall>=50?C.warn:C.blue}/>
                    <div style={{marginTop:5,fontSize:12,fontWeight:700,color:overall>=80?C.success:C.blue}}>{overall}%</div>
                  </div>
                );
              })}
            </div>
              );
            })()}
          </>
        )}

        {/* ══ 상세 입력 ══ */}
        {view==="detail"&&student&&(
          <>
            <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:20,flexWrap:"wrap"}}>
              <div style={{width:50,height:50,borderRadius:14,background:C.navy,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>👤</div>
              <div style={{flex:1}}>
                <div style={{fontSize:20,fontWeight:900,color:C.navy}}><span style={{fontSize:13,color:C.textLight,marginRight:6}}>{student.info.className}</span>{student.info.name}</div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:4}}>
                  {student.info.isPreArch&&<Badge color={C.accent}>예비건축사</Badge>}
                  {student.info.isWorking&&<Badge color={C.blueLight}>재직 중</Badge>}
                  {(student.info.passedSessions||[]).map(sid=><Badge key={sid} color={C.passed}>{SESSIONS.find(s=>s.id===sid)?.label} 합격</Badge>)}
                </div>
              </div>
              <button onClick={()=>setShowInfo(p=>!p)} style={{background:showInfo?C.navy:C.card,border:`1.5px solid ${showInfo?C.navy:C.border}`,borderRadius:9,padding:"8px 16px",cursor:"pointer",fontWeight:600,color:showInfo?"#fff":C.textMid,fontSize:12}}>
                {showInfo?"▲ 닫기":"✏️ 인적사항"}
              </button>
            </div>

            {showInfo&&(
              <div style={{background:C.card,borderRadius:14,padding:24,border:`1.5px solid ${C.accent}60`,marginBottom:20}}>
                <SecTitle>👤 수강생 인적사항</SecTitle>
                <InfoForm info={student.info} onChange={updInfo} customClasses={customClasses}/>
              </div>
            )}

            {visibleSess.length===0?(
              <div style={{textAlign:"center",padding:"60px 0",color:C.textLight,fontSize:16}}>🎉 모든 교시를 합격하셨습니다!</div>
            ):(
              <>
                {/* 출석 - 전체 공통 (과목 무관) */}
                <div style={{background:C.card,borderRadius:14,padding:24,border:`1px solid ${C.border}`,marginBottom:20}}>
                  <SecTitle>📅 출석률 (20주) — 전체 공통</SecTitle>
                  <AttendSection subjectData={student} onChange={(w,state)=>setAttend(w,state)}/>
                </div>

                <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
                  {visibleSess.map(sess=>(
                    <button key={sess.id} onClick={()=>{setActiveSess(sess.id);setActiveSub(sess.subjects[0].id);}} style={{padding:"8px 18px",borderRadius:10,border:`1.5px solid ${activeSess===sess.id?C.blue:C.border}`,background:activeSess===sess.id?C.blue:C.card,color:activeSess===sess.id?"#fff":C.textMid,fontWeight:700,cursor:"pointer",fontSize:13}}>
                      {sess.label}
                    </button>
                  ))}
                  {SESSIONS.filter(s=>!visibleSess.includes(s)).map(sess=>(
                    <div key={sess.id} style={{padding:"8px 18px",borderRadius:10,border:`1.5px solid ${C.border}`,background:C.bg,color:C.textLight,fontSize:13,display:"flex",alignItems:"center",gap:6}}>
                      {sess.label} <Badge color={C.passed}>합격 완료</Badge>
                    </div>
                  ))}
                </div>

                {(()=>{
                  const sess=SESSIONS.find(s=>s.id===activeSess);
                  if(!sess) return null;
                  return (
                    <>
                      <div style={{display:"flex",gap:8,marginBottom:18,flexWrap:"wrap"}}>
                        {sess.subjects.map(sub=>(
                          <button key={sub.id} onClick={()=>setActiveSub(sub.id)} style={{padding:"6px 14px",borderRadius:8,border:`1.5px solid ${activeSub===sub.id?C.accent:C.border}`,background:activeSub===sub.id?C.accent+"22":C.card,color:activeSub===sub.id?C.navy:C.textMid,fontWeight:600,cursor:"pointer",fontSize:12}}>
                            {sub.name}
                          </button>
                        ))}
                      </div>

                      {/* 실시간 진행 */}
                      <div style={{background:C.card,borderRadius:14,padding:"14px 20px",marginBottom:20,border:`1.5px solid ${C.border}`,display:"flex",alignItems:"center",gap:20}}>
                        <DonutChart value={hwDone} total={HW_TOTAL} color={C.blue} size={72}/>
                        <div style={{flex:1}}>
                          <div style={{fontWeight:700,fontSize:14,color:C.navy,marginBottom:6}}>{subName(activeSub)} — 숙제 달성률</div>
                          <ProgressBar value={pct(hwDone,HW_TOTAL)} color={hwDone>=30?C.success:hwDone>=15?C.warn:C.blue} height={10}/>
                          <div style={{marginTop:4,fontSize:12,color:C.textMid}}>{hwDone}/{HW_TOTAL} 문제 완료</div>
                        </div>
                      </div>

                      <div style={{display:"flex",flexDirection:"column",gap:20}}>
                        <div style={{background:C.card,borderRadius:14,padding:24,border:`1px solid ${C.border}`}}>
                          <SecTitle>📝 숙제 이행률 (총 {HW_TOTAL}문제)</SecTitle>
                          <HwAccordion subjectId={activeSub} subjectData={curSubData} onToggle={toggleHw}/>
                        </div>

                        <div style={{background:C.card,borderRadius:14,padding:24,border:`1px solid ${C.border}`}}>
                          <SecTitle>🎯 중간 / 기말고사 성적 & 도면</SecTitle>
                          <ExamSection studentId={selectedId} subjectId={activeSub} subjectData={curSubData} sessionId={activeSess} students={students} onChange={data=>setSubData(activeSub,data)}/>
                        </div>
                        <div style={{background:C.card,borderRadius:14,padding:24,border:`1px solid ${C.border}`}}>
                          <SecTitle>📈 모의고사 기록 & 도면</SecTitle>
                          <MockSection studentId={selectedId} subjectId={activeSub} subjectData={curSubData} sessionId={activeSess} students={students} onChange={data=>setSubData(activeSub,data)}/>
                        </div>
                        <div style={{background:C.card,borderRadius:14,padding:24,border:`1px solid ${C.border}`}}>
                          <SecTitle>✍️ 담당 건축사 종합평가</SecTitle>
                          <textarea value={curSubData?.comment||""} onChange={e=>setComment(activeSub,e.target.value)} placeholder="수강생에 대한 종합 의견을 입력하세요..." rows={5}
                            style={{width:"100%",padding:"12px 14px",borderRadius:10,border:`1.5px solid ${C.border}`,fontSize:14,resize:"vertical",fontFamily:"inherit",lineHeight:1.7,color:C.text,outline:"none",boxSizing:"border-box"}}/>
                        </div>
                      </div>

                      <div style={{textAlign:"center",marginTop:28}}>
                        <button onClick={()=>setView("report")} style={{background:`linear-gradient(135deg,${C.navy},${C.blue})`,color:"#fff",border:"none",borderRadius:12,padding:"14px 36px",fontSize:16,fontWeight:800,cursor:"pointer",boxShadow:`0 4px 20px ${C.blue}44`}}>
                          📄 수강생 결과서 보기
                        </button>
                      </div>
                    </>
                  );
                })()}
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
