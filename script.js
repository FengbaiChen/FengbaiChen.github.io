// script.js

// —————————————————————————————————————————————————
// 全局变量
var scene, camera, renderer, controls, activeModel;
const MODEL_PATH = 'model/bag.gltf';


// 颜色数组
const colors = [
  'FFFFFF','374047','5f6e78','7f8a93','97a1a7','acb4b9','DF9998','7C6862',
  'A3AB84','D6CCB1','F8D5C4','A3AE99','EFF2F2','B0C5C1','8B8C8C','565F59',
  'CB304A','FED7C8','C7BDBD','3DCBBE','264B4F','389389','85BEAE','F2DABA',
  'F2A97F','D85F52','D92E37','FC9736','F7BD69','A4D09C','4C8A67'
];

// PBR 材质定义
const MATERIALS = [
  {
    name: 'green-leather',
    label: 'Green Leather',
    path: 'assets/materials/green-leather/PBR'
  }
];

// —————————————————————————————————————————————————
// 入口：构建面板、初始化场景并启动动画
window.addEventListener('DOMContentLoaded', () => {
  addMaterialPalette();
  main();
  animate();
});

// —————————————————————————————————————————————————
// 1. 合并面板：Flat Colors + PBR
function addMaterialPalette() {
  const container = document.querySelector('.material-list');

  // 1.1 添加 Flat Colors
  colors.forEach(hex => {
    const li = document.createElement('li');
    li.classList.add('todo-wrap', 'flat-item');
    li.id = hex;
    li.style.background = `#${hex}`;
    li.innerHTML = `<div class="todo-content">#${hex}</div>`;
    container.appendChild(li);
  });

  // 1.2 添加 PBR 选项
  MATERIALS.forEach(m => {
    const li = document.createElement('li');
    li.classList.add('todo-wrap', 'pbr-item');
    li.id = m.name;
    li.innerHTML = `<div class="todo-content">${m.label}</div>`;
    container.appendChild(li);
  });

  // 1.3 统一事件委托：区分 flat-item / pbr-item
  container.addEventListener('click', e => {
    const li = e.target.closest('li.todo-wrap');
    if (!li) return;

    // Flat Color
    if (li.classList.contains('flat-item')) {
      const colorHex = li.id;
      const mat = new THREE.MeshStandardMaterial({
        color: parseInt('0x' + colorHex),
        side: THREE.DoubleSide   // ← 双面渲染
      });
      changeMaterial(activeModel, mat);
    }

    // PBR 材质
    if (li.classList.contains('pbr-item')) {
      const def = MATERIALS.find(x => x.name === li.id);
      if (def) loadPBRTextures(def.path, applyGreenLeather);
    }
  });
}

// —————————————————————————————————————————————————
// 2. Three.js 主流程
function main() {
  // 场景、雾和背景
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf1f1f1);
  scene.fog = new THREE.Fog(0xf1f1f1, 20, 100);

  // 相机
  camera = new THREE.PerspectiveCamera(
    75, window.innerWidth / window.innerHeight, 0.1, 1000
  );
  camera.position.set(0, 0, -3);
  camera.rotation.set(1.0, 0, 0);

  // 渲染器
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.physicallyCorrectLights = true;
  renderer.toneMapping = THREE.ReinhardToneMapping;
  renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);

  // 轨道控制
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.maxPolarAngle = Math.PI / 2;
  controls.minPolarAngle = Math.PI / 3;
  controls.enableDamping = true;
  controls.dampingFactor = 0.1;

  // 添加灯光、地面和模型
  addLight();
  addFloor();
  addModel(MODEL_PATH);
}

// —————————————————————————————————————————————————
// 3. 切换模型（如有多个）
const modelSection = document.querySelector('#models');
if (modelSection) {
  modelSection.addEventListener('click', e => {
    const id = e.target.id || e.target.parentElement.id;
    MODELS.forEach(mod => {
      if (id === mod.name) {
        removeAllObjects();
        addLight();
        addFloor();
        addModel(mod.path);
      }
    });
  });
}

// —————————————————————————————————————————————————
// 4. PBR 贴图加载器
function loadPBRTextures(path, onLoaded) {
  const loader = new THREE.TextureLoader();
  const files = [
    { key: 'map',          filename: 'SMALL_LADY_DIOR_BAG_BaseColor.png', encoding: THREE.sRGBEncoding },
    { key: 'normalMap',    filename: 'SMALL_LADY_DIOR_BAG_Normal.png',    encoding: THREE.sRGBEncoding },
    { key: 'roughnessMap', filename: 'SMALL_LADY_DIOR_BAG_Roughness.png', encoding: THREE.LinearEncoding },
    { key: 'metalnessMap', filename: 'SMALL_LADY_DIOR_BAG_Metallic.png',  encoding: THREE.LinearEncoding },
    { key: 'aoMap',        filename: 'SMALL_LADY_DIOR_BAG_map_AO.png',    encoding: THREE.LinearEncoding }
  ];

  const textures = {};
  let loaded = 0;

  files.forEach(item => {
    loader.load(
      `${path}/${item.filename}`,
      tex => {
        tex.flipY = false;
        tex.encoding = item.encoding;
        textures[item.key] = tex;
        if (++loaded === files.length) onLoaded(textures);
      },
      undefined,
      err => console.error('贴图加载失败:', item.filename, err)
    );
  });
}

// —————————————————————————————————————————————————
// 5. 应用 Green Leather PBR 材质
function applyGreenLeather(textures) {
  const mat = new THREE.MeshStandardMaterial({
    map:          textures.map,
    normalMap:    textures.normalMap,
    roughnessMap: textures.roughnessMap,
    metalnessMap: textures.metalnessMap,
    aoMap:        textures.aoMap,
    metalness:    0.2,
    roughness:    0.4,
    side:         THREE.DoubleSide  // ← 双面渲染
  });

  activeModel.traverse(o => {
    if (o.isMesh) {
      o.material.dispose();
      o.material = mat;
      if (o.geometry.attributes.uv2) {
        o.material.aoMapIntensity = 1.0;
      }
    }
  });
}

// —————————————————————————————————————————————————
// 6. 平面纯色材质替换
function changeMaterial(root, mat) {
  root.traverse(o => {
    if (o.isMesh) {
      o.material = mat;
    }
  });
}

// —————————————————————————————————————————————————
// 7. 地面
function addFloor() {
  const geo = new THREE.PlaneGeometry(5000, 5000);
  const mat = new THREE.MeshPhongMaterial({
    color: 0xeeeeee,
    shininess: 0
  });
  const floor = new THREE.Mesh(geo, mat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  floor.position.y = -1;
  scene.add(floor);
}

// —————————————————————————————————————————————————
// 8. 灯光
function addLight() {
  // 增强环境光
  scene.add(new THREE.AmbientLight(0xffffff, 0.9));

  // 半球光
  const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.9);
  hemi.position.set(0, 20, 0);
  scene.add(hemi);

  // 四面主光（保留原来）
  [
    [ 10, 10, 10, 1.2],
    [-10, 10, 10, 1.0],
    [ 10, 10,-10, 1.0],
    [-10, 10,-10, 0.8]
  ].forEach(cfg => {
    const light = new THREE.DirectionalLight(0xffffff, cfg[3]);
    light.position.set(cfg[0], cfg[1], cfg[2]);
    light.castShadow = true;
    scene.add(light);
  });

  // 顶部补光
  const top = new THREE.SpotLight(0xffffff, 0.5, 100, Math.PI/4);
  top.position.set(0, 20, 0);
  top.castShadow = true;
  scene.add(top);

  // 背面补光
  const backLight = new THREE.DirectionalLight(0xffffff, 0.4);
  backLight.position.set(0, 5, -10);
  scene.add(backLight);

  //（可选）调整曝光
  renderer.toneMappingExposure = 5.0;
}
// —————————————————————————————————————————————————
// 9. 加载 GLTF 模型
function addModel(modelPath) {
  const loader = new THREE.GLTFLoader();
  loader.load(modelPath,
    gltf => {
      const model = gltf.scene;
      model.rotation.y = Math.PI;
      activeModel = model;
      model.scale.set(5, 5, 5);
      model.position.set(0, -1, 0);
      model.traverse(o => {
        if (o.isMesh) {
          o.castShadow = true;
          o.receiveShadow = true;
        }
      });
      scene.add(model);
    },
    undefined,
    err => console.error(err)
  );
}

// —————————————————————————————————————————————————
// 10. 渲染循环
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

// —————————————————————————————————————————————————
// 11. 清除场景（切模型时用）
function removeAllObjects() {
  while (scene.children.length) {
    scene.remove(scene.children[0]);
  }
}
