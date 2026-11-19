(() => {
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const urls={president:'https://umbc.edu/about/leadership/president/',provost:'https://umbc.edu/about/leadership/provost/',team:'https://umbc.edu/about/leadership/provost/team/',grad:'https://gradschool.umbc.edu/staff/',gradHome:'https://gradschool.umbc.edu/',sa:'https://studentaffairs.umbc.edu/about-us/student-affairs-leadership/',dos:'https://studentaffairs.umbc.edu/student-support/dean-of-students/',colleges:'https://umbc.edu/academics/colleges-and-schools/'};
const team=[['Alan Byrd','Enrollment Management and Planning'],['Christopher Correnti','Financial Management'],['David Di Maria','Global Engagement'],['Carlos Jensen','Student Success and Undergraduate Academic Affairs'],['Anupam Joshi','Chief AI Officer'],['Nancy Kusmaul','Erickson School and Social Work'],['Ana Oskoz','Faculty Affairs'],['Walter P. Parrish III','Faculty Affairs'],['Christa J. Porter','Graduate School'],['Peggy Re','Academic Affairs'],['Marc Seigar','CNMS'],['Laila Shishineh','Chief of Staff'],['Sophia Sotilleo','Library and Gallery'],['Christia Spears Brown','CAHSS'],['Christopher Steele','Professional and Extended Studies'],['Crystal Williams','Curriculum Development'],['Jeanne M. van Briesen','COEIT']];
const units=[
 {icon:'✉',title:'Getting in',official:'Recruitment & Admissions',text:'Applications, recruitment and admissions support.',people:['Mike Suica','Scott Phillips','Megan Hays','Yasmin M. Graham','Cali L. Drouillard','Kathryn C. Nee','Tahreem Fayiz-Baker'],color:'yellow'},
 {icon:'◎',title:'Moving toward your degree',official:'Pathways, Progressions & Graduation',text:'Help with graduate milestones and the path to graduation.',people:['Sunji Jangha','Mona Ahmad','Patricia Winborn','Nicole Mooney','Katherin Totty','Kyle Hopson'],color:'mint'},
 {icon:'✳',title:'Support and development',official:'Academic Advocacy & Professional Development',text:'Graduate advocacy and professional development.',people:['Robin H. Cresiski','Ravi Kuber','Shirl F. Curtis','Yarazeth Medina','Jamie Gurganus','Aubrie Zepp'],color:'lilac'},
 {icon:'▧',title:'Keeping things running',official:'Fiscal Affairs & Operations',text:'Financial administration and office operations.',people:['Shannon Mize','Andrea Lorick','Jamie Marie Lybarger'],color:'peach'}
];
window.UMBC_ORG={team,units,checked:'2026-11-19',graduatePeople:24};
const roles={
 president:{title:'President',name:'Dr. Valerie Sheares Ashby',tag:'The whole university',color:'yellow',symbol:'sun',plain:'Leads UMBC as a university.',body:'The president sets institutional direction and brings university leaders together. The provost leads the academic side; vice presidents lead other major areas, including Student Affairs.',does:['University priorities and strategy','Leadership across academic and administrative divisions','University-wide accountability and external representation'],example:'A problem that spans several divisions may need university-wide coordination. Everyday requests still begin with the office that handles the service.',connection:'The provost and Student Affairs are different branches of university leadership.',source:urls.president,extra:`<a href="https://umbc.edu/about/leadership/senior-leadership/" target="_blank" rel="noopener">Meet the university leadership team</a>`},
 provost:{title:'Provost',name:'Dr. Manfred H. M. van Dulmen',tag:'Chief academic officer',color:'lilac',symbol:'book',plain:'Leads the university’s academic mission.',body:'The provost oversees the quality and direction of teaching, academic programs and scholarship. Deans and academic leaders work within this wider academic structure.',does:['Academic strategy across colleges and schools','Quality of instruction and academic programs','Coordination of academic leaders and resources'],example:'An issue affecting graduate education across several colleges connects the Graduate School with wider academic leadership.',connection:'The Graduate School and academic colleges connect through Academic Affairs.',source:urls.provost,extra:`<details class="team-disclosure"><summary><span><b>17 people</b> on the published leadership team</span><span class="plus"></span></summary><p>This is our count of the current team page, excluding the provost. It is not a count of all Academic Affairs employees or a verified list of direct reports.</p><div class="team-roster">${team.map(([n,r])=>`<div><strong>${esc(n)}</strong><span>${esc(r)}</span></div>`).join('')}</div><a href="${urls.team}" target="_blank" rel="noopener">Check the official team listing</a></details>`},
 graduate:{title:'Graduate School',name:'Dr. Christa J. Porter · Vice Provost and Dean',tag:'Graduate education across colleges',color:'lilac',symbol:'cap',plain:'Connects your graduate education across UMBC.',body:'Your degree program belongs to an academic unit. The Graduate School works with those units on graduate education, university-level processes and student progress.',does:['Graduate admissions and degree milestones','Academic advocacy and professional development','GA guidance and graduate-level concerns'],example:'At Meet & Confer, the Graduate School addressed GA appointments, renewal notice, stipends and routes for raising concerns. Departments and colleges still control many local decisions and budgets.',connection:'An academic office led by a dean, with four service teams.',source:urls.gradHome,extra:`<div class="team-preview"><strong>Have a GA concern?</strong><p>Find the contact route for pay, appointments, funding concerns and more.</p><a href="#inside-grad">Find where to get help</a></div>`},
 deans:{title:'College dean',name:'A leader for each academic college',tag:'Your academic home',color:'yellow',symbol:'building',plain:'Leads a particular college.',body:'A college groups related departments and programs. Its dean works with department leaders on academic priorities, faculty and resources within that college.',does:['College-level academic planning','Coordination of departments and programs','College resources and budget priorities'],example:'A workspace or departmental funding issue may involve a department chair and the college dean. The Graduate School can coordinate graduate concerns across colleges.',connection:'College → department → degree program. The Graduate School also works across this structure.',source:urls.team,extra:`<div class="college-list"><p><b>CAHSS</b> · Arts, Humanities and Social Sciences<br><span>Christia Spears Brown</span></p><p><b>CNMS</b> · Natural and Mathematical Sciences<br><span>Marc Seigar</span></p><p><b>COEIT</b> · Engineering and Information Technology<br><span>Jeanne M. van Briesen</span></p></div>`},
 departments:{title:'Department and program',name:'Chair · Graduate program director · Supervisor',tag:'Closer to your everyday work',color:'yellow',symbol:'book',plain:'Different roles inside your academic home.',body:'A department chair leads the department. A graduate program director coordinates a particular graduate program. Your supervisor directs the work associated with your assistantship.',does:['Department: local staffing and resources','Program director: degree and program guidance','Supervisor: duties and work expectations'],example:'A question about assigned GA duties usually begins close to the appointment. If the concern involves your supervisor and you are uncomfortable reporting locally, the Graduate School said you may contact it directly.',connection:'Part of the college structure; also works with the Graduate School on graduate processes.',source:'https://gradschool.umbc.edu/graduate-program-coordinators/',extra:`<a href="https://gradschool.umbc.edu/graduate-assistants/" target="_blank" rel="noopener">Graduate assistantship information</a>`},
 affairs:{title:'Student Affairs',name:'Dr. Renique T. Kersh · Vice President',tag:'The student experience',color:'mint',symbol:'heart',plain:'Supports life as a student.',body:'Student Affairs brings together services for well-being, housing, engagement and student support. Graduate students are part of the community it serves.',does:['Well-being and student support','Residential and campus life','Student engagement and belonging'],example:'At Meet & Confer, Student Affairs discussed insurance access, student information and on-campus housing affordability.',connection:'A university division alongside Academic Affairs. The Dean of Students works within it.',source:urls.sa,extra:`<div class="team-preview"><strong>Where to start</strong><p>Vice President’s office · The Commons 319<br><a href="mailto:studentaffairs@umbc.edu">studentaffairs@umbc.edu</a></p><a href="https://studentaffairs.umbc.edu/about-us/contact/" target="_blank" rel="noopener">Official office locations</a></div>`},
 dos:{title:'Dean of Students',name:'Dr. Jacob Diaz · Assistant Vice President',tag:'Care and support within Student Affairs',color:'peach',symbol:'heart',plain:'Helps students navigate difficult circumstances.',body:'This office helps students find resources, navigate concerns and get support through challenging situations. Its role includes student assistance, conduct and crisis coordination.',does:['Connecting students with practical support','Helping navigate concerns and difficult circumstances','Coordinating care and relevant student services'],example:'If personal circumstances or basic-needs difficulties are disrupting student life, the Dean of Students can help connect you with support. Academic degree requirements remain with academic offices.',connection:'A student-support dean, distinct from a college dean or the Graduate School dean.',source:urls.dos,extra:`<div class="team-preview"><strong>Center for Well-Being · Room 102</strong><p><a href="mailto:deanofstudents@umbc.edu">deanofstudents@umbc.edu</a><br>410-455-2770</p></div>`},
 life:{title:'Student life services',name:'Teams within Student Affairs',tag:'Help with daily student life',color:'mint',symbol:'building',plain:'Specialist teams provide the services.',body:'Student Affairs is a division, not a single service desk. Its teams have distinct responsibilities and locations.',does:['Residential Life: on-campus housing','Health and well-being services','Student engagement and support'],example:'Use the relevant service’s contact route for a specific request. The division’s leadership can coordinate issues that involve more than one service.',connection:'These are examples of service areas, not a complete list or a claim that all report directly to the Dean of Students.',source:'https://studentaffairs.umbc.edu/about-us/our-division/',extra:''}
};
const people=window.UMBC_PEOPLE;
const groups={deans:['brown','seigar','van-briesen'],life:['pete','artis','scally']};
const portrait=(id,extra='')=>{const p=people[id];return `<span class="portrait portrait-${id} ${extra}"><img src="${esc(p.image)}" alt="" width="96" height="96" decoding="async"></span>`;};
const personRow=(id)=>{const p=people[id];return `<a class="person-row" href="${esc(p.source)}" target="_blank" rel="noopener">${portrait(id)}<span><strong>${esc(p.name)}</strong><small>${esc(p.title)}</small></span><span class="person-arrow" aria-hidden="true">↗</span></a>`;};
roles.deans.extra=`<div class="people-roster"><h4>Meet the college deans</h4>${groups.deans.map(personRow).join('')}</div>`;
roles.life.extra=`<div class="people-roster"><h4>A few people behind the services</h4><p>These are examples from the wider Student Affairs team.</p>${groups.life.map(personRow).join('')}<a class="all-people-link" href="${urls.sa}" target="_blank" rel="noopener">See the full Student Affairs leadership directory ↗</a></div>`;
roles.departments.extra+=`<p class="department-note">The people in these roles depend on your department and program.</p><a class="all-people-link" href="https://gradschool.umbc.edu/graduate-program-coordinators/" target="_blank" rel="noopener">Find your graduate program’s contacts ↗</a>`;
$$('[data-office]').forEach(button=>{
 const id=button.dataset.office,icon=button.querySelector('.node-icon'),copy=button.lastElementChild;
 copy.classList.add('node-copy');
 if(people[id]){
  icon.outerHTML=portrait(id);button.classList.add('has-person');
  copy.querySelector('strong').insertAdjacentHTML('afterend',`<span class="node-person">${esc(people[id].name)}</span>`);
 }else if(groups[id]){
  icon.outerHTML=`<span class="portrait-group" aria-hidden="true">${groups[id].map(key=>portrait(key)).join('')}</span>`;
  button.classList.add('has-people');
  copy.insertAdjacentHTML('beforeend',`<span class="node-person">${id==='deans'?'Meet the deans':'Meet some of the team'}</span>`);
 }else{
  copy.querySelector('strong').insertAdjacentHTML('afterend','<span class="node-person">Varies by department</span>');
 }
});
let selected='president';
function showRole(id){
 const r=roles[id];if(!r)return;selected=id;
 $$('[data-office]').forEach(b=>{b.classList.toggle('selected',b.dataset.office===id);b.setAttribute('aria-pressed',String(b.dataset.office===id));});
 const panel=$('#office-panel');panel.className='role-panel '+r.color;
 panel.innerHTML=`<div class="role-overview"><div class="role-kicker">${esc(r.tag)}</div><div class="role-identity">${people[id]?portrait(id):''}<div><h3>${esc(r.title)}</h3><p class="role-name">${esc(r.name)}</p></div></div><p class="role-plain">${esc(r.plain)}</p><p>${esc(r.body)}</p><ul>${r.does.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div><div class="role-context"><div class="role-example"><b>What this means for you</b><p>${esc(r.example)}</p></div><p class="role-connection">${esc(r.connection)}</p>${r.extra}<a class="official-link" href="${r.source}" target="_blank" rel="noopener">Official role information</a>${people[id]?`<a class="portrait-credit" href="${esc(people[id].source)}" target="_blank" rel="noopener">Photo: official UMBC profile ↗</a>`:''}</div>`;
 panel.scrollTop=0;
 panel.classList.remove('arrive');void panel.offsetWidth;panel.classList.add('arrive');
 $('#map-status').textContent=`Showing ${r.title}. ${r.plain}`;
}
$$('[data-office]').forEach(b=>b.addEventListener('click',()=>showRole(b.dataset.office)));
showRole('president');
const examples={
 college:{
  title:'“I don’t have a suitable place to do my GA work.”',
  start:'Your department or program',
  help:'Ask about a desk, shared office, or other workspace. If the issue needs college-level space or resources, your department can raise it with the college dean.',
  ask:'“I need space to do my assigned GA work. What workspace is available, and who can help arrange it?”',
  link:'See how the college dean fits in',role:'deans'
 },
 graduate:{
  title:'“I’m unsure about my GA appointment or renewal.”',
  start:'The Graduate School',
  help:'Ask for help understanding the GA policies and the process that applies to your situation. You can approach the Graduate School directly if you’re uncomfortable asking your supervisor or program.',
  ask:'“Can you help me understand the rules for my appointment and who I should speak with about my concern?”',
  link:'See what the Graduate School does',role:'graduate'
 },
 student:{
  title:'“A family emergency is making it hard to keep up with classes and GA work.”',
  start:'The Dean of Students',
  help:'You don’t have to know which campus resource you need. The Dean of Students can help you find support and work out whom to contact about how the situation is affecting your studies.',
  ask:'“I’m dealing with a family emergency. Can you help me find support and figure out whom to contact about my classes and GA work?”',
  link:'See what the Dean of Students does',role:'dos'
 }
};
function showExample(id){
 const e=examples[id];
 $$('[data-example]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.example===id)));
 $('#dean-example').innerHTML=`<p class="scenario-label">For example, you might say…</p><h3>${e.title}</h3><div class="scenario-route"><h4>Start with: ${e.start}</h4><p>${e.help}</p></div><div class="scenario-ask"><h4>What you could ask</h4><p>${e.ask}</p></div><button class="text-button" id="example-role">${e.link} <span aria-hidden="true">↗</span></button>`;
 $('#example-role').onclick=()=>{showRole(e.role);$('#understand').scrollIntoView({behavior:document.body.classList.contains('motion-off')?'auto':'smooth'});};
}
$$('[data-example]').forEach(b=>b.onclick=()=>showExample(b.dataset.example));showExample('college');
const motion=$('#motion-toggle');const reduce=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
function setMotion(off){document.body.classList.toggle('motion-off',off);motion.setAttribute('aria-pressed',String(off));motion.textContent=off?'Motion off':'Motion on';}
setMotion(!!reduce);motion.onclick=()=>setMotion(!document.body.classList.contains('motion-off'));
function connectIllustration(){
 const canvas=$('.animated-campus'),svg=$('.mini-lines');if(!canvas||!svg)return;
 const base=canvas.getBoundingClientRect();if(!base.width)return;
 svg.setAttribute('viewBox',`0 0 ${base.width} ${base.height}`);
 const pos=id=>{const b=$(`[data-mini="${id}"]`).getBoundingClientRect();return {x:b.left-base.left+b.width/2,top:b.top-base.top,bottom:b.bottom-base.top};};
 const path=(from,to)=>{const a=pos(from),b=pos(to),mid=(a.bottom+b.top)/2;return `M${a.x} ${a.bottom}V${mid}H${b.x}V${b.top}`;};
 const routes=[['president','provost'],['president','affairs'],['provost','deans'],['provost','graduate'],['affairs','dos']];
 svg.innerHTML=routes.map(([a,b])=>`<path d="${path(a,b)}"/>`).join('')+`<circle class="travel-dot" r="5"><animateMotion dur="5s" repeatCount="indefinite" path="${path('president','provost')}"/></circle>`;
}
if(window.ResizeObserver)new ResizeObserver(connectIllustration).observe($('.animated-campus'));
window.addEventListener('resize',connectIllustration);requestAnimationFrame(connectIllustration);
function connectStructure(){
 const map=$('.leadership-map'),base=map.getBoundingClientRect();if(!base.width)return;
 let svg=map.querySelector('.structure-lines');if(!svg){svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('class','structure-lines');svg.setAttribute('aria-hidden','true');map.prepend(svg);}
 svg.setAttribute('viewBox',`0 0 ${base.width} ${base.height}`);
 const pos=id=>{const b=$(`[data-office="${id}"]`).getBoundingClientRect();return {x:b.left-base.left+b.width/2,left:b.left-base.left,right:b.right-base.left,top:b.top-base.top,bottom:b.bottom-base.top};};
 const branch=(parent,children)=>{
  const a=pos(parent),bs=children.map(pos),mid=(a.bottom+Math.min(...bs.map(b=>b.top)))/2;
  return `<path d="M${a.x} ${a.bottom}V${mid}M${bs[0].x} ${mid}H${bs[bs.length-1].x}${bs.map(b=>`M${b.x} ${mid}V${b.top}`).join('')}"/>`;
 };
 const dean=pos('deans'),department=pos('departments');
 svg.innerHTML=branch('president',['provost','affairs'])+branch('provost',['deans','graduate'])+branch('affairs',['dos','life'])+`<path d="M${dean.x} ${dean.bottom}V${department.top}"/>`;

}
if(window.ResizeObserver)new ResizeObserver(connectStructure).observe($('.leadership-map'));
window.addEventListener('resize',connectStructure);requestAnimationFrame(connectStructure);
 document.fonts?.ready.then(connectStructure);
// The adjacent diagram follows the video, and remains useful with sound off.
const video=$('#explainer'),info=window.GAAC_VIDEO,cover=$('#video-cover');
const stamp=t=>`${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}`;
async function play(start){try{if(typeof start==='number'){if(video.readyState===0)await new Promise((res,rej)=>{video.addEventListener('loadedmetadata',res,{once:true});video.addEventListener('error',rej,{once:true});video.load();});video.currentTime=start;}await video.play();cover.hidden=true;}catch{$('#media-message').textContent='Use the video controls, or open the transcript below.';}}
function sync(){if(!info)return;const chapter=[...info.chapters].reverse().find(c=>video.currentTime>=c.start)||info.chapters[0];$$('[data-mini]').forEach(n=>n.classList.toggle('speaking',chapter.role==='overview'||n.dataset.mini===chapter.role||(chapter.role==='dos'&&n.dataset.mini==='affairs')));$('#animation-caption').textContent=chapter.title;$$('[data-video-start]').forEach(b=>b.setAttribute('aria-current',String(Number(b.dataset.videoStart)===chapter.start)));}
cover.onclick=()=>play();video.addEventListener('play',()=>{cover.hidden=true;document.body.classList.add('video-playing');});video.addEventListener('pause',()=>document.body.classList.remove('video-playing'));video.addEventListener('ended',()=>document.body.classList.remove('video-playing'));video.addEventListener('timeupdate',sync);video.addEventListener('error',()=>{$('#media-message').textContent='The video could not load. The transcript and interactive guide are available below.';cover.hidden=true;});
if(info){$('#video-duration').textContent=stamp(info.duration);$('#video-chapters').innerHTML=info.chapters.map(c=>`<button data-video-start="${c.start}"><span>${esc(c.title)}</span><time>${stamp(c.start)}</time></button>`).join('');$$('[data-video-start]').forEach(b=>b.onclick=()=>play(Number(b.dataset.videoStart)));sync();}
})();
