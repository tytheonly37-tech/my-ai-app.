'use strict';

const lessons = [
  { english: 'Good morning.', creole: 'Bonjou.', pronunciation: 'bohn-zhoo' }
];
const $ = id => document.getElementById(id);
const state = {
  index: 0,
  visited: new Set(readJSON('kreyol-visited', [])),
  rate: Number(localStorage.getItem('kreyol-rate') || '0.9'),
  voices: []
};
function readJSON(key, fallback) {
  try { const value = JSON.parse(localStorage.getItem(key)); return Array.isArray(value) ? value : fallback; }
  catch { return fallback; }
}
function current() { return lessons[state.index]; }
function setMessage(text, kind='') { $('message').textContent=text; $('message').className='message'+(kind?' '+kind:''); }
function saveProgress() {
  localStorage.setItem('kreyol-visited', JSON.stringify([...state.visited]));
  $('visited-count').textContent=String(state.visited.size);
}
function voiceFor(prefix) {
  const exact=state.voices.find(v => (v.lang||'').toLowerCase()===prefix.toLowerCase());
  return exact || state.voices.find(v => (v.lang||'').toLowerCase().startsWith(prefix.toLowerCase()+'-')) || null;
}
function refreshVoices() {
  if (!('speechSynthesis' in window)) { state.voices=[]; updateVoiceSummary(); return; }
  state.voices=window.speechSynthesis.getVoices();
  updateVoiceSummary();
}
function updateVoiceSummary() {
  const en=voiceFor('en'), ht=voiceFor('ht');
  $('voice-summary').textContent=`English: ${en?en.name+' ('+en.lang+')':'not detected'}. Haitian Creole: ${ht?ht.name+' ('+ht.lang+')':'not detected on this device'}.`;
  $('creole-status').textContent=ht?`Available voice: ${ht.name}`:'Haitian Creole voice not detected';
}
function stopSpeech() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  ['english-status','creole-status','pronunciation-status'].forEach(id => { $(id).textContent='Ready'; });
}
function speak(layer) {
  if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
    setMessage('Speech playback is not supported by this browser.','error'); return;
  }
  refreshVoices();
  const item=current();
  const options={
    english:{text:item.english,voice:voiceFor('en'),status:'english-status',missing:'No English voice is available in this browser.'},
    creole:{text:item.creole,voice:voiceFor('ht'),status:'creole-status',missing:'No Haitian Creole voice (language tag ht) was detected. English will not be substituted.'},
    pronunciation:{text:item.pronunciation,voice:voiceFor('en'),status:'pronunciation-status',missing:'No English voice is available to read the pronunciation guide.'}
  };
  const selected=options[layer];
  if (!selected.voice) {
    $(selected.status).textContent='Voice unavailable';
    setMessage(selected.missing,'error'); return;
  }
  window.speechSynthesis.cancel();
  const utterance=new SpeechSynthesisUtterance(selected.text);
  utterance.voice=selected.voice;
  utterance.lang=selected.voice.lang || (layer==='creole'?'ht-HT':'en');
  utterance.rate=state.rate;
  utterance.onstart=()=>{ $(selected.status).textContent='Playing…'; setMessage(`Playing ${layer==='creole'?'Haitian Creole':layer==='english'?'English':'pronunciation guide'} audio.`,'success'); };
  utterance.onend=()=>{ $(selected.status).textContent='Ready'; setMessage('Audio finished.','success'); };
  utterance.onerror=e=>{ $(selected.status).textContent='Playback error'; setMessage(`Audio could not play (${e.error||'unknown error'}).`,'error'); };
  window.speechSynthesis.speak(utterance);
}
function render() {
  const item=current();
  $('english-text').textContent=item.english;
  $('creole-text').textContent=item.creole;
  $('pronunciation-text').textContent=item.pronunciation;
  $('counter').textContent=`${String(state.index+1).padStart(2,'0')} / ${String(lessons.length).padStart(2,'0')}`;
  $('progress-fill').style.width=`${((state.index+1)/lessons.length)*100}%`;
  $('previous').disabled=state.index===0;
  $('next').disabled=state.index===lessons.length-1;
  $('flash-front').textContent=item.english;
  $('flash-back').textContent=item.creole;
  $('flash-back').classList.add('hidden');
  $('flash-label').textContent='ENGLISH';
  state.visited.add(state.index); saveProgress();
  setMessage('Choose a speaker to hear a layer.');
}
function showView(name) {
  document.querySelectorAll('.screen').forEach(el=>el.classList.add('hidden'));
  $(name).classList.remove('hidden');
  document.querySelectorAll('.nav [data-view]').forEach(btn=>btn.classList.toggle('selected',btn.dataset.view===name));
  if(name==='settings') refreshVoices();
}
document.querySelectorAll('[data-view]').forEach(btn=>btn.addEventListener('click',()=>showView(btn.dataset.view)));
document.querySelectorAll('[data-speak]').forEach(btn=>btn.addEventListener('click',()=>speak(btn.dataset.speak)));
$('play-creole').addEventListener('click',()=>speak('creole'));
$('flash-audio').addEventListener('click',()=>speak('creole'));
$('stop').addEventListener('click',()=>{stopSpeech();setMessage('Audio stopped.');});
$('previous').addEventListener('click',()=>{if(state.index>0){stopSpeech();state.index--;render();}});
$('next').addEventListener('click',()=>{if(state.index<lessons.length-1){stopSpeech();state.index++;render();}});
$('rate').value=String(state.rate);
$('rate').addEventListener('change',e=>{state.rate=Number(e.target.value);localStorage.setItem('kreyol-rate',String(state.rate));});
$('refresh').addEventListener('click',()=>{refreshVoices();setMessage('Voice list refreshed.');});
$('reset').addEventListener('click',()=>{if(window.confirm('Reset study progress saved on this device?')){state.visited.clear();saveProgress();setMessage('Study progress reset.');}});
$('flashcard').addEventListener('click',()=>{
  const back=$('flash-back'); back.classList.toggle('hidden');
  $('flash-label').textContent=back.classList.contains('hidden')?'ENGLISH':'KREYÒL AYISYEN';
});
render();
refreshVoices();
if ('speechSynthesis' in window) window.speechSynthesis.addEventListener?.('voiceschanged',refreshVoices);
if ('serviceWorker' in navigator && location.protocol!=='file:') {
  window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js').catch(err=>console.warn('Offline cache registration failed:',err)));
}
