import { useState, useEffect, useRef } from "react";
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from "recharts";

// ═══════════════════════════════════════════════════
//  Supabase 설정
// ═══════════════════════════════════════════════════
const SUPABASE_URL = "https://yigtucvlikxeddqghtqw.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpZ3R1Y3ZsaWt4ZWRkcWdodHF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyOTcwNjgsImV4cCI6MjA5Nzg3MzA2OH0.MoTdu9sYMOLIaLhCNY9Ivs3hg32MbiHoqlOMcbRpIwY";

const sb = {
  async getAll() {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/students?select=*&order=updated_at.asc`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async upsert(id, data) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/students`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json", Prefer: "resolution=merge-duplicates"
      },
      body: JSON.stringify({ id, data, updated_at: new Date().toISOString() })
    });
    if (!res.ok) throw new Error(await res.text());
  },
  async delete(id) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/students?id=eq.${id}`, {
      method: "DELETE",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    });
    if (!res.ok) throw new Error(await res.text());
  },
  getShareUrl(studentId) {
    return `https://yigtucvlikxeddqghtqw.supabase.co/rest/v1/students?id=eq.${studentId}`;
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
};

// ═══════════════════════════════════════════════════
//  상수
// ═══════════════════════════════════════════════════
const SESSIONS = [
  { id:"s1", label:"1교시", subjects:[
    { id:"분석조닝", name:"분석조닝문제" },
    { id:"배치", name:"배치문제" },
  ]},
  { id:"s2", label:"2교시", subjects:[{ id:"평면", name:"평면문제" }]},
  { id:"s3", label:"3교시", subjects:[
    { id:"구조", name:"구조문제" },
    { id:"단면", name:"단면문제" },
  ]},
];
const HW_TYPES = [
  { id:"이해", name:"이해문제", count:10 },
  { id:"기초", name:"기초문제", count:4  },
  { id:"집중", name:"집중문제", count:6  },
  { id:"기출", name:"과년도 기출", count:10 },
  { id:"심화", name:"심화문제", count:8  },
];
const HW_TOTAL = HW_TYPES.reduce((s,t)=>s+t.count, 0);
const GRADES   = ["A","B","C","D","F"];
const GRADE_SCR= { A:5,B:4,C:3,D:2,F:1 };
const WEEKS    = Array.from({length:20},(_,i)=>i+1);
const CLASSES  = Array.from({length:26},(_,i)=>String.fromCharCode(65+i)+"반");

const getAllSubIds = () => SESSIONS.flatMap(s=>s.subjects.map(sub=>sub.id));

// ═══════════════════════════════════════════════════
//  데이터 팩토리
// ═══════════════════════════════════════════════════
const makeSubData = () => ({
  hw:{}, attend:{},
  mid:{ plan:"", work:"", rank:"" },
  final:{ plan:"", work:"", rank:"" },
  comment:"",
});
const makeStudent = (id, name="새 수강생") => ({
  id: String(id),
  info:{ className:"A반", name, birthYear:"", isPreArch:false, isWorking:false, passedSessions:[] },
  subjects: Object.fromEntries(getAllSubIds().map(sid=>[sid, makeSubData()])),
});

// ═══════════════════════════════════════════════════
//  유틸
// ═══════════════════════════════════════════════════
const pct   = (v,t) => t===0?0:Math.round((v/t)*100);
const gCol  = g => ({A:C.success,B:C.blue,C:C.warn,D:C.warn,F:C.danger}[g]||C.textLight);
const calcHw = sd => {
  let n=0;
  HW_TYPES.forEach(t=>{ for(let i=0;i<t.count;i++) if(sd?.hw?.[t.id]?.[i]) n++; });
  return n;
};
const calcAttend = sd => {
  let out=0,absent=0,late=0;
  WEEKS.forEach(w=>{ const s=sd?.attend?.[w]; if(s==="출석")out++; else if(s==="결석")absent++; else if(s==="지각")late++; });
  return {out,absent,late,total:WEEKS.length};
};
const isPassed = (subId, info) =>
  SESSIONS.some(sess=>(info?.passedSessions||[]).includes(sess.id)&&sess.subjects.some(s=>s.id===subId));
const countExaminees = (students, sessId) =>
  students.filter(s=>!(s.info.passedSessions||[]).includes(sessId)).length;

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
          <Pie data={[{v:pv},{v:100-pv}]} dataKey="v" innerRadius={size*.35} outerRadius={size*.47}
            startAngle={90} endAngle={-270} strokeWidth={0}>
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
  <span style={{display:"inline-flex",alignItems:"center",background:bg||color+"18",color,
    borderRadius:6,padding:"2px 7px",fontSize:10,fontWeight:700}}>{children}</span>
);

const Toggle = ({value,onChange,label}) => (
  <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}}>
    <div onClick={()=>onChange(!value)} style={{width:40,height:22,borderRadius:11,
      background:value?C.blue:C.border,position:"relative",transition:"background .2s",cursor:"pointer"}}>
      <div style={{position:"absolute",top:3,left:value?20:3,width:16,height:16,
        borderRadius:"50%",background:"#fff",transition:"left .2s"}}/>
    </div>
    <span style={{fontSize:13,color:value?C.blue:C.textMid,fontWeight:value?700:400}}>{label}</span>
  </label>
);

const GradeSelect = ({value,onChange,label}) => (
  <div style={{display:"flex",flexDirection:"column",gap:4}}>
    <label style={{fontSize:11,fontWeight:600,color:C.textMid}}>{label}</label>
    <select value={value} onChange={e=>onChange(e.target.value)} style={{
      padding:"7px 10px",borderRadius:8,border:`1.5px solid ${value?gCol(value):C.border}`,
      fontSize:14,fontWeight:700,color:value?gCol(value):C.textLight,
      background:value?gCol(value)+"12":C.card,cursor:"pointer",outline:"none"}}>
      <option value="">등급</option>
      {GRADES.map(g=><option key={g} value={g}>{g}</option>)}
    </select>
  </div>
);

// ═══════════════════════════════════════════════════
//  인적사항 폼
// ═══════════════════════════════════════════════════
const InfoForm = ({info,onChange}) => {
  const upd=(k,v)=>onChange({...info,[k]:v});
  const toggleSess=sid=>{
    const cur=info.passedSessions||[];
    upd("passedSessions",cur.includes(sid)?cur.filter(s=>s!==sid):[...cur,sid]);
  };
  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:12}}>
        <div>
          <label style={{fontSize:11,fontWeight:600,color:C.textMid,display:"block",marginBottom:5}}>반</label>
          <select value={info.className} onChange={e=>upd("className",e.target.value)}
            style={{width:"100%",padding:"9px 12px",borderRadius:9,border:`1.5px solid ${C.border}`,fontSize:13,outline:"none"}}>
            {CLASSES.map(c=><option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label style={{fontSize:11,fontWeight:600,color:C.textMid,display:"block",marginBottom:5}}>이름</label>
          <input value={info.name} onChange={e=>upd("name",e.target.value)} placeholder="홍길동"
            style={{width:"100%",padding:"9px 12px",borderRadius:9,border:`1.5px solid ${C.border}`,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
        </div>
        <div>
          <label style={{fontSize:11,fontWeight:600,color:C.textMid,display:"block",marginBottom:5}}>년생</label>
          <input value={info.birthYear} onChange={e=>upd("birthYear",e.target.value)} placeholder="예: 92년생"
            style={{width:"100%",padding:"9px 12px",borderRadius:9,border:`1.5px solid ${C.border}`,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
        </div>
      </div>
      <div style={{display:"flex",gap:24,flexWrap:"wrap"}}>
        <Toggle value={info.isPreArch} onChange={v=>upd("isPreArch",v)} label="예비건축사"/>
        <Toggle value={info.isWorking} onChange={v=>upd("isWorking",v)} label="재직 중"/>
      </div>
      <div>
        <div style={{fontSize:11,fontWeight:600,color:C.textMid,marginBottom:8}}>기존 합격 과목</div>
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
            <button onClick={()=>setOpen(p=>({...p,[type.id]:!p[type.id]}))} style={{
              width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",
              padding:"10px 14px",background:isOpen?C.navy:C.card,border:"none",cursor:"pointer"}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{background:isOpen?C.accent:C.bg,color:isOpen?C.navy:C.blue,
                  borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:700}}>{type.count}문제</span>
                <span style={{fontWeight:700,color:isOpen?"#fff":C.text,fontSize:14}}>{type.name}</span>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <span style={{fontSize:12,color:isOpen?C.accentSoft:C.textLight}}>{done}/{type.count}</span>
                <span style={{color:isOpen?C.accent:C.textLight,fontSize:18,
                  transform:isOpen?"rotate(180deg)":"none",transition:"transform .2s"}}>▾</span>
              </div>
            </button>
            {isOpen&&(
              <div style={{padding:"12px 14px",background:"#FAFBFE",
                display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(76px,1fr))",gap:8}}>
                {Array.from({length:type.count},(_,i)=>{
                  const checked=!!subjectData?.hw?.[type.id]?.[i];
                  return (
                    <button key={i} onClick={()=>onToggle(subjectId,type.id,i)} style={{
                      padding:"8px 4px",borderRadius:8,border:`2px solid ${checked?C.blue:C.border}`,
                      background:checked?C.blue:C.card,cursor:"pointer",
                      display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                      <span style={{fontSize:16}}>{checked?"✓":"○"}</span>
                      <span style={{fontSize:10,fontWeight:600,color:checked?"#fff":C.textMid}}>{i+1}번</span>
                    </button>
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
  const next =s=>s==="출석"?"결석":s==="결석"?"지각":"출석";
  return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(68px,1fr))",gap:6}}>
        {WEEKS.map(w=>{
          const s=subjectData?.attend?.[w]||"";
          return (
            <button key={w} onClick={()=>onChange(w,next(s))} style={{
              padding:"8px 4px",borderRadius:8,border:`2px solid ${sCol(s)}`,
              background:s?sCol(s)+"18":C.bg,cursor:"pointer",
              display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
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
        ))}
        <span style={{color:C.textLight}}>※ 클릭 시 순환</span>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════
//  시험 + 석차
// ═══════════════════════════════════════════════════
const ExamSection = ({subjectData,sessionId,students,onChange}) => {
  const total=countExaminees(students,sessionId);
  const upd=(exam,field,val)=>onChange({...subjectData,[exam]:{...subjectData[exam],[field]:val}});
  const Block=({exam,label})=>{
    const d=subjectData?.[exam]||{};
    const rankNum=parseInt(d.rank)||0;
    return (
      <div style={{background:C.bg,borderRadius:12,padding:16}}>
        <div style={{fontSize:13,fontWeight:700,color:C.navy,marginBottom:12}}>
          {exam==="mid"?"📋":"🏆"} {label}
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <GradeSelect label="계획 점수" value={d.plan||""} onChange={v=>upd(exam,"plan",v)}/>
          <GradeSelect label="작도 점수" value={d.work||""} onChange={v=>upd(exam,"work",v)}/>
          <div>
            <label style={{fontSize:11,fontWeight:600,color:C.textMid,display:"block",marginBottom:5}}>전체 석차</label>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <input type="number" min="1" value={d.rank||""} onChange={e=>upd(exam,"rank",e.target.value)}
                placeholder="등" style={{width:60,padding:"7px 10px",borderRadius:8,
                  border:`1.5px solid ${C.border}`,fontSize:14,fontWeight:700,
                  color:C.navy,textAlign:"center",outline:"none"}}/>
              <span style={{fontSize:13,color:C.textMid}}>등 /</span>
              <span style={{fontSize:15,fontWeight:800,color:C.blue}}>{total}</span>
              <span style={{fontSize:13,color:C.textMid}}>명</span>
            </div>
            {rankNum>0&&(
              <div style={{marginTop:5,fontSize:11,color:C.textLight,display:"flex",alignItems:"center",gap:6}}>
                상위 {pct(rankNum,total)}% 이내
                {rankNum<=Math.ceil(total*.1)&&<Badge color={C.accent} bg={C.accentSoft}>🏅 상위 10%</Badge>}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };
  return (
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:16}}>
      <Block exam="mid" label="중간고사"/>
      <Block exam="final" label="기말고사"/>
    </div>
  );
};

// ═══════════════════════════════════════════════════
//  결과서
// ═══════════════════════════════════════════════════
const ReportView = ({student,students,onBack,onShare}) => {
  const info=student.info;
  const allSubIds=getAllSubIds().filter(sid=>!isPassed(sid,info));
  const hwStats=allSubIds.map(sid=>({
    sid, done:calcHw(student.subjects[sid]),
    name:SESSIONS.flatMap(s=>s.subjects).find(s=>s.id===sid)?.name||sid,
    p:pct(calcHw(student.subjects[sid]),HW_TOTAL)
  }));
  const totalDone=hwStats.reduce((s,h)=>s+h.done,0);
  const totalPoss=HW_TOTAL*allSubIds.length;
  const attendStats=allSubIds.map(sid=>{
    const a=calcAttend(student.subjects[sid]);
    return {sid,name:SESSIONS.flatMap(s=>s.subjects).find(s=>s.id===sid)?.name||sid,...a,p:pct(a.out,a.total)};
  });
  const barData=allSubIds.map(sid=>{
    const sd=student.subjects[sid];
    const name=(SESSIONS.flatMap(s=>s.subjects).find(s=>s.id===sid)?.name||sid).replace("문제","");
    return {name,"중간(계획)":GRADE_SCR[sd.mid?.plan]||0,"중간(작도)":GRADE_SCR[sd.mid?.work]||0,
      "기말(계획)":GRADE_SCR[sd.final?.plan]||0,"기말(작도)":GRADE_SCR[sd.final?.work]||0};
  });

  return (
    <div className="report-root" style={{maxWidth:920,margin:"0 auto"}}>
      <style>{`@media print{.no-print{display:none!important}body{background:white!important}}`}</style>
      <div className="no-print" style={{display:"flex",gap:10,marginBottom:20,flexWrap:"wrap"}}>
        <button onClick={onBack} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,
          padding:"8px 18px",cursor:"pointer",fontWeight:600,color:C.navy,fontSize:13}}>← 입력 화면</button>
        <button onClick={onShare} style={{background:C.blue,color:"#fff",border:"none",
          borderRadius:8,padding:"8px 18px",fontWeight:700,cursor:"pointer",fontSize:13}}>🔗 공유 링크 생성</button>
        <button onClick={()=>window.print()} style={{background:C.navy,color:"#fff",border:"none",
          borderRadius:8,padding:"8px 18px",fontWeight:700,cursor:"pointer",fontSize:13}}>🖨️ 인쇄/PDF</button>
      </div>

      {/* 헤더 */}
      <div style={{background:C.navy,borderRadius:16,padding:"30px 36px",marginBottom:20,color:"#fff",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",right:30,top:20,width:130,height:130,borderRadius:"50%",
          background:C.accent+"20",border:`2px solid ${C.accent}40`}}/>
        <div style={{fontSize:10,letterSpacing:4,color:C.accent,marginBottom:6,fontWeight:700}}>SHINJEON SQUARE · 신전스퀘어</div>
        <div style={{fontSize:20,fontWeight:800,marginBottom:2}}>건축사 자격시험 수강생</div>
        <div style={{fontSize:26,fontWeight:900,color:C.accent}}>학업 성취 결과서</div>
        <div style={{marginTop:22,display:"flex",flexWrap:"wrap",gap:16}}>
          <div style={{background:"#ffffff12",borderRadius:12,padding:"14px 20px",minWidth:200}}>
            <div style={{fontSize:20,fontWeight:900}}>{info.className} {info.name}</div>
            {info.birthYear&&<div style={{fontSize:13,color:"#b0bcd4",marginTop:4}}>{info.birthYear}</div>}
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:8}}>
              {info.isPreArch&&<Badge color={C.accent} bg={C.accent+"30"}>예비건축사</Badge>}
              {info.isWorking&&<Badge color="#60A5FA" bg="#60A5FA30">재직 중</Badge>}
              {(info.passedSessions||[]).map(sid=>{
                const name=SESSIONS.find(s=>s.id===sid)?.label||sid;
                return <Badge key={sid} color={C.passed} bg={C.passed+"30"}>{name} 합격</Badge>;
              })}
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
            {hwStats.map(h=><ProgressBar key={h.sid} label={h.name} value={h.p}
              color={h.p>=80?C.success:h.p>=50?C.warn:C.danger}/>)}
          </div>
        </div>
        <div style={{background:C.bg,borderRadius:10,padding:"10px 16px",fontSize:13,color:C.textMid}}>
          전체 <strong>{totalPoss}</strong>문제 중 <strong style={{color:C.blue}}>{totalDone}문제</strong> 완료 ({pct(totalDone,totalPoss)}%)
        </div>
      </div>

      {/* 출석 */}
      <div style={{background:C.card,borderRadius:16,padding:28,marginBottom:20,border:`1px solid ${C.border}`}}>
        <SecTitle>📅 출석률</SecTitle>
        <div style={{display:"flex",flexWrap:"wrap",gap:16}}>
          {attendStats.map(a=>(
            <div key={a.sid} style={{flex:"1 1 160px",background:C.bg,borderRadius:12,padding:16,textAlign:"center"}}>
              <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:10}}>{a.name}</div>
              <DonutChart value={a.out} total={a.total} color={a.p>=80?C.success:C.warn} size={90}/>
              <div style={{marginTop:8,fontSize:11,color:C.textMid}}>출석 {a.out} · 결석 {a.absent} · 지각 {a.late}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 차트 */}
      {barData.length>0&&(
        <div style={{background:C.card,borderRadius:16,padding:28,marginBottom:20,border:`1px solid ${C.border}`}}>
          <SecTitle>📊 시험 성적 분석</SecTitle>
          <ResponsiveContainer width="100%" height={250}>
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
          {allSubIds.map(sid=>{
            const sd=student.subjects[sid];
            const sessId=SESSIONS.find(s=>s.subjects.some(sub=>sub.id===sid))?.id;
            const total=countExaminees(students,sessId);
            const name=SESSIONS.flatMap(s=>s.subjects).find(s=>s.id===sid)?.name||sid;
            if(!sd.mid?.rank&&!sd.final?.rank) return null;
            return (
              <div key={sid} style={{display:"flex",gap:16,flexWrap:"wrap",marginTop:16,
                background:C.bg,borderRadius:10,padding:"10px 16px"}}>
                <span style={{fontWeight:700,fontSize:13,color:C.navy}}>{name}</span>
                {sd.mid?.rank&&<span style={{fontSize:13,color:C.textMid}}>중간: <strong style={{color:C.blue}}>{sd.mid.rank}등</strong>/{total}명 <span style={{fontSize:11,color:C.textLight}}>(상위 {pct(+sd.mid.rank,total)}%)</span></span>}
                {sd.final?.rank&&<span style={{fontSize:13,color:C.textMid}}>기말: <strong style={{color:C.success}}>{sd.final.rank}등</strong>/{total}명 <span style={{fontSize:11,color:C.textLight}}>(상위 {pct(+sd.final.rank,total)}%)</span></span>}
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
            const name=SESSIONS.flatMap(s=>s.subjects).find(s=>s.id===sid)?.name||sid;
            return (
              <div key={sid} style={{marginBottom:14}}>
                <div style={{fontSize:13,fontWeight:700,color:C.blue,marginBottom:6}}>{name}</div>
                <div style={{background:C.bg,borderRadius:10,padding:14,fontSize:14,color:C.text,lineHeight:1.7,whiteSpace:"pre-wrap"}}>{comment}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════
//  공유 링크 모달
// ═══════════════════════════════════════════════════
const ShareModal = ({studentId, studentName, onClose}) => {
  return (
    <div style={{position:"fixed",inset:0,background:"#00000099",zIndex:999,
      display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:C.card,borderRadius:16,padding:24,maxWidth:400,width:"100%",
        boxShadow:"0 20px 60px #0006"}}>
        <div style={{fontSize:16,fontWeight:800,color:C.navy,marginBottom:4}}>📤 결과서 공유 방법</div>
        <div style={{fontSize:12,color:C.textMid,marginBottom:20}}>수강생: <strong>{studentName}</strong></div>

        <div style={{background:C.bg,borderRadius:12,padding:16,marginBottom:12}}>
          <div style={{fontSize:12,fontWeight:700,color:C.blue,marginBottom:8}}>① 아래 ID를 길게 눌러 복사하세요</div>
          <div style={{background:"#fff",borderRadius:8,padding:"14px",
            border:"2px dashed #2B58B8",cursor:"text"}}>
            <div style={{fontSize:11,color:"#8290B0",marginBottom:6}}>수강생 ID (손가락으로 길게 눌러 선택)</div>
            <div style={{fontSize:20,fontWeight:900,color:"#1A2A45",wordBreak:"break-all",
              letterSpacing:2, lineHeight:1.5}}>
              {studentId}
            </div>
          </div>
          <div style={{fontSize:11,color:"#8290B0",marginTop:8,lineHeight:1.6}}>
            👆 위 숫자를 손가락으로 꾹 누르면<br/>텍스트 선택 메뉴가 나와요 → 복사
          </div>
        </div>

        <div style={{background:C.bg,borderRadius:12,padding:16,marginBottom:16}}>
          <div style={{fontSize:12,fontWeight:700,color:C.navy,marginBottom:8}}>② 카톡으로 ID 숫자만 전송</div>
          <div style={{fontSize:12,color:"#475070",lineHeight:1.9}}>
            받는 분은 <strong>같은 Claude 앱</strong>을 열고<br/>
            상단 입력칸에 ID 붙여넣기 →<br/>
            <strong>불러오기</strong> 버튼 클릭
          </div>
        </div>

        <div style={{fontSize:11,color:"#475070",marginBottom:16,lineHeight:1.7,
          background:"#FFF8E8",borderRadius:8,padding:"10px 12px",
          border:"1px solid #C8A65544"}}>
          ⚠️ 카톡 링크로는 공유 불가, ID 숫자만 보내세요<br/>
          ✅ Supabase DB 저장 — 언제든 ID로 복원 가능
        </div>

        <button onClick={onClose} style={{width:"100%",background:"#1A2A45",color:"#fff",border:"none",
          borderRadius:10,padding:"12px",fontWeight:700,cursor:"pointer",fontSize:14}}>
          확인
        </button>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════
//  메인 앱
// ═══════════════════════════════════════════════════
export default function App() {
  const [students,setStudents]     = useState([]);
  const [selectedId,setSelectedId] = useState(null);
  const [view,setView]             = useState("dashboard");
  const [activeSess,setActiveSess] = useState(SESSIONS[0].id);
  const [activeSub, setActiveSub]  = useState(SESSIONS[0].subjects[0].id);
  const [showInfo,  setShowInfo]   = useState(false);
  const [saveStatus,setSaveStatus] = useState("idle"); // idle|saving|saved|error
  const [loadStatus,setLoadStatus] = useState("loading"); // loading|ok|error
  const [shareModal,setShareModal] = useState(null);
  const [importId,  setImportId]   = useState("");
  const [showImport,setShowImport] = useState(false);
  const saveTimers = useRef({});

  // ── 초기 로드 ──────────────────────────────────
  useEffect(()=>{
    (async()=>{
      try {
        const rows = await sb.getAll();
        const loaded = rows.map(r=>({...r.data, id:r.id}));
        setStudents(loaded.length>0 ? loaded : []);
        setLoadStatus("ok");
      } catch(e) {
        console.error(e);
        setLoadStatus("error");
      }
    })();
  },[]);

  const student = students.find(s=>s.id===selectedId);

  // ── 개별 수강생 자동저장 ────────────────────────
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

  // ── 상태 업데이트 ───────────────────────────────
  const updSt = (id,fn) => {
    setStudents(prev=>prev.map(s=>{ if(s.id!==id)return s; const ns=fn(s); saveStudent(ns); return ns; }));
  };
  const updSub = (subId,fn) => updSt(selectedId,s=>({...s,subjects:{...s.subjects,[subId]:fn(s.subjects[subId])}}));
  const toggleHw   = (subId,typeId,idx) => updSub(subId,sd=>({...sd,hw:{...sd.hw,[typeId]:{...sd.hw?.[typeId],[idx]:!sd.hw?.[typeId]?.[idx]}}}));
  const setAttend  = (subId,week,state) => updSub(subId,sd=>({...sd,attend:{...sd.attend,[week]:state}}));
  const setExam    = (subId,data)       => updSt(selectedId,s=>({...s,subjects:{...s.subjects,[subId]:data}}));
  const setComment = (subId,val)        => updSub(subId,sd=>({...sd,comment:val}));
  const updInfo    = (info)             => updSt(selectedId,s=>({...s,info}));

  const addStudent = async() => {
    const id = String(Date.now());
    const ns = makeStudent(id);
    setStudents(prev=>[...prev,ns]);
    await sb.upsert(id, ns);
    setSelectedId(id); setView("detail"); setShowInfo(true);
  };

  const delStudent = async(id) => {
    if(!window.confirm("삭제하시겠어요?")) return;
    setStudents(prev=>prev.filter(s=>s.id!==id));
    await sb.delete(id);
    if(selectedId===id){ setSelectedId(null); setView("dashboard"); }
  };

  // ── 공유 ID로 불러오기 ──────────────────────────
  const importById = async() => {
    const trimmed = importId.trim();
    if(!trimmed) return;
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/students?id=eq.${trimmed}`, {
        headers:{ apikey:SUPABASE_KEY, Authorization:`Bearer ${SUPABASE_KEY}` }
      });
      const rows = await res.json();
      if(!rows.length){ alert("❌ 해당 ID의 수강생을 찾을 수 없어요."); return; }
      const s = {...rows[0].data, id:rows[0].id};
      setStudents(prev=>{ const exists=prev.find(x=>x.id===s.id); return exists?prev.map(x=>x.id===s.id?s:x):[...prev,s]; });
      setSelectedId(s.id); setView("report");
      setShowImport(false); setImportId("");
    } catch(e){ alert("❌ 불러오기 실패: "+e.message); }
  };

  const visibleSess = student
    ? SESSIONS.filter(s=>!s.subjects.every(sub=>isPassed(sub.id,student.info)))
    : SESSIONS;
  const curSubData = student?.subjects?.[activeSub];
  const hwDone     = curSubData ? calcHw(curSubData) : 0;
  const sessSummary = s => {
    const ids=getAllSubIds().filter(sid=>!isPassed(sid,s.info));
    if(!ids.length) return 100;
    return pct(ids.reduce((acc,sid)=>acc+calcHw(s.subjects[sid]),0), HW_TOTAL*ids.length);
  };

  // ── 결과서 ─────────────────────────────────────
  if(view==="report"&&student){
    return (
      <div style={{minHeight:"100vh",background:C.bg,padding:"24px 16px"}}>
        {shareModal&&<ShareModal studentId={shareModal.id} studentName={shareModal.name} onClose={()=>setShareModal(null)}/>}
        <ReportView student={student} students={students}
          onBack={()=>setView("detail")}
          onShare={()=>setShareModal({id:student.id,name:student.info.name})}/>
      </div>
    );
  }

  // ── 로딩 화면 ───────────────────────────────────
  if(loadStatus==="loading"){
    return (
      <div style={{minHeight:"100vh",background:C.bg,display:"flex",flexDirection:"column",
        alignItems:"center",justifyContent:"center",gap:16}}>
        <div style={{width:40,height:40,borderRadius:"50%",border:`4px solid ${C.border}`,
          borderTopColor:C.blue,animation:"spin 1s linear infinite"}}/>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <div style={{color:C.textMid,fontSize:14}}>Supabase에서 데이터 불러오는 중…</div>
      </div>
    );
  }

  return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'Noto Sans KR',sans-serif"}}>
      {shareModal&&<ShareModal studentId={shareModal.id} studentName={shareModal.name} onClose={()=>setShareModal(null)}/>}

      {/* 헤더 */}
      <header style={{background:C.navy,padding:"10px 16px",position:"sticky",top:0,zIndex:100,
        borderBottom:`2px solid ${C.accent}40`}}>
        {/* 1행: 로고 + 저장상태 + 결과서버튼 */}
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
          <button onClick={()=>setView("dashboard")}
            style={{display:"flex",alignItems:"center",gap:8,background:"none",border:"none",cursor:"pointer",padding:0}}>
            <div style={{width:28,height:28,borderRadius:7,background:C.accent,
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>🏛</div>
            <div style={{textAlign:"left"}}>
              <div style={{color:"#fff",fontWeight:900,fontSize:14,lineHeight:1.1}}>신전스퀘어</div>
              <div style={{color:C.accent,fontSize:8,letterSpacing:1}}>SUPABASE 연동 · 자동저장</div>
            </div>
          </button>
          <div style={{flex:1}}/>
          {/* 저장 상태 */}
          <div style={{fontSize:11,fontWeight:600,
            color:saveStatus==="saved"?C.success:saveStatus==="saving"?"#7ab0e8":saveStatus==="error"?C.danger:"transparent",
            whiteSpace:"nowrap"}}>
            {saveStatus==="saved"?"✓ 저장됨":saveStatus==="saving"?"저장 중…":saveStatus==="error"?"⚠️ 오류":""}
          </div>
          {view==="detail"&&student&&(
            <button onClick={()=>setView("report")}
              style={{background:C.accent,border:"none",borderRadius:8,
                padding:"6px 14px",color:C.navy,cursor:"pointer",fontSize:12,fontWeight:800,whiteSpace:"nowrap"}}>
              결과서 📄
            </button>
          )}
        </div>
        {/* 2행: 공유 ID 불러오기 항상 표시 */}
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <input value={importId} onChange={e=>setImportId(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&importById()}
            placeholder="📥 공유받은 수강생 ID 붙여넣기..."
            style={{flex:1,padding:"7px 12px",borderRadius:8,
              border:`1px solid #344060`,fontSize:12,outline:"none",
              background:"#1a2a45",color:"#fff"}}/>
          <button onClick={importById}
            style={{background:C.blue,color:"#fff",border:"none",borderRadius:8,
              padding:"7px 14px",fontWeight:700,cursor:"pointer",fontSize:12,whiteSpace:"nowrap"}}>
            불러오기
          </button>
        </div>
      </header>

      <main style={{maxWidth:1100,margin:"0 auto",padding:"24px 16px"}}>

        {/* ══ 대시보드 ══ */}
        {view==="dashboard"&&(
          <>
            <div style={{marginBottom:24}}>
              <div style={{fontSize:22,fontWeight:900,color:C.navy}}>수강생 관리</div>
              <div style={{fontSize:14,color:C.textMid,marginTop:2}}>
                입력 즉시 Supabase DB에 자동저장 · 어디서든 접속 가능
              </div>
            </div>
            {loadStatus==="error"&&(
              <div style={{background:"#FEF2F2",border:`1px solid ${C.danger}`,borderRadius:10,
                padding:"12px 16px",marginBottom:20,fontSize:13,color:C.danger}}>
                ⚠️ DB 연결 오류. Supabase 테이블 생성 여부를 확인해주세요.
              </div>
            )}
            <button onClick={addStudent} style={{background:C.blue,color:"#fff",border:"none",borderRadius:10,
              padding:"10px 22px",fontWeight:700,cursor:"pointer",fontSize:14,marginBottom:24,
              display:"inline-flex",alignItems:"center",gap:8}}>+ 수강생 추가</button>

            {students.length===0&&loadStatus==="ok"&&(
              <div style={{textAlign:"center",padding:"60px 0",color:C.textLight}}>
                <div style={{fontSize:40,marginBottom:12}}>👤</div>
                <div style={{fontSize:16,fontWeight:600}}>수강생이 없습니다</div>
                <div style={{fontSize:13,marginTop:4}}>위 버튼으로 첫 수강생을 추가하세요</div>
              </div>
            )}

            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(230px,1fr))",gap:16}}>
              {students.map(s=>{
                const overall=sessSummary(s);
                const passed=s.info.passedSessions||[];
                return (
                  <div key={s.id} style={{background:C.card,border:`1.5px solid ${C.border}`,borderRadius:14,
                    padding:20,position:"relative",cursor:"pointer",transition:"all .2s"}}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor=C.blue;e.currentTarget.style.boxShadow=`0 4px 18px ${C.blue}22`;}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.boxShadow="none";}}
                    onClick={()=>{
                      setSelectedId(s.id); setView("detail"); setShowInfo(false);
                      const fv=SESSIONS.find(sess=>!sess.subjects.every(sub=>isPassed(sub.id,s.info)));
                      if(fv){setActiveSess(fv.id);setActiveSub(fv.subjects[0].id);}
                    }}>
                    <button onClick={e=>{e.stopPropagation();delStudent(s.id);}}
                      style={{position:"absolute",top:10,right:10,background:"none",border:"none",
                        cursor:"pointer",fontSize:16,color:C.textLight}}>×</button>
                    <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
                      <div style={{width:42,height:42,borderRadius:12,background:C.navy,
                        display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>👤</div>
                      <div>
                        <div style={{fontWeight:800,fontSize:15,color:C.text}}>
                          <span style={{fontSize:12,color:C.textLight,marginRight:4}}>{s.info.className}</span>{s.info.name}
                        </div>
                        {s.info.birthYear&&<div style={{fontSize:11,color:C.textLight}}>{s.info.birthYear}</div>}
                      </div>
                    </div>
                    {passed.length>0&&(
                      <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:10}}>
                        {passed.map(sid=><Badge key={sid} color={C.passed}>{SESSIONS.find(s=>s.id===sid)?.label} 합격 ✓</Badge>)}
                      </div>
                    )}
                    <div style={{fontSize:11,color:C.textMid,marginBottom:6}}>숙제 달성률</div>
                    <ProgressBar value={overall} height={6} color={overall>=80?C.success:overall>=50?C.warn:C.blue}/>
                    <div style={{marginTop:5,fontSize:12,fontWeight:700,color:overall>=80?C.success:C.blue}}>{overall}%</div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ══ 상세 입력 ══ */}
        {view==="detail"&&student&&(
          <>
            <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:20,flexWrap:"wrap"}}>
              <div style={{width:50,height:50,borderRadius:14,background:C.navy,
                display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>👤</div>
              <div style={{flex:1}}>
                <div style={{fontSize:20,fontWeight:900,color:C.navy}}>
                  <span style={{fontSize:13,color:C.textLight,marginRight:6}}>{student.info.className}</span>
                  {student.info.name}
                </div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:4}}>
                  {student.info.isPreArch&&<Badge color={C.accent}>예비건축사</Badge>}
                  {student.info.isWorking&&<Badge color={C.blueLight}>재직 중</Badge>}
                  {(student.info.passedSessions||[]).map(sid=>(
                    <Badge key={sid} color={C.passed}>{SESSIONS.find(s=>s.id===sid)?.label} 합격</Badge>
                  ))}
                </div>
              </div>
              <button onClick={()=>setShowInfo(p=>!p)} style={{
                background:showInfo?C.navy:C.card,border:`1.5px solid ${showInfo?C.navy:C.border}`,
                borderRadius:9,padding:"8px 16px",cursor:"pointer",fontWeight:600,
                color:showInfo?"#fff":C.textMid,fontSize:12}}>
                {showInfo?"▲ 닫기":"✏️ 인적사항"}
              </button>
            </div>

            {showInfo&&(
              <div style={{background:C.card,borderRadius:14,padding:24,border:`1.5px solid ${C.accent}60`,marginBottom:20}}>
                <SecTitle>👤 수강생 인적사항</SecTitle>
                <InfoForm info={student.info} onChange={updInfo}/>
              </div>
            )}

            {visibleSess.length===0?(
              <div style={{textAlign:"center",padding:"60px 0",color:C.textLight,fontSize:16}}>🎉 모든 교시를 합격하셨습니다!</div>
            ):(
              <>
                <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
                  {visibleSess.map(sess=>(
                    <button key={sess.id} onClick={()=>{setActiveSess(sess.id);setActiveSub(sess.subjects[0].id);}} style={{
                      padding:"8px 18px",borderRadius:10,
                      border:`1.5px solid ${activeSess===sess.id?C.blue:C.border}`,
                      background:activeSess===sess.id?C.blue:C.card,
                      color:activeSess===sess.id?"#fff":C.textMid,
                      fontWeight:700,cursor:"pointer",fontSize:13}}>
                      {sess.label}
                    </button>
                  ))}
                  {SESSIONS.filter(s=>!visibleSess.includes(s)).map(sess=>(
                    <div key={sess.id} style={{padding:"8px 18px",borderRadius:10,border:`1.5px solid ${C.border}`,
                      background:C.bg,color:C.textLight,fontSize:13,display:"flex",alignItems:"center",gap:6}}>
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
                          <button key={sub.id} onClick={()=>setActiveSub(sub.id)} style={{
                            padding:"6px 14px",borderRadius:8,
                            border:`1.5px solid ${activeSub===sub.id?C.accent:C.border}`,
                            background:activeSub===sub.id?C.accent+"22":C.card,
                            color:activeSub===sub.id?C.navy:C.textMid,
                            fontWeight:600,cursor:"pointer",fontSize:12}}>
                            {sub.name}
                          </button>
                        ))}
                      </div>

                      <div style={{background:C.card,borderRadius:14,padding:"14px 20px",marginBottom:20,
                        border:`1.5px solid ${C.border}`,display:"flex",alignItems:"center",gap:20}}>
                        <DonutChart value={hwDone} total={HW_TOTAL} color={C.blue} size={72}/>
                        <div style={{flex:1}}>
                          <div style={{fontWeight:700,fontSize:14,color:C.navy,marginBottom:6}}>
                            {SESSIONS.flatMap(s=>s.subjects).find(s=>s.id===activeSub)?.name} — 숙제 달성률
                          </div>
                          <ProgressBar value={pct(hwDone,HW_TOTAL)}
                            color={hwDone>=30?C.success:hwDone>=15?C.warn:C.blue} height={10}/>
                          <div style={{marginTop:4,fontSize:12,color:C.textMid}}>{hwDone}/{HW_TOTAL} 문제 완료</div>
                        </div>
                      </div>

                      <div style={{display:"flex",flexDirection:"column",gap:20}}>
                        <div style={{background:C.card,borderRadius:14,padding:24,border:`1px solid ${C.border}`}}>
                          <SecTitle>📝 숙제 이행률 (총 {HW_TOTAL}문제)</SecTitle>
                          <HwAccordion subjectId={activeSub} subjectData={curSubData} onToggle={toggleHw}/>
                        </div>
                        <div style={{background:C.card,borderRadius:14,padding:24,border:`1px solid ${C.border}`}}>
                          <SecTitle>📅 출석률 (20주)</SecTitle>
                          <AttendSection subjectData={curSubData} onChange={(w,state)=>setAttend(activeSub,w,state)}/>
                        </div>
                        <div style={{background:C.card,borderRadius:14,padding:24,border:`1px solid ${C.border}`}}>
                          <SecTitle>🎯 시험 성적 & 석차</SecTitle>
                          <ExamSection subjectData={curSubData} sessionId={activeSess}
                            students={students} onChange={data=>setExam(activeSub,data)}/>
                        </div>
                        <div style={{background:C.card,borderRadius:14,padding:24,border:`1px solid ${C.border}`}}>
                          <SecTitle>✍️ 담당 건축사 종합평가</SecTitle>
                          <textarea value={curSubData?.comment||""} onChange={e=>setComment(activeSub,e.target.value)}
                            placeholder="수강생에 대한 종합 의견을 입력하세요..." rows={5}
                            style={{width:"100%",padding:"12px 14px",borderRadius:10,
                              border:`1.5px solid ${C.border}`,fontSize:14,resize:"vertical",
                              fontFamily:"inherit",lineHeight:1.7,color:C.text,outline:"none",boxSizing:"border-box"}}/>
                        </div>
                      </div>

                      <div style={{textAlign:"center",marginTop:28}}>
                        <button onClick={()=>setView("report")} style={{
                          background:`linear-gradient(135deg,${C.navy},${C.blue})`,
                          color:"#fff",border:"none",borderRadius:12,
                          padding:"14px 36px",fontSize:16,fontWeight:800,cursor:"pointer",
                          boxShadow:`0 4px 20px ${C.blue}44`}}>
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
