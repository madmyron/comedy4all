// - DATA STORE -
var jokes = [];
var nextId = 1;
var archivedJokes = [];
var modalRating = 0;
var modalTags = [];
var editingId = null;
var apiKey = '';

var rehearsalData = [];

var rIdx=0, rPunch=false, rRatings={}, rTimer=0, rIv=null;
var recPlaying=false, recSecs=0, recIv=null;
var brooksHistory=[];
var displayJokes = [];

// - WRITING STUDIO DATA -
var scripts = [];
var activeScriptId = null;
var scriptNextId = 1;
