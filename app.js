import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, collection, getDocs, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const firebaseConfig = { apiKey:"AIzaSyAxgLF6gMi0S52d0cisPRooLNNCC986Wh4", authDomain:"mathclass-a9815.firebaseapp.com", projectId:"mathclass-a9815", storageBucket:"mathclass-a9815.firebasestorage.app", messagingSenderId:"39490049511", appId:"1:39490049511:web:ad1af15160612405881942" };
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const POINTS=[9,8,7,6,5,4,3,2,1,0];
const PARAMS=['I критерий','II критерий','III критерий','IV критерий'];

const sid='session_email';
export const getSessionEmail=()=>localStorage.getItem(sid)||'';
export const setSessionEmail=(email)=>localStorage.setItem(sid,email);
export const clearSession=()=>localStorage.removeItem(sid);
export const userDocId=(email)=>email.toLowerCase().replace(/[^a-z0-9@._-]/g,'_');

export async function getUser(email){ const snap=await getDoc(doc(db,'users',userDocId(email))); return snap.exists()?snap.data():null; }
export function watchCurrentUser(cb){ const email=getSessionEmail(); if(!email) return ()=>{}; return onSnapshot(doc(db,'users',userDocId(email)),(snap)=>cb(snap.exists()?snap.data():null)); }
export function watchAllUsers(cb){ return onSnapshot(collection(db,'users'),(snap)=>cb(snap.docs.map(d=>d.data()).filter(Boolean).sort((a,b)=>(a.email||'').localeCompare(b.email||'','ru')))); }

export async function registerUser(email,password){
  const ref=doc(db,'users',userDocId(email)); const snap=await getDoc(ref);
  if(snap.exists()) throw new Error('Email уже зарегистрирован');
  const state={votes:{},approvedVotes:{},pendingSubmission:null,activeTab:'vote'};
  await setDoc(ref,{email,password,verified:false,role:'player',state});
}
export async function saveUser(user){ await setDoc(doc(db,'users',userDocId(user.email)),user); }

export async function getVerifiedPlayers(currentEmail=''){
  const q=query(collection(db,'users'),where('verified','==',true));
  const snap=await getDocs(q);
  return snap.docs.map(d=>d.data()?.email).filter(email=>email && email!==currentEmail).sort((a,b)=>a.localeCompare(b));
}

export async function upsertSubmission(voterEmail,votes){
  const u=await getUser(voterEmail); if(!u) throw new Error('Пользователь не найден');
  const state=u.state||{};
  state.pendingSubmission={votes,status:'pending',updatedAt:new Date().toISOString()};
  await saveUser({...u,state});
}
export async function saveUser(user){ await setDoc(doc(db,'users',userDocId(user.email)),user); }

export async function toggleUserVerification(targetEmail,currentValue,actor){
  const user=await getUser(targetEmail); if(!user) return;
  await saveUser({...user,verified:!currentValue,verifiedBy:actor,verifiedAt:new Date().toISOString()});
}

export async function applySubmissionToLeaderboard(submitterEmail,moderEmail){
  const users=await getDocs(collection(db,'users')); const all=users.docs.map(d=>d.data()).filter(Boolean);
  const submitter=all.find(u=>u.email===submitterEmail); const pending=submitter?.state?.pendingSubmission;
  if(!pending?.votes) throw new Error('Отправка не найдена');
  for(const u of all){
    const state=u.state||{}; if(!state.approvedVotes) state.approvedVotes={};
    Object.keys(state.approvedVotes).forEach(player=>{ if(state.approvedVotes[player]?.[submitterEmail]) delete state.approvedVotes[player][submitterEmail]; });
    for(const [player,criteria] of Object.entries(pending.votes||{})){ if(!state.approvedVotes[player]) state.approvedVotes[player]={}; state.approvedVotes[player][submitterEmail]=criteria; }
    await saveUser({...u,state});
  }
  const refreshed=await getUser(submitterEmail); const s=refreshed.state||{};
  s.pendingSubmission={...s.pendingSubmission,status:'approved',approvedBy:moderEmail,approvedAt:new Date().toISOString()};
  await saveUser({...refreshed,state:s});
}

export function getParamStats(voteTree,player,param){ const all=Object.values(voteTree[player]||{}).map(v=>v[param]).filter(Number.isInteger); const c=all.length; return {avg:c?all.reduce((a,b)=>a+b,0)/c:0,count:c}; }
export { db, POINTS, PARAMS };
