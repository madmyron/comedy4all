// - DATA STORE -
var jokes = [
  {id:1,title:"Airport security bit",body:"So I'm at the airport security line, right? The guy in front of me is taking off his shoes, his belt, his watch... I'm like, is this a security checkpoint or your Tinder profile photo? He goes 'First time flying?' I said -- no man. First time getting DIVORCED.",tags:["Travel"],tier:"a",rating:5,runtime:"2:30",score:9.2},
  {id:2,title:"Dating app opener",body:"Has anyone here used a dating app? Everyone. We're all swiping like it's a job we hate but can't quit. My profile says spontaneous. I have spontaneity scheduled for every other Tuesday.",tags:["Dating"],tier:"a",rating:5,runtime:"3:00",score:8.7},
  {id:3,title:"Remote work WFH",body:"I've been working from home so long my dog started giving me performance reviews. He said I need to improve my bark-to-output ratio.",tags:["Work","Tech"],tier:"a",rating:4,runtime:"2:45",score:8.3},
  {id:4,title:"First class vs coach",body:"First class gets warm towels. Coach gets looked at with pity by the flight attendant. I'm in row 38. She handed me a napkin like it was a consolation prize.",tags:["Travel"],tier:"a",rating:4,runtime:"2:15",score:8.1},
  {id:5,title:"Mom texting",body:"My mom learned to use emojis. Full send, no context. She texted me the eggplant emoji asking what I wanted for dinner. I said: definitely not that.",tags:["Family"],tier:"b",rating:4,runtime:"1:45",score:7.9},
  {id:6,title:"Grocery self-checkout",body:"I love how they call it self-checkout like I asked for this responsibility. Sir this is a Kroger, not a career opportunity.",tags:["Work"],tier:"b",rating:4,runtime:"2:00",score:7.8},
  {id:7,title:"Social media algorithm",body:"My feed is so specific it showed me an ad for left-handed scissors for anxious dog owners who like jazz. I felt seen.",tags:["Tech"],tier:"b",rating:3,runtime:"1:45",score:7.3},
  {id:8,title:"Coffee shop prices",body:"$7 for a coffee. I asked if it came with a hug. She said that's extra. Turns out hugs are $12 with the app.",tags:["Work"],tier:"b",rating:3,runtime:"1:30",score:7.1},
  {id:9,title:"Fitness tracker",body:"My fitness tracker said I took 200 steps yesterday. I work from home -- that's called commuting. It gave me a sad face emoji.",tags:["Tech"],tier:"c",rating:3,runtime:"1:15",score:6.8}
];
var nextId = 10;
var archivedJokes = [];
var modalRating = 0;
var modalTags = [];
var editingId = null;
var apiKey = '';

var rehearsalData = [
  {text:"So I'm at the airport security line, right? The guy in front of me is taking off his shoes, his belt, his watch...",punch:"\"He goes, 'First time flying?' I said -- no man. First time getting DIVORCED.\""},
  {text:"Has anyone here used a dating app? Show of hands. Right, all of you. Every single one of us, swiping like it's a job we hate but cannot quit...",punch:"\"My profile says spontaneous. I have spontaneity scheduled for every other Tuesday.\""},
  {text:"I've been working from home so long my dog started giving me performance reviews...",punch:"\"He said I need to significantly improve my bark-to-output ratio. He's not wrong.\""},
  {text:"My mom learned to use emojis. Full send, no context. She texted me the eggplant emoji asking what I wanted for dinner...",punch:"\"I said: definitely not that. She sent back a question mark. That's somehow worse.\""},
  {text:"$7 for a coffee. I asked the barista if it came with a hug. She said that's extra...",punch:"\"Turns out hugs are $12 with the app. But subscribe monthly -- unlimited hugs and a tote bag.\""}
];

var rIdx=0, rPunch=false, rRatings={}, rTimer=0, rIv=null;
var recPlaying=false, recSecs=0, recIv=null;
var brooksHistory=[];
var displayJokes = jokes.slice();

// - WRITING STUDIO DATA -
var scripts = [];
var activeScriptId = null;
var scriptNextId = 1;
