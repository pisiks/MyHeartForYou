import * as THREE from 'three';
import{EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import{RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import{UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import{OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import{OrbitControls} from 'three/addons/controls/OrbitControls.js';

const HeartPulse={
    speed:1.8,
    strength:0.08
};

let scene, camera, renderer, particles, composer, controls;
let time=0;
let isAnimationEnabled= true;
let currentTheme= 'molten';

const particleCount = 1000;

const themes={
    dual:{
        name:'Blue-Red',
        colors:[
            new THREE.Color(0x1e3cff), 
            new THREE.Color(0x00bfff),
            new THREE.Color(0xffffff), 
            new THREE.Color(0xff4b4b), 
            new THREE.Color(0xff0000),
        ],
        bloom:{ strength: 0.5, radius: 0.6, threshold: 0.6 }
    },
    molten:{
        name: 'Orange',
        colors:[
            new THREE.Color(0xff4800),
            new THREE.Color(0xff8c00),
            new THREE.Color(0xd73a00),
            new THREE.Color(0x3d1005),
            new THREE.Color(0xffc600),
        ],
        bloom:{strength: 0.35, radius: 0.45, threshold: 0.7}
    },
    cosmic:{
        name:'Purple',
        colors:[
            new THREE.Color(0x6a0dad),
            new THREE.Color(0x9370db),
            new THREE.Color(0x4b0082),
            new THREE.Color(0x8a2be2),
            new THREE.Color(0xdda0dd),
        ],
        bloom:{strength: 0.4, radius: 0.5, threshold: 0.65}
    },
    emerald:{
        name:'Green',
        colors:[
            new THREE.Color(0x00ff7f),
            new THREE.Color(0x3cb371),
            new THREE.Color(0x2e8b57),
            new THREE.Color(0x00fa9a),
            new THREE.Color(0x98fb98),
        ],
        bloom: {strength: 0.3, radius: 0.6, threshold: 0.75}
    }
};

document.addEventListener('DOMContentLoaded', init);

function createHeartPath(particleIndex, totalParticles){
    const t = (particleIndex/totalParticles) * Math.PI * 2;
    const scale = 2.2;
    //Formula za srce
    let x = 16 * Math.pow(Math.sin(t),3);
    let y = 13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t);
    const finalX= x * scale;
    const finalY = y * scale;
    const z = Math.sin(t*4) * 2;
    const jitterStrength = 0.2;
    return new THREE.Vector3(
        finalX + (Math.random()-0.5) * jitterStrength,
        finalY + (Math.random()-0.5) * jitterStrength,
        z + (Math.random()-0.5) * jitterStrength * 0.5,
    );
}

function init(){
    scene= new THREE.Scene();

    camera=new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1500);
    camera.position.z = 100;

    renderer= new THREE.WebGLRenderer({antialias:true});
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
    document.getElementById('container').appendChild(renderer.domElement);
    createUI();
    controls= new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.04;
    controls.rotateSpeed = 0.3;
    controls.minDistance = 30;
    controls.maxDistance = 300;
    controls.enablePan = false;

    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene,camera));
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight),1.5, 0.4, 0.85);
    composer.addPass(bloomPass);
    composer.addPass(new OutputPass());
    scene.userData.bloomPass = bloomPass;

    createParticleSystem();

    window.addEventListener('resize', onWindowResize);
    setTheme(currentTheme);
    animate();
}

function createUI(){
    const controlsDiv = document.getElementById('controls');
    controlsDiv.innerHTML = '';

//Theme Buttons
const themeSelector = document.createElement('div');
themeSelector.id = 'theme-selector';
Object.keys(themes).forEach((themeKey) => {
    const button = document.createElement('button');
    button.className = 'theme-btn';
    button.dataset.theme = themeKey;
    button.textContent = themes[themeKey].name;
    button.addEventListener('click', () => setTheme(themeKey));
    themeSelector.appendChild(button);
});
controlsDiv.appendChild(themeSelector);

const separator = document.createElement('div');
separator.className = 'separator';
controlsDiv.appendChild(separator);

//Animate Toggle
const toggleOption = document.createElement('div');
toggleOption.className = 'toggle-option';

const toggleLabel = document.createElement('label');
toggleLabel.className = 'toggle-switch';

const toggleInput = document.createElement('input');
toggleInput.type = 'checkbox';
toggleInput.id = 'animateToggle';
toggleInput.checked = true;
toggleInput.addEventListener('change', (e) => {
    isAnimationEnabled = e.target.checked;
});

const toggleSlider = document.createElement('span');
toggleSlider.className = 'toggle-slider';

toggleLabel.appendChild(toggleInput);
toggleLabel.appendChild(toggleSlider);

const labelForToggle = document.createElement('label');
labelForToggle.htmlFor = 'animateToggle';
labelForToggle.textContent = 'Animation';

toggleOption.appendChild(toggleLabel);
toggleOption.appendChild(labelForToggle);
controlsDiv.appendChild(toggleOption);
}


function createParticleSystem(){
    const geometry = new THREE.BufferGeometry();

    const positions= new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const heartPositions = new Float32Array(particleCount * 3);
    const disintegrationOffsets = new Float32Array(particleCount * 3);


    for(let i = 0; i < particleCount; i++){
        const i3 = i*3;
        const heartPos = createHeartPath(i,particleCount);

        positions[i3] = heartPos.x;
        positions[i3 + 1] = heartPos.y;
        positions[i3 + 2] = heartPos.z;

        heartPositions[i3] = heartPos.x;
        heartPositions[i3 + 1] = heartPos.y;
        heartPositions[i3 + 2] = heartPos.z;

        const{ color, size } = getAttributesForParticle(i);
        colors[i3] = color.r;
        colors[i3 + 1] = color.g;
        colors[i3 + 2] = color.b;
        sizes[i] = size;

        //Pravac u kojem ce letjeti tackice tokom dezintegracije
        const offsetStrength = 25 + Math.random() * 35;
        const phi = Math.random() * Math.PI * 2;
        const theta = Math.acos(2 * Math.random()-1);

        disintegrationOffsets[i3] = Math.sin(theta) * Math.cos(phi) * offsetStrength;
        disintegrationOffsets[i3 + 1] = Math.sin(theta) * Math.sin(phi) * offsetStrength;
        disintegrationOffsets[i3 + 2] = Math.cos(theta) * offsetStrength * 0.5;
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('heartPosition', new THREE.BufferAttribute(heartPositions, 3));
    geometry.setAttribute('disintegrationOffset', new THREE.BufferAttribute(disintegrationOffsets, 3));

    const material = new THREE.PointsMaterial({
        size: 2.5,
        map: createParticleTexture(),
        vertexColors: true,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
        alphaTest: 0.001
    });   
    
    particles = new THREE.Points(geometry, material);
    scene.add(particles);
}

function getAttributesForParticle(i){

    const t=i/particleCount;
    const colorPalette = themes[currentTheme].colors;

    const colorProgress = (t * colorPalette.length * 1.5 + time * 0.05)% colorPalette.length;
    const colorIndex1 = Math.floor(colorProgress);
    const colorIndex2 = (colorIndex1 + 1)% colorPalette.length;
    const blendFactor = colorProgress - colorIndex1;

    const color1 = colorPalette[colorIndex1];
    const color2 = colorPalette[colorIndex2];
    const baseColor = new THREE.Color().lerpColors(color1, color2, blendFactor);

    const color = baseColor.clone().multiplyScalar(0.7 + Math.random() * 0.4);
    const size = 0.5 + Math.random() * 0.7;

    const pulseMix = (Math.sin(time * 1.8) + 1) * 0.5;
    baseColor.lerp(new THREE.Color(0xff3344), pulseMix * 0.3);
    
    return {color, size};
}

function createParticleTexture(){
    const canvas = document.createElement('canvas');
    const size = 64;
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');

    const centerX = size /2;
    const centerY = size /2;
    const radius = size * 0.4;
    const gradient =context.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.2, 'rgba(255,255,255,0.8)');
    gradient.addColorStop(0.5, 'rgba(255,255,255,0.3)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');

    context.fillStyle = gradient;
    context.beginPath();
    context.arc(centerX, centerY, radius, 0, Math.PI * 2);
    context.fill();
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
}

function animateParticles(){
    const pulse = 1+Math.sin(time*HeartPulse.speed)*HeartPulse.strength;

    if(!particles || !isAnimationEnabled)return;
    
    const positions = particles.geometry.attributes.position.array;
    const heartPositions = particles.geometry.attributes.heartPosition.array;
    const particleColors = particles.geometry.attributes.color.array;
    const particleSizes = particles.geometry.attributes.size.array;
    const disintegrationOffsets = particles.geometry.attributes.disintegrationOffset.array;

    for(let i = 0; i<particleCount; i++){
        const i3 = i * 3;
        //pocetna pozicija srca
        const homeX = heartPositions[i3];
        const homeY = heartPositions[i3+1];
        const homeZ = heartPositions[i3+2];

        const pulsedHomeX = homeX * pulse;
        const pulsedHomeY = homeY * pulse;
        const pulsedHomeZ = homeZ * pulse;

        //Logika dezintegracije (eksplozija i skupljanje)
        const disintegrationCycleTime = 12.0;
        const particleCycleOffset = (i/particleCount) * disintegrationCycleTime * 0.5;
        const cycleProgress = ((time * 0.8 + particleCycleOffset) % disintegrationCycleTime) / disintegrationCycleTime;
        let disintegrationAmount = 0;
        if(cycleProgress > 0.5 && cycleProgress < 0.7){
            //faza raspadanja
            disintegrationAmount = (cycleProgress - 0.5)/0.2;
        }else if (cycleProgress >= 0.7 && cycleProgress < 0.8){
            //Maksimalna udaljenost
            disintegrationAmount = 1.0;
        }else if(cycleProgress >= 0.8){
            //povratak u formi srca
            disintegrationAmount = 1.0 - (cycleProgress - 0.8) / 0.2;
        }

        disintegrationAmount = disintegrationAmount * disintegrationAmount * (3-2 * disintegrationAmount);

        let currentTargetX = pulsedHomeX + disintegrationOffsets[i3]*disintegrationAmount;
        let currentTargetY = pulsedHomeY + disintegrationOffsets[i3+1]*disintegrationAmount;
        let currentTargetZ = pulsedHomeZ + disintegrationOffsets[i3+2]*disintegrationAmount;

        //Glatko kretanje prema meti
        const lerpFactor = 0.06;
        positions[i3] += (currentTargetX - positions[i3]) * lerpFactor;
        positions[i3+1] += (currentTargetY - positions[i3+1]) * lerpFactor;
        positions[i3+2] += (currentTargetZ - positions[i3+2]) * lerpFactor;

        //Boje i treperenje
        const {color: baseParticleColor, size: baseParticleSize} = getAttributesForParticle(i);
        let brightnessFactor = (0.7 + Math.sin(time * 2 + i * 0.1) * 0.3)*(1 - disintegrationAmount * 0.5);

        particleColors[i3] = baseParticleColor.r*brightnessFactor;
        particleColors[i3+1] = baseParticleColor.g*brightnessFactor;
        particleColors[i3+2] = baseParticleColor.b*brightnessFactor;

        particleSizes[i] = baseParticleSize * (1+Math.sin(time * 3 + i)* 0.2);
    }

    particles.geometry.attributes.position.needsUpdate = true;
    particles.geometry.attributes.color.needsUpdate = true;
    particles.geometry.attributes.size.needsUpdate = true;
}

function setTheme(themeName){
    if(!themes[themeName])return;
    currentTheme = themeName;

    document.body.classList.remove('theme-molten','theme-cosmic','theme-emerald','theme-dual');
    document.body.classList.add(`theme-${currentTheme}`);

    document.querySelectorAll('.theme-btn').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.theme === themeName);
    });

    const theme = themes[currentTheme];
    const bloomPass = scene.userData.bloomPass;
    if(bloomPass){
        bloomPass.strength = theme.bloom.strength;
        bloomPass.radius = theme.bloom.radius;
        bloomPass.threshold = theme.bloom.threshold;
    }
}

function onWindowResize(){
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
}

function animate(){
   
    requestAnimationFrame(animate);
    time+=0.02;
    controls.update();

    if(isAnimationEnabled){
        animateParticles();
    }
    composer.render();
}