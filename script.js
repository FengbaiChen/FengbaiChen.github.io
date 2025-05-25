// —————————————————————————————————————————————————
// 全局变量
let scene, camera, renderer, controls, activeModel;

// 可选模型列表（name 对应 li 的 id）
const MODELS = [
  { name: 'bag1',  label: 'Bag',   path: 'model/bag.glb',  thumb: 'images/bag1.jpg' },
  { name: 'bag2',  label: 'Bag 2', path: 'model/bag2.glb', thumb: 'images/bag2.jpg' }
];

// 入口：构建 Model 切换面板，初始化场景并启动动画
window.addEventListener('DOMContentLoaded', () => {
  addModelSwitcher();
  initScene();
  animate();
});

// 构建 Model 切换面板
function addModelSwitcher() {
  const container = document.querySelector('.material-list');
  MODELS.forEach(m => {
    const li = document.createElement('li');
    li.classList.add('todo-wrap', 'model-item');
    li.id = m.name;

    // —— 关键：把 thumb 当背景图设置上去 —— 
    li.style.backgroundImage    = `url(${m.thumb})`;
    li.style.backgroundSize     = 'cover';
    li.style.backgroundPosition = 'center';
    li.style.borderRadius       = '4px';
    li.style.overflow           = 'hidden';

    // 文字加一个半透明底，保证可读
    li.innerHTML = `
      <div class="todo-content">
        ${m.label}
      </div>
    `;

    container.appendChild(li);
  });

  container.addEventListener('click', e => {
    const li = e.target.closest('li.model-item');
    if (!li) return;
    const def = MODELS.find(x => x.name === li.id);
    if (def) {
      removeAllObjects();
      addLight();
      addModel(def.path);
    }
  });
}

// 初始化 Three.js 场景
function initScene() {
  // 1. 新建场景
  scene = new THREE.Scene();

  // 2. 用背景图替换纯色背景
  new THREE.TextureLoader().load('images/bg.jpg', texture => {
    scene.background = texture;
  });
  // 如果你还想保留原来的纯色，改成下面这样即可：
  // scene.background = new THREE.Color(0xf1f1f1);
  // scene.backgroundBlending = THREE.MixOperation; // 可选

  // 3. 保留你的雾化设置
  scene.fog = new THREE.Fog(0xf1f1f1, 20, 100);

  // 4. 相机、渲染器、控件……
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 0, -3);
  camera.rotation.set(1.0, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true, dithering: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.physicallyCorrectLights = true;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);

  
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableZoom = false;
  controls.maxPolarAngle = Math.PI / 2;
  controls.minPolarAngle = Math.PI / 3;
  controls.enableDamping = true;
  controls.dampingFactor = 0.1;

  // 5. 初始光源、地面、模型
  addLight();
  addModel(MODELS[0].path);
}


// 添加地面
function addFloor() {
  const geo = new THREE.PlaneGeometry(5000, 5000);
  const mat = new THREE.MeshPhongMaterial({ color: 0xeeeeee, shininess: 0 });
  const floor = new THREE.Mesh(geo, mat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  floor.position.y = -1;
  scene.add(floor);
}

// 添加灯光
function addLight() {
  scene.add(new THREE.AmbientLight(0xffffff, 0.1));
  const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1.2);
  hemi.position.set(0, 20, 0);
  scene.add(hemi);

  [[10,10,10,2.0],[-10,10,10,1.0],[10,10,-10,1.0],[-10,10,-10,0.8]]
    .forEach(cfg => {
      const light = new THREE.DirectionalLight(0xffffff, cfg[3]);
      light.position.set(cfg[0], cfg[1], cfg[2]);
      light.castShadow = true;
      scene.add(light);
    });

  const top = new THREE.SpotLight(0xffffff, 0.5, 100, Math.PI / 4);
  top.position.set(0, 20, 0);
  top.castShadow = true;
  scene.add(top);

  const fill = new THREE.DirectionalLight(0xffffff, 0.6);
  fill.position.set(5, -5, 10);
  fill.castShadow = false;
  scene.add(fill);
}

// 加载 GLTF/GLB 模型
function addModel(path) {
  const loader = new THREE.GLTFLoader();
  loader.load(path,
    gltf => {
      const model = gltf.scene;

      model.traverse(o => {
        if (o.isMesh) {
          // —— 1. 重建顶点法线以获取平滑过渡 —— 
          o.geometry.deleteAttribute('normal');
          o.geometry.computeVertexNormals();

          // —— 2. 彻底关闭所有法线／凹凸贴图 —— 
          const mat = o.material;
          if (mat) {
            mat.normalMap       = null;
            mat.bumpMap         = null;
            mat.displacementMap = null;
            // 如果还有法线强度参数，也清零
            if (mat.normalScale) mat.normalScale.set(0, 0);
            mat.flatShading     = false;  // 保证 smooth shading
            mat.needsUpdate     = true;
          }

          o.castShadow    = true;
          o.receiveShadow = true;
        }
      });

      // 保持你原来的 transform
      model.rotation.y = Math.PI;
      model.scale.set(10, 10, 10);
      model.position.set(0, -1.3, 0);

      activeModel = model;
      scene.add(model);
    },
    undefined,
    err => console.error('模型加载失败:', err)
  );
}

// 渲染循环
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

// 清空场景（切换模型时调用）
function removeAllObjects() {
  while (scene.children.length) {
    scene.remove(scene.children[0]);
  }
}
