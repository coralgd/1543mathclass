import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

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

export async function registerUser(email,password){
  const ref=doc(db,'users',userDocId(email));
  const snap=await getDoc(ref);
  if(snap.exists()) throw new Error('Email уже зарегистрирован');
  const state={players:['Игрок_1','Игрок_2','Игрок_3'],votes:{},activeTab:'vote'};
  await setDoc(ref,{email,password,verified:false,state});
}

export async function saveState(email,password,verified,state){
  await setDoc(doc(db,'users',userDocId(email)),{email,password,verified,state});
}

export async function requireVerified(){
  const email=getSessionEmail();
  if(!email) return null;
  const user=await getUser(email);
  if(!user || user.verified!==true) return null;
  return user;
}

export function getParamStats(state,player,param){
  const all=Object.values(state.votes[player]||{}).map(v=>v[param]).filter(Number.isInteger);
  const c=all.length;
  return {avg:c?all.reduce((a,b)=>a+b,0)/c:0,count:c};
}

export { db, POINTS, PARAMS };
