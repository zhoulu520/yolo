import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom, Noise, Vignette, BrightnessContrast } from '@react-three/postprocessing';
import { TreeState, HandData, OrnamentData } from '../types';
import { COLORS, ORNAMENT_COUNT, TREE_HEIGHT, TREE_RADIUS } from '../constants';

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const TREE_ROTATION_SPEED = 0.3;

// Helper to create a texture from an emoji
const createEmojiTexture = (emoji: string) => {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.font = '100px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, 64, 74);
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  return texture;
};

// Helper to create a circular dot texture
const createCircleTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.beginPath();
  ctx.arc(32, 32, 28, 0, Math.PI * 2);
  ctx.fillStyle = 'white';
  ctx.fill();
  const texture = new THREE.CanvasTexture(canvas);
  return texture;
};

// Aurora Background Component with Christmas Palette
const AuroraBackground: React.FC = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const { viewport, camera } = useThree();
  
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uColorRed: { value: new THREE.Color('#4d0000') }, // Deep Christmas Red
    uColorGreen: { value: new THREE.Color('#0a1f14') }, // Forest Matte Green
    uColorGold: { value: new THREE.Color('#332200') }, // Subtle Metallic Gold base
  }), []);

  const vertexShader = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const fragmentShader = `
    uniform float uTime;
    uniform vec3 uColorRed;
    uniform vec3 uColorGreen;
    uniform vec3 uColorGold;
    varying vec2 vUv;

    void main() {
      vec2 uv = vUv;
      float time = uTime * 0.08;
      
      // Complex flow for organic nebula look
      float flow1 = sin(uv.x * 1.5 + uv.y * 1.2 + time) * 0.5 + 0.5;
      float flow2 = cos(uv.x * 2.0 - uv.y * 1.5 + time * 0.7) * 0.5 + 0.5;
      float flow3 = sin(uv.x * 3.0 + uv.y * 3.0 + time * 1.2) * 0.5 + 0.5;

      // Layered color mixing
      vec3 colorMix1 = mix(uColorGreen, uColorRed, flow1);
      vec3 colorMix2 = mix(colorMix1, uColorGold, flow2 * 0.6);
      
      // Highlight shimmer
      float shimmer = pow(flow3, 8.0) * 0.15;
      vec3 finalColor = colorMix2 + vec3(shimmer * 1.5, shimmer * 1.2, shimmer * 0.5);
      
      // Vignette effect built into background
      float dist = distance(uv, vec2(0.5));
      float mask = smoothstep(1.2, 0.2, dist);
      
      gl_FragColor = vec4(finalColor * mask, 1.0);
    }
  `;

  useFrame((state) => {
    if (meshRef.current) {
      (meshRef.current.material as THREE.ShaderMaterial).uniforms.uTime.value = state.clock.elapsedTime;
      meshRef.current.position.copy(camera.position);
      meshRef.current.quaternion.copy(camera.quaternion);
      meshRef.current.translateZ(-85); 
    }
  });

  return (
    <mesh ref={meshRef} scale={[viewport.width * 12, viewport.height * 12, 1]} frustumCulled={false}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        depthWrite={false}
        transparent={false}
      />
    </mesh>
  );
};

// Merry Christmas Particle Text with scanning sweep effect
const MerryChristmasText: React.FC<{ treeState: TreeState }> = ({ treeState }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  const particles = useMemo(() => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return [];

    canvas.width = 800;
    canvas.height = 200;
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 80px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Merry Christmas', canvas.width / 2, canvas.height / 2);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const points = [];
    const step = 4; 
    const scale = 0.035; 
    for (let y = 0; y < canvas.height; y += step) {
      for (let x = 0; x < canvas.width; x += step) {
        const index = (y * canvas.width + x) * 4;
        if (imageData[index] > 128) {
          points.push({
            x: (x - canvas.width / 2) * scale,
            y: (canvas.height / 2 - y) * scale,
            z: 0,
            id: Math.random()
          });
        }
      }
    }
    return points;
  }, []);

  useFrame((state) => {
    if (!meshRef.current) return;
    const time = state.clock.elapsedTime;
    
    // Always face camera
    meshRef.current.quaternion.copy(state.camera.quaternion);
    meshRef.current.position.set(0, 4.5, 6.0);

    const isScattered = treeState === TreeState.SCATTERED;
    
    // Sweep effect logic
    const sweepRange = 16; 
    const sweepSpeed = 4.0;
    const sweepX = (time * sweepSpeed) % sweepRange - (sweepRange / 2);

    particles.forEach((p, i) => {
      const offsetX = Math.sin(time * 0.5 + p.id * 10) * 0.05;
      const offsetY = Math.cos(time * 0.7 + p.id * 10) * 0.05;
      const scaleBase = 0.06 + Math.sin(time * 2 + p.id * 20) * 0.015;

      let sweepIntensity = 0;
      if (isScattered) {
        const dist = Math.abs(p.x - sweepX);
        sweepIntensity = Math.pow(Math.max(0, 1.0 - dist / 2.0), 4.0) * 8.0;
      }

      dummy.position.set(p.x + offsetX, p.y + offsetY, p.z);
      dummy.scale.setScalar(scaleBase * (1.0 + sweepIntensity * 0.1));
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
      
      const shimmer = 0.8 + Math.sin(time * 3 + p.id * 50) * 0.2;
      const baseColor = new THREE.Color(2.5, 2.0, 0.5); // Gold
      const scanColor = new THREE.Color(4.0, 4.0, 4.0); // Bright White/Silver for sweep
      
      const finalColor = baseColor.clone().multiplyScalar(shimmer).lerp(scanColor, sweepIntensity * 0.2);
      meshRef.current!.setColorAt(i, finalColor);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, particles.length]} frustumCulled={false}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial transparent blending={THREE.AdditiveBlending} />
    </instancedMesh>
  );
};

// Top Star Component - Synchronized rotation and stable visual
const TreeTopStar: React.FC<{ treeState: TreeState; texture: THREE.Texture | null }> = ({ treeState, texture }) => {
  const groupRef = useRef<THREE.Group>(null);
  const opacityRef = useRef(1);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    
    // Rotate in sync with the tree
    const angleOffset = state.clock.elapsedTime * TREE_ROTATION_SPEED;
    groupRef.current.rotation.y = angleOffset;

    // Transition visibility
    const targetOpacity = treeState === TreeState.CLOSED ? 1 : 0;
    opacityRef.current = lerp(opacityRef.current, targetOpacity, delta * 3);
    
    groupRef.current.scale.setScalar(Math.max(0.001, opacityRef.current));
    
    groupRef.current.children.forEach((child) => {
      const mat = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
      mat.opacity = opacityRef.current;
    });
  });

  return (
    <group ref={groupRef} position={[0, TREE_HEIGHT / 2 + 1.2, 0]}>
      {/* Crossed planes ensure visibility from all sides during rotation */}
      <mesh frustumCulled={false}>
        <planeGeometry args={[3, 3]} />
        <meshBasicMaterial 
          map={texture} 
          transparent 
          alphaTest={0.05} 
          depthWrite={false} 
          color={new THREE.Color(2.0, 1.8, 1.2)} 
        />
      </mesh>
      <mesh rotation={[0, Math.PI / 2, 0]} frustumCulled={false}>
        <planeGeometry args={[3, 3]} />
        <meshBasicMaterial 
          map={texture} 
          transparent 
          alphaTest={0.05} 
          depthWrite={false} 
          color={new THREE.Color(2.0, 1.8, 1.2)} 
        />
      </mesh>
    </group>
  );
};

const BaseRipple: React.FC<{ treeState: TreeState }> = ({ treeState }) => {
  const ringsCount = 6; 
  const particlesPerRing = 450; 
  const totalCount = ringsCount * particlesPerRing;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const dotTexture = useMemo(() => createCircleTexture(), []);
  const cycleDuration = 6.5; 
  const staggerTime = 0.9; 
  const rippleData = useMemo(() => {
    return Array.from({ length: totalCount }).map((_, i) => {
      const ringIndex = Math.floor(i / particlesPerRing);
      const particleInRingIndex = i % particlesPerRing;
      return { 
        ringIndex, 
        angle: (particleInRingIndex / particlesPerRing) * Math.PI * 2, 
        randomOffset: Math.random() * 0.5, 
        speed: 0.8 + Math.random() * 0.4 
      };
    });
  }, []);

  useFrame((state) => {
    if (!meshRef.current) return;
    const time = state.clock.elapsedTime;
    const isClosed = treeState === TreeState.CLOSED;
    const baseRadius = isClosed ? 28 : 55; 
    
    rippleData.forEach((r, i) => {
      const startTime = r.ringIndex * staggerTime;
      const cycleTime = (time - startTime) % cycleDuration;
      
      if (time < startTime) {
        dummy.scale.setScalar(0); 
        dummy.updateMatrix(); 
        meshRef.current!.setMatrixAt(i, dummy.matrix); 
        return;
      }
      
      const activeWindow = 3.0; 
      const progress = cycleTime / activeWindow;
      
      if (progress > 1.0 || progress < 0) {
        dummy.scale.setScalar(0); 
        dummy.updateMatrix(); 
        meshRef.current!.setMatrixAt(i, dummy.matrix); 
        return;
      }
      
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentRadius = (easeOutQuart * baseRadius) + r.randomOffset * 10;
      
      const opacity = Math.max(0, 1 - progress);
      const x = Math.cos(r.angle) * currentRadius;
      const z = Math.sin(r.angle) * currentRadius;
      const y = -TREE_HEIGHT / 2 - 0.5;
      
      dummy.position.set(x, y, z);
      dummy.rotation.set(-Math.PI / 2, 0, 0); 
      
      const size = (0.08 + r.randomOffset * 0.15) * opacity;
      dummy.scale.setScalar(size);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
      
      const glowColor = new THREE.Color(6.0, 5.0, 1.8).multiplyScalar(opacity);
      meshRef.current!.setColorAt(i, glowColor);
    });
    
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, totalCount]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={dotTexture} transparent blending={THREE.AdditiveBlending} depthWrite={false} />
    </instancedMesh>
  );
};

const MeteorShower: React.FC<{ treeState: TreeState }> = ({ treeState }) => {
  const count = 300;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const dotTexture = useMemo(() => createCircleTexture(), []);
  const meteorData = useMemo(() => {
    return Array.from({ length: count }).map(() => ({ phase: Math.random() * Math.PI * 2, speed: 0.3 + Math.random() * 1.2, yOffset: (Math.random() - 0.5) * TREE_HEIGHT * 1.2, radiusOffset: 0.5 + Math.random() * 3, size: 0.04 + Math.random() * 0.08, verticalSpeed: (Math.random() - 0.5) * 0.2 }));
  }, []);
  useFrame((state) => {
    if (!meshRef.current) return;
    const time = state.clock.elapsedTime;
    const isClosed = treeState === TreeState.CLOSED;
    meteorData.forEach((m, i) => {
      const t = time * m.speed + m.phase;
      const verticalDrift = Math.sin(time * 0.5 + m.phase) * 2;
      const orbitRadius = isClosed ? (TREE_RADIUS * 1.1 + m.radiusOffset) : 25;
      const x = Math.cos(t) * orbitRadius;
      const z = Math.sin(t) * orbitRadius;
      const y = m.yOffset + verticalDrift;
      dummy.position.set(x, y, z);
      dummy.quaternion.copy(state.camera.quaternion);
      const pulse = 1 + Math.sin(time * 3 + m.phase) * 0.3;
      dummy.scale.setScalar(m.size * pulse * (isClosed ? 1 : 0.3));
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={dotTexture} color={new THREE.Color(2.0, 1.6, 0.4)} transparent blending={THREE.AdditiveBlending} opacity={0.9} />
    </instancedMesh>
  );
};

const Snowfall: React.FC = () => {
  const emojiCount = 100;
  const emojiMeshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const emojiTexture = useMemo(() => createEmojiTexture('❄️'), []);
  const emojiData = useMemo(() => Array.from({ length: emojiCount }).map(() => ({ x: (Math.random() - 0.5) * 60, y: Math.random() * 50 - 15, z: (Math.random() - 0.5) * 60, speed: 0.3 + Math.random() * 1.2, offset: Math.random() * Math.PI * 2, size: 0.08 + Math.random() * 0.12, rotSpeed: (Math.random() - 0.5) * 2 })), []);
  useFrame((state, delta) => {
    if (!emojiMeshRef.current) return;
    for (let i = 0; i < emojiData.length; i++) {
      const s = emojiData[i];
      s.y -= s.speed * delta * 2;
      const xOffset = Math.sin(state.clock.elapsedTime * 0.4 + s.offset) * 0.1;
      const zOffset = Math.cos(state.clock.elapsedTime * 0.3 + s.offset) * 0.1;
      if (s.y < -20) { s.y = 30; s.x = (Math.random() - 0.5) * 60; s.z = (Math.random() - 0.5) * 60; }
      dummy.position.set(s.x + xOffset, s.y, s.z + zOffset);
      dummy.rotation.z += s.rotSpeed * delta;
      dummy.quaternion.copy(state.camera.quaternion);
      dummy.scale.setScalar(s.size * 2);
      dummy.updateMatrix();
      emojiMeshRef.current.setMatrixAt(i, dummy.matrix);
    }
    emojiMeshRef.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={emojiMeshRef} args={[undefined, undefined, emojiCount]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={emojiTexture} transparent opacity={0.6} alphaTest={0.05} />
    </instancedMesh>
  );
};

const EmojiLayer: React.FC<{ data: OrnamentData[]; texture: THREE.Texture; treeState: TreeState; handData: HandData; }> = ({ data, texture, treeState, handData }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const currentPositions = useRef(data.map(o => [...o.treePos]));
  
  useFrame((state, delta) => {
    if (!meshRef.current) return;
    const t = delta * 2.5; 
    const angleOffset = state.clock.elapsedTime * TREE_ROTATION_SPEED;
    
    for (let i = 0; i < data.length; i++) {
      const o = data[i];
      const target = treeState === TreeState.CLOSED ? o.treePos : o.scatterPos;
      
      currentPositions.current[i][0] = lerp(currentPositions.current[i][0], target[0], t);
      currentPositions.current[i][1] = lerp(currentPositions.current[i][1], target[1], t);
      currentPositions.current[i][2] = lerp(currentPositions.current[i][2], target[2], t);
      
      let px = currentPositions.current[i][0];
      let py = currentPositions.current[i][1];
      let pz = currentPositions.current[i][2];
      
      if (treeState === TreeState.SCATTERED) {
        px += Math.sin(state.clock.elapsedTime * 0.4 + i) * 0.015; 
        py += Math.cos(state.clock.elapsedTime * 0.5 + i) * 0.015; 
        pz += Math.sin(state.clock.elapsedTime * 0.6 + i) * 0.015;
      } else {
        const s = Math.sin(angleOffset); 
        const c = Math.cos(angleOffset); 
        const rx = px * c - pz * s; 
        const rz = px * s + pz * c; 
        px = rx; 
        pz = rz;
      }
      
      dummy.position.set(px, py, pz);
      dummy.quaternion.copy(state.camera.quaternion);
      
      const s = treeState === TreeState.CLOSED ? o.size : o.size * 2.0;
      dummy.scale.setScalar(lerp(dummy.scale.x, s, t));
      
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
      
      if (o.color === COLORS.METALLIC_GOLD) { 
        meshRef.current.setColorAt(i, new THREE.Color(1.5, 1.3, 0.5)); 
      } else { 
        meshRef.current.setColorAt(i, new THREE.Color(1, 1, 1)); 
      }
    }
    
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, data.length]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={texture} transparent alphaTest={0.1} side={THREE.DoubleSide} />
    </instancedMesh>
  );
};

const Scene3D: React.FC<{ treeState: TreeState; handData: HandData }> = ({ treeState, handData }) => {
  const targetCameraRotation = useRef({ x: 0, y: 0 });
  const emojiTextures = useMemo(() => ({ 
    tree: createEmojiTexture('🎄'), 
    gift: createEmojiTexture('🎁'), 
    candy: createEmojiTexture('🍬'), 
    bell: createEmojiTexture('🔔'), 
    snowflake: createEmojiTexture('❄️'), 
    star: createEmojiTexture('🌟') 
  }), []);

  const ornamentSets = useMemo(() => {
    const sets: Record<string, OrnamentData[]> = { tree: [], gift: [], candy: [], bell: [], snowflake: [], star: [] };
    for (let i = 0; i < ORNAMENT_COUNT; i++) {
      const h = Math.random() * TREE_HEIGHT;
      const ratio = 1 - h / TREE_HEIGHT;
      const r = ratio * TREE_RADIUS * (0.8 + Math.random() * 0.4);
      const theta = Math.random() * Math.PI * 2;
      const treePos: [number, number, number] = [r * Math.cos(theta), h - TREE_HEIGHT / 2, r * Math.sin(theta)];
      const scatterR = 15 + Math.random() * 25;
      const sTheta = Math.random() * Math.PI * 2;
      const sPhi = Math.random() * Math.PI;
      const scatterPos: [number, number, number] = [scatterR * Math.sin(sPhi) * Math.cos(sTheta), scatterR * Math.sin(sPhi) * Math.sin(sTheta), scatterR * Math.cos(sPhi)];
      const rand = Math.random();
      let type: keyof typeof sets = 'tree'; 
      let size = 0.5 + Math.random() * 0.4; 
      let color = COLORS.MATTE_GREEN;
      
      if (rand < 0.6) { type = 'tree'; size *= 1.2; } 
      else if (rand < 0.75) { type = 'gift'; color = COLORS.CHRISTMAS_RED; } 
      else if (rand < 0.85) { type = 'candy'; } 
      else if (rand < 0.92) { type = 'bell'; color = COLORS.METALLIC_GOLD; } 
      else { type = 'snowflake'; }
      
      sets[type].push({ initialPos: [...treePos], treePos, scatterPos, type: 'sphere', color, size });
    }
    return sets;
  }, []);

  const CameraController = () => {
    useFrame((state, delta) => {
      const t = delta * 3;
      if (handData.detected) { 
        targetCameraRotation.current.y = (handData.position.x - 0.5) * Math.PI; 
        targetCameraRotation.current.x = (handData.position.y - 0.5) * Math.PI * 0.5; 
      }
      const dist = 32;
      state.camera.position.x = lerp(state.camera.position.x, dist * Math.sin(targetCameraRotation.current.y), t);
      state.camera.position.z = lerp(state.camera.position.z, dist * Math.cos(targetCameraRotation.current.y), t);
      state.camera.position.y = lerp(state.camera.position.y, targetCameraRotation.current.x * 20 + 7, t);
      state.camera.lookAt(0, 0, 0);
    });
    return null;
  };

  return (
    <Canvas camera={{ position: [0, 5, 32], fov: 40 }} gl={{ antialias: false, powerPreference: "high-performance" }} dpr={[1, 2]}>
      <color attach="background" args={[COLORS.DEEP_BLACK]} />
      <CameraController />
      <ambientLight intensity={0.6} />
      <pointLight position={[20, 20, 20]} intensity={2} color={COLORS.METALLIC_GOLD} />
      <pointLight position={[-20, 5, -15]} intensity={1.5} color={COLORS.CHRISTMAS_RED} />
      
      <AuroraBackground />
      <Snowfall />
      <MeteorShower treeState={treeState} />
      <BaseRipple treeState={treeState} />
      <MerryChristmasText treeState={treeState} />

      {Object.entries(ornamentSets).map(([key, data]) => (
          <EmojiLayer key={key} data={data} texture={emojiTextures[key as keyof typeof emojiTextures]!} treeState={treeState} handData={handData} />
      ))}

      <TreeTopStar treeState={treeState} texture={emojiTextures.star} />

      <EffectComposer multisampling={0} disableNormalPass>
        <Bloom luminanceThreshold={0.2} mipmapBlur intensity={1.5} radius={0.5} />
        <BrightnessContrast brightness={0.02} contrast={0.1} />
        <Noise opacity={0.05} />
        <Vignette eskil={false} offset={0.2} darkness={1.3} />
      </EffectComposer>
    </Canvas>
  );
};

export default Scene3D;