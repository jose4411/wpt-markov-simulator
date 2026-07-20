import React, { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  OrbitControls,
  Environment,
  ContactShadows,
  Sparkles,
  Text,
} from "@react-three/drei";
import { EffectComposer, Bloom, Vignette, Noise } from "@react-three/postprocessing";
import * as THREE from "three";

/* ---------------------------------------------------------------------- */
/*  Utilidades de mapeo: valores fisicos (del backend) -> escena 3D        */
/* ---------------------------------------------------------------------- */

const clamp01 = (v) => Math.max(0, Math.min(1, v));

// distancia real 2-20 cm -> separacion visual 1.1 - 4.2 unidades
function distanceToUnits(distance_cm) {
  return 1.1 + (clamp01((distance_cm - 2) / 18) * 3.1);
}

/* ---------------------------------------------------------------------- */
/*  Bobina (emisora o receptora): anillo metalico con brillo segun potencia*/
/* ---------------------------------------------------------------------- */

function Coil({ position, radius = 0.75, color, intensity, spinning }) {
  const ref = useRef();
  useFrame((_, dt) => {
    if (spinning && ref.current) ref.current.rotation.z += dt * (0.4 + intensity * 1.5);
  });

  return (
    <group position={position}>
      {[0, 0.06, 0.12].map((offset, i) => (
        <mesh key={i} ref={i === 0 ? ref : undefined} rotation={[Math.PI / 2, 0, 0]} position={[0, offset, 0]} castShadow receiveShadow>
          <torusGeometry args={[radius - i * 0.05, 0.045, 16, 64]} />
          <meshStandardMaterial
            color={color}
            metalness={0.9}
            roughness={0.25}
            emissive={color}
            emissiveIntensity={0.15 + intensity * 1.6}
          />
        </mesh>
      ))}
    </group>
  );
}

/* ---------------------------------------------------------------------- */
/*  Campo electromagnetico: anillos concentricos pulsantes, aditivos       */
/* ---------------------------------------------------------------------- */

function EMField({ gap, efficiency, powerRatio, overheating }) {
  const group = useRef();
  const rings = 5;

  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = clock.getElapsedTime();
    group.current.children.forEach((ring, i) => {
      const phase = (t * (0.6 + powerRatio * 1.4) + i * 0.35) % 1;
      const scale = 0.3 + phase * (0.9 + powerRatio * 0.6);
      ring.scale.set(scale, scale, scale);
      ring.material.opacity = (1 - phase) * (0.08 + efficiency * 0.5) * (0.3 + powerRatio);
    });
  });

  const color = overheating ? "#FF9B45" : "#22D3EE";

  return (
    <group ref={group} position={[0, gap / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
      {Array.from({ length: rings }).map((_, i) => (
        <mesh key={i}>
          <torusGeometry args={[0.85, 0.02, 8, 48]} />
          <meshBasicMaterial color={color} transparent opacity={0.2} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

/* ---------------------------------------------------------------------- */
/*  Flujo de particulas de energia entre emisor y receptor                 */
/* ---------------------------------------------------------------------- */

function EnergyParticles({ gap, powerRatio, efficiency, misalignment }) {
  const count = 60;
  const meshRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const seeds = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        offset: Math.random(),
        radiusJitter: (Math.random() - 0.5) * 0.5,
        angle: Math.random() * Math.PI * 2,
        speed: 0.4 + Math.random() * 0.6,
      })),
    []
  );

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();
    const dispersion = 0.15 + misalignment * 1.4; // mala alineacion => se dispersan

    seeds.forEach((seed, i) => {
      const progress = (t * (0.25 + powerRatio * 0.6) * seed.speed + seed.offset) % 1;
      const y = progress * gap; // de la base (y=0) al telefono (y=gap)
      const radius = 0.15 + seed.radiusJitter * dispersion + Math.sin(progress * Math.PI) * 0.25;
      const angle = seed.angle + t * 0.6;

      dummy.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
      const s = 0.02 + powerRatio * 0.03 * (0.5 + efficiency);
      dummy.scale.setScalar(Math.max(0.008, s));
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  const color = efficiency > 0.45 ? "#5FE8F2" : efficiency > 0.2 ? "#B69CFF" : "#FF9B45";

  return (
    <instancedMesh ref={meshRef} args={[null, null, count]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial color={color} transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} />
    </instancedMesh>
  );
}

/* ---------------------------------------------------------------------- */
/*  Base transmisora                                                       */
/* ---------------------------------------------------------------------- */

function TransmitterBase({ powerRatio }) {
  return (
    <group position={[0, 0, 0]}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[1.15, 1.3, 0.22, 64]} />
        <meshStandardMaterial color="#131C29" metalness={0.6} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.115, 0]}>
        <cylinderGeometry args={[1.0, 1.0, 0.02, 64]} />
        <meshStandardMaterial
          color="#0FB8D4"
          emissive="#0FB8D4"
          emissiveIntensity={0.3 + powerRatio * 1.2}
          metalness={0.2}
          roughness={0.5}
          transparent
          opacity={0.85}
        />
      </mesh>
    </group>
  );
}

/* ---------------------------------------------------------------------- */
/*  Telefono receptor: vidrio + carcasa metalica + glow segun carga        */
/* ---------------------------------------------------------------------- */

function Phone({ position, misalignmentOffset, batteryPct, powerRatio }) {
  const glowIntensity = 0.15 + (batteryPct / 100) * 0.6 + powerRatio * 0.3;
  return (
    <group position={[misalignmentOffset, position[1], 0]} rotation={[Math.PI, 0, 0]}>
      {/* carcasa */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.85, 0.09, 1.75]} />
        <meshStandardMaterial color="#1B2635" metalness={0.85} roughness={0.3} />
      </mesh>
      {/* pantalla / vidrio */}
      <mesh position={[0, 0.051, 0]}>
        <boxGeometry args={[0.78, 0.01, 1.6]} />
        <meshPhysicalMaterial
          color="#06090D"
          transmission={0.4}
          roughness={0.05}
          thickness={0.2}
          emissive="#22D3EE"
          emissiveIntensity={glowIntensity}
          clearcoat={1}
        />
      </mesh>
    </group>
  );
}

/* ---------------------------------------------------------------------- */
/*  Escena completa                                                         */
/* ---------------------------------------------------------------------- */

export default function Scene({ simState }) {
  const {
    distance_cm = 5,
    misalignment = 0.05,
    power_tx_w = 20,
    efficiency = 0,
    battery_pct = 20,
    temperature_c = 28,
    status = "OK",
  } = simState || {};

  const gap = distanceToUnits(distance_cm);
  const powerRatio = clamp01(power_tx_w / 100);
  const misalignOffset = misalignment * 1.1;
  const overheating = temperature_c > 75;

  return (
    <Canvas shadows camera={{ position: [3.4, 2.6, 3.8], fov: 42 }} className="!bg-transparent">
      <color attach="background" args={["#06090D"]} />
      <fog attach="fog" args={["#06090D", 6, 16]} />

      <ambientLight intensity={0.18} />
      <spotLight
        position={[4, 6, 3]}
        angle={0.35}
        penumbra={0.5}
        intensity={1.4}
        castShadow
        shadow-mapSize={[1024, 1024]}
        color="#DCE8FF"
      />
      <pointLight position={[-3, 1.5, -2]} intensity={0.6} color="#22D3EE" />
      <pointLight position={[0, gap + 0.6, 0]} intensity={0.5 + powerRatio} color={overheating ? "#FF9B45" : "#5FE8F2"} />

      <TransmitterBase powerRatio={powerRatio} />
      <Coil position={[0, 0.14, 0]} radius={0.75} color="#0FB8D4" intensity={powerRatio} spinning />
      <EMField gap={gap} efficiency={efficiency} powerRatio={powerRatio} overheating={overheating} />
      <EnergyParticles gap={gap} powerRatio={powerRatio} efficiency={efficiency} misalignment={misalignment} />

      <group position={[misalignOffset, gap, 0]}>
        <Coil position={[0, 0, 0]} radius={0.55} color="#7C5CF0" intensity={efficiency} spinning />
      </group>
      <Phone position={[0, gap + 0.16, 0]} misalignmentOffset={misalignOffset} batteryPct={battery_pct} powerRatio={powerRatio} />

      {powerRatio > 0.05 && (
        <Sparkles
          count={40}
          scale={[1.6, gap + 0.5, 1.6]}
          position={[0, gap / 2, 0]}
          size={2}
          speed={0.3 + powerRatio}
          color={overheating ? "#FF9B45" : "#5FE8F2"}
          opacity={0.4 + efficiency * 0.5}
        />
      )}

      <ContactShadows position={[0, -0.001, 0]} opacity={0.55} scale={10} blur={2.2} far={4} />
      <Environment preset="night" />

      <OrbitControls
        enablePan={false}
        minDistance={2.2}
        maxDistance={9}
        maxPolarAngle={Math.PI / 2 - 0.02}
        target={[0, gap / 2, 0]}
      />

      <EffectComposer disableNormalPass>
        <Bloom intensity={0.9} luminanceThreshold={0.15} luminanceSmoothing={0.35} mipmapBlur radius={0.7} />
        <Noise opacity={0.02} />
        <Vignette eskil={false} offset={0.2} darkness={0.9} />
      </EffectComposer>
    </Canvas>
  );
}
