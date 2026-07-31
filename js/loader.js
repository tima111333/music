/* UNDERTOW — loading sequence
   A record rises into place, the tonearm swings down and drops the needle;
   once it "reads the groove" the loader dissolves into the hero. */
(function(){
  const wrap = document.getElementById('loader-canvas');
  const barSpan = document.querySelector('.loader-bar span');
  const loaderEl = document.getElementById('loader');
  if(!wrap || !window.THREE){ if(loaderEl) loaderEl.classList.add('hide'); return; }

  const W = wrap.clientWidth, H = wrap.clientHeight;
  const renderer = new THREE.WebGLRenderer({ alpha:true, antialias:true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
  renderer.setSize(W,H);
  wrap.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, W/H, 0.1, 50);
  camera.position.set(0, 3.6, 5.2);
  camera.lookAt(0,0,0);

  scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  const key = new THREE.PointLight(0xe8a24a, 12, 20);
  key.position.set(3,4,3);
  scene.add(key);
  const rim = new THREE.PointLight(0x4fb7a8, 6, 20);
  rim.position.set(-3,2,-2);
  scene.add(rim);

  // record
  const recordGeo = new THREE.CylinderGeometry(1.6, 1.6, 0.06, 64);
  const recordMat = new THREE.MeshStandardMaterial({ color:0x0c0c0c, roughness:0.35, metalness:0.4 });
  const record = new THREE.Mesh(recordGeo, recordMat);
  scene.add(record);

  // grooves (subtle rings)
  for(let i=0;i<10;i++){
    const ringGeo = new THREE.TorusGeometry(0.35 + i*0.13, 0.004, 6, 64);
    const ringMat = new THREE.MeshStandardMaterial({ color:0x2a2a2a, roughness:0.5 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI/2;
    ring.position.y = 0.031;
    record.add(ring);
  }

  // label
  const labelGeo = new THREE.CylinderGeometry(0.32,0.32,0.065,32);
  const labelMat = new THREE.MeshStandardMaterial({ color:0xe8a24a, roughness:0.5 });
  const label = new THREE.Mesh(labelGeo, labelMat);
  record.add(label);

  // tonearm (pivot group)
  const arm = new THREE.Group();
  arm.position.set(1.9, 0.4, -1.0);
  scene.add(arm);

  const armBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12,0.14,0.2,20),
    new THREE.MeshStandardMaterial({ color:0x333333, metalness:0.6, roughness:0.3 })
  );
  arm.add(armBase);

  const armPivot = new THREE.Group();
  armPivot.position.set(0,0.1,0);
  arm.add(armPivot);

  const armRod = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025,0.025,2.1,10),
    new THREE.MeshStandardMaterial({ color:0xd8d8d8, metalness:0.8, roughness:0.2 })
  );
  armRod.rotation.z = Math.PI/2;
  armRod.position.set(-1.05, 0, 0);
  armPivot.add(armRod);

  const headshell = new THREE.Mesh(
    new THREE.BoxGeometry(0.14,0.06,0.22),
    new THREE.MeshStandardMaterial({ color:0x1a1a1a, metalness:0.5, roughness:0.4 })
  );
  headshell.position.set(-2.05,0,0);
  armPivot.add(headshell);

  // needle glow
  const needle = new THREE.PointLight(0xe8a24a, 0, 3);
  needle.position.set(-2.1,-0.05,0);
  armPivot.add(needle);

  // start: arm lifted, record hidden below
  armPivot.rotation.z = -0.55;
  record.position.y = -1.4;

  let start = null;
  const DURATION = 2600; // ms

  function ease(t){ return 1 - Math.pow(1-t, 3); }

  function frame(ts){
    if(!start) start = ts;
    const elapsed = ts - start;
    const p = Math.min(elapsed / DURATION, 1);

    // phase 1 (0-0.45): record rises
    const riseP = Math.min(p/0.45, 1);
    record.position.y = -1.4 + ease(riseP) * 1.4;

    // phase 2 (0.4-0.8): arm swings down onto record
    const armP = Math.min(Math.max((p-0.4)/0.4,0),1);
    armPivot.rotation.z = -0.55 + ease(armP) * 0.42;
    needle.intensity = ease(armP) * 1.6;

    // spinning starts once arm contacts (phase 3)
    if(p > 0.75){ record.rotation.y += 0.14; }

    barSpan && (barSpan.style.width = (p*100).toFixed(0)+'%');

    renderer.render(scene, camera);

    if(p < 1){
      requestAnimationFrame(frame);
    }else{
      // hold briefly then hide loader
      setTimeout(() => {
        loaderEl && loaderEl.classList.add('hide');
        document.dispatchEvent(new CustomEvent('undertow:loaded'));
      }, 350);
      // keep spinning quietly behind the fade
      (function spin(){
        record.rotation.y += 0.06;
        renderer.render(scene, camera);
        if(!loaderEl.classList.contains('hide') || performance.now() - ts < 1200){
          requestAnimationFrame(spin);
        }
      })();
    }
  }
  requestAnimationFrame(frame);

  // safety: never block the page for more than ~5s
  setTimeout(() => { loaderEl && loaderEl.classList.add('hide'); }, 5000);
})();
