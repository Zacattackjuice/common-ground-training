import {courses,fresh,normalise,score} from './content.js';
import {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY} from './supabase-config.js';

export const supabaseConfigured=Boolean(SUPABASE_URL&&SUPABASE_PUBLISHABLE_KEY);
let clientPromise;

export const getSupabase=async()=>{
 if(!supabaseConfigured)return null;
 if(!clientPromise)clientPromise=import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm').then(({createClient})=>createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}));
 return clientPromise;
};

export const emptyApp=()=>({session:null,user:null,membership:null,organisation:null,members:[],invites:[],mode:supabaseConfigured?'supabase':'demo',loading:false,error:'',message:''});

export const emailsFromText=text=>[...new Set(String(text||'').split(/[\s,;]+/).map(x=>x.trim().toLowerCase()).filter(x=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x)))];

export const canAccessCourses=app=>!supabaseConfigured||Boolean(app?.membership);
export const canViewAdmin=app=>Boolean(app?.membership&&app.membership.role==='admin'&&app.membership.status==='active');
export const needsInviteGate=app=>supabaseConfigured&&Boolean(app?.user)&&!app?.membership;


export const rowFromCourseState=(c,s,orgId,userId)=>({
 organisation_id:orgId,
 user_id:userId,
 course_id:c.id,
 read:s.read,
 best:s.best,
 failed_attempts:s.failedAttempts,
 question:s.question,
 answers:s.answers,
 submitted:s.submitted,
 test_started_at:s.testStartedAt?new Date(s.testStartedAt).toISOString():null,
 test_expired:s.testExpired
});

export const stateFromProgressRows=rows=>{
 const state=fresh();
 for(const row of rows||[]){
  const c=courses.find(x=>x.id===row.course_id),s=c&&state.courseStates[c.id];
  if(!s)continue;
  s.read=Array.isArray(row.read)?row.read:[];
  s.best=Number.isInteger(row.best)?row.best:0;
  s.failedAttempts=Number.isInteger(row.failed_attempts)?row.failed_attempts:0;
  s.question=Number.isInteger(row.question)?row.question:0;
  s.answers=Array.isArray(row.answers)?row.answers:Array(c.questions.length).fill(null);
  s.submitted=row.submitted===true;
  s.testStartedAt=row.test_started_at?Date.parse(row.test_started_at):null;
  s.testExpired=row.test_expired===true;
 }
 return normalise(state);
};

export const attachRecords=(state,records=[])=>{
 for(const row of records){
  const c=courses.find(x=>x.id===row.course_id),s=c&&state.courseStates[c.id];
  if(!s)continue;
  s.records.push({score:row.score,passed:row.passed,completedAt:Date.parse(row.completed_at),expired:row.expired===true,attempt:row.attempt});
 }
 return state;
};

export async function loadRemoteApp(){
 const supabase=await getSupabase();
 if(!supabase)return emptyApp();
 const {data:{session}}=await supabase.auth.getSession();
 const app={...emptyApp(),session,user:session?.user||null};
 if(!session)return app;
 const {data:memberships,error:mErr}=await supabase.from('organisation_members').select('organisation_id,role,status,organisations(id,name)').eq('user_id',session.user.id).eq('status','active').limit(1);
 if(mErr){app.error=mErr.message;return app}
 const membership=memberships?.[0]||null;
 if(!membership)return app;
 app.membership=membership;
 app.organisation=membership.organisations;
 const orgId=membership.organisation_id;
 const progress=supabase.from('course_progress').select('*').eq('organisation_id',orgId).eq('user_id',session.user.id);
 const records=supabase.from('test_records').select('*').eq('organisation_id',orgId).eq('user_id',session.user.id).order('completed_at',{ascending:false});
 const [p,r]=await Promise.all([progress,records]);
 if(p.error)app.error=p.error.message;
 if(r.error)app.error=r.error.message;
 return {...app,state:attachRecords(stateFromProgressRows(p.data||[]),r.data||[])};
}

export async function saveCourseProgress(app,c,state){
 if(!supabaseConfigured||!app.session||!app.membership)return;
 const supabase=await getSupabase();
 const s=state.courseStates[c.id];
 await supabase.from('course_progress').upsert(rowFromCourseState(c,s,app.membership.organisation_id,app.user.id),{onConflict:'organisation_id,user_id,course_id'});
}

export async function saveTestRecord(app,c,state,attempt,expired=false){
 if(!supabaseConfigured||!app.session||!app.membership)return;
 const supabase=await getSupabase();
 const s=state.courseStates[c.id],n=score(s.answers,c);
 await supabase.from('test_records').insert({organisation_id:app.membership.organisation_id,user_id:app.user.id,course_id:c.id,score:n,passed:n>=c.passMark,expired,attempt,answers:s.answers});
 await saveCourseProgress(app,c,state);
}
