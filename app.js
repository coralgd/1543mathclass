import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const firebaseConfig = { apiKey:"AIzaSyAxgLF6gMi0S52d0cisPRooLNNCC986Wh4", authDomain:"mathclass-a9815.firebaseapp.com", projectId:"mathclass-a9815", storageBucket:"mathclass-a9815.firebasestorage.app", messagingSenderId:"39490049511", appId:"1:39490049511:web:ad1af15160612405881942" };
const app = initializeApp(firebaseConfig); const db = getFirestore(app);
const POINTS=[9,8,7,6,5,4,3,2,1,0]; const PARAMS=['I критерий','II критерий','III критерий','IV критерий'];
export const userDocId=(email)=>email.toLowerCase().replace(/[^a-z0-9@._-]/g,'_');
export const getEmailFromUrl=()=>new URLSearchParams(location.search).get('email')||'';
export const withEmail=(page,email)=>`${page}?email=${encodeURIComponent(email)}`;
export async function getUser(email){ const snap=await getDoc(doc(db,'users',userDocId(email))); return snap.exists()?snap.data():null; }
export async function registerUser(email,password){ const ref=doc(db,'users',userDocId(email)); if((await getDoc(ref)).exists()) throw new Error('Email уже зарегистрирован'); await setDoc(ref,{email,password,verified:false,role:'player',state:{votes:{},approvedVotes:{},pendingSubmission:null,activeTab:'vote'}}); }
export async function saveUser(user){ await setDoc(doc(db,'users',userDocId(user.email)),user); }
export async function getAllUsers(){ const snap=await getDocs(collection(db,'users')); return snap.docs.map(d=>d.data()).filter(Boolean).sort((a,b)=>(a.email||'').localeCompare(b.email||'','ru')); }
export async function getVerifiedPlayers(currentEmail=''){ const snap=await getDocs(query(collection(db,'users'),where('verified','==',true))); return snap.docs.map(d=>d.data()?.email).filter(e=>e&&e!==currentEmail).sort((a,b)=>a.localeCompare(b)); }
export async function upsertSubmission(voterEmail,votes){ const u=await getUser(voterEmail); const state=u.state||{}; state.pendingSubmission={votes,status:'pending',updatedAt:new Date().toISOString()}; await saveUser({...u,state}); }
export async function toggleUserVerification(targetEmail,currentValue,actor){ const u=await getUser(targetEmail); await saveUser({...u,verified:!currentValue,verifiedBy:actor,verifiedAt:new Date().toISOString()}); }
export async function applySubmissionToLeaderboard(submitterEmail,moderEmail){ const all=await getAllUsers(); const submitter=all.find(u=>u.email===submitterEmail); const pending=submitter?.state?.pendingSubmission; if(!pending?.votes) throw new Error('Отправка не найдена'); for(const u of all){const s=u.state||{}; if(!s.approvedVotes) s.approvedVotes={}; Object.keys(s.approvedVotes).forEach(p=>{if(s.approvedVotes[p]?.[submitterEmail]) delete s.approvedVotes[p][submitterEmail];}); for(const [p,c] of Object.entries(pending.votes)){ if(!s.approvedVotes[p]) s.approvedVotes[p]={}; s.approvedVotes[p][submitterEmail]=c;} await saveUser({...u,state:s});} const fresh=await getUser(submitterEmail); const st=fresh.state||{}; st.pendingSubmission={...st.pendingSubmission,status:'approved',approvedBy:moderEmail,approvedAt:new Date().toISOString()}; await saveUser({...fresh,state:st}); }
export function getParamStats(voteTree,player,param){ const all=Object.values(voteTree[player]||{}).map(v=>v[param]).filter(Number.isInteger); const c=all.length; return {avg:c?all.reduce((a,b)=>a+b,0)/c:0,count:c}; }
export { db, POINTS, PARAMS };
