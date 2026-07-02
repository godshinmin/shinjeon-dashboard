import { useState, useEffect, useRef, useMemo } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

const SB_URL = "https://yigtucvlikxeddqghtqw.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpZ3R1Y3ZsaWt4ZWRkcWdodHF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyOTcwNjgsImV4cCI6MjA5Nzg3MzA2OH0.MoTdu9sYMOLIaLhCNY9Ivs3hg32MbiHoqlOMcbRpIwY";
const SBH = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` };

const sbGet = async () => { try { const r = await fetch(`${SB_URL}/rest/v1/students?select=*&order=updated_at.asc`, { headers: SBH }); return r.ok ? r.json() : []; } catch { return []; } };
const sbUpsert = async (id, data) => { try { await fetch(`${SB_URL}/rest/v1/students`, { method:"POST", headers:{...SBH,"Content-Type":"application/json",Prefer:"resolution=merge-duplicates"}, body:JSON.stringify({id,data,updated_at:new Date().toISOString()}) }); } catch {} };
const sbDel = async (id) => { try { await fetch(`${SB_URL}/rest/v1/students?id=eq.${id}`, { method:"DELETE", headers:SBH }); } catch {} };
const sbGetSetting = async (key) => { try { const r = await fetch(`${SB_URL}/rest/v1/settings?key=eq.${key}&select=value`, { headers:SBH }); const d = await r.json(); return d?.length ? d[0].value : null; } catch { return null; } };
const sbSetSetting = async (key, value) => { try { await fetch(`${SB_URL}/rest/v1/settings`, { method:"POST", headers:{...SBH,"Content-Type":"application/json",Prefer:"resolution=merge-duplicates"}, body:JSON.stringify({key,value}) }); } catch {} };
const lsGet = (k,fb=null) => { try { const v=localStorage.getItem(k); return v?JSON.parse(v):fb; } catch { return fb; } };
const lsSet = (k,v) => { try { localStorage.setItem(k,JSON.stringify(v)); } catch {} };

const C = {
  navy:"#1A2A45", navyMid:"#243355", blue:"#2B58B8",
  accent:"#C8A655", accentSoft:"#F0E4C0",
  bg:"#F2F5FB", card:"#FFFFFF", border:"#DAE0EF",
  text:"#1A2A45", textMid:"#475070", textLight:"#8290B0",
  success:"#1E9E6B", warn:"#D97706", danger:"#DC2626", passed:"#059669",
};

const SESSIONS = [
  {id:"s1",label:"1교시",subs:[{id:"분석조닝",name:"분석조닝문제"},{id:"배치",name:"배치문제"}]},
  {id:"s2",label:"2교시",subs:[{id:"평면",name:"평면문제"}]},
  {id:"s3",label:"3교시",subs:[{id:"구조",name:"구조문제"},{id:"단면",name:"단면문제"}]},
];
const GICHUL = ["2020년 1회","2020년 2회","2021년 1회","2021년 2회","2022년 1회","2022년 2회","2023년 1회","2023년 2회","2024년 1회","2024년 2회","2025년 1회","2025년 2회","2026년 1회"];
const HW_TYPES = [
  {id:"이해",name:"이해문제",count:10},
  {id:"기초",name:"기초문제",count:4},
  {id:"집중",name:"집중문제",count:6},
  {id:"기출",name:"과년도 기출",count:13},
  {id:"심화",name:"심화문제",count:8},
];
const HW_TOTAL = HW_TYPES.reduce((s,t)=>s+t.count,0);
const GRADES = ["A","B","C","D","F"];
const GS = {A:5,B:4,C:3,D:2,F:1};
const WEEKS = Array.from({length:20},(_,i)=>i+1);
const CLASSES_AZ = Array.from({length:26},(_,i)=>String.fromCharCode(65+i)+"반");
const DEFAULT_PW = "0000";
const SUBJECTS_ALL = ["분석조닝문제","배치문제","평면문제","구조문제","단면문제","전반적"];
const CHART_COLORS = ["#2B58B8","#C8A655","#1E9E6B","#DC2626","#7C3AED","#D97706","#059669","#0EA5E9"];

const DEFAULT_TEACHERS_INIT = {
  "A반":"신민철","B반":"이서연","C반":"전재환","D반":"이유정",
  "E반":"전재환","F반":"최유정","G반":"전재환","H반":"이영미",
  "I반":"전재환","J반":"이서연","K반":"이서연","L반":"이영미",
  "M반":"전재환","N반":"신민철","O반":"신민철","P반":"이서연",
  "Q반":"최유정","R반":"이서연","S반":"이영미","U반":"이서연",
  "V반":"신민철","개인과외":"조소민/배기태/신민철",
};

const allSubIds = () => SESSIONS.flatMap(s=>s.subs.map(sub=>sub.id));
const subName = sid => SESSIONS.flatMap(s=>s.subs).find(s=>s.id===sid)?.name||sid;
const isPassed = (subId,info) => SESSIONS.some(sess=>(info?.passedSessions||[]).includes(sess.id)&&sess.subs.some(s=>s.id===subId));
const pct = (v,t) => t===0?0:Math.round((v/t)*100);
const gCol = g => ({A:C.success,B:C.blue,C:C.warn,D:C.warn,F:C.danger}[g]||C.textLight);
const uid = () => String(Date.now()+Math.floor(Math.random()*999999));
const calcHw = sd => { let n=0; HW_TYPES.forEach(t=>{ for(let i=0;i<t.count;i++) if(sd?.hw?.[t.id]?.[i]) n++; }); return n; };
const calcAttend = att => { let out=0,absent=0,late=0; WEEKS.forEach(w=>{ const s=att?.[w]; if(s==="출석")out++; else if(s==="결석")absent++; else if(s==="지각")late++; }); return {out,absent,late,total:20}; };
const makeSubData = () => ({hw:{},mid:{plan:"",work:"",rank:""},final:{plan:"",work:"",rank:""},comment:""});
const makeStudent = (id,name="새 수강생") => ({
  id:String(id),
  info:{className:"A반",name,birthYear:"",isPreArch:false,isWorking:false,passedSessions:[],goal:""},
  attend:{},
  subjects:Object.fromEntries(allSubIds().map(sid=>[sid,makeSubData()])),
  counseling:[],
});
const sessSummary = (s) => {
  const ids=allSubIds().filter(sid=>!isPassed(sid,s.info));
  if(!ids.length) return 100;
  return pct(ids.reduce((acc,sid)=>acc+calcHw(s.subjects[sid]||makeSubData()),0),HW_TOTAL*ids.length);
};

const SEED = [
  {n:"최영주",c:"A반",p:[]},{n:"김주찬",c:"A반",p:[]},{n:"강우정",c:"A반",p:[]},{n:"이주현",c:"A반",p:[]},{n:"배민건",c:"A반",p:[]},{n:"이도경",c:"A반",p:[]},{n:"김수혜",c:"A반",p:[]},{n:"임범호",c:"A반",p:[]},{n:"권이설",c:"A반",p:[]},{n:"신희선",c:"A반",p:[]},
  {n:"이유상",c:"B반",p:[]},{n:"박난송",c:"B반",p:[]},{n:"권혁범",c:"B반",p:[]},{n:"이대원",c:"B반",p:[]},{n:"안용석",c:"B반",p:[]},
  {n:"진실환",c:"C반",p:[]},{n:"정연모",c:"C반",p:[]},{n:"조상희",c:"C반",p:[]},{n:"이연우",c:"C반",p:[]},{n:"심동혁",c:"C반",p:[]},{n:"나기주",c:"C반",p:[]},{n:"안영홍",c:"C반",p:[]},{n:"김석영",c:"C반",p:[]},{n:"허다운",c:"C반",p:[]},
  {n:"이한결",c:"D반",p:[]},{n:"박상국",c:"D반",p:[]},{n:"이현석",c:"D반",p:[]},{n:"안종원",c:"D반",p:[]},{n:"박주원",c:"D반",p:[]},{n:"송형창",c:"D반",p:[]},{n:"김민선",c:"D반",p:[]},{n:"김성경",c:"D반",p:[]},{n:"문범호",c:"D반",p:[]},{n:"노유진",c:"D반",p:[]},
  {n:"문현빈",c:"E반",p:[]},{n:"김도은",c:"E반",p:[]},{n:"정진호",c:"E반",p:["s1"]},{n:"김지나",c:"E반",p:[]},{n:"김현경",c:"E반",p:[]},{n:"이은총",c:"E반",p:[]},{n:"이종필",c:"E반",p:[]},{n:"김성록",c:"E반",p:[]},{n:"이성섭",c:"E반",p:[]},
  {n:"이호준",c:"F반",p:["s2"]},{n:"박다임",c:"F반",p:["s2"]},{n:"지영선",c:"F반",p:["s2"]},{n:"유촌호",c:"F반",p:["s2"]},{n:"양기정",c:"F반",p:["s2"]},{n:"정득화",c:"F반",p:["s2"]},{n:"사명석",c:"F반",p:["s2"]},{n:"김향환",c:"F반",p:["s2"]},
  {n:"박희은",c:"G반",p:[]},{n:"장현수",c:"G반",p:[]},{n:"홍보라",c:"G반",p:[]},{n:"박정은",c:"G반",p:[]},{n:"김종석",c:"G반",p:[]},{n:"배주현",c:"G반",p:["s2"]},{n:"권승혁",c:"G반",p:[]},{n:"이숙경",c:"G반",p:[]},{n:"박관호",c:"G반",p:[]},
  {n:"서강우",c:"H반",p:["s1","s3"]},{n:"박주석",c:"H반",p:["s1","s3"]},{n:"정소연",c:"H반",p:["s3"]},{n:"이재진",c:"H반",p:["s3"]},{n:"정상형",c:"H반",p:["s3"]},{n:"윤종경",c:"H반",p:["s1","s3"]},{n:"김경환",c:"H반",p:["s2","s3"]},
  {n:"손준혁",c:"I반",p:[]},{n:"이재명",c:"I반",p:[]},{n:"강유라",c:"I반",p:[]},{n:"전형록",c:"I반",p:[]},{n:"조준영",c:"I반",p:[]},{n:"김대민",c:"I반",p:[]},{n:"신재",c:"I반",p:[]},{n:"김고은",c:"I반",p:[]},{n:"임승유",c:"I반",p:[]},
  {n:"최호영",c:"J반",p:[]},{n:"박태우",c:"J반",p:[]},{n:"홍유진",c:"J반",p:[]},{n:"박상진",c:"J반",p:[]},{n:"배연주",c:"J반",p:[]},{n:"이성준",c:"J반",p:[]},{n:"김성민",c:"J반",p:[]},{n:"김동희",c:"J반",p:[]},
  {n:"홍성주",c:"K반",p:["s1"]},{n:"엄희용",c:"K반",p:["s1"]},{n:"허동호",c:"K반",p:["s1"]},{n:"김현준",c:"K반",p:["s1"]},{n:"박준례",c:"K반",p:["s1"]},{n:"한혜림",c:"K반",p:["s1"]},{n:"홍기",c:"K반",p:["s1"]},{n:"곽준걸",c:"K반",p:["s1"]},{n:"배은경",c:"K반",p:["s1","s2"]},{n:"김규현",c:"K반",p:["s1"]},
  {n:"조고문이",c:"L반",p:[]},{n:"심경환",c:"L반",p:[]},{n:"심원보",c:"L반",p:[]},{n:"이영복",c:"L반",p:[]},{n:"권순태",c:"L반",p:[]},{n:"유재인",c:"L반",p:[]},{n:"박성준",c:"L반",p:["s1"]},{n:"박준태",c:"L반",p:[]},{n:"정아영",c:"L반",p:["s1"]},{n:"김소원",c:"L반",p:["s1"]},
  {n:"김경특",c:"M반",p:["s1"]},{n:"박정은",c:"M반",p:[]},{n:"배병언",c:"M반",p:[]},{n:"안희라",c:"M반",p:[]},{n:"김중운",c:"M반",p:["s1"]},{n:"강현일",c:"M반",p:[]},{n:"권익모",c:"M반",p:[]},{n:"신나라",c:"M반",p:[]},
  {n:"정지혜",c:"N반",p:[]},{n:"한해정",c:"N반",p:[]},{n:"신혜윤",c:"N반",p:[]},{n:"조중원",c:"N반",p:["s1"]},{n:"김수정",c:"N반",p:[]},{n:"황유정",c:"N반",p:[]},{n:"권준호",c:"N반",p:[]},{n:"이정희",c:"N반",p:[]},{n:"박아름",c:"N반",p:[]},{n:"김종문",c:"N반",p:["s1"]},
  {n:"임은지",c:"O반",p:[]},{n:"김민준",c:"O반",p:[]},{n:"김해리",c:"O반",p:[]},{n:"이시원",c:"O반",p:[]},{n:"정유정",c:"O반",p:[]},{n:"진평화",c:"O반",p:[]},{n:"이승현",c:"O반",p:[]},{n:"이영훈",c:"O반",p:[]},{n:"강우석",c:"O반",p:[]},{n:"최성관",c:"O반",p:[]},
  {n:"서보혁",c:"P반",p:[]},{n:"이준성",c:"P반",p:[]},{n:"박재희",c:"P반",p:[]},{n:"김지은",c:"P반",p:[]},{n:"김찬",c:"P반",p:[]},{n:"김태경",c:"P반",p:[]},{n:"최순민",c:"P반",p:[]},{n:"송승후",c:"P반",p:[]},{n:"한현직",c:"P반",p:[]},{n:"김진홍",c:"P반",p:[]},
  {n:"손용훈",c:"Q반",p:[]},{n:"임재형",c:"Q반",p:[]},{n:"조한슬",c:"Q반",p:[]},{n:"박용범",c:"Q반",p:[]},{n:"최문기",c:"Q반",p:[]},{n:"정유라",c:"Q반",p:[]},{n:"심상호",c:"Q반",p:[]},{n:"한종",c:"Q반",p:[]},{n:"류주희",c:"Q반",p:[]},{n:"강효상",c:"Q반",p:["s1"]},
  {n:"이용재",c:"R반",p:[]},{n:"최원재",c:"R반",p:[]},{n:"연대광",c:"R반",p:[]},{n:"류재일",c:"R반",p:[]},{n:"서석량",c:"R반",p:[]},{n:"윤연철",c:"R반",p:[]},{n:"이승현",c:"R반",p:[]},{n:"김병찬",c:"R반",p:[]},{n:"김충호",c:"R반",p:[]},
  {n:"권혁만",c:"S반",p:["s2"]},{n:"김태형",c:"S반",p:["s1","s2"]},{n:"권수연",c:"S반",p:["s2"]},{n:"김태로",c:"S반",p:["s2","s3"]},{n:"현진",c:"S반",p:["s2"]},{n:"안세은",c:"S반",p:["s2","s3"]},{n:"이종문",c:"S반",p:["s1","s2"]},
  {n:"임은주",c:"U반",p:[]},{n:"김민지",c:"U반",p:[]},{n:"최나혹",c:"U반",p:[]},{n:"김도연",c:"U반",p:[]},{n:"황현",c:"U반",p:["s1"]},{n:"김미진",c:"U반",p:["s2","s3"]},{n:"윤민속",c:"U반",p:[]},{n:"강용구",c:"U반",p:[]},
  {n:"정용국",c:"V반",p:[]},{n:"최준우",c:"V반",p:[]},{n:"김선재",c:"V반",p:[]},{n:"윤다희",c:"V반",p:[]},{n:"송원길",c:"V반",p:[]},{n:"정윤환",c:"V반",p:[]},{n:"김재완",c:"V반",p:[]},{n:"고연진",c:"V반",p:[]},{n:"이다연",c:"V반",p:[]},{n:"이지홍",c:"V반",p:[]},
  {n:"고자경",c:"개인과외",p:[]},{n:"고금영",c:"개인과외",p:[]},{n:"주혜림",c:"개인과외",p:[]},{n:"이상민",c:"개인과외",p:[]},{n:"양수지",c:"개인과외",p:[]},{n:"곽은정",c:"개인과외",p:[]},{n:"유현준",c:"개인과외",p:[]},{n:"윤서희",c:"개인과외",p:[]},{n:"김성준",c:"개인과외",p:[]},
];

// ── UI 컴포넌트 ───────────────────────────────────────────
const PBar = ({value,color=C.blue,h=8,label}) => (
  <div>
    {label&&<div style={{display:"flex",justifyContent:"space-between",marginBottom:4,fontSize:12,color:C.textMid}}><span>{label}</span><span style={{fontWeight:700,color}}>{value}%</span></div>}
    <div style={{background:C.border,borderRadius:99,height:h,overflow:"hidden"}}><div style={{width:`${value}%`,height:"100%",background:color,borderRadius:99,transition:"width .4s"}}/></div>
  </div>
);
const Donut = ({value,total,color=C.blue,size=120,label}) => {
  const p=pct(value,total);
  return (
    <div style={{textAlign:"center"}}>
      <div style={{position:"relative",width:size,height:size,margin:"0 auto"}}>
        <PieChart width={size} height={size}><Pie data={[{v:p},{v:100-p}]} dataKey="v" innerRadius={size*.35} outerRadius={size*.47} startAngle={90} endAngle={-270} strokeWidth={0}><Cell fill={color}/><Cell fill={C.border}/></Pie></PieChart>
        <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
          <span style={{fontSize:size*.19,fontWeight:800,color}}>{p}%</span>
          <span style={{fontSize:size*.1,color:C.textLight}}>완료</span>
        </div>
      </div>
      {label&&<div style={{marginTop:6,fontSize:12,fontWeight:600,color:C.textMid}}>{label}</div>}
    </div>
  );
};
const SecT = ({children}) => (
  <div style={{fontSize:15,fontWeight:800,color:C.navy,marginBottom:16,display:"flex",alignItems:"center",gap:8}}>
    {children}<div style={{flex:1,height:1,background:C.border,marginLeft:8}}/>
  </div>
);
const Bdg = ({children,color=C.blue,bg}) => <span style={{background:bg||color+"18",color,borderRadius:6,padding:"2px 7px",fontSize:10,fontWeight:700}}>{children}</span>;
const Tog = ({value,onChange,label}) => (
  <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}}>
    <div onClick={()=>onChange(!value)} style={{width:40,height:22,borderRadius:11,background:value?C.blue:C.border,position:"relative",transition:"background .2s",cursor:"pointer",flexShrink:0}}>
      <div style={{position:"absolute",top:3,left:value?20:3,width:16,height:16,borderRadius:"50%",background:"#fff",transition:"left .2s"}}/>
    </div>
    <span style={{fontSize:13,color:value?C.blue:C.textMid,fontWeight:value?700:400}}>{label}</span>
  </label>
);
const GSel = ({value,onChange,label}) => (
  <div style={{display:"flex",flexDirection:"column",gap:4}}>
    <label style={{fontSize:11,fontWeight:600,color:C.textMid}}>{label}</label>
    <select value={value} onChange={e=>onChange(e.target.value)} style={{padding:"7px 10px",borderRadius:8,border:`1.5px solid ${value?gCol(value):C.border}`,fontSize:14,fontWeight:700,color:value?gCol(value):C.textLight,background:value?gCol(value)+"12":C.card,cursor:"pointer",outline:"none"}}>
      <option value="">등급</option>{GRADES.map(g=><option key={g} value={g}>{g}</option>)}
    </select>
  </div>
);
const Modal = ({onClose,children,maxW=480}) => (
  <div style={{position:"fixed",inset:0,background:"#00000088",zIndex:999,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
    <div style={{background:C.card,borderRadius:20,width:"100%",maxWidth:maxW,maxHeight:"90vh",overflow:"auto",boxShadow:"0 24px 80px #0008"}}>
      {children}
    </div>
  </div>
);

// ── 상담 섹션 ────────────────────────────────────────────
function CounselingSection({counseling=[],onChange,readOnly}) {
  const [editing,setEditing] = useState(null);
  const [form,setForm] = useState({});
  const upd = (k,v) => setForm(f=>({...f,[k]:v}));
  const sessions = ["1차","2차","3차","4차","5차","6차","7차","8차","9차","10차"];

  const newRec = () => {
    setForm({id:uid(),date:new Date().toISOString().slice(0,10),session:"1차",hardest:"",easiest:"",dailyHours:"",weeklyHours:"",goal:"",notes:""});
    setEditing("new");
  };
  const saveRec = () => {
    if(editing==="new") onChange([...counseling,form]);
    else onChange(counseling.map(r=>r.id===editing?form:r));
    setEditing(null); setForm({});
  };

  return (
    <div>
      {!readOnly&&<button onClick={newRec} style={{background:C.blue,color:"#fff",border:"none",borderRadius:9,padding:"9px 18px",fontWeight:700,cursor:"pointer",fontSize:13,marginBottom:16}}>+ 상담 기록 추가</button>}
      {counseling.length===0&&<div style={{textAlign:"center",padding:"30px 0",color:C.textLight,fontSize:13}}>상담 기록이 없어요</div>}
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {[...counseling].sort((a,b)=>b.date.localeCompare(a.date)).map(r=>(
          <div key={r.id} style={{background:C.bg,borderRadius:13,padding:16,border:`1px solid ${C.border}`}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,flexWrap:"wrap"}}>
              <span style={{background:C.navy,color:C.accent,borderRadius:6,padding:"2px 10px",fontSize:12,fontWeight:800}}>{r.session}</span>
              <span style={{fontSize:13,fontWeight:700,color:C.navy}}>{r.date}</span>
              {!readOnly&&<div style={{marginLeft:"auto",display:"flex",gap:6}}>
                <button onClick={()=>{setForm({...r});setEditing(r.id);}} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:7,padding:"4px 10px",cursor:"pointer",fontSize:11,color:C.textMid}}>✏️</button>
                <button onClick={()=>onChange(counseling.filter(x=>x.id!==r.id))} style={{background:"none",border:`1px solid ${C.danger}44`,borderRadius:7,padding:"4px 10px",cursor:"pointer",fontSize:11,color:C.danger}}>삭제</button>
              </div>}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",gap:8,marginBottom:r.notes?10:0}}>
              {r.hardest&&<div style={{background:"#FEF2F2",borderRadius:8,padding:"8px 12px"}}><div style={{fontSize:9,color:C.danger,fontWeight:700,marginBottom:2}}>😓 어려운 과목</div><div style={{fontSize:12,color:C.text,fontWeight:600}}>{r.hardest}</div></div>}
              {r.easiest&&<div style={{background:"#ECFDF5",borderRadius:8,padding:"8px 12px"}}><div style={{fontSize:9,color:C.success,fontWeight:700,marginBottom:2}}>😊 쉬운 과목</div><div style={{fontSize:12,color:C.text,fontWeight:600}}>{r.easiest}</div></div>}
              {r.dailyHours&&<div style={{background:C.bg,borderRadius:8,padding:"8px 12px",border:`1px solid ${C.border}`}}><div style={{fontSize:9,color:C.textLight,fontWeight:700,marginBottom:2}}>⏰ 일 공부</div><div style={{fontSize:12,color:C.text,fontWeight:600}}>{r.dailyHours}시간</div></div>}
              {r.weeklyHours&&<div style={{background:C.bg,borderRadius:8,padding:"8px 12px",border:`1px solid ${C.border}`}}><div style={{fontSize:9,color:C.textLight,fontWeight:700,marginBottom:2}}>📅 주 공부</div><div style={{fontSize:12,color:C.text,fontWeight:600}}>{r.weeklyHours}시간</div></div>}
              {r.goal&&<div style={{background:"#EBF0FB",borderRadius:8,padding:"8px 12px"}}><div style={{fontSize:9,color:C.blue,fontWeight:700,marginBottom:2}}>🎯 목표</div><div style={{fontSize:12,color:C.text,fontWeight:600}}>{r.goal}</div></div>}
            </div>
            {r.notes&&<div style={{background:"#fff",borderRadius:8,padding:"10px 12px",border:`1px solid ${C.border}`,fontSize:13,color:C.text,lineHeight:1.7,whiteSpace:"pre-wrap"}}>{r.notes}</div>}
          </div>
        ))}
      </div>

      {editing&&(
        <Modal onClose={()=>{setEditing(null);setForm({});}}>
          <div style={{background:C.navy,borderRadius:"20px 20px 0 0",padding:"18px 24px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{fontSize:15,fontWeight:900,color:"#fff"}}>💬 {editing==="new"?"새 상담 기록":"상담 기록 수정"}</div>
            <button onClick={()=>{setEditing(null);setForm({});}} style={{background:"#ffffff22",border:"none",borderRadius:7,color:"#fff",padding:"4px 12px",cursor:"pointer",fontWeight:700}}>닫기</button>
          </div>
          <div style={{padding:24,display:"flex",flexDirection:"column",gap:14}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div>
                <label style={{fontSize:12,fontWeight:700,color:C.textMid,display:"block",marginBottom:5}}>상담 차수</label>
                <select value={form.session||"1차"} onChange={e=>upd("session",e.target.value)} style={{width:"100%",padding:"10px 12px",borderRadius:9,border:`1.5px solid ${C.border}`,fontSize:13,outline:"none"}}>
                  {sessions.map(s=><option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={{fontSize:12,fontWeight:700,color:C.textMid,display:"block",marginBottom:5}}>날짜</label>
                <input type="date" value={form.date||""} onChange={e=>upd("date",e.target.value)} style={{width:"100%",padding:"10px 12px",borderRadius:9,border:`1.5px solid ${C.border}`,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              {[["😓 어려운 과목","hardest",C.danger],["😊 쉬운 과목","easiest",C.success]].map(([lbl,key,col])=>(
                <div key={key}>
                  <label style={{fontSize:12,fontWeight:700,color:col,display:"block",marginBottom:5}}>{lbl}</label>
                  <select value={form[key]||""} onChange={e=>upd(key,e.target.value)} style={{width:"100%",padding:"10px 12px",borderRadius:9,border:`1.5px solid ${C.border}`,fontSize:13,outline:"none"}}>
                    <option value="">선택</option>
                    {SUBJECTS_ALL.map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              {[["⏰ 일 공부시간 (시간)","dailyHours"],["📅 주 공부시간 (시간)","weeklyHours"]].map(([lbl,key])=>(
                <div key={key}>
                  <label style={{fontSize:12,fontWeight:700,color:C.textMid,display:"block",marginBottom:5}}>{lbl}</label>
                  <input type="number" min="0" max="24" value={form[key]||""} onChange={e=>upd(key,e.target.value)} style={{width:"100%",padding:"10px 12px",borderRadius:9,border:`1.5px solid ${C.border}`,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
                </div>
              ))}
            </div>
            <div>
              <label style={{fontSize:12,fontWeight:700,color:C.blue,display:"block",marginBottom:5}}>🎯 수강생 목표</label>
              <input value={form.goal||""} onChange={e=>upd("goal",e.target.value)} placeholder="예: 2026년 1회 합격" style={{width:"100%",padding:"10px 12px",borderRadius:9,border:`1.5px solid ${C.border}`,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
            </div>
            <div>
              <label style={{fontSize:12,fontWeight:700,color:C.textMid,display:"block",marginBottom:5}}>📝 상담 메모</label>
              <textarea value={form.notes||""} onChange={e=>upd("notes",e.target.value)} placeholder="상담 내용, 특이사항, 개선점 등..." rows={4}
                style={{width:"100%",padding:"10px 12px",borderRadius:9,border:`1.5px solid ${C.border}`,fontSize:13,outline:"none",resize:"vertical",fontFamily:"inherit",boxSizing:"border-box"}}/>
            </div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={saveRec} style={{flex:1,background:C.navy,color:"#fff",border:"none",borderRadius:11,padding:13,fontWeight:800,cursor:"pointer",fontSize:14}}>저장</button>
              <button onClick={()=>{setEditing(null);setForm({});}} style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:11,padding:"13px 18px",cursor:"pointer",color:C.textMid,fontSize:13}}>취소</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── 학습 통계 뷰 ─────────────────────────────────────────
function StatsView({students,classTeachers,teacherList}) {
  const [mode,setMode] = useState("class");

  const classGroups = {};
  students.forEach(s=>{
    const c=s.info.className;
    if(!classGroups[c]) classGroups[c]=[];
    classGroups[c].push(s);
  });
  const classData = Object.entries(classGroups).map(([cls,ss])=>({
    name:cls.length>5?cls.slice(0,5):cls, cls,
    숙제:Math.round(ss.reduce((sum,s)=>sum+sessSummary(s),0)/ss.length),
    출석:Math.round(ss.reduce((sum,s)=>{const a=calcAttend(s.attend||{});return sum+pct(a.out,20);},0)/ss.length),
    인원:ss.length, 상담:ss.filter(s=>s.counseling?.length>0).length,
    teacher:classTeachers[cls]||"",
  })).sort((a,b)=>a.cls.localeCompare(b.cls,"ko"));

  const teacherGroups = {};
  students.forEach(s=>{
    const t=classTeachers[s.info.className]||"미배정";
    if(!teacherGroups[t]) teacherGroups[t]=[];
    teacherGroups[t].push(s);
  });
  const teacherData = Object.entries(teacherGroups).map(([t,ss])=>({
    name:t.length>4?t.slice(0,4):t, fullName:t, 수강생수:ss.length,
    숙제:Math.round(ss.reduce((sum,s)=>sum+sessSummary(s),0)/ss.length),
    출석:Math.round(ss.reduce((sum,s)=>{const a=calcAttend(s.attend||{});return sum+pct(a.out,20);},0)/ss.length),
  }));

  return (
    <div>
      <div style={{display:"flex",gap:8,marginBottom:18}}>
        {[["class","📊 반별"],["teacher","👨‍🏫 담당 건축사별"]].map(([k,l])=>(
          <button key={k} onClick={()=>setMode(k)} style={{padding:"8px 16px",borderRadius:9,border:`1.5px solid ${mode===k?C.blue:C.border}`,background:mode===k?C.blue:C.card,color:mode===k?"#fff":C.textMid,fontWeight:700,cursor:"pointer",fontSize:13}}>{l}</button>
        ))}
      </div>

      {mode==="class"&&(
        <div>
          <div style={{background:"#fff",borderRadius:12,padding:20,marginBottom:16,border:`1px solid ${C.border}`}}>
            <div style={{fontSize:13,fontWeight:800,color:C.navy,marginBottom:12}}>반별 숙제 달성률 / 출석률</div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={classData} margin={{top:5,right:10,left:-15,bottom:40}}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
                <XAxis dataKey="name" tick={{fontSize:10,fill:C.textMid}} angle={-30} textAnchor="end" interval={0}/>
                <YAxis domain={[0,100]} tick={{fontSize:10}} tickFormatter={v=>v+"%"}/>
                <Tooltip formatter={v=>v+"%"}/>
                <Legend wrapperStyle={{fontSize:11}}/>
                <Bar dataKey="숙제" fill={C.blue} radius={[3,3,0,0]}/>
                <Bar dataKey="출석" fill={C.success} radius={[3,3,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:8}}>
            {classData.map(d=>(
              <div key={d.cls} style={{background:"#fff",borderRadius:10,padding:12,border:`1px solid ${C.border}`}}>
                <div style={{fontSize:12,fontWeight:800,color:C.navy}}>{d.cls}</div>
                {d.teacher&&<div style={{fontSize:10,color:C.textLight,marginBottom:6}}>👨‍🏫 {d.teacher}</div>}
                <div style={{fontSize:11,color:C.textMid}}>인원 <b>{d.인원}</b>명</div>
                <div style={{fontSize:11,color:C.blue}}>숙제 <b>{d.숙제}%</b></div>
                <div style={{fontSize:11,color:C.success}}>출석 <b>{d.출석}%</b></div>
                <div style={{fontSize:11,color:C.accent}}>상담 <b>{d.상담}</b>명</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {mode==="teacher"&&(
        <div>
          <div style={{background:"#fff",borderRadius:12,padding:20,marginBottom:16,border:`1px solid ${C.border}`}}>
            <div style={{fontSize:13,fontWeight:800,color:C.navy,marginBottom:12}}>담당 건축사별 평균 달성률</div>
            <div style={{display:"flex",alignItems:"center",gap:20,flexWrap:"wrap"}}>
              <PieChart width={180} height={180}>
                <Pie data={teacherData} dataKey="수강생수" cx={90} cy={90} outerRadius={80}>
                  {teacherData.map((_,i)=><Cell key={i} fill={CHART_COLORS[i%CHART_COLORS.length]}/>)}
                </Pie>
                <Tooltip formatter={(v,n,p)=>[`${v}명`,p.payload.fullName]}/>
              </PieChart>
              <div style={{flex:1,minWidth:200}}>
                {teacherData.map((d,i)=>(
                  <div key={d.fullName} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,padding:"8px 12px",background:C.bg,borderRadius:8}}>
                    <div style={{width:10,height:10,borderRadius:"50%",background:CHART_COLORS[i%CHART_COLORS.length],flexShrink:0}}/>
                    <div style={{flex:1}}>
                      <div style={{fontSize:12,fontWeight:700,color:C.navy}}>{d.fullName}</div>
                      <div style={{fontSize:11,color:C.textMid}}>{d.수강생수}명 · 숙제 {d.숙제}% · 출석 {d.출석}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div style={{background:"#fff",borderRadius:12,padding:20,border:`1px solid ${C.border}`}}>
            <div style={{fontSize:13,fontWeight:800,color:C.navy,marginBottom:12}}>담당 건축사별 성취도 비교</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={teacherData} margin={{top:5,right:10,left:-15,bottom:5}}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
                <XAxis dataKey="name" tick={{fontSize:11,fill:C.textMid}}/>
                <YAxis domain={[0,100]} tick={{fontSize:11}} tickFormatter={v=>v+"%"}/>
                <Tooltip formatter={v=>v+"%"}/>
                <Legend wrapperStyle={{fontSize:11}}/>
                <Bar dataKey="숙제" fill={C.blue} radius={[3,3,0,0]}/>
                <Bar dataKey="출석" fill={C.success} radius={[3,3,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

// ── 설정 모달 ─────────────────────────────────────────────
function SettingsModal({students,setStudents,storedPw,onPwChange,customClasses,setCustomClasses,classTeachers,setClassTeachers,teacherNames,setTeacherNames,onClose}) {
  const [tab,setTab]=useState("class");
  const [curPw,setCurPw]=useState(""); const [newPw,setNewPw]=useState(""); const [conPw,setConPw]=useState(""); const [pwMsg,setPwMsg]=useState("");
  const [newCls,setNewCls]=useState(""); const [renamingIdx,setRenamingIdx]=useState(null); const [clsMsg,setClsMsg]=useState("");
  const [newTeacher,setNewTeacher]=useState(""); const [teacherMsg,setTeacherMsg]=useState("");
  const [renTeacher,setRenTeacher]=useState(null); // {idx, val}

  const allCls=useMemo(()=>[...new Set([...students.map(s=>s.info.className),...customClasses])].sort((a,b)=>a.localeCompare(b,"ko")),[students,customClasses]);

  const savePw=async()=>{
    if(curPw!==(storedPw||DEFAULT_PW)){setPwMsg("현재 비밀번호가 틀렸어요");return;}
    if(newPw.length<4){setPwMsg("4자 이상이어야 해요");return;}
    if(newPw!==conPw){setPwMsg("새 비밀번호가 일치하지 않아요");return;}
    lsSet("sj_teacher_pw",newPw); await sbSetSetting("teacher_password",newPw);
    onPwChange(newPw); setPwMsg("✅ 변경됐어요!"); setTimeout(()=>{setCurPw("");setNewPw("");setConPw("");setPwMsg("");},2000);
  };
  const addCls=()=>{const name=newCls.trim();if(!name||allCls.includes(name)){setClsMsg("중복된 반 이름이에요");return;}const upd=[...customClasses,name];setCustomClasses(upd);lsSet("sj_custom_classes",upd);setNewCls("");setClsMsg("✅ 추가됐어요!");setTimeout(()=>setClsMsg(""),2000);};
  const doRename=(oldName,newName)=>{if(!newName.trim()||newName.trim()===oldName){setRenamingIdx(null);return;}setStudents(prev=>prev.map(s=>s.info.className===oldName?{...s,info:{...s.info,className:newName.trim()}}:s));const updCls=customClasses.map(c=>c===oldName?newName.trim():c);setCustomClasses(updCls);lsSet("sj_custom_classes",updCls);const updT={...classTeachers};if(updT[oldName]){updT[newName.trim()]=updT[oldName];delete updT[oldName];}setClassTeachers(updT);lsSet("sj_class_teachers",updT);setRenamingIdx(null);setClsMsg(`✅ 변경됐어요!`);setTimeout(()=>setClsMsg(""),2000);};
  const delCls=(cls)=>{const cnt=students.filter(s=>s.info.className===cls).length;if(cnt>0){setClsMsg(`수강생 ${cnt}명이 있어 삭제 불가`);setTimeout(()=>setClsMsg(""),2000);return;}const upd=customClasses.filter(c=>c!==cls);setCustomClasses(upd);lsSet("sj_custom_classes",upd);};

  const addTeacher=()=>{const name=newTeacher.trim();if(!name||teacherNames.includes(name)){setTeacherMsg("중복된 이름이에요");return;}const upd=[...teacherNames,name];setTeacherNames(upd);lsSet("sj_teacher_names",upd);setNewTeacher("");setTeacherMsg("✅ 추가됐어요!");setTimeout(()=>setTeacherMsg(""),2000);};
  const delTeacher=(name)=>{const upd=teacherNames.filter(t=>t!==name);setTeacherNames(upd);lsSet("sj_teacher_names",upd);const updT={};Object.entries(classTeachers).forEach(([k,v])=>{if(v!==name)updT[k]=v;});setClassTeachers(updT);lsSet("sj_class_teachers",updT);};
  const renTeacherDo=(oldName,newName)=>{if(!newName.trim()||newName.trim()===oldName){setRenTeacher(null);return;}const upd=teacherNames.map(t=>t===oldName?newName.trim():t);setTeacherNames(upd);lsSet("sj_teacher_names",upd);const updT={};Object.entries(classTeachers).forEach(([k,v])=>{updT[k]=v===oldName?newName.trim():v;});setClassTeachers(updT);lsSet("sj_class_teachers",updT);setRenTeacher(null);};

  const TABS=[["class","🏛 반 관리"],["teacher_mgmt","👨‍🏫 건축사 관리"],["class_teacher","🔗 반-건축사 연결"],["pw","🔑 비밀번호"]];

  return (
    <Modal onClose={onClose} maxW={500}>
      <div style={{background:C.navy,borderRadius:"20px 20px 0 0",padding:"18px 24px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{fontSize:16,fontWeight:900,color:"#fff"}}>⚙️ 설정</div>
        <button onClick={onClose} style={{background:"#ffffff22",border:"none",borderRadius:8,color:"#fff",padding:"5px 12px",cursor:"pointer",fontWeight:700}}>닫기</button>
      </div>
      <div style={{display:"flex",borderBottom:`1px solid ${C.border}`,overflowX:"auto"}}>
        {TABS.map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)} style={{flexShrink:0,padding:"10px 14px",border:"none",background:"none",cursor:"pointer",fontWeight:tab===k?800:400,color:tab===k?C.blue:C.textLight,borderBottom:`2.5px solid ${tab===k?C.blue:"transparent"}`,fontSize:11,whiteSpace:"nowrap"}}>{l}</button>
        ))}
      </div>
      <div style={{padding:24}}>
        {tab==="class"&&(
          <div>
            {clsMsg&&<div style={{background:clsMsg.startsWith("✅")?"#ECFDF5":"#FEF2F2",borderRadius:10,padding:"9px 14px",fontSize:12,color:clsMsg.startsWith("✅")?C.success:C.danger,marginBottom:14}}>{clsMsg}</div>}
            <div style={{marginBottom:16}}>
              <div style={{fontSize:13,fontWeight:700,color:C.navy,marginBottom:8}}>새 반 추가</div>
              <div style={{display:"flex",gap:8}}><input value={newCls} onChange={e=>setNewCls(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addCls()} placeholder="예: W반, 특별반..." style={{flex:1,padding:"10px 12px",borderRadius:9,border:`1.5px solid ${C.border}`,fontSize:13,outline:"none"}}/><button onClick={addCls} style={{background:C.blue,color:"#fff",border:"none",borderRadius:9,padding:"10px 16px",fontWeight:700,cursor:"pointer",fontSize:13}}>추가</button></div>
            </div>
            <div style={{fontSize:13,fontWeight:700,color:C.navy,marginBottom:8}}>반 목록 ({allCls.length}개)</div>
            <div style={{display:"flex",flexDirection:"column",gap:6,maxHeight:280,overflowY:"auto"}}>
              {allCls.map((cls,idx)=>{
                const cnt=students.filter(s=>s.info.className===cls).length;
                const RenRow=()=>{const[v,sv]=useState(cls);return(<><input value={v} onChange={e=>sv(e.target.value)} autoFocus onKeyDown={e=>{if(e.key==="Enter")doRename(cls,v);if(e.key==="Escape")setRenamingIdx(null);}} style={{flex:1,padding:"6px 10px",borderRadius:7,border:`1.5px solid ${C.blue}`,fontSize:13,outline:"none"}}/><button onClick={()=>doRename(cls,v)} style={{background:C.success,color:"#fff",border:"none",borderRadius:7,padding:"6px 12px",fontWeight:700,cursor:"pointer",fontSize:12}}>저장</button><button onClick={()=>setRenamingIdx(null)} style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:7,padding:"6px 10px",cursor:"pointer",fontSize:12,color:C.textMid}}>취소</button></>);};
                return(
                  <div key={cls} style={{display:"flex",alignItems:"center",gap:8,background:C.bg,borderRadius:9,padding:"9px 12px",border:`1px solid ${C.border}`}}>
                    {renamingIdx===idx?<RenRow/>:<>
                      <div style={{flex:1}}><span style={{fontWeight:700,fontSize:13,color:C.text}}>{cls}</span><span style={{fontSize:11,color:C.textLight,marginLeft:8}}>{cnt}명</span>{classTeachers[cls]&&<span style={{fontSize:10,color:C.textMid,marginLeft:8}}>👨‍🏫 {classTeachers[cls]}</span>}</div>
                      <button onClick={()=>setRenamingIdx(idx)} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:7,padding:"5px 10px",cursor:"pointer",fontSize:11,color:C.textMid}}>✏️</button>
                      {cnt===0&&<button onClick={()=>delCls(cls)} style={{background:"none",border:`1px solid ${C.danger}44`,borderRadius:7,padding:"5px 10px",cursor:"pointer",fontSize:11,color:C.danger}}>삭제</button>}
                    </>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab==="teacher_mgmt"&&(
          <div>
            {teacherMsg&&<div style={{background:teacherMsg.startsWith("✅")?"#ECFDF5":"#FEF2F2",borderRadius:10,padding:"9px 14px",fontSize:12,color:teacherMsg.startsWith("✅")?C.success:C.danger,marginBottom:14}}>{teacherMsg}</div>}
            <div style={{marginBottom:16}}>
              <div style={{fontSize:13,fontWeight:700,color:C.navy,marginBottom:8}}>건축사 추가</div>
              <div style={{display:"flex",gap:8}}><input value={newTeacher} onChange={e=>setNewTeacher(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addTeacher()} placeholder="예: 홍길동" style={{flex:1,padding:"10px 12px",borderRadius:9,border:`1.5px solid ${C.border}`,fontSize:13,outline:"none"}}/><button onClick={addTeacher} style={{background:C.blue,color:"#fff",border:"none",borderRadius:9,padding:"10px 16px",fontWeight:700,cursor:"pointer",fontSize:13}}>추가</button></div>
            </div>
            <div style={{fontSize:13,fontWeight:700,color:C.navy,marginBottom:8}}>건축사 목록 ({teacherNames.length}명)</div>
            <div style={{display:"flex",flexDirection:"column",gap:6,maxHeight:280,overflowY:"auto"}}>
              {teacherNames.map((t,i)=>{
                const clsCnt=Object.entries(classTeachers).filter(([,v])=>v===t).length;
                const stuCnt=students.filter(s=>classTeachers[s.info.className]===t).length;
                const RenT=()=>{const[v,sv]=useState(t);return(<><input value={v} onChange={e=>sv(e.target.value)} autoFocus onKeyDown={e=>{if(e.key==="Enter")renTeacherDo(t,v);if(e.key==="Escape")setRenTeacher(null);}} style={{flex:1,padding:"6px 10px",borderRadius:7,border:`1.5px solid ${C.blue}`,fontSize:13,outline:"none"}}/><button onClick={()=>renTeacherDo(t,v)} style={{background:C.success,color:"#fff",border:"none",borderRadius:7,padding:"6px 12px",fontWeight:700,cursor:"pointer",fontSize:12}}>저장</button><button onClick={()=>setRenTeacher(null)} style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:7,padding:"6px 10px",cursor:"pointer",fontSize:12,color:C.textMid}}>취소</button></>);};
                return(
                  <div key={t} style={{display:"flex",alignItems:"center",gap:8,background:C.bg,borderRadius:9,padding:"10px 12px",border:`1px solid ${C.border}`}}>
                    {renTeacher===i?<RenT/>:<>
                      <div style={{width:36,height:36,borderRadius:10,background:C.navy,display:"flex",alignItems:"center",justifyContent:"center",color:C.accent,fontWeight:900,fontSize:15,flexShrink:0}}>👨‍🏫</div>
                      <div style={{flex:1}}><div style={{fontSize:13,fontWeight:700,color:C.text}}>{t}</div><div style={{fontSize:11,color:C.textLight}}>{clsCnt}개 반 · 수강생 {stuCnt}명</div></div>
                      <button onClick={()=>setRenTeacher(i)} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:7,padding:"5px 10px",cursor:"pointer",fontSize:11,color:C.textMid}}>✏️</button>
                      <button onClick={()=>delTeacher(t)} style={{background:"none",border:`1px solid ${C.danger}44`,borderRadius:7,padding:"5px 10px",cursor:"pointer",fontSize:11,color:C.danger}}>삭제</button>
                    </>}
                  </div>
                );
              })}
              {teacherNames.length===0&&<div style={{textAlign:"center",padding:"20px 0",color:C.textLight,fontSize:13}}>건축사가 없어요. 추가해주세요.</div>}
            </div>
          </div>
        )}

        {tab==="class_teacher"&&(
          <div>
            <div style={{fontSize:12,color:C.textMid,marginBottom:14}}>각 반에 담당 건축사를 연결하세요</div>
            <div style={{display:"flex",flexDirection:"column",gap:8,maxHeight:400,overflowY:"auto"}}>
              {allCls.map(cls=>(
                <div key={cls} style={{display:"flex",alignItems:"center",gap:10,background:C.bg,borderRadius:9,padding:"9px 12px",border:`1px solid ${C.border}`}}>
                  <span style={{fontWeight:700,fontSize:13,color:C.text,width:72,flexShrink:0}}>{cls}</span>
                  <select value={classTeachers[cls]||""} onChange={e=>{const u={...classTeachers,[cls]:e.target.value};setClassTeachers(u);lsSet("sj_class_teachers",u);}} style={{flex:1,padding:"7px 10px",borderRadius:7,border:`1.5px solid ${C.border}`,fontSize:13,outline:"none"}}>
                    <option value="">미배정</option>
                    {teacherNames.map(t=><option key={t} value={t}>{t}</option>)}
                  </select>
                  <span style={{fontSize:11,color:C.textLight,flexShrink:0}}>{students.filter(s=>s.info.className===cls).length}명</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab==="pw"&&(
          <div>
            {pwMsg&&<div style={{background:pwMsg.startsWith("✅")?"#ECFDF5":"#FEF2F2",borderRadius:10,padding:"9px 14px",fontSize:12,color:pwMsg.startsWith("✅")?C.success:C.danger,marginBottom:14}}>{pwMsg}</div>}
            <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:20}}>
              {[["현재 비밀번호",curPw,setCurPw],["새 비밀번호",newPw,setNewPw],["새 비밀번호 확인",conPw,setConPw]].map(([lbl,val,set])=>(
                <div key={lbl}><label style={{fontSize:12,fontWeight:700,color:C.textMid,display:"block",marginBottom:5}}>{lbl}</label><input type="password" value={val} onChange={e=>set(e.target.value)} onKeyDown={e=>e.key==="Enter"&&savePw()} style={{width:"100%",padding:"11px 14px",borderRadius:10,border:`1.5px solid ${C.border}`,fontSize:14,outline:"none",boxSizing:"border-box"}}/></div>
              ))}
            </div>
            <button onClick={savePw} style={{width:"100%",background:C.navy,color:"#fff",border:"none",borderRadius:11,padding:13,fontWeight:800,cursor:"pointer",fontSize:14}}>변경하기</button>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ── 나머지 컴포넌트들 ────────────────────────────────────
function LoginScreen({onLogin,storedPw}) {
  const [pw,setPw]=useState(""); const [err,setErr]=useState(false); const [loading,setLoading]=useState(false); const [showPw,setShowPw]=useState(false);
  const tryLogin=async()=>{if(!pw)return;setLoading(true);let correctPw=storedPw||DEFAULT_PW;try{const v=await sbGetSetting("teacher_password");if(v)correctPw=v;}catch{}if(pw===correctPw)onLogin("full");else{setErr(true);setTimeout(()=>setErr(false),2500);}setLoading(false);};
  return (
    <div style={{minHeight:"100vh",background:`linear-gradient(135deg,${C.navy},#0D1B30)`,display:"flex",alignItems:"center",justifyContent:"center",padding:20,fontFamily:"'Noto Sans KR',sans-serif"}}>
      <div style={{background:C.card,borderRadius:24,padding:"44px 40px",maxWidth:400,width:"100%",boxShadow:"0 24px 80px #00000066"}}>
        <div style={{textAlign:"center",marginBottom:36}}>
          <div style={{width:72,height:72,borderRadius:20,background:C.navy,margin:"0 auto 16px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:36}}>🏛</div>
          <div style={{fontSize:24,fontWeight:900,color:C.navy}}>신전스퀘어</div>
          <div style={{fontSize:12,color:C.textLight,marginTop:6,letterSpacing:2}}>SHINJEON SQUARE</div>
        </div>
        <div style={{marginBottom:20}}>
          <label style={{fontSize:12,fontWeight:700,color:C.textMid,display:"block",marginBottom:8}}>비밀번호</label>
          <div style={{position:"relative"}}>
            <input type={showPw?"text":"password"} value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&tryLogin()} placeholder="비밀번호 입력" autoFocus
              style={{width:"100%",padding:"13px 44px 13px 16px",borderRadius:12,border:`2px solid ${err?C.danger:pw?C.blue:C.border}`,fontSize:16,outline:"none",boxSizing:"border-box",background:err?"#FEF2F2":"#fff"}}/>
            <button onClick={()=>setShowPw(p=>!p)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:18,color:C.textLight}}>{showPw?"🙈":"👁"}</button>
          </div>
          {err&&<div style={{fontSize:12,color:C.danger,marginTop:6,fontWeight:600}}>❌ 비밀번호가 틀렸습니다</div>}
        </div>
        <button onClick={tryLogin} disabled={loading||!pw} style={{width:"100%",background:(!pw||loading)?C.border:`linear-gradient(135deg,${C.navy},${C.blue})`,color:"#fff",border:"none",borderRadius:12,padding:"14px",fontWeight:800,fontSize:16,cursor:(!pw||loading)?"not-allowed":"pointer",marginBottom:20}}>{loading?"확인 중…":"로그인"}</button>
        <div style={{borderTop:`1px solid ${C.border}`,paddingTop:16,textAlign:"center"}}>
          <button onClick={()=>onLogin("readonly")} style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:9,padding:"8px 20px",color:C.textMid,cursor:"pointer",fontSize:12,fontWeight:600}}>📄 결과서만 보기</button>
        </div>
      </div>
    </div>
  );
}

function InfoForm({info,onChange,allClasses}) {
  const upd=(k,v)=>onChange({...info,[k]:v});
  const toggleSess=sid=>{const cur=info.passedSessions||[];upd("passedSessions",cur.includes(sid)?cur.filter(s=>s!==sid):[...cur,sid]);};
  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:12}}>
        <div><label style={{fontSize:11,fontWeight:600,color:C.textMid,display:"block",marginBottom:5}}>반</label><select value={info.className} onChange={e=>upd("className",e.target.value)} style={{width:"100%",padding:"9px 12px",borderRadius:9,border:`1.5px solid ${C.border}`,fontSize:13,outline:"none"}}>{allClasses.map(c=><option key={c}>{c}</option>)}</select></div>
        {[["이름","name","홍길동"],["년생","birthYear","예: 92년생"]].map(([lbl,key,ph])=>(
          <div key={key}><label style={{fontSize:11,fontWeight:600,color:C.textMid,display:"block",marginBottom:5}}>{lbl}</label><input value={info[key]||""} onChange={e=>upd(key,e.target.value)} placeholder={ph} style={{width:"100%",padding:"9px 12px",borderRadius:9,border:`1.5px solid ${C.border}`,fontSize:13,outline:"none",boxSizing:"border-box"}}/></div>
        ))}
      </div>
      <div style={{display:"flex",gap:24,flexWrap:"wrap"}}>
        <Tog value={info.isPreArch||false} onChange={v=>upd("isPreArch",v)} label="예비건축사"/>
        <Tog value={info.isWorking||false} onChange={v=>upd("isWorking",v)} label="재직 중"/>
      </div>
      <div><label style={{fontSize:11,fontWeight:600,color:C.textMid,display:"block",marginBottom:5}}>합격 목표</label><input value={info.goal||""} onChange={e=>upd("goal",e.target.value)} placeholder="예: 2026년 건축사 합격" style={{width:"100%",padding:"9px 12px",borderRadius:9,border:`1.5px solid ${C.border}`,fontSize:13,outline:"none",boxSizing:"border-box"}}/></div>
      <div>
        <div style={{fontSize:11,fontWeight:600,color:C.textMid,marginBottom:8}}>기존 합격 과목</div>
        <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
          {SESSIONS.map(sess=>{const passed=(info.passedSessions||[]).includes(sess.id);return(<button key={sess.id} onClick={()=>toggleSess(sess.id)} style={{padding:"8px 18px",borderRadius:10,border:`2px solid ${passed?C.passed:C.border}`,background:passed?C.passed+"18":C.card,color:passed?C.passed:C.textMid,fontWeight:700,cursor:"pointer",fontSize:13}}>{passed&&"✓ "}{sess.label}{passed&&<Bdg color={C.passed}>합격</Bdg>}</button>);})}
        </div>
      </div>
    </div>
  );
}

function HwAcc({subjectId,subjectData,onToggle}) {
  const [open,setOpen]=useState({});
  return (
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      {HW_TYPES.map(type=>{
        const done=Array.from({length:type.count},(_,i)=>subjectData?.hw?.[type.id]?.[i]).filter(Boolean).length;
        const isOpen=open[type.id]; const isGichul=type.id==="기출";
        return (
          <div key={type.id} style={{border:`1px solid ${C.border}`,borderRadius:10,overflow:"hidden"}}>
            <button onClick={()=>setOpen(p=>({...p,[type.id]:!p[type.id]}))} style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",background:isOpen?C.navy:C.card,border:"none",cursor:"pointer"}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{background:isOpen?C.accent:C.bg,color:isOpen?C.navy:C.blue,borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:700}}>{type.count}개</span>
                <span style={{fontWeight:700,color:isOpen?"#fff":C.text,fontSize:14}}>{type.name}</span>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <span style={{fontSize:12,color:isOpen?C.accentSoft:C.textLight}}>{done}/{type.count}</span>
                <span style={{color:isOpen?C.accent:C.textLight,fontSize:18,transform:isOpen?"rotate(180deg)":"none",transition:"transform .2s"}}>▾</span>
              </div>
            </button>
            {isOpen&&(
              <div style={{padding:"12px 14px",background:"#FAFBFE",display:"grid",gridTemplateColumns:isGichul?"repeat(auto-fill,minmax(108px,1fr))":"repeat(auto-fill,minmax(76px,1fr))",gap:6}}>
                {Array.from({length:type.count},(_,i)=>{
                  const checked=!!subjectData?.hw?.[type.id]?.[i];
                  const label=isGichul?(GICHUL[i]||`${i+1}번`):`${i+1}번`;
                  const showDiv=isGichul&&i>0&&i%2===0&&i<12;
                  return (<div key={i} style={{display:"contents"}}>{showDiv&&<div style={{gridColumn:"1/-1",height:1,background:C.border}}/>}<button onClick={()=>onToggle(subjectId,type.id,i)} style={{padding:"9px 6px",borderRadius:8,border:`2px solid ${checked?C.blue:C.border}`,background:checked?C.blue:C.card,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3,transition:"all .15s"}}><span style={{fontSize:14}}>{checked?"✓":"○"}</span><span style={{fontSize:10,fontWeight:700,color:checked?"#fff":C.textMid,whiteSpace:"nowrap",textAlign:"center",lineHeight:1.3}}>{label}</span></button></div>);
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function AttendSec({attend,onChange}) {
  const sCol=s=>s==="출석"?C.success:s==="지각"?C.warn:s==="결석"?C.danger:C.border;
  const next=s=>s==="출석"?"결석":s==="결석"?"지각":"출석";
  const a=calcAttend(attend);
  return (
    <div>
      <div style={{display:"flex",gap:12,marginBottom:14,flexWrap:"wrap"}}>
        {[["출석",a.out,C.success],["결석",a.absent,C.danger],["지각",a.late,C.warn]].map(([lbl,cnt,col])=>(<div key={lbl} style={{background:col+"12",borderRadius:8,padding:"6px 14px",border:`1px solid ${col}44`}}><span style={{fontSize:11,color:col,fontWeight:700}}>{lbl} {cnt}회</span></div>))}
        <div style={{background:C.bg,borderRadius:8,padding:"6px 14px",border:`1px solid ${C.border}`}}><span style={{fontSize:11,color:C.blue,fontWeight:700}}>출석률 {pct(a.out,20)}%</span></div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(68px,1fr))",gap:6}}>
        {WEEKS.map(w=>{const s=attend?.[w]||"";return(<button key={w} onClick={()=>onChange(w,next(s))} style={{padding:"8px 4px",borderRadius:8,border:`2px solid ${sCol(s)}`,background:s?sCol(s)+"18":C.bg,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2}}><span style={{fontSize:10,color:C.textLight}}>{w}주</span><span style={{fontSize:11,fontWeight:700,color:s?sCol(s):C.textLight}}>{s||"—"}</span></button>);})}
      </div>
      <div style={{display:"flex",gap:16,marginTop:10,fontSize:12,color:C.textMid,flexWrap:"wrap"}}>
        {["출석","결석","지각"].map(s=>(<span key={s} style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:8,height:8,borderRadius:"50%",background:sCol(s),display:"inline-block"}}/>{s}</span>))}
        <span style={{color:C.textLight}}>※ 클릭 시 순환</span>
      </div>
    </div>
  );
}

function ExamSec({subjectData,onChange}) {
  const upd=(exam,field,val)=>onChange({...subjectData,[exam]:{...(subjectData?.[exam]||{}),[field]:val}});
  return (
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:16}}>
      {[["mid","📋 중간고사"],["final","🏆 기말고사"]].map(([exam,label])=>{const d=subjectData?.[exam]||{};return(
        <div key={exam} style={{background:C.bg,borderRadius:12,padding:16}}>
          <div style={{fontSize:13,fontWeight:700,color:C.navy,marginBottom:12}}>{label}</div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <GSel label="계획 점수" value={d.plan||""} onChange={v=>upd(exam,"plan",v)}/>
            <GSel label="작도 점수" value={d.work||""} onChange={v=>upd(exam,"work",v)}/>
            <div><label style={{fontSize:11,fontWeight:600,color:C.textMid,display:"block",marginBottom:5}}>전체 석차</label><input type="number" min="1" value={d.rank||""} onChange={e=>upd(exam,"rank",e.target.value)} placeholder="등" style={{width:60,padding:"7px 10px",borderRadius:8,border:`1.5px solid ${C.border}`,fontSize:14,fontWeight:700,color:C.navy,textAlign:"center",outline:"none"}}/></div>
          </div>
        </div>
      );})}
    </div>
  );
}

function ShareModal({studentId,studentName,onClose}) {
  return (
    <Modal onClose={onClose} maxW={400}>
      <div style={{padding:24}}>
        <div style={{fontSize:16,fontWeight:800,color:C.navy,marginBottom:16}}>📤 결과서 공유 — {studentName}</div>
        <div style={{background:C.bg,borderRadius:12,padding:16,marginBottom:16}}><div style={{fontSize:11,color:C.textLight,marginBottom:4}}>수강생 ID (길게 눌러 복사)</div><div style={{fontSize:15,fontWeight:900,color:C.navy,wordBreak:"break-all",userSelect:"all"}}>{studentId}</div></div>
        <div style={{fontSize:12,color:C.textMid,marginBottom:16,lineHeight:1.8}}>받는 분은 앱 상단 입력칸에 ID 붙여넣기 → <strong>불러오기</strong></div>
        <button onClick={onClose} style={{width:"100%",background:C.navy,color:"#fff",border:"none",borderRadius:10,padding:"12px",fontWeight:700,cursor:"pointer",fontSize:14}}>확인</button>
      </div>
    </Modal>
  );
}

function ReportView({student,onBack,onShare,classTeachers}) {
  const info=student.info;
  const activeIds=allSubIds().filter(sid=>!isPassed(sid,info));
  const hwStats=activeIds.map(sid=>({sid,name:subName(sid),done:calcHw(student.subjects[sid]),p:pct(calcHw(student.subjects[sid]),HW_TOTAL)}));
  const totalDone=hwStats.reduce((s,h)=>s+h.done,0);
  const totalPoss=HW_TOTAL*activeIds.length;
  const att=calcAttend(student.attend||{});
  const attP=pct(att.out,att.total);
  const teacher=classTeachers?.[info.className];
  const barData=activeIds.map(sid=>{const sd=student.subjects[sid];return{name:subName(sid).replace("문제",""),"중간(계획)":GS[sd?.mid?.plan]||0,"중간(작도)":GS[sd?.mid?.work]||0,"기말(계획)":GS[sd?.final?.plan]||0,"기말(작도)":GS[sd?.final?.work]||0};});
  return (
    <div style={{maxWidth:920,margin:"0 auto",fontFamily:"'Noto Sans KR',sans-serif"}}>
      <style>{`@media print{.np{display:none!important}body{background:white!important}}`}</style>
      <div className="np" style={{display:"flex",gap:10,marginBottom:20,flexWrap:"wrap"}}>
        <button onClick={onBack} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 18px",cursor:"pointer",fontWeight:600,color:C.navy,fontSize:13}}>← 입력 화면</button>
        <button onClick={onShare} style={{background:C.blue,color:"#fff",border:"none",borderRadius:8,padding:"8px 18px",fontWeight:700,cursor:"pointer",fontSize:13}}>🔗 공유</button>
        <button onClick={()=>window.print()} style={{background:C.navy,color:"#fff",border:"none",borderRadius:8,padding:"8px 18px",fontWeight:700,cursor:"pointer",fontSize:13}}>🖨️ 인쇄/PDF</button>
      </div>
      <div style={{background:C.navy,borderRadius:16,padding:"30px 36px",marginBottom:20,color:"#fff"}}>
        <div style={{fontSize:10,letterSpacing:4,color:C.accent,marginBottom:6,fontWeight:700}}>SHINJEON SQUARE · 신전스퀘어</div>
        <div style={{fontSize:26,fontWeight:900,color:C.accent}}>학업 성취 결과서</div>
        <div style={{marginTop:20,background:"#ffffff12",borderRadius:12,padding:"14px 20px",display:"inline-block"}}>
          <div style={{fontSize:20,fontWeight:900}}>{info.className} {info.name}</div>
          {teacher&&<div style={{fontSize:12,color:C.accent,marginTop:2}}>👨‍🏫 {teacher}</div>}
          {info.goal&&<div style={{fontSize:12,color:"#8ab0d0",marginTop:2}}>🎯 {info.goal}</div>}
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:8}}>
            {info.isPreArch&&<Bdg color={C.accent} bg={C.accent+"30"}>예비건축사</Bdg>}
            {(info.passedSessions||[]).map(sid=>{const n=SESSIONS.find(s=>s.id===sid)?.label||sid;return <Bdg key={sid} color={C.passed} bg={C.passed+"30"}>{n} 합격</Bdg>;})}
          </div>
        </div>
        <div style={{marginTop:8,fontSize:12,color:"#6880a0"}}>출력일: {new Date().toLocaleDateString("ko-KR")}</div>
      </div>
      <div style={{background:C.card,borderRadius:16,padding:28,marginBottom:20,border:`1px solid ${C.border}`}}>
        <SecT>📚 숙제 이행률</SecT>
        <div style={{display:"flex",flexWrap:"wrap",gap:24,alignItems:"center",marginBottom:16}}><Donut value={totalDone} total={totalPoss} color={C.blue} size={130} label="전체 달성률"/><div style={{flex:1,minWidth:180,display:"flex",flexDirection:"column",gap:10}}>{hwStats.map(h=><PBar key={h.sid} label={h.name} value={h.p} color={h.p>=80?C.success:h.p>=50?C.warn:C.danger}/>)}</div></div>
        <div style={{background:C.bg,borderRadius:10,padding:"10px 16px",fontSize:13,color:C.textMid}}>전체 <strong>{totalPoss}</strong>문제 중 <strong style={{color:C.blue}}>{totalDone}문제</strong> 완료 ({pct(totalDone,totalPoss)}%)</div>
      </div>
      <div style={{background:C.card,borderRadius:16,padding:28,marginBottom:20,border:`1px solid ${C.border}`}}>
        <SecT>📅 출석률 (전체 공통)</SecT>
        <div style={{display:"flex",alignItems:"center",gap:28,flexWrap:"wrap"}}>
          <Donut value={att.out} total={att.total} color={attP>=80?C.success:C.warn} size={130} label="출석률"/>
          <div style={{flex:1,minWidth:180}}><PBar value={attP} color={attP>=80?C.success:attP>=70?C.warn:C.danger} h={12} label="출석률"/>
            <div style={{display:"flex",gap:16,marginTop:14,flexWrap:"wrap"}}>{[["출석",att.out,C.success],["결석",att.absent,C.danger],["지각",att.late,C.warn]].map(([lbl,cnt,col])=>(<div key={lbl} style={{background:col+"12",borderRadius:8,padding:"8px 16px",textAlign:"center"}}><div style={{fontSize:18,fontWeight:900,color:col}}>{cnt}</div><div style={{fontSize:11,color:col}}>{lbl}</div></div>))}</div>
          </div>
        </div>
      </div>
      {barData.length>0&&(<div style={{background:C.card,borderRadius:16,padding:28,marginBottom:20,border:`1px solid ${C.border}`}}><SecT>📊 시험 성적 분석</SecT><ResponsiveContainer width="100%" height={240}><BarChart data={barData} margin={{top:10,right:10,left:-10,bottom:0}}><CartesianGrid strokeDasharray="3 3" stroke={C.border}/><XAxis dataKey="name" tick={{fontSize:11,fill:C.textMid}}/><YAxis domain={[0,5]} tickFormatter={v=>["","F","D","C","B","A"][v]||""} tick={{fontSize:11}}/><Tooltip formatter={(v,n)=>[["","F","D","C","B","A"][v]||"-",n]}/><Legend wrapperStyle={{fontSize:11}}/><Bar dataKey="중간(계획)" fill={C.navyMid} radius={[4,4,0,0]}/><Bar dataKey="중간(작도)" fill={C.blue} radius={[4,4,0,0]}/><Bar dataKey="기말(계획)" fill={C.accent} radius={[4,4,0,0]}/><Bar dataKey="기말(작도)" fill={C.success} radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></div>)}
      {activeIds.some(sid=>student.subjects[sid]?.comment)&&(<div style={{background:C.card,borderRadius:16,padding:28,marginBottom:20,border:`1px solid ${C.border}`}}><SecT>✍️ 담당 건축사 종합평가</SecT>{activeIds.map(sid=>{const comment=student.subjects[sid]?.comment;if(!comment)return null;return(<div key={sid} style={{marginBottom:14}}><div style={{fontSize:13,fontWeight:700,color:C.blue,marginBottom:6}}>{subName(sid)}</div><div style={{background:C.bg,borderRadius:10,padding:14,fontSize:14,color:C.text,lineHeight:1.7,whiteSpace:"pre-wrap"}}>{comment}</div></div>);})}</div>)}
      {(student.counseling||[]).length>0&&(<div style={{background:C.card,borderRadius:16,padding:28,marginBottom:20,border:`1px solid ${C.border}`}}><SecT>💬 상담 기록 요약</SecT>{[...student.counseling].sort((a,b)=>b.date.localeCompare(a.date)).map(r=>(<div key={r.id} style={{marginBottom:12,background:C.bg,borderRadius:10,padding:14,display:"flex",gap:12,alignItems:"flex-start",flexWrap:"wrap"}}><span style={{background:C.navy,color:C.accent,borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:800,flexShrink:0}}>{r.session}</span><span style={{fontSize:12,color:C.textMid,flexShrink:0}}>{r.date}</span>{r.hardest&&<span style={{fontSize:11,color:C.danger}}>😓 {r.hardest}</span>}{r.easiest&&<span style={{fontSize:11,color:C.success}}>😊 {r.easiest}</span>}{r.dailyHours&&<span style={{fontSize:11,color:C.textMid}}>⏰ 일 {r.dailyHours}h</span>}{r.notes&&<div style={{width:"100%",fontSize:12,color:C.text,marginTop:4}}>{r.notes.slice(0,100)}{r.notes.length>100&&"…"}</div>}</div>))}</div>)}
    </div>
  );
}

// ── 메인 앱 ──────────────────────────────────────────────
export default function App() {
  const [isLoggedIn,setIsLoggedIn]=useState(false);
  const [isReadOnly,setIsReadOnly]=useState(false);
  const [students,setStudents]=useState([]);
  const [selectedId,setSelectedId]=useState(null);
  const [view,setView]=useState("dashboard");
  const [activeSess,setActiveSess]=useState(SESSIONS[0].id);
  const [activeSub,setActiveSub]=useState(SESSIONS[0].subs[0].id);
  const [showInfo,setShowInfo]=useState(false);
  const [detailTab,setDetailTab]=useState("study");
  const [saveStatus,setSaveStatus]=useState("idle");
  const [loadStatus,setLoadStatus]=useState("loading");
  const [shareModal,setShareModal]=useState(null);
  const [showSettings,setShowSettings]=useState(false);
  const [showStats,setShowStats]=useState(false);
  const [importId,setImportId]=useState("");
  const [bulkLoading,setBulkLoading]=useState(false);
  const [showBulkDone,setShowBulkDone]=useState(false);
  const [classFilter,setClassFilter]=useState("전체");
  const [teacherFilter,setTeacherFilter]=useState("전체");
  const [searchQuery,setSearchQuery]=useState("");
  const [customClasses,setCustomClasses]=useState([]);
  const [classTeachers,setClassTeachers]=useState(DEFAULT_TEACHERS_INIT);
  const [teacherNames,setTeacherNames]=useState(["신민철","이서연","전재환","이유정","최유정","이영미","조소민","배기태"]);
  const [storedPw,setStoredPw]=useState(DEFAULT_PW);
  const saveTimers=useRef({});

  useEffect(()=>{
    setCustomClasses(lsGet("sj_custom_classes",[]));
    const t=lsGet("sj_class_teachers",null); if(t)setClassTeachers({...DEFAULT_TEACHERS_INIT,...t});
    const tn=lsGet("sj_teacher_names",null); if(tn)setTeacherNames(tn);
    const p=lsGet("sj_teacher_pw",null); if(p)setStoredPw(p);
    (async()=>{const v=await sbGetSetting("teacher_password");if(v){setStoredPw(v);lsSet("sj_teacher_pw",v);}})();
  },[]);

  useEffect(()=>{
    (async()=>{try{const rows=await sbGet();setStudents(rows.map(r=>({...r.data,id:r.id})));setLoadStatus("ok");}catch{setLoadStatus("error");}})();
  },[]);

  const student=students.find(s=>s.id===selectedId);
  const saveStudent=(s)=>{if(saveTimers.current[s.id])clearTimeout(saveTimers.current[s.id]);setSaveStatus("saving");saveTimers.current[s.id]=setTimeout(async()=>{try{await sbUpsert(s.id,s);setSaveStatus("saved");setTimeout(()=>setSaveStatus("idle"),2000);}catch{setSaveStatus("error");}},800);};
  const updSt=(id,fn)=>setStudents(prev=>prev.map(s=>{if(s.id!==id)return s;const ns=fn(s);saveStudent(ns);return ns;}));
  const updSub=(subId,fn)=>updSt(selectedId,s=>({...s,subjects:{...s.subjects,[subId]:fn(s.subjects[subId]||makeSubData())}}));
  const toggleHw=(subId,typeId,idx)=>updSub(subId,sd=>({...sd,hw:{...sd.hw,[typeId]:{...sd.hw?.[typeId],[idx]:!sd.hw?.[typeId]?.[idx]}}}));
  const setAttend=(week,state)=>updSt(selectedId,s=>({...s,attend:{...s.attend,[week]:state}}));
  const setSubData=(subId,data)=>updSt(selectedId,s=>({...s,subjects:{...s.subjects,[subId]:data}}));
  const setComment=(subId,val)=>updSub(subId,sd=>({...sd,comment:val}));
  const updInfo=(info)=>updSt(selectedId,s=>({...s,info}));
  const updCounseling=(records)=>updSt(selectedId,s=>({...s,counseling:records}));

  const addStudent=async()=>{const id=uid();const ns=makeStudent(id);setStudents(prev=>[...prev,ns]);try{await sbUpsert(id,ns);}catch{}setSelectedId(id);setView("detail");setShowInfo(true);setDetailTab("study");};
  const delStudent=async(id)=>{setStudents(prev=>prev.filter(s=>s.id!==id));try{await sbDel(id);}catch{}if(selectedId===id){setSelectedId(null);setView("dashboard");}};
  const bulkImport=()=>{const existing=students.map(s=>s.info.name);const toAdd=SEED.filter(s=>!existing.includes(s.n));if(toAdd.length===0){setShowBulkDone(true);return;}const added=toAdd.map(seed=>{const id=uid();const ns=makeStudent(id,seed.n);ns.info.className=seed.c;ns.info.passedSessions=seed.p;return ns;});setStudents(prev=>[...prev,...added]);setBulkLoading(true);(async()=>{for(const ns of added){try{await sbUpsert(ns.id,ns);}catch{}await new Promise(r=>setTimeout(r,40));}setBulkLoading(false);setSaveStatus("saved");setTimeout(()=>setSaveStatus("idle"),3000);})();};
  const importById=async()=>{const id=importId.trim();if(!id)return;try{const r=await fetch(`${SB_URL}/rest/v1/students?id=eq.${id}`,{headers:SBH});const rows=await r.json();if(!rows.length)return;const s={...rows[0].data,id:rows[0].id};setStudents(prev=>{const ex=prev.find(x=>x.id===s.id);return ex?prev.map(x=>x.id===s.id?s:x):[...prev,s];});setSelectedId(s.id);setView("report");setImportId("");}catch{}};

  const allClasses=useMemo(()=>[...new Set([...students.map(s=>s.info.className),...customClasses,...CLASSES_AZ,"개인과외"])].sort((a,b)=>a.localeCompare(b,"ko")),[students,customClasses]);
  const teacherListFull=useMemo(()=>{const t=new Set(["전체"]);students.forEach(s=>{const v=classTeachers[s.info.className];if(v)t.add(v);});return[...t];},[students,classTeachers]);
  const filteredStudents=useMemo(()=>students.filter(s=>teacherFilter==="전체"||classTeachers[s.info.className]===teacherFilter).filter(s=>classFilter==="전체"||s.info.className===classFilter).filter(s=>!searchQuery||s.info.name.includes(searchQuery)).sort((a,b)=>a.info.className.localeCompare(b.info.className,"ko")||a.info.name.localeCompare(b.info.name,"ko")),[students,teacherFilter,classTeachers,classFilter,searchQuery]);

  const visibleSess=student?SESSIONS.filter(s=>!s.subs.every(sub=>isPassed(sub.id,student.info))):SESSIONS;
  const curSubData=student?.subjects?.[activeSub]||makeSubData();
  const hwDone=calcHw(curSubData);

  if(!isLoggedIn) return <LoginScreen onLogin={mode=>{setIsLoggedIn(true);setIsReadOnly(mode==="readonly");}} storedPw={storedPw}/>;

  if(view==="report"&&student) return (
    <div style={{minHeight:"100vh",background:C.bg,padding:"24px 16px",fontFamily:"'Noto Sans KR',sans-serif"}}>
      {shareModal&&<ShareModal studentId={shareModal.id} studentName={shareModal.name} onClose={()=>setShareModal(null)}/>}
      <ReportView student={student} classTeachers={classTeachers} onBack={()=>setView("detail")} onShare={()=>setShareModal({id:student.id,name:student.info.name})}/>
    </div>
  );

  if(loadStatus==="loading") return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16,fontFamily:"'Noto Sans KR',sans-serif"}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{width:40,height:40,borderRadius:"50%",border:`4px solid ${C.border}`,borderTopColor:C.blue,animation:"spin 1s linear infinite"}}/>
      <div style={{color:C.textMid,fontSize:14}}>데이터 불러오는 중…</div>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'Noto Sans KR',sans-serif"}}>
      {showSettings&&!isReadOnly&&<SettingsModal students={students} setStudents={setStudents} storedPw={storedPw} onPwChange={pw=>{setStoredPw(pw);lsSet("sj_teacher_pw",pw);}} customClasses={customClasses} setCustomClasses={setCustomClasses} classTeachers={classTeachers} setClassTeachers={t=>{setClassTeachers(t);lsSet("sj_class_teachers",t);}} teacherNames={teacherNames} setTeacherNames={t=>{setTeacherNames(t);lsSet("sj_teacher_names",t);}} onClose={()=>setShowSettings(false)}/>}
      {shareModal&&<ShareModal studentId={shareModal.id} studentName={shareModal.name} onClose={()=>setShareModal(null)}/>}

      {/* 헤더 */}
      <header style={{background:C.navy,padding:"10px 16px",position:"sticky",top:0,zIndex:100,borderBottom:`2px solid ${C.accent}40`}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
          <button onClick={()=>setView("dashboard")} style={{display:"flex",alignItems:"center",gap:8,background:"none",border:"none",cursor:"pointer",padding:0}}>
            <div style={{width:28,height:28,borderRadius:7,background:C.accent,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>🏛</div>
            <div><div style={{color:"#fff",fontWeight:900,fontSize:14,lineHeight:1.1}}>신전스퀘어</div><div style={{color:C.accent,fontSize:8,letterSpacing:1}}>성취도 관리</div></div>
          </button>
          <div style={{flex:1}}/>
          <div style={{fontSize:11,fontWeight:600,color:saveStatus==="saved"?C.success:saveStatus==="saving"?"#7ab0e8":saveStatus==="error"?C.danger:"transparent",whiteSpace:"nowrap"}}>{saveStatus==="saved"?"✓ 저장됨":saveStatus==="saving"?"저장 중…":saveStatus==="error"?"⚠️ 오류":""}</div>
          {!isReadOnly&&<button onClick={()=>setShowSettings(true)} style={{background:"transparent",border:`1px solid #344060`,borderRadius:8,padding:"5px 10px",color:"#a0b0cc",cursor:"pointer",fontSize:12}}>⚙️</button>}
          {isReadOnly&&<Bdg color={C.warn}>읽기 전용</Bdg>}
          <button onClick={()=>{setIsLoggedIn(false);setIsReadOnly(false);}} style={{background:"transparent",border:`1px solid #344060`,borderRadius:8,padding:"5px 10px",color:"#a0b0cc",cursor:"pointer",fontSize:11}}>{isReadOnly?"로그인":"로그아웃"}</button>
          {view==="detail"&&student&&<button onClick={()=>setView("report")} style={{background:C.accent,border:"none",borderRadius:8,padding:"6px 14px",color:C.navy,cursor:"pointer",fontSize:12,fontWeight:800}}>결과서 📄</button>}
        </div>
        <div style={{display:"flex",gap:8}}>
          <input value={importId} onChange={e=>setImportId(e.target.value)} onKeyDown={e=>e.key==="Enter"&&importById()} placeholder="📥 공유받은 수강생 ID 붙여넣기..."
            style={{flex:1,padding:"7px 12px",borderRadius:8,border:`1px solid #344060`,fontSize:12,outline:"none",background:"#1a2a45",color:"#fff"}}/>
          <button onClick={importById} style={{background:C.blue,color:"#fff",border:"none",borderRadius:8,padding:"7px 14px",fontWeight:700,cursor:"pointer",fontSize:12,whiteSpace:"nowrap"}}>불러오기</button>
        </div>
      </header>

      {/* 편집 모드 배너 */}
      {!isReadOnly&&<div style={{background:C.success,padding:"6px 16px",textAlign:"center",fontSize:11,fontWeight:700,color:"#fff"}}>✏️ 선생님 편집 모드 — 모든 항목 수정 가능합니다</div>}
      {isReadOnly&&<div style={{background:C.warn,padding:"6px 16px",textAlign:"center",fontSize:11,fontWeight:700,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>👁 결과서 보기 전용<button onClick={()=>{setIsLoggedIn(false);}} style={{background:"#ffffff33",border:"none",borderRadius:5,padding:"1px 8px",color:"#fff",cursor:"pointer",fontSize:10,fontWeight:700}}>선생님 로그인</button></div>}

      <main style={{maxWidth:1100,margin:"0 auto",padding:"20px 16px"}}>
        {/* ═══ 대시보드 ═══ */}
        {view==="dashboard"&&(
          <div>
            <div style={{marginBottom:16}}>
              <div style={{fontSize:22,fontWeight:900,color:C.navy}}>수강생 관리</div>
              <div style={{fontSize:14,color:C.textMid,marginTop:2}}>총 {students.length}명 · Supabase 자동저장</div>
            </div>
            {loadStatus==="error"&&<div style={{background:"#FEF2F2",border:`1px solid ${C.danger}`,borderRadius:10,padding:"12px 16px",marginBottom:16,fontSize:13,color:C.danger}}>⚠️ DB 연결 오류</div>}

            {/* 액션 버튼들 */}
            <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap",alignItems:"center"}}>
              <button onClick={()=>setShowStats(p=>!p)} style={{background:showStats?C.navy:C.card,border:`1.5px solid ${C.border}`,borderRadius:10,padding:"10px 18px",fontWeight:700,cursor:"pointer",fontSize:13,color:showStats?"#fff":C.textMid}}>{showStats?"✕ 통계 닫기":"📊 학습 통계"}</button>
              {!isReadOnly&&<>
                <button onClick={addStudent} style={{background:C.blue,color:"#fff",border:"none",borderRadius:10,padding:"10px 18px",fontWeight:700,cursor:"pointer",fontSize:13}}>+ 수강생 추가</button>
                <button onClick={bulkImport} disabled={bulkLoading} style={{background:bulkLoading?C.textLight:C.success,color:"#fff",border:"none",borderRadius:10,padding:"10px 18px",fontWeight:700,cursor:bulkLoading?"not-allowed":"pointer",fontSize:13}}>{bulkLoading?"등록 중…":`📋 전체 반 일괄 등록 (${SEED.length}명)`}</button>
                {showBulkDone&&<span style={{fontSize:12,color:C.success,fontWeight:700}}>✅ 이미 모두 등록됨!</span>}
              </>}
            </div>

            {/* 통계 패널 */}
            {showStats&&students.length>0&&(
              <div style={{background:C.card,borderRadius:14,padding:24,border:`1px solid ${C.border}`,marginBottom:16}}>
                <StatsView students={students} classTeachers={classTeachers} teacherList={teacherListFull}/>
              </div>
            )}

            {/* 담당 건축사 필터 */}
            {teacherListFull.length>1&&(
              <div style={{marginBottom:12}}>
                <div style={{fontSize:11,fontWeight:700,color:C.textMid,marginBottom:6}}>👨‍🏫 담당 건축사</div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {teacherListFull.map(t=>(
                    <button key={t} onClick={()=>{setTeacherFilter(t);setClassFilter("전체");}} style={{padding:"5px 13px",borderRadius:20,border:`1.5px solid ${teacherFilter===t?C.accent:C.border}`,background:teacherFilter===t?C.accent:C.card,color:teacherFilter===t?C.navy:C.textMid,fontWeight:teacherFilter===t?800:400,cursor:"pointer",fontSize:12}}>
                      {t}{t!=="전체"&&<span style={{fontSize:10,opacity:.7,marginLeft:4}}>{students.filter(s=>classTeachers[s.info.className]===t).length}명</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 검색 + 반 필터 */}
            <div style={{display:"flex",gap:10,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
              <input value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="🔍 이름 검색..." style={{padding:"8px 14px",borderRadius:9,border:`1.5px solid ${C.border}`,fontSize:13,outline:"none",minWidth:140}}/>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {["전체",...[...new Set(students.map(s=>s.info.className))].sort((a,b)=>a.localeCompare(b,"ko"))].map(cls=>{
                  const cnt=cls==="전체"?students.length:students.filter(s=>s.info.className===cls).length;
                  return (<button key={cls} onClick={()=>setClassFilter(cls)} style={{padding:"5px 11px",borderRadius:7,border:`1.5px solid ${classFilter===cls?C.blue:C.border}`,background:classFilter===cls?C.blue:C.card,color:classFilter===cls?"#fff":C.textMid,fontWeight:classFilter===cls?700:400,cursor:"pointer",fontSize:11,display:"flex",alignItems:"center",gap:4}}>{cls}{cnt>0&&<span style={{background:classFilter===cls?"#ffffff33":C.border,borderRadius:99,padding:"0 5px",fontSize:10,fontWeight:700}}>{cnt}</span>}</button>);
                })}
              </div>
            </div>

            {students.length===0&&loadStatus==="ok"&&<div style={{textAlign:"center",padding:"60px 0",color:C.textLight}}><div style={{fontSize:48,marginBottom:12}}>👥</div><div style={{fontSize:18,fontWeight:700,color:C.navy}}>수강생이 없습니다</div><div style={{fontSize:13,marginTop:8,color:C.textMid}}>📋 전체 반 일괄 등록 버튼을 눌러주세요</div></div>}

            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(230px,1fr))",gap:14}}>
              {filteredStudents.map(s=>{
                const overall=sessSummary(s); const teacher=classTeachers[s.info.className]; const hasCounseling=(s.counseling||[]).length>0;
                return (
                  <div key={s.id} style={{background:C.card,border:`1.5px solid ${C.border}`,borderRadius:14,padding:18,position:"relative",cursor:"pointer",transition:"all .2s"}}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor=C.blue;e.currentTarget.style.boxShadow=`0 4px 18px ${C.blue}22`;}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.boxShadow="none";}}
                    onClick={()=>{setSelectedId(s.id);setView(isReadOnly?"report":"detail");setShowInfo(!isReadOnly);setDetailTab("study");const fv=SESSIONS.find(sess=>!sess.subs.every(sub=>isPassed(sub.id,s.info)));if(fv){setActiveSess(fv.id);setActiveSub(fv.subs[0].id);}}}>
                    {!isReadOnly&&<button onClick={e=>{e.stopPropagation();delStudent(s.id);}} style={{position:"absolute",top:10,right:10,background:"none",border:"none",cursor:"pointer",fontSize:16,color:C.textLight}}>×</button>}
                    <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
                      <div style={{width:40,height:40,borderRadius:11,background:C.navy,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>👤</div>
                      <div>
                        <div style={{fontWeight:800,fontSize:15,color:C.text}}><span style={{background:C.navy,color:C.accent,borderRadius:5,padding:"1px 6px",fontSize:10,fontWeight:700,marginRight:6}}>{s.info.className}</span>{s.info.name}</div>
                        {teacher&&<div style={{fontSize:10,color:C.textLight,marginTop:2}}>👨‍🏫 {teacher}</div>}
                      </div>
                    </div>
                    <div style={{fontSize:11,color:C.textMid,marginBottom:5}}>숙제 달성률</div>
                    <PBar value={overall} h={6} color={overall>=80?C.success:overall>=50?C.warn:C.blue}/>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:5}}>
                      <div style={{fontSize:12,fontWeight:700,color:overall>=80?C.success:C.blue}}>{overall}%</div>
                      {hasCounseling&&<span style={{fontSize:10,color:C.accent,fontWeight:700}}>💬 상담 {(s.counseling||[]).length}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══ 상세 입력 ═══ */}
        {view==="detail"&&student&&(
          <div>
            {/* 상단 헤더 */}
            <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:20,flexWrap:"wrap"}}>
              <div style={{width:50,height:50,borderRadius:14,background:C.navy,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>👤</div>
              <div style={{flex:1}}>
                <div style={{fontSize:20,fontWeight:900,color:C.navy}}><span style={{fontSize:13,color:C.textLight,marginRight:6}}>{student.info.className}</span>{student.info.name}</div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:4}}>
                  {classTeachers[student.info.className]&&<Bdg color={C.accent}>👨‍🏫 {classTeachers[student.info.className]}</Bdg>}
                  {student.info.isPreArch&&<Bdg color={C.accent}>예비건축사</Bdg>}
                  {student.info.isWorking&&<Bdg color={C.blue}>재직 중</Bdg>}
                  {(student.info.passedSessions||[]).map(sid=><Bdg key={sid} color={C.passed}>{SESSIONS.find(s=>s.id===sid)?.label} 합격</Bdg>)}
                  {(student.counseling||[]).length>0&&<Bdg color={C.accent} bg={C.accent+"18"}>💬 상담 {student.counseling.length}회</Bdg>}
                </div>
              </div>
              {!isReadOnly&&<button onClick={()=>setShowInfo(p=>!p)} style={{background:showInfo?C.navy:C.blue,border:"none",borderRadius:9,padding:"9px 18px",cursor:"pointer",fontWeight:700,color:"#fff",fontSize:13}}>{showInfo?"▲ 닫기":"✏️ 인적사항 수정"}</button>}
            </div>

            {/* 인적사항 폼 */}
            {showInfo&&!isReadOnly&&(
              <div style={{background:C.card,borderRadius:14,padding:24,border:`1.5px solid ${C.accent}60`,marginBottom:20}}>
                <SecT>👤 수강생 인적사항</SecT>
                <InfoForm info={student.info} onChange={updInfo} allClasses={allClasses}/>
              </div>
            )}

            {/* 탭 선택 */}
            <div style={{display:"flex",gap:8,marginBottom:20,flexWrap:"wrap"}}>
              {[["study","📚 학습 기록"],["counseling","💬 상담 기록"]].map(([k,l])=>(
                <button key={k} onClick={()=>setDetailTab(k)} style={{padding:"10px 22px",borderRadius:11,border:`1.5px solid ${detailTab===k?C.blue:C.border}`,background:detailTab===k?C.blue:C.card,color:detailTab===k?"#fff":C.textMid,fontWeight:700,cursor:"pointer",fontSize:14}}>
                  {l}{k==="counseling"&&(student.counseling||[]).length>0&&<span style={{background:detailTab===k?"#ffffff33":C.accent+"22",color:detailTab===k?"#fff":C.accent,borderRadius:99,padding:"0 6px",fontSize:11,fontWeight:800,marginLeft:6}}>{student.counseling.length}</span>}
                </button>
              ))}
            </div>

            {/* 상담 탭 */}
            {detailTab==="counseling"&&(
              <div style={{background:C.card,borderRadius:14,padding:24,border:`1px solid ${C.border}`}}>
                <SecT>💬 상담 기록</SecT>
                <CounselingSection counseling={student.counseling||[]} readOnly={isReadOnly} onChange={updCounseling}/>
              </div>
            )}

            {/* 학습 탭 */}
            {detailTab==="study"&&(
              <div>
                {/* 출석 */}
                <div style={{background:C.card,borderRadius:14,padding:24,border:`1px solid ${C.border}`,marginBottom:20}}>
                  <SecT>📅 출석률 (20주) — 전체 공통</SecT>
                  <AttendSec attend={student.attend||{}} onChange={isReadOnly?()=>{}:(w,state)=>setAttend(w,state)}/>
                </div>

                {/* 교시 탭 */}
                {visibleSess.length===0?(
                  <div style={{textAlign:"center",padding:"60px 0",color:C.textLight,fontSize:16}}>🎉 모든 교시를 합격하셨습니다!</div>
                ):(
                  <div>
                    <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
                      {visibleSess.map(sess=>(<button key={sess.id} onClick={()=>{setActiveSess(sess.id);setActiveSub(sess.subs[0].id);}} style={{padding:"8px 18px",borderRadius:10,border:`1.5px solid ${activeSess===sess.id?C.blue:C.border}`,background:activeSess===sess.id?C.blue:C.card,color:activeSess===sess.id?"#fff":C.textMid,fontWeight:700,cursor:"pointer",fontSize:13}}>{sess.label}</button>))}
                    </div>
                    {(()=>{
                      const sess=SESSIONS.find(s=>s.id===activeSess); if(!sess)return null;
                      return (
                        <div>
                          <div style={{display:"flex",gap:8,marginBottom:18,flexWrap:"wrap"}}>
                            {sess.subs.map(sub=>(<button key={sub.id} onClick={()=>setActiveSub(sub.id)} style={{padding:"6px 14px",borderRadius:8,border:`1.5px solid ${activeSub===sub.id?C.accent:C.border}`,background:activeSub===sub.id?C.accent+"22":C.card,color:activeSub===sub.id?C.navy:C.textMid,fontWeight:600,cursor:"pointer",fontSize:12}}>{sub.name}</button>))}
                          </div>
                          <div style={{background:C.card,borderRadius:14,padding:"14px 20px",marginBottom:20,border:`1.5px solid ${C.border}`,display:"flex",alignItems:"center",gap:20}}>
                            <Donut value={hwDone} total={HW_TOTAL} color={C.blue} size={72}/>
                            <div style={{flex:1}}>
                              <div style={{fontWeight:700,fontSize:14,color:C.navy,marginBottom:6}}>{subName(activeSub)} — 숙제 달성률</div>
                              <PBar value={pct(hwDone,HW_TOTAL)} color={hwDone>=30?C.success:hwDone>=15?C.warn:C.blue} h={10}/>
                              <div style={{marginTop:4,fontSize:12,color:C.textMid}}>{hwDone}/{HW_TOTAL} 문제 완료</div>
                            </div>
                          </div>
                          <div style={{display:"flex",flexDirection:"column",gap:20}}>
                            <div style={{background:C.card,borderRadius:14,padding:24,border:`1px solid ${C.border}`}}>
                              <SecT>📝 숙제 이행률 (총 {HW_TOTAL}문제)</SecT>
                              <HwAcc subjectId={activeSub} subjectData={curSubData} onToggle={isReadOnly?()=>{}:toggleHw}/>
                            </div>
                            <div style={{background:C.card,borderRadius:14,padding:24,border:`1px solid ${C.border}`}}>
                              <SecT>🎯 시험 성적</SecT>
                              <ExamSec subjectData={curSubData} onChange={isReadOnly?()=>{}:(data)=>setSubData(activeSub,data)}/>
                            </div>
                            <div style={{background:C.card,borderRadius:14,padding:24,border:`1px solid ${C.border}`}}>
                              <SecT>✍️ 담당 건축사 종합평가</SecT>
                              {isReadOnly?(
                                <div style={{background:C.bg,borderRadius:10,padding:14,fontSize:14,color:C.text,lineHeight:1.7,minHeight:60,whiteSpace:"pre-wrap"}}>{curSubData?.comment||<span style={{color:C.textLight}}>작성된 평가 없음</span>}</div>
                              ):(
                                <textarea value={curSubData?.comment||""} onChange={e=>setComment(activeSub,e.target.value)} placeholder="수강생에 대한 종합 의견을 입력하세요..." rows={5}
                                  style={{width:"100%",padding:"12px 14px",borderRadius:10,border:`1.5px solid ${C.blue}`,fontSize:14,resize:"vertical",fontFamily:"inherit",lineHeight:1.7,color:C.text,outline:"none",boxSizing:"border-box"}}/>
                              )}
                            </div>
                          </div>
                          <div style={{textAlign:"center",marginTop:28}}>
                            <button onClick={()=>setView("report")} style={{background:`linear-gradient(135deg,${C.navy},${C.blue})`,color:"#fff",border:"none",borderRadius:12,padding:"14px 36px",fontSize:16,fontWeight:800,cursor:"pointer"}}>📄 수강생 결과서 보기</button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
