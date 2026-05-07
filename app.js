import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, collection, query, where, onSnapshot, getDocs } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const app = initializeApp({ apiKey:"AIzaSyAxgLF6gMi0S52d0cisPRooLNNCC986Wh4", authDomain:"mathclass-a9815.firebaseapp.com", projectId:"mathclass-a9815", storageBucket:"mathclass-a9815.firebasestorage.app", messagingSenderId:"39490049511", appId:"1:39490049511:web:ad1af15160612405881942" });
const db = getFirestore(app);
export const POINTS=[9,8,7,6,5,4,3,2,1,0];
export const PARAMS=['I критерий','II критерий','III критерий','IV критерий'];
export const userDocId=e=>e.toLowerCase().replace(/[^a-z0-9@._-]/g,'_');
export const getEmailFromUrl=()=>new URLSearchParams(location.search).get('email')||'';
export const withEmail=(p,e)=>`${p}?email=${encodeURIComponent(e)}`;

export async function getUser(email){const s=await getDoc(doc(db,'users',userDocId(email)));return s.exists()?s.data():null;}
export async function registerUser(email,password){const ref=doc(db,'users',userDocId(email));if((await getDoc(ref)).exists())throw new Error('Email уже зарегистрирован');await setDoc(ref,{email,password,verified:false,role:'player',state:{votesDraft:{},approvedVotes:{},pendingSubmission:null}});}
export async function saveUser(user){await setDoc(doc(db,'users',userDocId(user.email)),user);}
export function watchUser(email,cb){return onSnapshot(doc(db,'users',userDocId(email)),s=>cb(s.exists()?s.data():null));}
export function watchUsers(cb){return onSnapshot(collection(db,'users'),snap=>cb(snap.docs.map(d=>d.data()).filter(Boolean).sort((a,b)=>(a.email||'').localeCompare(b.email||'','ru'))));}
export async function getVerifiedPlayers(currentEmail=''){const snap=await getDocs(query(collection(db,'users'),where('verified','==',true)));return snap.docs.map(d=>d.data()?.email).filter(e=>e&&e!==currentEmail).sort((a,b)=>a.localeCompare(b));}

export async function submitVotes(email,votes){const u=await getUser(email);const st=u.state||{};st.pendingSubmission={votes,status:'pending',updatedAt:new Date().toISOString()};await saveUser({...u,state:st});}
export async function toggleVerify(email){const u=await getUser(email);await saveUser({...u,verified:!u.verified});}
export async function approveSubmission(targetEmail,moderEmail){const usersSnap=await getDocs(collection(db,'users'));const users=usersSnap.docs.map(d=>d.data()).filter(Boolean);const target=users.find(u=>u.email===targetEmail);const pending=target?.state?.pendingSubmission?.votes;if(!pending) throw new Error('Нет отправки');for(const u of users){const st=u.state||{};if(!st.approvedVotes)st.approvedVotes={};for(const p of Object.keys(st.approvedVotes)) delete st.approvedVotes[p][targetEmail];for(const [player,scores] of Object.entries(pending)){if(!st.approvedVotes[player])st.approvedVotes[player]={};st.approvedVotes[player][targetEmail]=scores;}await saveUser({...u,state:st});}const fresh=await getUser(targetEmail);const st=fresh.state||{};st.pendingSubmission={...st.pendingSubmission,status:'approved',approvedBy:moderEmail,approvedAt:new Date().toISOString()};await saveUser({...fresh,state:st});}

export function getParamStats(voteTree,player,param){const all=Object.values(voteTree[player]||{}).map(v=>v[param]).filter(Number.isInteger);return{avg:all.length?all.reduce((a,b)=>a+b,0)/all.length:0,count:all.length};}
export { db };
