import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

// ─── Automotive Physical Materials (clearcoat finish) ───
export const PAINT_GLOSSY_WHITE = {
  color: '#e8e8ec',
  roughness: 0.18,
  metalness: 0.7,
  clearcoat: 1.0,
  clearcoatRoughness: 0.03,
  envMapIntensity: 1.5,
};
export const PAINT_GLOSSY_SILVER = {
  color: '#c4c4cc',
  roughness: 0.15,
  metalness: 0.75,
  clearcoat: 1.0,
  clearcoatRoughness: 0.04,
  envMapIntensity: 1.4,
};
export const PAINT_GLOSSY_BLUE = {
  color: '#2a3a5a',
  roughness: 0.15,
  metalness: 0.75,
  clearcoat: 1.0,
  clearcoatRoughness: 0.03,
  envMapIntensity: 1.6,
};
export const PAINT_DARK = {
  color: '#1e1e24',
  roughness: 0.45,
  metalness: 0.6,
  clearcoat: 0.3,
  clearcoatRoughness: 0.15,
};
export const CHROME = {
  color: '#e0e0e0',
  roughness: 0.05,
  metalness: 0.98,
  clearcoat: 1.0,
  clearcoatRoughness: 0.01,
  envMapIntensity: 2.0,
};
export const RUBBER = { color: '#111111', roughness: 0.92, metalness: 0.02 };
export const GLASS_PHYSICAL = {
  color: '#88bbee',
  transmission: 0.82,
  thickness: 0.25,
  roughness: 0.02,
  metalness: 0.0,
  ior: 1.52,
  clearcoat: 0.5,
  clearcoatRoughness: 0.01,
  transparent: true,
  opacity: 0.35,
  side: THREE.DoubleSide as THREE.Side,
  envMapIntensity: 1.0,
};
export const ALUMINIUM = {
  color: '#bcc0c5',
  roughness: 0.35,
  metalness: 0.8,
  clearcoat: 0.4,
  clearcoatRoughness: 0.1,
  envMapIntensity: 1.2,
};
export const BUMPER_PLASTIC = {
  color: '#222228',
  roughness: 0.65,
  metalness: 0.15,
  clearcoat: 0.2,
  clearcoatRoughness: 0.3,
};
export const PAINT_INDIUM_GREY = {
  color: '#6b6b73',
  roughness: 0.14,
  metalness: 0.75,
  clearcoat: 1.0,
  clearcoatRoughness: 0.03,
  envMapIntensity: 1.5,
};
export const BLACK_CLADDING = {
  color: '#1a1a1e',
  roughness: 0.72,
  metalness: 0.08,
  clearcoat: 0.05,
  clearcoatRoughness: 0.4,
};
export const PAINT_VEHICLE_LIGHT = {
  color: '#d0d8e8',
  roughness: 0.4,
  metalness: 0.3,
  clearcoat: 0.6,
  clearcoatRoughness: 0.08,
  envMapIntensity: 1.2,
};

// Legacy aliases for compatibility
export const PAINT_WHITE = PAINT_GLOSSY_WHITE;
export const PAINT_SILVER = PAINT_GLOSSY_SILVER;
export const GLASS_PROPS = GLASS_PHYSICAL;

// ─── Automotive Body Panel (RoundedBox wrapper) ───
export function BodyPanel({
  position,
  size,
  material,
  radius = 0.04,
  smoothness = 4,
  rotation,
  castShadow = true,
  receiveShadow = true,
}: {
  position: [number, number, number];
  size: [number, number, number];
  material: Record<string, any>;
  radius?: number;
  smoothness?: number;
  rotation?: [number, number, number];
  castShadow?: boolean;
  receiveShadow?: boolean;
}) {
  return (
    <RoundedBox
      args={size}
      radius={radius}
      smoothness={smoothness}
      position={position}
      rotation={rotation}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
    >
      <meshPhysicalMaterial {...material} />
    </RoundedBox>
  );
}

// ─── Wheel Arch (visual cutout) ───
export function WheelArch({
  position,
  radius = 0.3,
  width = 0.06,
  rotation,
}: {
  position: [number, number, number];
  radius?: number;
  width?: number;
  rotation?: [number, number, number];
}) {
  return (
    <mesh position={position} rotation={rotation || [0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[radius, radius, width, 24, 1, false, 0, Math.PI]} />
      <meshPhysicalMaterial {...PAINT_DARK} />
    </mesh>
  );
}

// ─── Premium Detail Wheel with alloy rim ───
export function DetailWheel({ position, radius = 0.3, width = 0.18, spinning = false }: { position: [number, number, number]; radius?: number; width?: number; spinning?: boolean }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, delta) => { if (ref.current && spinning) ref.current.rotation.x += delta * 0.3; });

  const spokeGeo = useMemo(() => {
    const shape = new THREE.Shape();
    const s = radius / 0.3;
    shape.moveTo(-0.01 * s, 0);
    shape.lineTo(0.01 * s, 0);
    shape.lineTo(0.006 * s, radius * 0.82);
    shape.lineTo(-0.006 * s, radius * 0.82);
    shape.closePath();
    return new THREE.ExtrudeGeometry(shape, { depth: 0.018, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.002, bevelSegments: 2 });
  }, [radius]);

  return (
    <group ref={ref} position={position} rotation={[0, 0, Math.PI / 2]}>
      {/* Tire — high-poly smooth */}
      <mesh castShadow>
        <torusGeometry args={[radius * 0.84, radius * 0.2, 20, 48]} />
        <meshStandardMaterial {...RUBBER} />
      </mesh>
      {/* Tire sidewall detail */}
      <mesh>
        <torusGeometry args={[radius * 0.84, radius * 0.18, 8, 48]} />
        <meshStandardMaterial color="#181818" roughness={0.95} metalness={0.01} />
      </mesh>
      {/* Rim disc — alloy finish */}
      <mesh castShadow>
        <cylinderGeometry args={[radius * 0.64, radius * 0.64, width * 0.55, 32]} />
        <meshPhysicalMaterial {...CHROME} color="#d0d0d8" />
      </mesh>
      {/* Brake disc (visible through spokes) */}
      <mesh>
        <cylinderGeometry args={[radius * 0.5, radius * 0.5, width * 0.15, 24]} />
        <meshPhysicalMaterial color="#555" roughness={0.5} metalness={0.7} />
      </mesh>
      {/* Hub cap — polished */}
      <mesh position={[0, width * 0.3, 0]}>
        <cylinderGeometry args={[radius * 0.2, radius * 0.22, 0.035, 20]} />
        <meshPhysicalMaterial {...CHROME} />
      </mesh>
      {/* 5 spokes — alloy */}
      {Array.from({ length: 5 }).map((_, i) => (
        <mesh key={i} geometry={spokeGeo} position={[0, width * 0.3, 0]} rotation={[0, 0, (i * Math.PI * 2) / 5]}>
          <meshPhysicalMaterial {...CHROME} color="#c8c8d0" />
        </mesh>
      ))}
    </group>
  );
}

// ─── LED Headlight (premium) ───
export function Headlight({ position, size = [0.12, 0.06, 0.04] }: { position: [number, number, number]; size?: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Housing — glossy dark */}
      <RoundedBox args={size} radius={0.008} smoothness={3}>
        <meshPhysicalMaterial color="#1a1a22" roughness={0.2} metalness={0.85} clearcoat={0.8} clearcoatRoughness={0.05} />
      </RoundedBox>
      {/* LED projector lens */}
      <mesh position={[size[0] / 2 + 0.002, 0, 0]}>
        <sphereGeometry args={[size[1] * 0.25, 16, 16]} />
        <meshPhysicalMaterial
          color="#ffffff"
          emissive="#ffeecc"
          emissiveIntensity={4}
          transmission={0.5}
          roughness={0.02}
          clearcoat={1}
        />
      </mesh>
      {/* DRL strip */}
      <mesh position={[size[0] / 2 + 0.002, -size[1] * 0.35, 0]}>
        <boxGeometry args={[0.004, 0.006, size[2] * 0.9]} />
        <meshStandardMaterial emissive="#ffffff" emissiveIntensity={3} color="#ffffff" toneMapped={false} />
      </mesh>
      <pointLight color="#ffeecc" intensity={0.8} distance={4} decay={2} />
    </group>
  );
}

// ─── Taillight (premium glow) ───
export function Taillight({ position, size = [0.04, 0.08, 0.06] }: { position: [number, number, number]; size?: [number, number, number] }) {
  return (
    <group position={position}>
      <RoundedBox args={size} radius={0.006} smoothness={3}>
        <meshPhysicalMaterial
          color="#ff2222"
          emissive="#cc1111"
          emissiveIntensity={2.5}
          transparent
          opacity={0.92}
          clearcoat={1}
          clearcoatRoughness={0.02}
          toneMapped={false}
        />
      </RoundedBox>
      {/* Glow halo */}
      <mesh>
        <boxGeometry args={[size[0] + 0.015, size[1] + 0.025, size[2] + 0.025]} />
        <meshStandardMaterial emissive="#cc1111" emissiveIntensity={0.3} transparent opacity={0.06} />
      </mesh>
    </group>
  );
}

// ─── Side Mirror (premium) ───
export function SideMirror({ position, side = 'left' }: { position: [number, number, number]; side?: 'left' | 'right' }) {
  const flip = side === 'right' ? -1 : 1;
  return (
    <group position={position}>
      {/* Arm */}
      <mesh position={[0, 0, flip * 0.06]}>
        <boxGeometry args={[0.02, 0.015, 0.12]} />
        <meshPhysicalMaterial {...PAINT_DARK} />
      </mesh>
      {/* Mirror housing */}
      <RoundedBox args={[0.06, 0.08, 0.035]} radius={0.008} smoothness={3} position={[0, 0, flip * 0.14]}>
        <meshPhysicalMaterial {...PAINT_DARK} />
      </RoundedBox>
      {/* Mirror surface */}
      <mesh position={[-0.031, 0, flip * 0.14]}>
        <planeGeometry args={[0.048, 0.065]} />
        <meshPhysicalMaterial color="#ccddef" roughness={0.02} metalness={0.98} clearcoat={1} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// ─── Animated Door (swing type) ───
export function SwingDoor({
  position, size, pivotOffset, isOpen,
  openAngle = Math.PI * 0.55, direction = 1, material,
}: {
  position: [number, number, number];
  size: [number, number, number];
  pivotOffset: [number, number, number];
  isOpen: boolean;
  openAngle?: number;
  direction?: number;
  material?: Record<string, any>;
}) {
  const ref = useRef<THREE.Group>(null);
  const targetAngle = isOpen ? openAngle * direction : 0;

  useFrame((_, delta) => {
    if (!ref.current) return;
    ref.current.rotation.y += (targetAngle - ref.current.rotation.y) * Math.min(delta * 4, 0.15);
  });

  return (
    <group position={position}>
      <group ref={ref} position={pivotOffset}>
        <RoundedBox
          args={size}
          radius={0.015}
          smoothness={3}
          position={[-pivotOffset[0], -pivotOffset[1], -pivotOffset[2]]}
          castShadow
        >
          <meshPhysicalMaterial {...(material || PAINT_GLOSSY_WHITE)} />
        </RoundedBox>
      </group>
    </group>
  );
}

// ─── Sliding Door ───
export function SlidingDoor({
  position, size, isOpen, slideDistance, slideAxis = 'x', material,
}: {
  position: [number, number, number];
  size: [number, number, number];
  isOpen: boolean;
  slideDistance: number;
  slideAxis?: 'x' | 'z';
  material?: Record<string, any>;
}) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (!ref.current) return;
    const target = isOpen ? slideDistance : 0;
    const axis = slideAxis === 'x' ? 'x' : 'z';
    const base = slideAxis === 'x' ? position[0] : position[2];
    ref.current.position[axis] += (base + target - ref.current.position[axis]) * Math.min(delta * 4, 0.15);
  });

  return (
    <RoundedBox ref={ref as any} args={size} radius={0.015} smoothness={3} position={position} castShadow>
      <meshPhysicalMaterial {...(material || PAINT_GLOSSY_WHITE)} />
    </RoundedBox>
  );
}

// ─── Tail Lift (animated fold-down) ───
export function TailLift({
  position, size, isOpen,
}: {
  position: [number, number, number];
  size: [number, number, number];
  isOpen: boolean;
}) {
  const ref = useRef<THREE.Group>(null);
  const targetAngle = isOpen ? -Math.PI * 0.5 : 0;

  useFrame((_, delta) => {
    if (!ref.current) return;
    ref.current.rotation.z += (targetAngle - ref.current.rotation.z) * Math.min(delta * 3, 0.12);
  });

  return (
    <group position={position}>
      <group ref={ref}>
        <mesh position={[0, -size[1] / 2, 0]} castShadow>
          <boxGeometry args={size} />
          <meshPhysicalMaterial {...ALUMINIUM} />
        </mesh>
        {/* Grip strips */}
        {[-0.3, 0, 0.3].map((z, i) => (
          <mesh key={i} position={[0, -size[1] / 2 + 0.005, z * size[2] * 0.8]}>
            <boxGeometry args={[size[0] * 0.9, 0.008, 0.02]} />
            <meshPhysicalMaterial color="#999" roughness={0.5} metalness={0.5} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

// ─── Glass Panel (physical transmission) ───
export function GlassPanel({ position, size, rotation }: { position: [number, number, number]; size: [number, number]; rotation?: [number, number, number] }) {
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={size} />
      <meshPhysicalMaterial {...GLASS_PHYSICAL} />
    </mesh>
  );
}

// ─── Grille Pattern ───
export function Grille({ position, size, slats = 5 }: { position: [number, number, number]; size: [number, number]; slats?: number }) {
  const slatH = size[1] / (slats * 2 - 1);
  return (
    <group position={position}>
      {Array.from({ length: slats }).map((_, i) => (
        <mesh key={i} position={[0, size[1] / 2 - slatH / 2 - i * slatH * 2, 0]}>
          <boxGeometry args={[0.015, slatH * 0.7, size[0]]} />
          <meshPhysicalMaterial {...CHROME} />
        </mesh>
      ))}
    </group>
  );
}

// ─── Showroom turntable platform ───
export function TurntablePlatform({ radius = 5, speed = 0.15 }: { radius?: number; speed?: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => { if (ref.current) ref.current.rotation.y += delta * speed; });

  return (
    <mesh ref={ref} position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <circleGeometry args={[radius, 64]} />
      <meshStandardMaterial color="#0a0a12" roughness={0.6} metalness={0.4} transparent opacity={0.7} />
    </mesh>
  );
}

// ─── Door state interface ───
export interface DoorState {
  rear: boolean;
  side: boolean;
}

export interface VehicleModelProps {
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  doors: DoorState;
}
