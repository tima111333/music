/* ============================================================
   UNDERTOW PLAYER — generative synthesis engine
   Every "track" here is not an audio file: it is a small procedural
   composition, synthesized live in the browser with the Web Audio API,
   so the label never runs out of tape. Press play to hear it generate.
   ============================================================ */
(function(){

  const TRACKS = [
    {
      name:"Thermocline", genre:"Deep Ambient", key:"D minor", bpm:64, depth:"200m",
      type:"pad", root:146.83, scale:[0,3,5,7,10,12,15], loop:280, filter:900
    },
    {
      name:"Anglerfish Lure", genre:"Dub Techno", key:"F minor", bpm:122, depth:"850m",
      type:"pulse", root:87.31, scale:[0,3,7,10], loop:260, filter:600
    },
    {
      name:"Hydrothermal Vent", genre:"Industrial Techno", key:"C minor", bpm:128, depth:"2600m",
      type:"pulse-hard", root:65.41, scale:[0,2,3,7,8], loop:250, filter:400
    },
    {
      name:"Bioluminescence", genre:"Melodic Ambient", key:"A minor", bpm:90, depth:"1100m",
      type:"arp", root:220, scale:[0,3,5,7,10,12,15,19], loop:230, filter:2200
    },
    {
      name:"Trench Silence", genre:"Drone / Noise", key:"—", bpm:40, depth:"6000m+",
      type:"drone", root:41.2, scale:[0,7,10], loop:300, filter:300
    }
  ];

  let ctx=null, master=null, analyser=null, filterNode=null;
  let currentIndex = 0;
  let playing = false;
  let stepTimer = null;
  let stepIndex = 0;
  let trackStartTime = 0;

  const els = {
    play: document.getElementById('playBtn'),
    prev: document.getElementById('prevBtn'),
    next: document.getElementById('nextBtn'),
    title: document.getElementById('npTitle'),
    meta: document.getElementById('npMeta'),
    disc: document.querySelector('.disc'),
    progressSpan: document.querySelector('#progressBar span'),
    progressBar: document.getElementById('progressBar'),
    cur: document.getElementById('curTime'),
    total: document.getElementById('totalTime'),
    volume: document.getElementById('volume'),
    rows: document.querySelectorAll('.track-row'),
    scope: document.getElementById('scope')
  };
  if(!els.play) return; // not on music.html

  function freqFor(track, degree){
    const semis = track.scale[degree % track.scale.length] + Math.floor(degree/track.scale.length)*12;
    return track.root * Math.pow(2, semis/12);
  }

  function fmtTime(s){
    s = Math.max(0, Math.floor(s));
    const m = Math.floor(s/60), sec = s%60;
    return m + ':' + String(sec).padStart(2,'0');
  }

  function ensureCtx(){
    if(ctx) return;
    ctx = new (window.AudioContext||window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = parseFloat(els.volume ? els.volume.value : 0.7);
    filterNode = ctx.createBiquadFilter();
    filterNode.type = 'lowpass';
    analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    master.connect(filterNode);
    filterNode.connect(analyser);
    analyser.connect(ctx.destination);
    drawScope();
  }

  function playNote(freq, dur, opts){
    opts = opts || {};
    const type = opts.type || 'sine';
    const g = ctx.createGain();
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const now = ctx.currentTime;
    const peak = opts.gain != null ? opts.gain : 0.18;
    const attack = opts.attack != null ? opts.attack : 0.02;
    const release = opts.release != null ? opts.release : dur*0.6;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(peak, now+attack);
    g.gain.exponentialRampToValueAtTime(0.0001, now+dur+release);
    osc.connect(g);
    if(opts.filterFreq){
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = opts.filterFreq;
      g.connect(f);
      f.connect(master);
    } else {
      g.connect(master);
    }
    osc.start(now);
    osc.stop(now+dur+release+0.05);

    if(opts.detuneCents){
      const osc2 = ctx.createOscillator();
      osc2.type = type;
      osc2.frequency.value = freq;
      osc2.detune.value = opts.detuneCents;
      const g2 = ctx.createGain();
      g2.gain.setValueAtTime(0.0001, now);
      g2.gain.exponentialRampToValueAtTime(peak*0.6, now+attack);
      g2.gain.exponentialRampToValueAtTime(0.0001, now+dur+release);
      osc2.connect(g2); g2.connect(master);
      osc2.start(now); osc2.stop(now+dur+release+0.05);
    }
  }

  function playNoise(dur, opts){
    opts = opts||{};
    const bufferSize = ctx.sampleRate * dur;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for(let i=0;i<bufferSize;i++) data[i] = (Math.random()*2-1) * Math.pow(1 - i/bufferSize, 2);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const g = ctx.createGain();
    g.gain.value = opts.gain || 0.15;
    const f = ctx.createBiquadFilter();
    f.type = opts.filterType || 'highpass';
    f.frequency.value = opts.filterFreq || 4000;
    src.connect(f); f.connect(g); g.connect(master);
    src.start();
  }

  /* --- generative step logic per track type --- */
  function stepFor(track){
    const stepDur = (60/track.bpm)/4; // 16th note
    filterNode.frequency.setTargetAtTime(track.filter, ctx.currentTime, 0.4);

    if(track.type === 'pad'){
      if(stepIndex % 8 === 0){
        const degree = Math.floor(Math.random()*track.scale.length);
        playNote(freqFor(track, degree), stepDur*10, {type:'triangle', gain:0.10, attack:2.2, release:3.5, detuneCents:6, filterFreq:track.filter});
      }
      if(stepIndex % 16 === 4){
        playNote(freqFor(track, 0)/2, stepDur*14, {type:'sine', gain:0.14, attack:3, release:4, filterFreq:track.filter*0.6});
      }
    }
    else if(track.type === 'pulse'){
      if(stepIndex % 4 === 0) playNote(freqFor(track,0)/2, stepDur*0.9, {type:'sawtooth', gain:0.22, attack:0.005, release:0.12, filterFreq:track.filter});
      if(stepIndex % 8 === 4) playNoise(0.05, {gain:0.10, filterType:'bandpass', filterFreq:1200});
      if(Math.random() < 0.22) playNote(freqFor(track, 1+Math.floor(Math.random()*4)), stepDur*1.2, {type:'square', gain:0.05, filterFreq:track.filter*1.4});
      if(stepIndex % 2 === 1 && Math.random()<0.7) playNoise(0.02, {gain:0.06, filterType:'highpass', filterFreq:6000});
    }
    else if(track.type === 'pulse-hard'){
      if(stepIndex % 4 === 0) playNote(freqFor(track,0)/2, stepDur*0.7, {type:'square', gain:0.24, attack:0.004, release:0.08, filterFreq:track.filter});
      if(stepIndex % 16 === 10) playNoise(0.25, {gain:0.16, filterType:'bandpass', filterFreq:500});
      if(Math.random() < 0.3) playNote(freqFor(track, Math.floor(Math.random()*track.scale.length)), stepDur*0.5, {type:'sawtooth', gain:0.06, filterFreq:track.filter*2});
      if(stepIndex % 2 === 0) playNoise(0.015, {gain:0.05, filterType:'highpass', filterFreq:7000});
    }
    else if(track.type === 'arp'){
      if(stepIndex % 2 === 0){
        const degree = (stepIndex/2) % track.scale.length;
        playNote(freqFor(track, degree + (Math.random()<0.3?7:0)), stepDur*1.8, {type:'triangle', gain:0.12, attack:0.01, release:0.5, filterFreq:track.filter});
      }
      if(stepIndex % 32 === 0) playNote(freqFor(track,0)/2, stepDur*20, {type:'sine', gain:0.08, attack:2, release:3, filterFreq:track.filter*0.5});
    }
    else if(track.type === 'drone'){
      if(stepIndex % 24 === 0){
        const degree = Math.floor(Math.random()*track.scale.length);
        playNote(freqFor(track, degree)/2, stepDur*40, {type:'sawtooth', gain:0.07, attack:6, release:8, detuneCents:9, filterFreq:track.filter});
      }
      if(stepIndex % 40 === 20) playNoise(3, {gain:0.02, filterType:'bandpass', filterFreq:200});
    }

    stepIndex++;
  }

  function startTrack(index){
    ensureCtx();
    stopSchedule();
    currentIndex = index;
    const track = TRACKS[index];
    stepIndex = 0;
    trackStartTime = ctx.currentTime;
    const stepMs = ((60/track.bpm)/4) * 1000;
    stepTimer = setInterval(() => stepFor(track), stepMs);
    updateNowPlaying(track);
    playing = true;
    setPlayIcon(true);
    els.disc && els.disc.classList.add('playing');
    highlightRow(index);
  }

  function stopSchedule(){
    if(stepTimer) clearInterval(stepTimer);
    stepTimer = null;
  }

  function pause(){
    playing = false;
    stopSchedule();
    if(ctx) ctx.suspend();
    setPlayIcon(false);
    els.disc && els.disc.classList.remove('playing');
  }

  function resume(){
    if(!ctx){ startTrack(currentIndex); return; }
    ctx.resume();
    trackStartTime = ctx.currentTime - ((TRACKS[currentIndex].loop) * (getElapsedFraction()));
    const track = TRACKS[currentIndex];
    const stepMs = ((60/track.bpm)/4) * 1000;
    stepTimer = setInterval(() => stepFor(track), stepMs);
    playing = true;
    setPlayIcon(true);
    els.disc && els.disc.classList.add('playing');
  }

  function getElapsedFraction(){
    if(!ctx) return 0;
    const loop = TRACKS[currentIndex].loop;
    const elapsed = (ctx.currentTime - trackStartTime) % loop;
    return elapsed / loop;
  }

  function setPlayIcon(isPlaying){
    els.play.innerHTML = isPlaying ? svgPause() : svgPlay();
  }
  function svgPlay(){ return '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>'; }
  function svgPause(){ return '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>'; }

  function updateNowPlaying(track){
    els.title.textContent = track.name;
    els.meta.textContent = `${track.genre} · ${track.key} · ${track.bpm} BPM · ${track.depth}`;
    els.total.textContent = fmtTime(track.loop);
  }

  function highlightRow(index){
    els.rows.forEach(r => r.classList.toggle('active', parseInt(r.dataset.track,10) === index));
  }

  /* transport wiring */
  els.play.addEventListener('click', () => {
    if(playing){ pause(); } else { ctx ? resume() : startTrack(currentIndex); }
  });
  els.next.addEventListener('click', () => startTrack((currentIndex+1) % TRACKS.length));
  els.prev.addEventListener('click', () => startTrack((currentIndex-1+TRACKS.length) % TRACKS.length));

  els.rows.forEach(row => {
    row.addEventListener('click', () => startTrack(parseInt(row.dataset.track,10)));
  });

  if(els.volume){
    els.volume.addEventListener('input', () => {
      if(master) master.gain.value = parseFloat(els.volume.value);
    });
  }

  if(els.progressBar){
    els.progressBar.addEventListener('click', (e) => {
      if(!ctx) return;
      const r = els.progressBar.getBoundingClientRect();
      const frac = (e.clientX - r.left) / r.width;
      trackStartTime = ctx.currentTime - frac * TRACKS[currentIndex].loop;
    });
  }

  /* progress + oscilloscope + bg-level feed loop */
  function drawScope(){
    const canvas = els.scope;
    let dataArray;
    if(canvas){
      const c = canvas.getContext('2d');
      const resize = () => { canvas.width = canvas.clientWidth*2; canvas.height = canvas.clientHeight*2; };
      resize();
      window.addEventListener('resize', resize);
      dataArray = new Uint8Array(analyser.fftSize);

      const draw = () => {
        requestAnimationFrame(draw);
        analyser.getByteTimeDomainData(dataArray);

        // feed bg particle field
        let sum=0;
        for(let i=0;i<dataArray.length;i++){ const v=(dataArray[i]-128)/128; sum += v*v; }
        window.UNDERTOW_AUDIO_LEVEL = playing ? Math.sqrt(sum/dataArray.length) : window.UNDERTOW_AUDIO_LEVEL*0.9;

        if(!canvas) return;
        c.clearRect(0,0,canvas.width,canvas.height);
        c.lineWidth = 2;
        c.strokeStyle = '#e8a24a';
        c.beginPath();
        const slice = canvas.width / dataArray.length;
        let x = 0;
        for(let i=0;i<dataArray.length;i++){
          const v = dataArray[i]/128.0;
          const y = v * canvas.height/2;
          i===0 ? c.moveTo(x,y) : c.lineTo(x,y);
          x += slice;
        }
        c.stroke();

        if(playing && ctx){
          const frac = getElapsedFraction();
          els.progressSpan.style.width = (frac*100)+'%';
          els.cur.textContent = fmtTime(frac * TRACKS[currentIndex].loop);
        }
      };
      draw();
    }
  }

  /* initial UI state */
  updateNowPlaying(TRACKS[0]);
  highlightRow(0);

})();
