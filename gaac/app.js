'use strict';
const data = window.GAAC_DATA;
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const categories = {all:'All questions',insurance:'Health insurance',pay:'Pay & fees',appointments:'Appointments & renewal',voice:'Speaking up safely',support:'Leave & emergency help',campus:'Housing & campus life',process:'Your voice & the process'};
const sourceLink = (id, label) => { const s = data.sources[id]; return `<a class="source-ref" href="${escape(s.url)}" target="_blank" rel="noopener">${escape(label || s.title)}</a>`; };
const statuses = s => /improvement/i.test(s) ? 'improvement' : /unresolved|needed/i.test(s) ? 'open' : /Assurance|route identified/i.test(s) ? 'assurance' : 'work';
let category = 'all';
let showAll = false;

function renderCategories(){
 $('#categories').innerHTML=Object.entries(categories).map(([id,label])=>`<button data-category="${id}" class="${category===id?'active':''}" aria-pressed="${category===id}"><span>${label}</span><span class="count">${id==='all'?data.questions.length:data.questions.filter(q=>q.category===id).length}</span></button>`).join('')+'<p class="category-caption">Status reflects the November 18 meeting.<br><br>Open a question to see the evidence and the next step.</p>';
 $$('[data-category]').forEach(b=>b.addEventListener('click',()=>{category=b.dataset.category;showAll=false;renderCategories();renderQuestions();}));
}

function card(q){ return window.GAAC_ANSWER_VIEWS.render(q,{categories,statuses,sourceLink}); }
function renderQuestions(){
 const query=$('#search').value.trim().toLowerCase(); const status=$('#status').value;
 const words=query.split(/\s+/).filter(Boolean);
 const results=data.questions.filter(q=>(category==='all'||q.category===category)&&(status==='all'||statuses(q.status)===status)&&words.every(w=>JSON.stringify([q,window.GAAC_ANSWER_VIEWS.items[q.id]]).toLowerCase().includes(w)));
 const visible = showAll || query || category !== 'all' || status !== 'all' ? results : results.slice(0,8);
 $('#question-list').innerHTML=visible.map(card).join('');
 $('#show-more').hidden=visible.length===results.length;
 $('#show-more').textContent=`Show all ${results.length} questions`;
 $('#result-count').textContent=`${visible.length < results.length ? `${visible.length} of ` : ''}${results.length} ${results.length===1?'question':'questions'}${category==='all'?' across all topics':` in ${categories[category].toLowerCase()}`}`;
 $('#empty-state').hidden=results.length>0;
 $$('[data-copy]').forEach(b=>b.addEventListener('click',async()=>{const url=new URL(location.href);url.hash=b.dataset.copy;try{await navigator.clipboard.writeText(url.href);toast('Question link copied');}catch{toast('Select and copy the address in your browser');location.hash=b.dataset.copy;}}));
}
renderCategories();renderQuestions();
$('#show-more').addEventListener('click',()=>{showAll=true;renderQuestions();});
$('#search').addEventListener('input',renderQuestions);$('#status').addEventListener('change',renderQuestions);
$('#collapse-all').addEventListener('click',()=>$$('#question-list details').forEach(d=>d.open=false));
$('#clear-filters').addEventListener('click',()=>{category='all';showAll=false;$('#search').value='';$('#status').value='all';renderCategories();renderQuestions();$('#search').focus();});
document.addEventListener('keydown',e=>{if(e.key==='/'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)){e.preventDefault();$('#search').focus();}});
function openHash(){const id=decodeURIComponent(location.hash.slice(1));if(data.questions.some(q=>q.id===id)){category='all';showAll=true;$('#search').value='';$('#status').value='all';renderCategories();renderQuestions();const el=document.getElementById(id);el.open=true;requestAnimationFrame(()=>el.scrollIntoView({block:'start'}));}}
window.addEventListener('hashchange',openHash);if(location.hash)openHash();
let toastTimer;function toast(message){$('#toast').textContent=message;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),2600);}

const milestones=[['Dec 2, 2026','Appointment-template feedback','Additional comments from graduate program directors.'],['Dec 18, 2026','Written office responses','Agreed target for Graduate School and Student Affairs reports.'],['Jan–Feb 2027','Student communication','January sharing; Aetna session being arranged for February.'],['Spring 2027','Review & report back','Stipend audit begins; clearer Pay Bridge update expected.'],['Apr 15, 2027','Next Meet & Confer','Housing-affordability response and follow-up on open issues.']];
$('#milestones').innerHTML=milestones.map(([date,title,desc])=>`<article class="milestone"><time>${date}</time><h3>${title}</h3><p>${desc}</p></article>`).join('');
