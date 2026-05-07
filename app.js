import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, collection, getDocs, query, where, serverTimestamp, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

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

export async function getUser(email){
  const snap=await getDoc(doc(db,'users',userDocId(email)));
  return snap.exists()?snap.data():null;
}

export function watchCurrentUser(cb){
  const email=getSessionEmail();
  if(!email) return ()=>{};
  return onSnapshot(doc(db,'users',userDocId(email)),(snap)=>cb(snap.exists()?snap.data():null));
}

export function watchAllUsers(cb){
  return onSnapshot(collection(db,'users'),(snap)=>cb(snap.docs.map(d=>d.data()).filter(Boolean).sort((a,b)=>(a.email||'').localeCompare(b.email||'','ru'))));
}

export function watchSubmissions(cb){
  return onSnapshot(collection(db,'submissions'),(snap)=>cb(snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(a.voterEmail||'').localeCompare(b.voterEmail||''))));
}

export async function registerUser(email,password){
  const ref=doc(db,'users',userDocId(email));
  const snap=await getDoc(ref);
  if(snap.exists()) throw new Error('Email уже зарегистрирован');
  const state={votes:{},approvedVotes:{},activeTab:'vote'};
  await setDoc(ref,{email,password,verified:false,role:'player',state});
}

export async function saveState(email,password,verified,state,role='player'){
  await setDoc(doc(db,'users',userDocId(email)),{email,password,verified,role,state});
}

export async function requireVerified(){
  const email=getSessionEmail();
  if(!email) return null;
  const user=await getUser(email);
  if(!user || user.verified!==true) return null;
  return user;
}

export async function getAllUsers(){
  const snap=await getDocs(collection(db,'users'));
  return snap.docs.map(d=>d.data()).filter(Boolean).sort((a,b)=>(a.email||'').localeCompare(b.email||'', 'ru'));
}

export async function getVerifiedPlayers(currentEmail=''){
  const q=query(collection(db,'users'),where('verified','==',true));
  const snap=await getDocs(q);
  return snap.docs.map(d=>d.data()?.email).filter(email=>email && email!==currentEmail).sort((a,b)=>a.localeCompare(b));
}

export async function upsertSubmission(voterEmail,votes){
  await setDoc(doc(db,'submissions',userDocId(voterEmail)),{voterEmail,votes,status:'pending',updatedAt:serverTimestamp()});
}

export async function toggleUserVerification(targetEmail,currentValue,actor){
  const user=await getUser(targetEmail);
  if(!user) return;
  await setDoc(doc(db,'users',userDocId(targetEmail)),{...user,verified:!currentValue,verifiedBy:actor,verifiedAt:new Date().toISOString()});
}

export async function applySubmissionToLeaderboard(submission,moderEmail){
  if(Object.keys(submission.votes||{}).length===0) throw new Error('Пустая отправка');
  const users=await getAllUsers();
  for(const u of users){
    const state=u.state||{};
    if(!state.approvedVotes) state.approvedVotes={};
    Object.keys(state.approvedVotes).forEach(player=>{ if(state.approvedVotes[player]?.[submission.voterEmail]) delete state.approvedVotes[player][submission.voterEmail]; });
    for(const [player,criteria] of Object.entries(submission.votes||{})){ if(!state.approvedVotes[player]) state.approvedVotes[player]={}; state.approvedVotes[player][submission.voterEmail]=criteria; }
    await saveState(u.email,u.password,u.verified,state,u.role||'player');
  }
  await setDoc(doc(db,'submissions',userDocId(submission.voterEmail)),{...submission,status:'approved',approvedBy:moderEmail,approvedAt:new Date().toISOString()});
}

export function getParamStats(voteTree,player,param){
  const all=Object.values(voteTree[player]||{}).map(v=>v[param]).filter(Number.isInteger);
  const c=all.length;
  return {avg:c?all.reduce((a,b)=>a+b,0)/c:0,count:c};
}

export { db, POINTS, PARAMS };
