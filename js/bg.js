/* UNDERTOW — ambient 3D particle field ("bioluminescence")
   Renders a slow drifting field of glowing points behind every page.
   Reacts gently to mouse position and, on the music page, to audio level. */
(function(){
  if(!window.THREE) return;
  const canvas = document.getElementById('bg-canvas');
  if(!canvas) return;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha:true, antialias:true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, window.innerWidth/window.innerHeight, 0.1, 100);
  camera.position.z = 12;

  // particle field
  const COUNT = window.innerWidth < 760 ? 500 : 1400;
  const positions = new Float32Array(COUNT*3);
  const speeds = new Float32Array(COUNT);
  const colorChoice = new Float32Array(COUNT);
  for(let i=0;i<COUNT;i++){
    positions[i*3]   = (Math.random()-0.5)*30;
    positions[i*3+1] = (Math.random()-0.5)*20;
    positions[i*3+2] = (Math.random()-0.5)*20;
    speeds[i] = 0.05 + Math.random()*0.15;
    colorChoice[i] = Math.random();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions,3));

  const amber = new THREE.Color(0xe8a24a);
  const teal  = new THREE.Color(0x4fb7a8);
  const colors = new Float32Array(COUNT*3);
  for(let i=0;i<COUNT;i++){
    const c = colorChoice[i] > 0.82 ? amber : teal;
    colors[i*3]=c.r; colors[i*3+1]=c.g; colors[i*3+2]=c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors,3));

  const mat = new THREE.PointsMaterial({
    size:0.06, sizeAttenuation:true, vertexColors:true,
    transparent:true, opacity:0.75, depthWrite:false, blending:THREE.AdditiveBlending
  });
  const points = new THREE.Points(geo, mat);
  scene.add(points);

  // a few larger soft "glow" sprites for depth
  const glowGeo = new THREE.SphereGeometry(0.5, 8, 8);
  const glowMat = new THREE.MeshBasicMaterial({ color:0xe8a24a, transparent:true, opacity:0.05 });
  for(let i=0;i<6;i++){
    const g = new THREE.Mesh(glowGeo, glowMat.clone());
    g.position.set((Math.random()-0.5)*20,(Math.random()-0.5)*14,(Math.random()-0.5)*10-4);
    g.scale.setScalar(2+Math.random()*4);
    scene.add(g);
  }

  let mouseX=0, mouseY=0, targetX=0, targetY=0;
  window.addEventListener('mousemove', (e)=>{
    mouseX = (e.clientX/window.innerWidth - 0.5);
    mouseY = (e.clientY/window.innerHeight - 0.5);
  });

  window.UNDERTOW_AUDIO_LEVEL = 0; // set by player.js when audio is playing

  let t=0;
  function animate(){
    t += 0.0035;
    targetX += (mouseX - targetX) * 0.02;
    targetY += (mouseY - targetY) * 0.02;
    camera.position.x = targetX * 2;
    camera.position.y = -targetY * 1.2;
    camera.lookAt(0,0,0);

    const level = window.UNDERTOW_AUDIO_LEVEL || 0;
    points.rotation.y = t * 0.15;
    points.rotation.x = Math.sin(t*0.3) * 0.05;
    mat.size = 0.06 + level*0.12;
    mat.opacity = 0.65 + level*0.3;

    const pos = geo.attributes.position.array;
    for(let i=0;i<COUNT;i++){
      pos[i*3+1] += speeds[i]*0.01;
      if(pos[i*3+1] > 10) pos[i*3+1] = -10;
    }
    geo.attributes.position.needsUpdate = true;

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }
  animate();

  window.addEventListener('resize', ()=>{
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
})();
